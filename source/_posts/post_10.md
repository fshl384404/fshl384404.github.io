---
title: 如何实现一个零依赖迷你 AI Agent
date: 2026-09-13 23:00:00
updated: 2026-09-13 23:00:00
categories:
  - 履践
tags:
  - Python
  - AI Agent
description: 零依赖、可对接本地模型的 AI Agent 教学实现与解析
cover: /img/blog10.webp
---

## 背景

最近读到了一篇题目很有趣的文章，名为[《The Emperor Has No Clothes: How to Code Claude Code in 200 Lines of Code》](https://www.mihaileric.com/The-Emperor-Has-No-Clothes/) ，作者 Mihail Eric 提出一个主张：Claude Code 的核心逻辑（约 200 行）只是一个「调用模型 → 解析工具调用 → 执行工具 → 结果回填 → 继续循环」的循环；产品其余约 9800 行代码属于安全与工程层（权限确认、沙箱、审计、预算管理）。

本文以此为灵感，给出一个可运行、可验证的实现（`minicode.py`）。核心循环（`Agent.run` + `_execute`）约 60 行，与扩展层在代码中明确分开；扩展层共七项：**回复进上下文、上下文预算与摘要压缩、跨会话长期记忆、最小权限沙箱、调用统计、流式输出、会话保存/恢复**。

---

## 需求与设计约束

### 功能需求

| 编号 | 需求 | 对应实现 |
|---|---|---|
| F1 | 支持多轮对话，且模型能引用自己先前的回答 | `Agent.append_reply`（默认开启），见 4.7 |
| F2 | 支持工具调用（读文件、写文件、计算、记忆读写、白名单命令） | `_make_tools()`，见 4.5 |
| F3 | 上下文超预算时自动压缩，而非截断 | `Agent._compact()`，见 4.7 |
| F4 | 长期记忆跨进程持久化，且每轮注入上下文 | `MemoryStore` + `_system_messages()`，见 4.3 |
| F5 | 工具执行受路径与命令白名单约束 | `_safe_path()`、`SAFE_COMMANDS`，见 4.4 |
| F6 | 记录调用次数、token 用量与成本 | `Agent._track()`、`--stats`，见 4.7 |
| F7 | 无 API Key 时可运行完整循环（本地模型） | `LLMClient` + 本地 Ollama，见 4.6 |
| F8 | 支持流式输出（回答边生成边显示） | `chat_stream` + `_chat_stream`、`--stream`，见 4.6/4.7 |
| F9 | 支持会话持久化，进程重启后恢复 | `save_session`/`load_session`、`--session`，见 4.7 |

### 设计约束

1. **零第三方依赖**：HTTP 客户端使用 `urllib.request`，安全计算器使用 `ast` 标准库。
2. **协议兼容**：真实模型路径遵循 OpenAI Chat Completions 协议（含 `tools` 字段），因此可对接 OpenAI、DeepSeek、Moonshot、Ollama 等任何兼容服务。
3. **单一文件**：全部代码位于 `minicode.py`，便于教学与审阅。

---

## 总体架构

### 模块结构

```
minicode.py
├── 常量与基础工具
│   ├── SYSTEM_PROMPT          系统提示词
│   ├── SAFE_COMMANDS          命令白名单
│   ├── estimate_tokens()      token 估算（启发式）
│   └── MemoryStore            长期记忆（JSON 持久化）
├── 安全原语
│   ├── _safe_eval()           AST 白名单计算器
│   └── _safe_path()           工作目录内路径解析
├── 工具注册表
│   └── _make_tools(workdir, memory) -> {name: (描述, JSON Schema, 函数)}
├── LLM 客户端
│   ├── LLMResult              统一返回对象
│   └── LLMClient              OpenAI 兼容协议（云端 / 本地 Ollama）
├── Agent（核心循环 + 扩展层）
│   ├── run()/_execute()       核心循环（约 60 行，见 4.7）
│   ├── _chat_stream()         流式输出（扩展 6）
│   ├── save/load_session()    会话保存/恢复（扩展 7）
│   ├── _compact()/_summarize()  上下文压缩（扩展 2）
│   ├── _reflect_once()        可选自检（扩展）
│   └── _track()               统计（扩展 5）
└── 入口
    ├── main()                 argparse CLI
    ├── repl()                 交互模式
    └── demo()                 内置演示（三组实验）
```

### 一次 `run()` 调用的完整时序

输入 `user_input` 后，`Agent.run()` 执行以下步骤：

1. 将用户消息追加到 `self.messages`（role=`user`）。
2. 进入循环（上限默认 12 次，`--max-steps` 可配）：
   a. 刷新 `self.messages[0]`：用 `_system_messages()` 重建 system 消息（含当前长期记忆）。
   b. 调用 `llm.chat(messages, tools)`（`--stream` 时走 `chat_stream`），得到 `LLMResult`。
   c. 记录统计（`_track`）。
   d. 若 `result.tool_calls` 非空：
      - 将助手消息（含 `tool_calls`）追加入史；
      - 对每个工具调用执行 `_execute`，将结果以 role=`tool` 的消息（携带 `tool_call_id`）追加入史；
      - `continue`，进入下一次循环。
   e. 否则（模型给出最终回答）：
      - 若 `append_reply=True`，将回答以 role=`assistant` 追加入史；
      - 若 `reflect=True`，执行一次自检（追加一轮问答）；
      - 执行 `_compact()`（超预算则压缩）；
      - 返回回答文本。
3. 若循环达到上限仍未得到最终回答，返回占位文本。

### 核心数据结构

**消息对象**（OpenAI 协议中的 `messages` 元素）：

| role | 生产者 | 主要字段 | 语义 |
|---|---|---|---|
| `system` | Agent | `content` | 系统指令、当前记忆、历史摘要 |
| `user` | 用户/Agent | `content` | 用户输入；自检提示也以此角色追加 |
| `assistant` | LLM | `content`、`tool_calls` | 模型回复；含工具调用时 `content` 可为 `null` |
| `tool` | Agent | `tool_call_id`、`content` | 工具执行结果，必须与某个 `assistant.tool_calls[i].id` 对应 |

**`LLMResult`**：

```python
class LLMResult:
    def __init__(self, text, tool_calls, usage):
        self.text = text or ""
        self.tool_calls = tool_calls or []  # [{"id", "function": {"name", "arguments"}}]
        self.usage = usage or {"prompt_tokens": 0, "completion_tokens": 0}
```

**工具注册表条目**：`name -> (描述字符串, 参数 JSON Schema 字典, 实现函数)`。

**记忆文件格式**（`--memory` 指定，默认 `agent_memory.json`）：

```json
{
  "作者": {"value": "小明", "ts": "2026-08-16 21:53:45"}
}
```

### 协议不变式（正确性要求）

在 OpenAI 工具调用协议下，历史维护必须满足三条不变式，`run()` 的每一步都围绕它们实现：

1. **对应性**：含 `tool_calls` 的 `assistant` 消息必须先于其 `tool` 结果入史；
2. **关联性**：每条 `tool` 消息的 `tool_call_id` 必须等于对应 `tool_call.id`；
3. **连续性**：模型最终回答默认以 `assistant` 角色入史（由 `append_reply` 控制），使后续轮次可引用。

---

## 模块详解

### 系统提示词（`SYSTEM_PROMPT`）

```python
SYSTEM_PROMPT = """你是 minicode，一个极简的 AI Agent。
你可以调用工具来完成用户的任务。规则：
1. 需要外部信息或执行动作时，先调用工具，不要凭空编造；
2. 可以一次并行调用多个工具；
3. 你的每一次回复（包括最终回答）都会追加进对话历史，成为后续对话的上下文，请保持回答自洽；
4. 任务完成后，用自然语言总结结果。"""
```

作用：声明工具的存在与使用规则。其中第 3 条与 `append_reply` 的实现保持一致——提示词与运行时行为共同保证「回复进上下文」这一语义。提示词本身可视为 Agent 的「说明书」，修改它即可改变模型的行为模式，无需改动代码。

### token 估算（`estimate_tokens`）

```python
def estimate_tokens(text):
    cjk = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    return cjk + (len(text) - cjk) // 4 + 1
```

说明：按「CJK 字符约 1 token/字、其余字符约 4 字符/token」估算。这是启发式方法，用于上下文压缩的阈值判断；调用方传入的是**完整序列化后的消息**（含 `tool_calls` 参数）与工具 schema，避免只数 `content` 导致系统性低估（见 4.7 `_compact`）。真实 API 的精确用量以响应中的 `usage` 字段为准（`_track` 即使用该字段）。如需更高精度，可替换为 `tiktoken` 等真实 tokenizer，接口不变。

### 长期记忆（`MemoryStore`）

```python
class MemoryStore:
    def __init__(self, path):
        self.path = path
        self.data = {}
        self.load()

    def load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                self.data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.data = {}

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def set(self, key, value):
        self.data[key] = {"value": value, "ts": _now()}
        self.save()
        return f"已记住 {key} = {value}"

    def search(self, keyword=None):
        if not self.data:
            return "记忆为空"
        if not keyword:
            return "\n".join(f"{k}: {v['value']}" for k, v in self.data.items())
        hits = {k: v["value"] for k, v in self.data.items()
                if keyword in k or keyword in v["value"]}
        return "\n".join(f"{k}: {v}" for k, v in hits.items()) or "没有找到相关记忆"
```

要点：

- 持久化格式为 JSON 文件，`set()` 立即写盘，`load()` 容错处理文件缺失与损坏。
- 检索为子串匹配（对 key 与 value 均匹配），满足演示需求；大规模场景应替换为向量检索。
- 记忆的**注入**发生在 `Agent._system_messages()`：每次调用模型前，将全部记忆条目拼入 system 消息（见 4.7）。因此记忆属于「每轮主动可见的上下文」，而非「被动查询」——模型不需要先调用 `recall` 就知道已记住的事实。
- `remember` / `recall` 本身也是工具（见 4.5），模型可通过工具写入或查询记忆，形成闭环。

### 安全原语（`_safe_eval`、`_safe_path`）

**安全计算器 `_safe_eval`**：使用 `ast` 解析表达式，仅放行数字常量、二元运算（加减乘除、整除、取模、幂）与一元运算（正负号），其余语法直接抛错。这样 `calculate` 工具不会执行任意 Python 代码。除此之外还有两道 **DoS 防护**：指数绝对值超过 `_MAX_POW_EXP = 1000` 时在计算前拒绝（防止 `9**9**9` 这类超大整数运算耗尽 CPU/内存），任何 `int` 结果位数超过 `_MAX_DIGITS = 10000` 时拒绝（兜底拦截乘法等运算的爆炸性结果）。

```python
_MAX_POW_EXP = 1000    # 指数上限：防止 9**9**9 这类大整数运算耗尽 CPU/内存（DoS）
_MAX_DIGITS = 10000    # 结果位数上限（int）

def _safe_eval(expr):
    def guard(n):
        if isinstance(n, int) and len(str(abs(n))) > _MAX_DIGITS:
            raise ValueError(f"数字过大（超过 {_MAX_DIGITS} 位）")
        return n

    def walk(node):
        if isinstance(node, ast.Expression):
            return walk(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return guard(node.value)
        if isinstance(node, ast.BinOp) and type(node.op) in _BINOPS:
            left, right = walk(node.left), walk(node.right)
            if type(node.op) is ast.Pow and abs(right) > _MAX_POW_EXP:
                raise ValueError(f"指数过大（绝对值超过 {_MAX_POW_EXP}）")
            return guard(_BINOPS[type(node.op)](left, right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY:
            return guard(_UNARY[type(node.op)](walk(node.operand)))
        raise ValueError(f"表达式包含不支持的语法：{type(node).__name__}")

    return walk(ast.parse(expr, mode="eval"))
```

**路径沙箱 `_safe_path`**：将相对路径解析到 `workdir` 内，`..` 越界直接抛出 `PermissionError`。与朴素 `abspath` 版本相比有两处加固：

- **符号链接 / junction**：用 `realpath` 解析链接的真实目标——工作目录内指向外部的链接会被判为越界（Windows junction 同样适用）；
- **大小写**：比较前统一 `normcase`，兼容 Windows 大小写不敏感的文件系统。

```python
def _safe_path(workdir, path):
    root = os.path.realpath(workdir)
    full = os.path.realpath(os.path.join(root, path))
    root_c, full_c = os.path.normcase(root), os.path.normcase(full)
    if full_c != root_c and not full_c.startswith(root_c + os.sep):
        raise PermissionError(f"路径越界：{path}（只允许访问 {root}）")
    return full
```

判断依据：`realpath` 归一化后，目标路径必须以 `root + os.sep` 为前缀（或等于 root 本身）。该原语被 `read_file`、`write_file`、`list_dir` 共用。

### 工具注册表（`_make_tools`）

注册表结构为 `{name: (description, parameters, fn)}`，其中 `parameters` 为 JSON Schema。`Agent._tool_schema()` 将其转换为协议要求的格式：

```python
def _tool_schema(self):
    return [{"type": "function",
             "function": {"name": n, "description": d, "parameters": p}}
            for n, (d, p, _fn) in self.tools.items()]
```

全部工具：

| 工具名 | 参数（JSON Schema） | 行为 | 安全约束 |
|---|---|---|---|
| `read_file` | `path`（必填）、`limit`（默认 2000） | 读取文件前若干行 | `_safe_path` |
| `write_file` | `path`、`content`（均必填） | 覆盖写入，自动建目录 | `_safe_path` |
| `list_dir` | `path`（默认 `.`） | 列出目录条目 | `_safe_path` |
| `calculate` | `expr`（必填） | 计算数学表达式 | `_safe_eval`（AST 白名单） |
| `now` | 无 | 返回当前时间 | — |
| `remember` | `key`、`value`（均必填） | 写入长期记忆 | 写入 `--memory` 文件 |
| `recall` | `keyword`（可选） | 检索长期记忆 | 只读 |
| `run_cmd` | `cmd`（必填） | 执行白名单命令 | `SAFE_COMMANDS = {echo, date, pwd}` |

`run_cmd` 的实现：

```python
def run_cmd(cmd):
    parts = cmd.strip().split(maxsplit=1)
    head = parts[0].lower() if parts else ""
    if head not in SAFE_COMMANDS:
        return f"拒绝执行：'{head}' 不在安全白名单 {sorted(SAFE_COMMANDS)} 内"
    if head == "echo":
        return parts[1] if len(parts) > 1 else ""
    if head == "date":
        return _now()
    return os.path.abspath(workdir)
```

设计说明：`run_cmd` 不调用 `subprocess`，而是直接对白名单命令给出确定结果。这样既演示了「最小权限」思想，又避免 `shell=True` 带来的注入风险。`_execute` 对工具调用统一做 JSON 参数解析与异常兜底：

```python
def _execute(self, name, arguments):
    if name not in self.tools:
        return f"未知工具：{name}"
    _, _schema, fn = self.tools[name]
    try:
        kwargs = json.loads(arguments) if arguments else {}
        if not isinstance(kwargs, dict):
            kwargs = {}
        return str(fn(**kwargs))
    except Exception as e:  # 工具失败也要回填，不能中断循环
        return f"工具执行失败：{type(e).__name__}: {e}"
```

**新增工具的步骤**：在 `_make_tools` 的返回字典中增加一个条目（描述、Schema、函数）即可；`_tool_schema`、`_execute` 均无需改动。真实模型通过 function calling 发现工具，无需任何关键词规则。

### LLM 客户端

**接口契约**：`chat(messages, tools) -> LLMResult`（非流式）与 `chat_stream(messages, tools, on_piece) -> LLMResult`（流式）。`Agent` 只依赖该接口，因此可对接任何 OpenAI 兼容服务——云端（OpenAI、DeepSeek、Moonshot）或本地（Ollama）无缝切换。

**`LLMClient`（真实模型）**：

```python
def chat(self, messages, tools=None):
    payload = {"model": self.model, "messages": messages, "temperature": 0.2}
    if tools:
        payload["tools"] = tools
    with self._open(payload) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    msg = data["choices"][0]["message"]
    return LLMResult(msg.get("content") or "",
                     msg.get("tool_calls") or [],
                     data.get("usage") or {})
```

请求为 `POST {base_url}/chat/completions`。`api_key` 可为空字符串：**本地 Ollama 无鉴权，不需要 `Authorization` 头**；配置了 Key 时才携带 `Authorization: Bearer {api_key}`。协议层面的请求/响应示例（`model` 用 Ollama 的 `qwen2.5:3b` 亦成立）：

```jsonc
// 请求
{
  "model": "qwen2.5:3b",
  "messages": [
    {"role": "system", "content": "你是 minicode，一个极简的 AI Agent。…"},
    {"role": "user", "content": "计算 (12+8)*3"}
  ],
  "tools": [
    {"type": "function", "function": {"name": "calculate", "description": "…",
                                       "parameters": {"type": "object", "properties": {"expr": {"type": "string"}}, "required": ["expr"]}}}
  ],
  "temperature": 0.2
}

// 响应（截取关键字段）
{
  "choices": [{
    "message": {
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {"name": "calculate", "arguments": "{\"expr\": \"(12+8)*3\"}"}
      }]
    }
  }],
  "usage": {"prompt_tokens": 120, "completion_tokens": 30}
}
```

错误处理：`HTTPError` 抛出带状态码与响应体的 `RuntimeError`；`URLError`（网络错误）自动重试后再失败才抛出（见下文 `_open`）；`Agent.run` 会把这些错误统一包装后再向上抛，由 `repl`/`main` 兜底（见 4.7）。注意 `arguments` 是**字符串**，需要 `json.loads` 解析（见 `_execute`）。

**本地 Ollama 接入**：Ollama 的 OpenAI 兼容端点为 `http://localhost:11434/v1`，无需 Key、无需 `Authorization` 头。与云端唯一的实际差异是模型名（如 `qwen2.5:3b`）与 `usage` 字段来自本地推理。qwen2.5 系列原生支持 function calling，但 3B 小模型对工具 schema 的遵循并不总是稳定——这是接入真实模型后才会暴露的坑（见第 6 节实测）。

**流式输出（`chat_stream`，扩展 6）**：请求体加 `"stream": true`，响应变为 **SSE（Server-Sent Events）**——逐行 `data: {json}` 分片，以 `data: [DONE]` 结束。每个分片的关键字段在 `choices[0].delta`：

```python
def chat_stream(self, messages, tools=None, on_piece=None):
    payload = {"model": self.model, "messages": messages,
               "temperature": 0.2, "stream": True}
    if tools:
        payload["tools"] = tools
    text_parts, tool_map, usage = [], {}, {}
    with self._open(payload) as resp:
        for raw in resp:
            line = raw.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            chunk = json.loads(data)
            delta = (chunk.get("choices") or [{}])[0].get("delta", {})
            if delta.get("content"):
                text_parts.append(delta["content"])
                if on_piece:
                    on_piece(delta["content"])
            for tc in delta.get("tool_calls") or []:
                idx = tc.get("index", 0)
                entry = tool_map.setdefault(
                    idx, {"id": "", "function": {"name": "", "arguments": ""}})
                if tc.get("id"):
                    entry["id"] = tc["id"]
                fn = tc.get("function") or {}
                entry["function"]["name"] += fn.get("name") or ""
                entry["function"]["arguments"] += fn.get("arguments") or ""
            if chunk.get("usage"):
                usage = chunk["usage"]
    tool_calls = [tool_map[i] for i in sorted(tool_map)]
    return LLMResult("".join(text_parts), tool_calls, usage)
```

两个教学点：

1. **`delta.content` 是增量**：`on_piece` 回调把每个分片实时交给上层打印（见 4.7 `_chat_stream`），实现「边生成边显示」。
2. **`delta.tool_calls` 按 `index` 分片、`arguments` 是增量字符串**：必须按 index 累积拼接（`entry["function"]["arguments"] += …`），只处理 content 会丢掉工具调用。实测中一次 `calculate` 调用的参数就是横跨多个分片拼出来的。

注意：`usage` 只在服务端选择返回时才有（Ollama 的流式响应**不携带** `usage`，见第 7 节局限表）。

**网络错误重试（`_open`）**：`chat` 与 `chat_stream` 共用同一个请求方法 `_open`，网络类错误自动重试：

```python
def _open(self, payload):
    headers = {"Content-Type": "application/json"}
    if self.api_key:
        headers["Authorization"] = f"Bearer {self.api_key}"
    req = urllib.request.Request(
        f"{self.base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers, method="POST")
    for attempt in range(self.retries + 1):
        try:
            return urllib.request.urlopen(req, timeout=self.timeout)
        except urllib.error.HTTPError as e:
            raise RuntimeError(
                f"API 错误 {e.code}: {e.read().decode('utf-8', 'replace')[:400]}") from e
        except urllib.error.URLError as e:
            if attempt < self.retries:
                wait = 1.0 * (attempt + 1)
                print(f"[重试 {attempt + 1}/{self.retries}] 网络错误：{e.reason}，"
                      f"{wait:.0f} 秒后重试……", file=sys.stderr)
                time.sleep(wait)
                continue
            raise RuntimeError(f"网络错误: {e.reason}") from e
```

教学点（重试边界）：**只重试网络类错误（`URLError`：连不上/超时），不重试 `HTTPError`**——4xx（如 401 密钥错误）重试多少次都不会成功，只会放大延迟；而 `POST /chat/completions` 无副作用（不修改任何状态），所以重试安全。默认 `retries=2`，退避间隔 1s、2s。

**后端选择逻辑**（`main()`）：

```python
memory = MemoryStore(args.memory)
llm = LLMClient(args.base_url, args.api_key or "", args.model,
                args.price_in, args.price_out)
if args.api_key:
    print(f"[backend] {args.model} @ {args.base_url}")
else:
    print(f"[backend] 未提供 API Key；若目标是本地 Ollama，请确认 --base-url 指向其 /v1 端点"
          f"（如 http://localhost:11434/v1），当前为 {args.base_url}")
```

即：不区分后端，始终走同一个 OpenAI 兼容客户端；`--base-url` 指向本地 Ollama 或云端服务均可，`api_key` 可选（默认读取 `OPENAI_API_KEY` 环境变量，`--base-url`/`--model` 同理）。默认 `--base-url` 为 `http://localhost:11434/v1`、`--model` 为 `qwen2.5:3b`，开箱即连本地 Ollama。

### Agent（核心循环与扩展层）

**构造与状态**：`Agent.__init__` 接收 `llm`、`memory`、`workdir`、`max_tokens`、`keep_turns`、`append_reply`、`reflect`、价格参数，以及 `max_steps`（步数上限，默认 12）与 `stream`（流式开关），初始化消息列表（`messages[0]` 为 system 消息）与统计字典。

**记忆注入 `_system_messages`**：

```python
def _system_messages(self):
    sys_text = SYSTEM_PROMPT
    if self.memory.data:
        lines = "\n".join(f"- {k}: {v['value']}" for k, v in self.memory.data.items())
        sys_text += f"\n\n[当前长期记忆]\n{lines}"
    return [{"role": "system", "content": sys_text}]
```

每次进入循环时执行 `self.messages[0] = self._system_messages()[0]`，保证记忆实时可见。`messages[0]` 常驻为 system 消息，这是 `_compact` 中「保留所有 system 消息」的前提。

**上下文压缩 `_compact` / `_summarize`**：

```python
def _compact(self):
    def msg_tokens(m):
        return estimate_tokens(json.dumps(m, ensure_ascii=False))
    total = sum(msg_tokens(m) for m in self.messages)
    total += estimate_tokens(json.dumps(self._tool_schema(), ensure_ascii=False))
    if total <= self.max_tokens:
        return
    sys_n = sum(1 for m in self.messages if m["role"] == "system")
    if self.keep_turns > 0:
        tail, middle = self.messages[-self.keep_turns:], self.messages[sys_n:-self.keep_turns]
    else:
        tail, middle = [], self.messages[sys_n:]
    if not middle:
        return
    summary = self._summarize(middle)
    self.messages = (self.messages[:sys_n]
                     + [{"role": "system", "content": f"[历史摘要] {summary}"}]
                     + tail)
```

算法步骤：

1. 估算总 token 数；不超过 `max_tokens` 则直接返回。注意估算基于**完整序列化消息**（`json.dumps`，含 `tool_calls` 参数）**加上工具 schema 本身**，而不是只数 `content`——后者会系统性低估实际 prompt 大小。
2. 计算 system 消息数量 `sys_n`（基础 system 与既有摘要）。
3. 划分：`middle` 为待压缩的旧消息（`messages[sys_n:-keep_turns]`），`tail` 为最近 `keep_turns` 条保留消息。
4. 将 `middle` 压缩为一条 `[历史摘要]` system 消息，替换原 `middle`。

`_summarize` 使用一次额外的 LLM 调用生成三句话摘要（与主循环同一模型）；调用失败时降级为占位文本 `(压缩失败：…)`，不中断对话。压缩的代价是额外的 LLM 调用与延迟，收益是上下文长度可控且关键信息不丢失。

**主循环 `run()`**（核心代码，与 3.2 的时序一一对应）：

```python
def run(self, user_input, echo=False):
    if echo:
        print(f"\n[你] {user_input}")
    self.messages.append({"role": "user", "content": user_input})

    for _ in range(self.max_steps):
        self.messages[0] = self._system_messages()[0]  # 刷新记忆注入
        try:
            if self.stream:
                result = self._chat_stream()           # ★ 扩展6：流式
            else:
                result = self.llm.chat(self.messages, self._tool_schema())
        except RuntimeError:
            raise  # LLMClient 已抛出带上下文信息的 RuntimeError
        except Exception as e:  # 其他意外异常统一包装，由 repl/main 兜底
            raise RuntimeError(f"LLM 调用失败（{type(e).__name__}）：{e}") from e
        self._track(result)

        if result.tool_calls:
            # ① 含工具调用意图的助手消息必须入史，否则工具结果无法对应
            self.messages.append({"role": "assistant", "content": result.text or None,
                                  "tool_calls": result.tool_calls})
            for tc in result.tool_calls:
                name = tc["function"]["name"]
                args = tc["function"].get("arguments", "")
                out = self._execute(name, args)
                if echo:
                    print(f"  [工具] {name}({args[:60]}) → {out[:100]}")
                self.messages.append({"role": "tool",
                                      "tool_call_id": tc.get("id", ""),
                                      "content": out})
            continue

        # ② 最终回答：追加进历史，成为后续上下文
        if self.append_reply:
            self.messages.append({"role": "assistant", "content": result.text})
        if echo and not self.stream:
            # 流式模式下 _chat_stream 已边收边打印，避免重复输出
            print(f"[Agent] {result.text}")

        if self.reflect:
            self._reflect_once()
        self._compact()
        return result.text

    return "(达到最大步数，任务未完成)"
```

逐段说明：

- 工具分支（①）：模型若返回 `tool_calls`，先入史助手消息（满足不变式 1），再逐个执行并回填 role=`tool` 消息（满足不变式 2），然后 `continue` 进入下一轮。工具执行失败也以字符串形式回填，循环不中断。
- 回答分支（②）：`append_reply=True` 时最终回答入史（满足不变式 3）。这是「回复进上下文」的具体实现点：**模型的最终回答与用户输入、工具结果一样，都是后续上下文的组成部分**。`append_reply=False` 时该回答不入史，用于对比实验（第 6 节）。
- 流式分支（★ 扩展 6）：`stream=True` 时改走 `_chat_stream`——它调用 `chat_stream` 并注册 `on_piece` 回调，**第一次收到文本增量时才打印 `[Agent]` 前缀**；若本次是工具调用轮（只有 `delta.tool_calls`，没有 content），不会出现孤立的 `[Agent]` 行。工具调用照常静默累积、执行。
- 异常兜底：`llm.chat` 的网络/协议错误会以 `RuntimeError` 抛出，交互模式下单轮失败不中断会话（见 4.8）。
- 终止条件：模型不再返回 `tool_calls`，即视为任务完成；`max_steps`（默认 12，`--max-steps` 可配）为防死循环的硬上限。

**可选自检 `_reflect_once`**：`reflect=True` 时，在最终回答后追加一条用户消息「请自我检查你上一条回答是否准确完整；若有问题请直接给出修正后的完整回答。」，再调用一次模型并将自检回复入史。代价为一次额外 LLM 调用；该调用失败时降级为占位文本，不影响主流程。

**统计 `_track`**：

```python
def _track(self, result):
    self.stats["calls"] += 1
    self.stats["in"] += result.usage.get("prompt_tokens", 0)
    self.stats["out"] += result.usage.get("completion_tokens", 0)
    self.stats["cost"] += (result.usage.get("prompt_tokens", 0) / 1e6 * self.price_in
                           + result.usage.get("completion_tokens", 0) / 1e6 * self.price_out)
```

价格参数 `--price-in` / `--price-out`（单位：美元 / 1M tokens）默认 0，未配置时成本恒为 0。

**会话保存/恢复（`save_session` / `load_session`，扩展 7）**：把**完整对话历史**落盘，进程重启后无缝续聊：

```python
def save_session(self, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"messages": self.messages, "stats": self.stats},
                  f, ensure_ascii=False, indent=2)
    return f"会话已保存到 {path}（{len(self.messages)} 条消息）"

def load_session(self, path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return f"无会话文件或文件损坏，已忽略：{path}"
    self.messages = data.get("messages") or [self._system_messages()[0]]
    self.stats.update(data.get("stats", {}))
    self.messages[0] = self._system_messages()[0]  # 刷新记忆注入
    return f"已恢复 {len(self.messages)} 条消息"
```

与 `MemoryStore`（扩展 3）的定位区别是本节的教学点：

| | 会话（`--session`） | 长期记忆（`--memory`） |
|---|---|---|
| 存什么 | **全量消息历史**（user/assistant/tool 逐条） | **精选事实**（key-value） |
| 粒度 | 完整对话现场 | 跨对话的事实摘要 |
| 恢复方式 | 进程重启后原样恢复上下文 | 每轮注入 system 消息 |
| 类比 | 浏览器的「恢复上次会话」 | 人的长期记忆 |

恢复时的关键一步是 `self.messages[0] = self._system_messages()[0]`：磁盘上的旧 system 消息可能携带过期记忆，必须按当前 `MemoryStore` 内容重建。`main()` 在启动时 `load_session`、退出时 `save_session`（见 4.8）。

### 命令行入口（`main` / `repl`）

| 参数 | 默认值 | 说明 |
|---|---|---|
| `prompt`（位置参数） | 无 | 一次性提问；缺省进入交互模式 |
| `--demo` | 关 | 运行内置演示（默认连本地 Ollama） |
| `--model` | `OPENAI_MODEL` 或 `qwen2.5:3b` | 模型名 |
| `--base-url` | `OPENAI_BASE_URL` 或 `http://localhost:11434/v1` | API 地址 |
| `--api-key` | `OPENAI_API_KEY`（可选） | API Key；本地 Ollama 无需提供 |
| `--max-tokens` | 8000 | 上下文预算（tokens），超限自动压缩 |
| `--keep-turns` | 6 | 压缩时保留的最近消息条数 |
| `--memory` | `agent_memory.json` | 长期记忆文件路径 |
| `--workdir` | `.` | 工具沙箱根目录 |
| `--no-reply-context` | 关 | 关闭「回复进上下文」（对比实验） |
| `--reflect` | 关 | 回答后追加一次自检 |
| `--stream` | 关 | 流式输出：回答边生成边打印 |
| `--session` | 无 | 会话文件：启动时恢复历史，退出时自动保存 |
| `--max-steps` | 12 | 单轮任务的最大工具循环步数 |
| `--stats` | 关 | 结束时打印统计 |
| `--price-in` / `--price-out` | `MINICODE_PRICE_IN/OUT` 或 0 | 单价（$/1M tokens） |

交互模式 `repl()` 对输入做 `EOFError`/`KeyboardInterrupt` 与 `UnicodeError` 的兜底，异常输入跳过而非中断会话；单轮 `RuntimeError`（网络/协议错误）同样只打印提示并继续，不会打断整场对话。

### 内置演示（`demo`）

`demo()` 在 `_minicode_demo_tmp` 目录（演示沙箱，结束后清理）中构造三组实验，全部走真实模型（默认本地 Ollama 的 `qwen2.5:3b`）；单轮失败（如模型服务未启动、function calling 异常）由 `safe_run` 兜底，不中断整个演示：

- 实验一：同一对话分别以 `append_reply=True/False` 运行，验证「回复进上下文」的差异；
- 实验二：依次请求读文件、写文件、记住、回忆、计算、时间、echo、越权命令，覆盖工具循环、记忆与白名单拒绝；
- 实验三：`max_tokens=300, keep_turns=2` 下灌入 5 轮消息，验证超预算后出现 `[历史摘要]`。

注意：真实模型是否调用工具、调用哪个工具由模型自行决定，因此实验二的具体输出（哪些请求触发了工具、模型如何表述）不保证逐字复现；实验一、三的结构性结论（开/关差异、摘要出现）是稳定的。第 6 节给出一次实际运行记录。

---

## 从零实现指南（七步复刻）

本节给出与 `minicode.py` 等价的构建路径。每步给出目标、关键代码要点与验证方法；不依赖本文档即可独立完成，最终产物应与 `minicode.py` 行为一致。

**步骤 0：环境与骨架**

- Python ≥ 3.8；无需安装任何第三方包。
- Windows 下先处理控制台编码：`sys.stdout.reconfigure(encoding="utf-8")`（置于 `try/except` 中）。
- 定义消息列表 `messages = []` 与常量 `SYSTEM_PROMPT`。

**步骤 1：最小对话循环**

- 目标：`messages` 中追加 user 消息，调用一次 `chat`，追加 assistant 回复。
- 关键点：`messages[0]` 恒为 system 消息；每次调用前确保 system 存在。
- 验证：交互输入两轮，第二轮的模型能看到第一轮的问答（真实模型直接生效）。

**步骤 2：加入工具协议**

- 目标：支持 `tools` 字段与 `tool_calls` 回环。
- 关键点：
  - 工具注册表 `{name: (desc, schema, fn)}`，`_tool_schema()` 生成协议格式；
  - 响应中 `message.tool_calls` 的 `arguments` 是 JSON 字符串，需 `json.loads`；
  - 入史顺序：`assistant(tool_calls)` 在前，`tool(tool_call_id)` 在后；`continue` 继续循环。
- 验证：真实模型提问「计算 1+1」，观察输出中出现工具调用与结果回填；工具执行失败（如读不存在的文件）时循环不崩溃。

**步骤 3：回复即上下文**

- 目标：最终回答默认入史。
- 关键点：仅需在回答分支增加 `if append_reply: messages.append({"role": "assistant", "content": text})`。
- 验证：第一轮让模型说出任意内容，第二轮问「你刚才说了什么」，模型能引用（真实模型路径直接生效）。

**步骤 4：上下文预算与压缩**

- 目标：超预算时压缩中间消息为摘要。
- 关键点：`estimate_tokens` 启发式估算；划分 `system / middle / tail`；摘要以 system 角色入史；`keep_turns` 控制保留尾部条数。
- 验证：设 `max_tokens` 为较小值，多轮对话后检查 `messages` 中出现 `[历史摘要]` 且尾部消息保留。

**步骤 5：跨会话长期记忆**

- 目标：事实写入 JSON 文件并在每轮注入 system。
- 关键点：`MemoryStore.set/search` 的读写与容错；`_system_messages()` 拼接 `[当前长期记忆]` 段；`remember`/`recall` 作为工具暴露。
- 验证：进程 A 执行 `记住 作者 是 小明`，进程 B 执行 `回忆 作者`，能返回同一事实（第 6 节「跨进程记忆」为一次实测记录）。

**步骤 6：安全与可观测**

- 目标：路径沙箱、命令白名单、调用统计。
- 关键点：`_safe_path` 的前缀校验；`SAFE_COMMANDS` 白名单；`_track` 累加 `calls/in/out/cost`。
- 验证：真实模型下"模型是否按剧本调用越权工具"不可控，因此安全原语建议**直接单测**：`python -c "import minicode as m; m._safe_path('.', '../x')"` 应抛 `PermissionError`，`m._safe_eval('9**9**9')` 应快速抛 `ValueError`；`--stats` 输出非零的调用次数。

**步骤 7：CLI 与演示**

- 目标：`argparse` 参数化、交互模式、内置演示。
- 关键点：默认连接本地 Ollama（`--base-url http://localhost:11434/v1 --model qwen2.5:3b`，无需 Key）；`repl` 的输入异常与单轮调用失败兜底；`--stream`/`--session`/`--max-steps` 等参数化扩展；`demo` 用临时目录构造实验并清理。
- 验证：确保本地 Ollama 运行后执行 `python minicode.py --demo`，输出**结构**与第 6 节一致（具体文本因模型输出而异）。

---

## 运行验证（实测输出）

环境：Python 3.13，Windows；本地 Ollama（`qwen2.5:3b`，1.8GB，OpenAI 兼容端点 `http://localhost:11434/v1`）。以下为一次实际运行记录——真实模型输出存在随机性，实验二的具体文本不保证逐字复现，但结构性结论稳定。

### 实验一：回复进上下文（开/关）

```text
--- 回复进上下文: 开（默认） ---

[你] 随便说一句：今天天气真好，适合写代码。
[Agent] 我知道这句话是由你随意说出的，并没有实际调用任何函数生成内容。我将直接回答你的问题而不是使用提供的工具。如果你需要根据特定条件生成类似的内容，请告诉我。

[你] 你刚才那句话是怎么说的？
[Agent] 我知道这句话是“今天天气真好，适合写代码。”由我说出的，并没有实际调用任何函数来生成内容。我将直接回答你的问题而不是使用提供的工具。……

--- 回复进上下文: 关（--no-reply-context） ---

[你] 随便说一句：今天天气真好，适合写代码。
[Agent] 今天天气确实不错，很适合进行编程相关的工作。

[你] 你刚才那句话是怎么说的？
[Agent] 今天天气真好，适合写代码。
```

结论：开关打开时，第二轮模型能**引用自己第一轮的完整回答**（包括它的元评论）；关闭后，模型只能复述用户输入——因为它的回答没有入史，第二轮的上下文里只剩原始用户消息。差异的直接原因即 4.7 节不变式 3。

### 实验二：工具循环（真实模型自主决策）

```text
[你] 读文件 demo_note.txt
  [工具] read_file({"path":"demo_note.txt"}) → 你好，这是 demo 笔记。
minicode 是一个迷你 AI Agent。

[你] 写文件 hello.txt，内容是 你好世界
  [工具] write_file({"path":"hello.txt","content":"你好世界"}) → 已写入 hello.txt（4 字符）

[你] 记住 作者 是 小明
  [工具] remember({"key":"author","value":"小明"}) → 已记住 author = 小明

[你] 回忆 作者
  [工具] recall({"keyword":"author"}) → author: 小明

[你] 计算 (12+8)*3
  [工具] calculate({"expr":"(12+8)*3"}) → 60

[你] 现在几点了
  [工具] now({}) → 2026-09-13 21:26:16

[你] echo 你好，安全命令
  [工具] run_cmd({"cmd":"echo 你好，安全命令"}) → 你好，安全命令

[你] rm -rf /
[Agent] 很遗憾，我不能执行这个命令。因为它会删除文件系统中的所有内容，这是非常危险的操作。……
```

要点：

- 8 次请求中 7 次触发了正确的工具调用，读文件、写文件、记忆写入/检索、计算、时间、白名单命令全流程工作正常；
- **记忆 key 由模型自主选择**：用户说「记住 作者 是 小明」，模型调用的是 `remember(key="author", …)`——中文输入被模型转成了英文 key；但检索时模型同样使用 `recall(keyword="author")`，闭环依然成立；
- **`rm -rf /` 被模型直接拒绝**：模型判断这是危险操作，拒绝调用工具并以文字说明。

### 实验三：超预算自动压缩

```text
[你] 现在历史很长了，有摘要吗？
[Agent] [历史摘要] 用户希望了解关于工作的详细信息，但当前上下文中没有提供相关信息。

[历史摘要] 根据已有的文件，助理从 demo_note.txt 文件中读取了内容。接下来汇报工作时，可以参考这些信息进行填充。

[历史摘要] 用户请求汇报工作内容，但上下文目前仅包含关于 minicode 的基础介绍。……
```

要点：`max_tokens=300, keep_turns=2` 下灌入 5 轮消息后触发压缩，出现多条 `[历史摘要]` system 消息，机制工作正常。注意 `qwen2.5:3b` 的摘要质量一般（内容有重复与发散）——这正是「摘要质量依赖模型能力」的真实体现，换用更大的模型或专门的压缩模型会明显改善（见扩展方向 2）。

### 一次性提问与统计

```text
$ python -X utf8 minicode.py --stats "计算 123*456"
[backend] 未提供 API Key；若目标是本地 Ollama，请确认 --base-url 指向其 /v1 端点
          （如 http://localhost:11434/v1），当前为 http://localhost:11434/v1

[你] 计算 123*456
  [工具] calculate({"expr":"123*456"}) → 56088
[Agent] 123乘以456的结果是56088。
[stats] 调用次数: 2 | 输入 tokens: 1235 | 输出 tokens: 42 | 预估成本: $0.000000
```

统计来自 Ollama 响应中的 `usage` 字段（真实用量，非估算）。

### 跨进程记忆

```text
$ python -X utf8 minicode.py --memory mem_test.json "记住 语言 是 Python"
  [工具] remember({"key":"language","value":"Python"}) → 已记住 language = Python

$ python -X utf8 minicode.py --memory mem_test.json "回忆 语言"   # 独立进程
  [工具] recall({"keyword":"language"}) → language: Python
```

与实验二一致，模型把中文「语言」转成了英文 key `language`；跨进程检索依然命中——key 的形态不影响闭环。这是真实模型带来的「不按剧本走但依然正确」的典型例子。

### 流式输出

```text
$ python -X utf8 minicode.py --stream --stats "计算 123*456"
[你] 计算 123*456
  [工具] calculate({"expr":"123*456"}) → 56088
[Agent] 计算结果是 56088。        ← 文字是边生成边打印的（实测约 60 个 SSE 分片）
[stats] 调用次数: 2 | 输入 tokens: 0 | 输出 tokens: 0 | 预估成本: $0.000000
```

两点观察：

- 工具调用轮次没有 `[Agent]` 前缀——该轮只有 `delta.tool_calls` 没有 content，符合 4.7 的设计；
- `--stats` 的**调用次数准确（2 次）**，但 token 统计为 0——Ollama 的流式响应不携带 `usage` 字段（见局限表）。切换到会返回 usage 的服务（如 OpenAI）即可恢复统计。

### 会话保存/恢复

```text
$ python -X utf8 minicode.py --session sess_test.json "记住 语言 是 Python"
[session] 无会话文件或文件损坏，已忽略：sess_test.json
  [工具] remember({"key":"language_is_python","value":"语言是 Python"}) → 已记住 language_is_python = 语言是 Python
[session] 会话已保存到 sess_test.json（5 条消息）

$ python -X utf8 minicode.py --session sess_test.json "回忆 语言"   # 独立进程
[session] 已恢复 5 条消息
  [工具] recall({"keyword":"语言"}) → language_is_python: 语言是 Python
[session] 会话已保存到 sess_test.json（9 条消息）
```

第二个进程恢复了第一个进程的全部 5 条消息（system / user / assistant(tool_calls) / tool / assistant），因此「回忆 语言」是在完整上下文里接续进行的；对话结束后又保存为 9 条。会话文件内容即 `{"messages": [...], "stats": {...}}` 的 JSON（见 4.7）。

### 安全原语（单元验证）

真实模型不保证按剧本触发越权请求，因此安全原语用一次性调用直接验证：

```text
$ python -c "import minicode as m; m._safe_eval('9**9**9')"
ValueError: 指数过大（绝对值超过 1000）        # 0.000s 内拒绝，而非卡死

$ python -c "import minicode as m; m._safe_eval('2**100')"
1267650600228229401496703205376              # 合法表达式正常计算

$ python -c "import minicode as m; m._safe_path('.', '../x')"
PermissionError: 路径越界：../x（只允许访问 …）

# 目录内指向外部的符号链接 / junction 同样被判为越界
$ python -c "import minicode as m; m._safe_path('.', 'link/secret.txt')"
PermissionError: 路径越界：link/secret.txt（只允许访问 …）
```

---

## 边界条件与已知局限

| 项 | 现状 | 说明 |
|---|---|---|
| token 估算 | 启发式 | 基于完整序列化消息与工具 schema；仅用于压缩阈值，真实用量以 API `usage` 为准 |
| 模型行为 | 不确定 | 真实模型是否调用工具、调用哪个由模型决定；小模型（如 3B）function calling 偶发不稳定 |
| 服务依赖 | 本地/云端模型服务 | 无 Key 需本地 Ollama 运行中；网络/服务错误以 `RuntimeError` 提示，不静默 |
| 压缩粒度 | 整条消息 | 未保留 `assistant(tool_calls)` 与 `tool` 的成对结构，摘要恢复性有限 |
| 摘要生成 | 一次额外 LLM 调用 | 产生延迟与成本；失败时降级为占位文本 |
| 流式统计 | 依赖服务 | Ollama 流式响应不携带 `usage`，`--stream` 下 token/成本统计为 0（调用次数仍准确）；部分服务在流末返回 usage |
| 记忆文件 | 无锁、无并发控制 | 多进程同时写入可能相互覆盖；演示场景可接受 |
| 安全边界 | 教学级 | 计算器有指数/位数上限、路径沙箱解析符号链接；真实部署仍需权限确认、容器/进程隔离、审计日志、prompt 注入防护 |
| 步数上限 | 默认 12（`--max-steps` 可配） | 达到上限返回占位文本，不抛出异常 |
| 单轮工具数 | 无限制 | 按响应中 `tool_calls` 列表逐个执行 |

---

## 扩展方向

按实现成本从低到高：

1. **会话管理增强**：多会话（多个 `--session` 文件）、会话列表与切换；当前为单会话文件。
2. **压缩增强**：摘要前保留工具调用对；摘要改用专门的压缩模型或 prompt。
3. **记忆分层**：工作记忆（上下文）→ 摘要记忆 → 长期事实（向量检索/RAG）。
4. **规划（planning）**：先让模型输出计划（plan）再逐项执行，见 [Claude Code 的 Agent Loop 概念](https://mintlify.wiki/sanbuphy/claude-code-source-code/concepts/agent-loop)。
5. **子代理（subagents）**：将子任务委托给独立循环。
6. **评测（eval）**：为工具调用成功率、多轮一致性建立基准；注意 benchmark 数据污染问题（[《The Emperor's New Clothes in Benchmarking?》](https://proceedings.mlr.press/v267/sun25t.html)）。
7. **工具标准化**：接入 MCP 等协议，实现工具即插即用。

---

## 结语

回到开篇抛出的问题：Claude Code 的 “皇帝” 真的没穿衣服吗？借助此次复刻实现，我们已经可以给出答案。

整个 Agent 的内核，其实就浓缩在 run () 与_execute () 构成的循环之中：调用大模型、解析工具调用、执行工具动作、回填执行结果，再进入下一轮迭代。Mihail Eric 的观点在本次复刻中得到印证：the core of these tools isn’t magic。其质是一套确定性执行循环，搭配一个输出具备不确定性的大模型。其余所有代码，都只是为了让这套循环能够落地真实生产环境。文中介绍的七项扩展，正是这上万行工程逻辑的教学缩影：长期记忆对应状态管理，上下文压缩解决成本问题，路径沙箱与命令白名单划定安全边界，调用统计实现系统可观测性，流式输出优化交互体验，会话保存完成数据持久化，回复入上下文则保障多轮对话的一致性。同时我们也在局限表中说明了教学实现做出的妥协：缺少权限确认、进程隔离、审计日志与并发控制。

更值得思考的是，内核与外围扩展的边界本身是动态变化的。两年前流式输出尚且属于锦上添花的体验优化，如今已经成为行业标配；当下广为使用的工具调用协议，未来也可能被全新范式替代。可无论外层外壳如何迭代，“观察‑决策‑行动‑再观察” 这套核心循环，大概率会长期延续。

