---
title: Python数据分析完全入门指南
date: 2026-08-16 23:00:00
updated: 2026-08-16 23:00:00
categories:
  - 穷理
tags:
  - Python
  - 机器学习
  - 数据分析
description: 以 Wes McKinney 《利用 Python 进行数据分析》为蓝本，结合 Python 数据科学生态近年来的发展重新编排与扩充
cover: /img/blog6.webp
---

> 因全文篇幅较长，建议读者视情况分章节阅读学习。

**版本基准**：文中所有示例基于 Python 3.11+、pandas 3.0+、NumPy 2.0+ 等现代版本，并以"注意"形式标注了原书旧写法与现行写法之间的差异（如 df.map 取代 applymap、频率代码 ME 取代 M、pd.Grouper 取代 pd.TimeGrouper、patsy 公式接口变更等）。pandas 3.0 起默认启用的写时复制（Copy-on-Write）与 Arrow 字符串存储等新特性也在对应章节予以说明。

---

## 数据分析与 Python 生态

**本章目标**：建立对数据分析的整体认知；理解 Python 生态中各库的分工与选择逻辑；搭建可用的现代开发环境。

### 数据分析在解决什么问题

开始编写代码之前，需要明确一个基本问题：数据分析的目标是什么。

数据分析的输入是数据，输出是结论或决策依据。其过程可概括为一条流水线：

获取数据 → 清洗数据 → 规整数据 → 探索分析 → 建模预测 → 呈现结论

其中，清洗与规整通常占总时间的 80%。现实世界的数据往往存在缺失、重复、格式不统一、分散于多个文件等问题，因此数据分析的主要工作量不在于计算，而在于使数据达到可供分析的状态。这也是本文以 pandas（数据处理工具）为重点的原因。

#### 结构化数据：数据分析的对象

本文所称"数据"主要指结构化数据（structured data），即能够组织为规整格式的数据，例如：

- **表格型数据**：各列可为不同类型（字符串、数值、日期等），如关系型数据库中的表、CSV/TSV 文本文件；
- **多维数组（矩阵）**：如图像像素矩阵、特征矩阵；
- **通过关键列相互关联的多个表**：通过主键（primary key）与外键（foreign key）连接，是 SQL 数据库的核心形态；
- **时间序列**：间隔均匀或不均匀、按时间顺序排列的观测值。

绝大多数数据集均可转化为结构化形式；无法直接转化的数据（如新闻文章）也可通过提取特征（如词频表）实现结构化。Excel 是普及度最高的手动数据分析工具，pandas 则是其可编程、可扩展、可处理更大数据量的对应形态。本文介绍以代码替代手工操作的方法。

### 选择 Python 的原因

自 1991 年诞生以来，Python 已成为最流行的动态编程语言之一。其在数据分析领域的应用优势来自三个层面。

**第一，语言设计兼顾可读性与开发效率。** Python 常被称为"可执行的伪代码"：以缩进组织代码块、语法简洁、接近自然语言。这使得分析思路的表达成本较低，无需关注类型声明与内存管理等细节，可将注意力集中于数据处理本身。

**第二，Python 是有效的"胶水语言"。** 多数现代计算环境的核心算法（线性代数、优化、快速傅里叶变换）以 C/C++/Fortran 实现。Python 可调用这些底层库，将占用大量执行时间的核心代码与不常执行的胶水代码组合起来。分析代码的性能瓶颈通常位于底层数值计算，而这些计算已由 C 语言高度优化。

**第三，生态系统的正反馈效应。** 数据科学社区为 Python 贡献了 NumPy、pandas、scikit-learn 等高质量库，库的成熟又吸引更多开发者加入，形成良性循环。

#### 解决"两种语言"问题

许多组织长期面临以下情况：研究阶段使用 SAS、R 等专用语言进行原型开发，生产阶段再用 Java、C++ 重新实现。Python 同时适用于研究与生产，可在原型到上线的全流程使用同一语言，减少重复劳动与沟通成本。

#### Python 的局限性

- **解释型语言的性能限制**：多数场景下开发效率比执行效率更重要，Python 的性能可以接受；但在毫秒级延迟敏感的系统（如高频交易）中，C++ 仍不可替代；
- **GIL（全局解释器锁）**：Python 解释器同一时刻只能执行一条字节码指令，计算密集型的多线程并行因此受限。多进程以及不频繁与 Python 对象交互的 C 扩展（如 NumPy 底层）仍可并行执行。

### 生态全景：各库的分工

了解各库的定位与适用场景，是选择工具的前提。本文涉及的核心库如下：

| 库 | 核心定位 | 使用场景 |
|---|---|---|
| **IPython/Jupyter** | 交互式计算环境 | 探索式开发、Notebook 文档化 |
| **pandas** | 表格型数据（Series/DataFrame）处理 | 数据加载、清洗、规整、聚合、时间序列 |
| **statsmodels** | 经典统计与计量经济学 | 回归、ANOVA、时间序列模型、统计推断 |
| **scikit-learn** | 通用机器学习 | 分类、回归、聚类、降维、预测 |
| **NumPy** | N 维数组计算基础 | 数值计算、数组操作、各库之间的数据容器 |
| **SciPy** | 科学计算工具箱 | 积分、优化、信号处理、统计分布 |
| **matplotlib** | 底层 2D 绘图库 | 精细控制图表、出版级图形 |
| **seaborn** | 高层统计可视化库（基于 matplotlib） | 探索性绘图、统计图表 |

> statsmodels 与 scikit-learn 的分工：statsmodels 关注统计推断（给出 p 值、置信区间），scikit-learn 关注预测效果。两者可搭配使用。

#### 现代生态补充

- **Polars**：以 Rust 实现的 DataFrame 库，API 与 pandas 相似，在多核 CPU 上的性能优于 pandas，适合超大数据集与流式处理；
- **PyArrow**：Apache Arrow 的 Python 接口，提供高效的列式内存格式，也是 pandas 的底层加速引擎之一（如 `pd.read_csv(..., engine='pyarrow')`）；
- **DuckDB**：嵌入式分析型 SQL 数据库，可直接对 pandas DataFrame 执行 SQL 查询，适合大规模聚合；
- **JupyterLab**：Jupyter Notebook 的现代继任者，支持多标签页、内置文件浏览器与终端。

学习主线仍以 pandas 为核心，了解上述新工具可在特定场景下提供更多方案。

### 环境搭建

#### 发行版与虚拟环境

Python 科学计算的依赖较多且对版本敏感（pandas 依赖 NumPy，NumPy 依赖底层 BLAS 库）。发行版（如 Anaconda）将常用包预先编译打包，可避免依赖安装失败的问题；虚拟环境则为不同项目隔离依赖版本，避免项目之间相互影响。

#### 安装方案选择

| 方案 | 适用人群 | 说明 |
|---|---|---|
| **Anaconda** | 初学者、一站式需求 | 预装 250+ 科学计算包，安装后即可使用 |
| **Miniconda** | 进阶用户 | 仅包含 conda 与 Python，按需安装 |
| **mamba / micromamba** | 需要更快的包解析 | mamba 为 C++ 重实现、micromamba 为 Rust 编写的独立二进制，均比 conda 快 |
| **uv** | 追求简洁的工具链 | Rust 实现的包管理器，兼容 pip/venv 工作流 |

安装完成后，验证环境：

```bash
python --version        # 应输出 3.11 或更高
python -c "import pandas, numpy, matplotlib; print(pandas.__version__)"
```

> 安装额外包时，优先使用 conda/mamba 通道（`mamba install package_name`），通道中不存在的包再使用 pip（`pip install package_name`）。注意：不要使用 pip 升级 conda 已管理的包，以免破坏依赖一致性；使用 uv 时则完全走 pip 兼容工作流（`uv pip install ...`）。

#### 代码约定

Python 社区对常用库形成了统一的导入惯例，本文所有示例均基于此：

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
import statsmodels.formula.api as smf
```

看到 `np.arange` 时应理解其引用的是 NumPy 的 `arange` 函数。应避免 `from numpy import *` 式导入，此类导入会污染命名空间，且 NumPy 部分函数名与 Python 内置函数（如 `min`、`max`）重名。

涉及随机数的示例统一使用 `np.random.default_rng()` 生成器（见"伪随机数生成"一节），不再使用遗留的全局接口（`np.random.randn`、`np.random.seed`）。

#### 开发工具

- **JupyterLab**：数据分析的标准交互环境；
- **VS Code**：现代编辑器，对 Python 与 Jupyter 支持完善，适合编写正式脚本；
- **Spyder**：Anaconda 自带、MATLAB 风格的 IDE。

---

## 交互式开发环境：IPython 与 Jupyter


**本章目标**：理解交互式计算的工作方式；掌握 IPython 的核心功能；熟悉 Jupyter 的工作流。

### 交互式环境的必要性

传统软件开发遵循"编辑 → 编译 → 运行"的流程，需要完成整个程序后才能查看结果。数据分析则具有探索性，需要逐行执行、查看结果、再决定下一步。例如，加载数据后无法预知其形态，须先通过 `head()` 查看，才能确定后续清洗步骤。

IPython（强化版 Python 解释器）与 Jupyter（网页版交互笔记本）即为"执行–探索"工作流设计。其作用并非提供计算能力，而是提升与 Python 交互的效率。Jupyter Notebook 的核心理念是文档化探索：代码、输出、图表与说明文字可混排于一个 `.ipynb` 文件中，既可作为分析过程记录，也可作为可复现的报告。

### IPython 基础

#### 启动与基本交互

```bash
ipython
In [1]: a = 5
In [2]: a
Out[2]: 5
```

提示符 `In [1]:` 与标准解释器的 `>>>` 不同，原因是 IPython 会记录每次输入。仅输入变量名即可显示其值，且 IPython 以更易读的方式（pretty-print）呈现复杂对象。

运行脚本使用 `%run`，脚本内定义的变量在运行后仍可在会话中访问：

```
In [3]: %run hello_world.py
Hello world
```

#### Tab 补全

输入部分名称后按 Tab，IPython 会搜索命名空间中的所有候选（变量、函数、对象方法、模块成员、文件路径与函数关键字参数）。Tab 补全既是效率工具，也是探索工具：不确定对象具有哪些方法时，可通过"对象名."加 Tab 查看全部可用方法。

```
In [1]: an_apple = 27
In [2]: an_example = 42
In [3]: an<Tab>
an_apple    and         an_example  any
```

#### 自省：`?` 与 `??`

在对象前后添加 `?` 可查看其类型、文档字符串、签名等信息；添加 `??` 可查看函数源码。该功能使查阅文档无需离开终端：

```
In [4]: print?
Docstring:
print(value, ..., sep=' ', end='\n', file=sys.stdout, flush=False)
```

`np.*load*?` 可搜索命名空间中所有包含 `load` 的名称。

#### 从剪贴板执行代码：`%paste` / `%cpaste`

在 IPython 中直接粘贴多行缩进代码可能因缩进层级判断错误而出错。`%paste` 直接运行剪贴板内容；`%cpaste` 进入粘贴模式，以单独一行 `--` 结束，执行前可先检查。

### 魔术命令

魔术命令（magic command）是 IPython 特有的命令，用于完成 Python 语法无法实现的系统级操作，通常以 `%` 或 `%%` 为前缀。% 前缀表示行级魔术命令，只作用于当前行；%% 前缀表示单元级魔术命令，作用于整个代码单元。常用命令如下：

| 命令 | 作用 |
|---|---|
| `%run script.py` | 运行脚本，变量保留在会话中 |
| `%timeit 语句` | 多次执行以获取稳定耗时 |
| `%debug` | 异常发生后进入交互式调试器 |
| `%pdb` | 任何异常自动进入调试器 |
| `%paste` / `%cpaste` | 从剪贴板执行代码 |
| `%matplotlib inline` | 使图表内嵌于 Notebook 中 |
| `%quickref` / `%magic` | 查看所有魔术命令 |
| `%hist` | 查看输入历史 |
| `%reset` | 清空命名空间 |
| `%pip install 包名` | 在 Notebook 中安装包（Jupyter 专用） |

魔术命令的返回值可赋给变量（`foo = %pwd`）；默认可省略 `%`（自动魔术）。判断两段代码的性能差异应以 `%timeit` 的测量结果为准，而非主观估计。

### Jupyter Notebook / JupyterLab 工作流

#### 启动与基本操作

```bash
$ jupyter lab        # 现代版本（原书中的 jupyter notebook 命令仍可用）
```

浏览器打开后，通过 New → Python 3 内核新建笔记本。代码单元格中输入代码后按 Shift-Enter 执行，输出（含图表）直接显示在单元格下方。单元格有两种模式：代码模式（编写 Python）与 Markdown 模式（编写文档，支持标题、列表、公式）。两者交替使用即可形成"可执行的报告"。

> 内核（kernel）的概念：Jupyter 支持多种语言，通过"内核"协议连接。Python 的内核即 IPython，因此 Notebook 中可使用 IPython 的增强语法（魔术命令等）。

#### 使用建议

- JupyterLab 是推荐的现代界面：支持多标签、拖拽布局、内置文件树与终端；
- 浏览器中 `%matplotlib inline` 使图表内嵌；如需交互式图表（缩放、平移），安装 `ipympl` 后改用 `%matplotlib widget`；
- 建议采用"Notebook 探索 + `.py` 脚本沉淀"的工作流：Notebook 适合试错，正式的可复用代码应提炼为脚本或模块（见附录）。

#### 常用快捷键

| 快捷键 | 作用 |
|---|---|
| Shift-Enter | 执行当前单元格并进入下一个 |
| Esc → m / y | 切换 Markdown / 代码模式 |
| Esc → a / b | 在上方/下方插入单元格 |
| Esc → dd | 删除单元格 |
| Esc → 0,0 | 重启内核 |
| Ctrl-S | 保存（运行结果存入 `.ipynb`） |

### IPython 键盘快捷键（shell 模式）

IPython shell 支持 Emacs 风格导航：`Ctrl-P`/`Ctrl-N`（上下翻历史）、`Ctrl-R`（反向增量搜索历史）、`Ctrl-A`（行首）、`Ctrl-E`（行尾）、`Ctrl-K`（删除至行尾）、`Ctrl-C`（中断运行中的代码）。这些快捷键在交互式探索中会频繁使用。

---

## Python 语言基础

**本章目标**：掌握 Python 的核心语言机制（对象模型、引用语义、控制流）；能够根据需求在四种内建数据结构中做出选择；能够编写函数、处理异常、读写文件。

> 本文定位为数据分析，但语言基础决定后续学习效率。已有编程经验的读者可快速浏览本节。

### 语言核心机制

#### 以缩进组织代码

Python 以空白字符（缩进）表示代码块的归属，冒号标志着缩进块的开始：

```python
for x in array:
    if x < pivot:
        less.append(x)
    else:
        greater.append(x)
```

与 C/Java 的 `{}` 相比，缩进强制统一了代码风格，可读性较好。两条规则：同一代码块内的缩进量必须一致；语句无需分号结尾（分号可切分同一行的多条语句，但会降低可读性，不建议使用）。

> 建议统一使用四个空格缩进，并让编辑器将 Tab 自动转换为空格。

#### 万物皆对象

在 Python 中，数字、字符串、数据结构、函数、类、模块均为对象。每个对象都有类型（type）与内部数据。该设计的一个重要影响是：函数本身也是对象，可作为数据传递、存入列表、作为参数，这是后续 groupby 等高级用法的实现基础。

#### 变量是引用

变量名是对对象的绑定（bind），赋值不会复制数据：

```python
a = [1, 2, 3]
b = a            # b 与 a 指向同一个列表对象
a.append(4)
b                # [1, 2, 3, 4] —— b 随之改变
```

理解数据何时被复制、何时仅共享引用，是避免隐蔽缺陷的关键。判断两个名称是否指向同一对象使用 `is`，判断值是否相等使用 `==`：

```python
a = [1, 2, 3]
b = a
c = list(a)      # list() 显式创建新列表（复制）
a is b           # True —— 同一对象
a is c           # False
a == c           # True —— 值相等
```

#### 动态引用与强类型

Python 变量本身无类型，类型信息保存在对象中（动态类型）；但对象类型明确，不会隐式转换（强类型）：

```python
a = 5; type(a)    # int
a = 'foo'; type(a)  # str
'5' + 5           # TypeError: 字符串不会自动转换为整数
```

#### 鸭子类型

鸭子类型的原则是：只要对象具备所需的方法或协议即可使用，无需关注其具体类型。该原则的名称来源于"如果它走起来像鸭子、叫起来像鸭子，那么它就是鸭子"的说法。

```python
def isiterable(obj):
    try:
        iter(obj)          # 试探对象是否支持迭代协议
        return True
    except TypeError:
        return False

isiterable('abc')    # True
isiterable(5)        # False
```

该机制使函数可同时接受列表、元组、NumPy 数组、pandas Series 等多种输入。

### 标量类型

标量（scalar）是单值类型，是构建数据结构的基础。Python 的主要标量：

| 类型 | 说明 | 示例 |
|---|---|---|
| `int` | 任意精度整数 | `17239871 ** 6` |
| `float` | 双精度（64 位）浮点数 | `7.243`、`6.78e-5` |
| `str` | Unicode 字符串（不可变） | `'python'`、`"another"` |
| `bool` | `True` / `False`（`int` 的子类） | `True and False` |
| `None` | 空值，唯一的 `NoneType` 实例 | `a is None` |
| `datetime` | 日期时间（标准库 `datetime` 模块） | `datetime(2011, 10, 29, 20, 30)` |

#### 数值类型

```python
ival = 17239871
ival ** 6                    # 大整数运算无溢出
fval = 7.243
3 / 2                        # 1.5（除法返回浮点数）
3 // 2                       # 1（底除，丢弃小数部分）
```

#### 字符串

字符串是不可变对象，所有"修改"操作均返回新字符串，原字符串不变：

```python
a = 'this is a string'
b = a.replace('string', 'longer string')   # b 为新字符串
a                                          # 原字符串不变

# 切片（字符串是字符序列）
s = 'python'
s[:3]        # 'pyt'
list(s)      # ['p', 'y', 't', 'h', 'o', 'n']

# 原始字符串 r''：反斜杠不转义
s = r'this\has\no\special\characters'

# 连接
'::'.join(['a', 'b', 'c'])    # 'a::b::c'（join 效率高于 +）
```

f-string 是当前字符串格式化的主要方式（原书使用 `.format()`）：

```python
name, amount = '阿根廷比索', 4.5560
f'{amount:.2f} {name} 价值 1 美元'            # '4.56 阿根廷比索 价值 1 美元'
f'{"pi":>{10}}'                                # 对齐控制
f'{1000000:,}'                                 # 千分位: '1,000,000'
```

字节与 Unicode：Python 3 中字符串是 Unicode 类型。编码（encode）将字符串转换为字节，解码（decode）将字节还原为字符串：

```python
val = "español"
val.encode('utf-8')                  # b'espa\xc3\xb1ol'
val.encode('utf-8').decode('utf-8')  # 'español'
```

> 现实中的数据文件常为字节流，不应假定编码。读写文件时明确指定 `encoding='utf-8'`（或实际使用的编码），可避免 `UnicodeDecodeError`。

#### 日期时间：datetime 模块

`datetime` 是标准库中处理日期时间的基础类型，pandas 的时间序列功能（见"时间序列分析"一章）构建于其上：

```python
from datetime import datetime, date, time, timedelta
dt = datetime(2011, 10, 29, 20, 30, 21)
dt.day; dt.minute                       # 访问字段
dt.strftime('%m/%d/%Y %H:%M')           # datetime -> 字符串
datetime.strptime('20091031', '%Y%m%d') # 字符串 -> datetime
dt.replace(minute=0, second=0)          # 替换字段（产生新对象）
dt2 - dt                                # 两个 datetime 之差 -> timedelta
dt + timedelta(12)                      # timedelta 运算
```

常用格式码：`%Y` 四位年份、`%m` 月份、`%d` 日、`%H` 时（24 小时制）、`%M` 分、`%S` 秒。

### 控制流

```python
# if / elif / else：条件分支（elif 可有多个）
if x < 0:
    print("It's negative")
elif x == 0:
    print('Equal to zero')
else:
    print('Positive')

# for：遍历可迭代对象；continue 跳过本轮，break 跳出循环
sequence = [1, 2, None, 4, None, 5]
total = 0
for value in sequence:
    if value is None:
        continue
    total += value

# while：条件循环
x, total = 256, 0
while x > 0:
    if total > 500:
        break
    total += x
    x = x // 2

# range：生成整数序列（不含终点），内存占用极小
list(range(0, 20, 2))     # [0, 2, 4, ..., 18]
for i in range(len(sequence)):  # 按序号迭代
    ...

# 三元表达式：单行 if-else
value = 'Non-negative' if x >= 0 else 'Negative'
```

> `range` 是惰性对象，无论范围多大均不占用内存，这是它与 `list(range(...))` 的本质区别。

### 数据结构：选型原则

Python 内建四种核心数据结构，其适用场景不同：

| 结构 | 是否可变 | 是否有序 | 是否允许重复 | 典型用途 |
|---|---|---|---|---|
| `tuple` 元组 | 否 | 是 | 是 | 固定结构、函数多返回值、字典键 |
| `list` 列表 | 是 | 是 | 是 | 通用序列，日常使用频率最高 |
| `dict` 字典 | 是 | 插入有序（3.7+） | 键唯一 | 键值映射、计数、查表 |
| `set` 集合 | 是 | 否 | 否 | 去重、集合运算、成员测试 |

选型原则：需要修改则用列表；不需要修改则用元组；需要按键取值则用字典；需要去重或集合运算则用集合。

#### 元组（tuple）

元组是固定长度、不可变的序列。其两个价值：数据完整性（防止意外修改）与可哈希性（可作为字典键、集合元素）：

```python
tup = 4, 5, 6                     # 逗号即构成元组
nested = (4, 5, 6), (7, 8)        # 嵌套
tuple(['foo', [1, 2], True])      # 任意序列转元组
tup[0]                            # 索引从 0 开始

# 元组拆包（unpacking）
a, b, c = (4, 5, 6)
a, b, *rest = 1, 2, 3, 4, 5       # rest = [3, 4, 5]（* 抓取剩余元素）
a, b, *_ = values                 # 使用 _ 表示丢弃
b, a = a, b                       # 变量交换可通过拆包一行完成

# 函数返回多个值（本质是返回元组后自动拆包）
def f():
    return 5, 6, 7
a, b, c = f()
```

#### 列表（list）

列表是使用频率最高的可变序列，支持增删改查与排序：

```python
a_list = [2, 3, 7, None]
a_list.append('dwarf')            # 末尾追加（O(1)）
a_list.insert(1, 'red')           # 指定位置插入（O(n)，应慎用）
a_list.pop(2)                     # 移除并返回指定位置元素
a_list.remove('dwarf')           # 移除第一个匹配值
'foo' in a_list                   # 成员测试（线性搜索，较慢）

# 串联：+ 会新建并复制；extend 原地扩展（大列表效率更高）
x = [4, None, 'foo']
x.extend([7, 8, (2, 3)])

# 排序：sort 原地排序；sorted 返回新列表
a = [7, 2, 5, 1, 3]; a.sort()
b = ['saw', 'small', 'He', 'foxes', 'six']
b.sort(key=len)                   # 按长度排序
```

#### 切片（slicing）

切片适用于所有序列（字符串、列表、元组、NumPy 数组、pandas Series）：

```python
seq = [7, 2, 3, 7, 5, 6, 0, 1]
seq[1:5]        # [2, 3, 7, 5]  —— 含头不含尾
seq[:5]         # 从头开始
seq[3:]         # 直到结尾
seq[-4:]        # 负数：从后往前
seq[::2]        # 步长为 2，隔一个取一个
seq[::-1]       # 反转
```

> 切片的"含头不含尾"计数方式与 `range` 一致，其设计目的是使 `seq[:i] + seq[i:]` 恒等于 `seq`，且切片长度恰好为 `stop - start`。

#### 序列工具函数

```python
# enumerate：同时获取序号和值（替代手写计数器）
for i, value in enumerate(collection):
    ...

# sorted：返回新的排序列表（参数与 sort 一致）
sorted([7, 1, 2, 6, 0, 3, 2])

# zip：将多个序列配对；zip(*x) 反向解压
list(zip(['foo', 'bar'], ['one', 'two']))
# [('foo', 'one'), ('bar', 'two')]
first_names, last_names = zip(*pitchers)   # 行的列表 -> 列的列表

# reversed：反向迭代（惰性生成器）
list(reversed(range(10)))
```

#### 字典（dict）

字典（哈希映射 / 关联数组）将键映射到值，查询复杂度为 O(1)（基于哈希表），快于列表的线性搜索：

```python
d1 = {'a': 'some value', 'b': [1, 2, 3, 4]}
d1[7] = 'an integer'              # 插入/更新
'b' in d1                         # True（哈希查找，较快）
del d1['b']                       # 删除键
ret = d1.pop('dummy')             # 删除并返回
list(d1.keys()); list(d1.values())
d1.update({'b': 'foo', 'c': 12})  # 合并另一个字典

# 取值时提供默认值：get / setdefault
value = some_dict.get(key, default_value)   # 键不存在时返回默认值
by_letter.setdefault(letter, []).append(word)

# collections.defaultdict：键不存在时自动创建默认值
from collections import defaultdict
by_letter = defaultdict(list)
by_letter[word[0]].append(word)

# 由两个序列创建字典
mapping = dict(zip(range(5), reversed(range(5))))
```

> 字典的键必须可哈希：整数、浮点数、字符串、元组（内容不可变）。列表不可哈希，但 `tuple([1, 2, 3])` 可以。

#### 集合（set）

集合适用于去重、交集、并集、差集等集合运算及成员检查：

```python
a = {1, 2, 3, 4, 5}
b = {3, 4, 5, 6, 7, 8}
a.union(b)             # 并集（a | b）
a.intersection(b)      # 交集（a & b）
a.difference(b)        # 差集（a - b）
a.symmetric_difference(b)  # 对称差（a ^ b）
{1, 2, 3}.issubset(a)  # 子集判断
```

### 推导式（Comprehension）

推导式以一行表达式完成"遍历 + 过滤 + 变换 + 收集"，是 Python 使用频率最高的语法特性之一。其语法为 `[表达式 for 变量 in 可迭代对象 if 条件]`：

```python
strings = ['a', 'as', 'bat', 'car', 'dove', 'python']

# 列表推导式：过滤长度大于 2 的并转大写
[x.upper() for x in strings if len(x) > 2]
# ['BAT', 'CAR', 'DOVE', 'PYTHON']

# 集合推导式：自动去重
{len(x) for x in strings}          # {1, 2, 3, 4, 6}

# 字典推导式
loc_mapping = {val: index for index, val in enumerate(strings)}

# 嵌套推导式：for 的书写顺序与嵌套 for 循环一致（先外后内）
flattened = [x for tup in some_tuples for x in tup]   # 扁平化
result = [name for names in all_data for name in names if name.count('e') >= 2]
```

> 以推导式替代显式 for 循环，代码更短且通常更快（底层有优化）。嵌套超过两层时应考虑可读性。

### 函数

函数是 Python 组织与复用代码的主要手段。同一段逻辑需要重复使用时，应将其封装为函数。

#### 参数：位置参数与关键字参数

```python
def my_function(x, y, z=1.5):     # x、y 为位置参数；z 为带默认值的关键字参数
    if z > 1:
        return z * (x + y)
    else:
        return z / (x + y)

my_function(5, 6, z=0.7)   # 位置与关键字参数混合
my_function(10, 20)        # 使用默认值
```

规则：关键字参数必须位于位置参数之后；调用时可用关键字传递任意参数（`my_function(x=5, y=6, z=7)` 可读性较好）；无显式 return 时函数返回 `None`。

#### 命名空间与作用域

函数内赋值的变量属于局部命名空间，函数执行完毕即销毁；修改全局变量需 `global` 声明。不建议频繁使用 `global`，此类需求通常应以面向对象方式解决。

#### 函数是一等对象

函数可存入列表、作为参数传递，便于对数据执行一系列变换：

```python
import re
def remove_punctuation(value):
    return re.sub('[!#?]', '', value)

clean_ops = [str.strip, remove_punctuation, str.title]   # 变换管道
def clean_strings(strings, ops):
    result = []
    for value in strings:
        for function in ops:
            value = function(value)
        result.append(value)
    return result
```

#### lambda：匿名函数

lambda 定义只含单条表达式、结果为返回值的函数，适合作为参数一次性传入：

```python
strings.sort(key=lambda x: len(set(list(x))))   # 按不同字母数排序

def apply_to_list(strings, f):
    return [f(x) for x in strings]

apply_to_list(strings, lambda x: x * 2)
```

#### 生成器（generator）

生成器是按需生成值的迭代器：普通函数一次返回一个值，生成器每执行一个 `yield` 即暂停，直到下一个值被请求。适用于处理无法或不需一次性装入内存的序列（如超大文件）：

```python
def squares(n=10):
    for i in range(1, n + 1):
        yield i ** 2

gen = squares()        # 此时不执行任何代码
for x in gen:          # 请求时才逐步执行
    print(x, end=' ')

# 生成器表达式：将推导式的方括号改为圆括号
gen = (x ** 2 for x in range(100))
sum(x ** 2 for x in range(100))    # 328350 —— 可直接作为函数参数
```

#### 异常处理

数据分析中，函数往往只对部分输入有效（如 `float('something')` 会抛出 `ValueError`）。异常处理可使程序在遇到异常数据时继续运行：

```python
def attempt_float(x):
    try:
        return float(x)
    except (TypeError, ValueError):   # 捕获多种异常
        return x

# 结构：try -> except（捕获）-> else（仅成功时执行）-> finally（无论成败均执行）
f = open(path, 'w')
try:
    write_to_file(f)
except:
    print('Failed')
else:
    print('Succeeded')
finally:
    f.close()          # 资源清理置于此处
```

> 应只捕获预期会发生的异常类型（如 `ValueError`），使真正的错误（如 `TypeError`）能够暴露出来，而不被忽略。

### 文件与操作系统

数据分析的第一步通常是读取文件。虽然 pandas 提供了更高级的 `read_csv`（见"数据加载、存储与文件格式"一章），理解底层文件对象仍属基本功：

```python
path = 'examples/segismundo.txt'
with open(path) as f:                 # with 自动关闭文件（推荐）
    lines = [x.rstrip() for x in f]   # 逐行读取，rstrip 去掉换行符

# 文件模式：'r' 读、'w' 写（覆盖）、'x' 创建（已存在则失败）、'b' 二进制、'a' 追加
f = open(path, 'rb')
data = f.read(10)          # 读取指定字节数
f.tell()                   # 当前文件位置
f.seek(3)                  # 移动位置
f.close()

# 写入
with open('tmp.txt', 'w', encoding='utf-8') as handle:
    handle.writelines(x for x in open(path) if 'foo' in x)
```

> 不应在文本模式中随意使用 `seek`：若位置落在某个 Unicode 字符的字节中间，读取会抛出 `UnicodeDecodeError`；二进制模式（`'rb'`）下 `tell`/`seek` 才按字节计数。

**本章小结**：Python 的核心机制为对象、引用与鸭子类型；四种数据结构按可变性、顺序性与用途选型；推导式与生成器是处理序列的两种高效工具；函数为一等对象，配合 lambda 与异常处理可编写稳健的数据处理代码。

---

## NumPy：数组与矢量计算

**本章目标**：理解数组相对列表的优势；掌握 ndarray 的创建、索引、运算；理解视图与副本、dtype、广播等核心概念。

### 数组与 Python 列表的差异

一个常见疑问是：Python 已有列表，为何还需要 NumPy 数组。答案在于性能与内存。

| 对比维度 | Python 列表 | NumPy ndarray |
|---|---|---|
| 元素类型 | 任意对象（每个元素都是完整对象） | 同质（单一 dtype），连续内存块 |
| 存储开销 | 较大（对象头 + 指针） | 较小（紧凑的原始字节） |
| 批量运算 | 需编写 for 循环 | 矢量化，一次操作整个数组 |
| 与底层语言交互 | 需逐元素转换 | 直接暴露内存块，零拷贝 |

实测对比（作者机器，仅作量级参考）：对一百万元素乘以 2，NumPy 约 72ms，纯 Python 列表推导约 1.05s，相差约 15 倍，且 NumPy 内存占用更小。数据量越大，差距越明显。以数组运算替代循环的做法称为矢量化（vectorization），是 NumPy 与 pandas 性能优势的基础。

此外，NumPy 数组是生态中各库之间传递数据的标准容器，pandas、scikit-learn、statsmodels 内部均以 ndarray 为数据载体。

### ndarray：多维数组对象

ndarray（N-dimensional array）是同质数据的多维容器，所有元素必须为相同类型。每个数组有两个关键属性：

- **shape**：各维度大小的元组，如 `(2, 3)` 表示 2 行 3 列；
- **dtype**：元素数据类型（决定每个元素占用的字节数及内存的解释方式）。

```python
import numpy as np

rng = np.random.default_rng(42)       # 现代随机接口（见"伪随机数生成"一节）
data = rng.standard_normal((2, 3))    # 2×3 的标准正态随机数组
data.shape                     # (2, 3)
data.dtype                     # dtype('float64')

data * 10                      # 所有元素乘以 10（无需循环）
data + data                    # 元素级相加
```

#### 创建数组

```python
np.array([6, 7.5, 8, 0, 1])                    # 从列表创建
np.array([[1, 2, 3, 4], [5, 6, 7, 8]])         # 嵌套列表 -> 二维数组
np.zeros(10)                   # 全 0
np.ones((3, 6))                # 全 1
np.empty((2, 3, 2))            # 未初始化内存（内容为未定义值）
np.arange(15)                  # range 的数组版本
```

> `np.empty` 只分配内存而不初始化，返回的内容为未定义值，不应假设其为 0。需要确定初始值时应使用 `zeros`/`ones`。

### dtype：数据类型

dtype 是 NumPy 与外部系统（磁盘二进制、C/Fortran 代码）互操作的关键。命名规则为类型名加位数：`float64`（8 字节双精度，对应 Python float）、`int32`、`uint8`、`bool`、`complex128` 等。

```python
arr1 = np.array([1, 2, 3], dtype=np.float64)
arr2 = np.array([1, 2, 3], dtype=np.int32)

# astype 显式转换（总是返回新数组）
arr = np.array([3.7, -1.2, -2.6, 0.5, 12.9, 10.1])
arr.astype(np.int32)             # 截断小数部分
np.array(['1.25', '-9.6', '42']).astype(float)   # 字符串转数值
```

> 通常只需知道数据大致为浮点、整数、布尔、字符串或对象类型。需要在内存或磁盘中控制存储大小时（尤其大数据集）才需精确指定，如将 `float64` 降为 `float32` 可节省一半内存。

### 矢量化运算

大小相同的数组之间的算术运算均为元素级（element-wise）：

```python
arr = np.array([[1., 2., 3.], [4., 5., 6.]])
arr * arr          # 元素级相乘（非矩阵乘法）
arr - arr
1 / arr            # 标量广播到每个元素
arr ** 0.5
arr2 > arr         # 比较运算生成布尔数组
```

> 注意：`arr1 * arr2` 为逐元素相乘，矩阵乘法应使用 `arr1 @ arr2` 或 `np.dot(arr1, arr2)`（见下文线性代数部分）。这是 MATLAB 用户常见的错误。

### 索引与切片：视图与副本

#### 视图与副本

NumPy 切片返回原数组的视图——不复制数据，只是以不同方式解释同一块内存。修改视图会修改原数组：

```python
arr = np.arange(10)
arr_slice = arr[5:8]     # 视图
arr_slice[1] = 12345
arr                      # 原数组第 6 个元素随之改变
```

该设计与列表（切片即复制）不同。视图机制是 NumPy 处理大数据的原因之一：若每次切片均复制，内存与性能均不可接受。需要独立副本时应显式调用 `.copy()`：

```python
arr[5:8].copy()
```

#### 索引规则

```python
arr2d = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
arr2d[2]          # 第 2 行: array([7, 8, 9])
arr2d[0, 2]       # 元素 3（等价 arr2d[0][2]）
arr2d[:2]         # 前两行
arr2d[:2, 1:]     # 前两行、第 1 列之后
arr2d[:, :1]      # 所有行、第 1 列
```

规则：以逗号分隔各轴的索引；`:` 表示整轴；省略高维索引会得到低一维的数组；二维情况下轴 0 为行、轴 1 为列。

### 布尔索引与花式索引

#### 布尔索引

布尔索引将比较运算生成的布尔数组作为掩码（mask）选择元素，是数据过滤的常用方式：

```python
names = np.array(['Bob', 'Joe', 'Will', 'Bob', 'Will', 'Joe', 'Joe'])
rng = np.random.default_rng(42)
data = rng.standard_normal((7, 4))

data[names == 'Bob']          # 名字为 Bob 的所有行
data[names == 'Bob', 2:]      # 布尔掩码 + 列切片
data[~(names == 'Bob')]       # ~ 取反
mask = (names == 'Bob') | (names == 'Will')   # 组合条件
data[mask]

data[data < 0] = 0            # 将所有负数设为 0（掩码赋值）
```

> 两点注意：布尔索引总是返回副本（与切片视图不同）；组合条件必须使用 `&`（与）、`|`（或）、`~`（非），不能使用 Python 的 `and`/`or`（二者无法作用于数组）。

#### 花式索引

以整数数组（而非切片）指定选取顺序，总是返回副本：

```python
arr = np.arange(32).reshape((8, 4))
arr[[4, 3, 0, 6]]                  # 按指定顺序取行
arr[[-3, -5, -7]]                  # 负数从末尾选取
arr[[1, 5, 7, 2], [0, 3, 1, 2]]    # 两个索引数组配对: (1,0),(5,3),...
arr[[1, 5, 7, 2]][:, [0, 3, 1, 2]] # 先选行再选列 -> 矩形子集
```

### 通用函数（ufunc）

通用函数（universal function）是对 ndarray 执行元素级运算的函数的统称，本质是"接受标量并返回标量"的函数的矢量化封装。应优先使用 ufunc 而非自行编写 Python 循环——ufunc 底层由 C 实现且经过优化：

```python
arr = np.arange(10)
np.sqrt(arr)          # 一元 ufunc：开方
np.exp(arr)           # 指数
np.abs(arr)           # 绝对值
np.floor(arr); np.ceil(arr); np.rint(arr)   # 取整系列

rng = np.random.default_rng(42)
x = rng.standard_normal(8); y = rng.standard_normal(8)
np.maximum(x, y)      # 二元 ufunc：逐元素取最大
np.add(x, y); np.multiply(x, y)   # 加减乘除均有对应 ufunc

# 返回多个数组的 ufunc：modf 拆分小数与整数部分
remainder, whole_part = np.modf(arr)

# out 参数：原地运算，避免分配新数组
np.sqrt(arr, arr)     # 结果写回 arr
```

常用一元 ufunc：`abs`、`sqrt`、`square`、`exp`、`log`/`log10`/`log2`、`sign`、`ceil`、`floor`、`isnan`、`isinf`、`cos`/`sin`/`tan`。常用二元：`add`、`subtract`、`multiply`、`divide`、`power`、`maximum`、`minimum`、`mod`。

### 利用数组处理数据

#### np.meshgrid：网格坐标生成

`meshgrid` 接受两个一维数组，生成覆盖所有 `(x, y)` 组合的二维网格，常用于等高线、曲面图的坐标计算：

```python
points = np.arange(-5, 5, 0.01)
xs, ys = np.meshgrid(points, points)
z = np.sqrt(xs ** 2 + ys ** 2)     # 整个网格一次求值
```

#### np.where：矢量化三元表达式

`np.where(cond, x, y)` 等价于对数组逐元素执行 `x if cond else y`，用于替代逐元素的 if-else 循环：

```python
xarr = np.array([1.1, 1.2, 1.3, 1.4, 1.5])
yarr = np.array([2.1, 2.2, 2.3, 2.4, 2.5])
cond = np.array([True, False, True, True, False])
np.where(cond, xarr, yarr)         # [1.1, 2.2, 1.3, 1.4, 2.5]

# 常见用法：根据条件替换值（第二、三参数可为标量）
rng = np.random.default_rng(42)
arr = rng.standard_normal((4, 4))
np.where(arr > 0, 2, -2)       # 正数变 2，负数变 -2
np.where(arr > 0, 2, arr)      # 只将正数设为 2，其余保留原值
```

### 数学与统计方法、排序、集合运算

#### 统计聚合

聚合计算（aggregation，亦称约简 reduction）将数组约简为更小的结果。`axis` 参数决定沿哪个轴约简：`axis=0` 沿行方向（得到每列的统计量），`axis=1` 沿列方向（得到每行的统计量）：

```python
rng = np.random.default_rng(42)
arr = rng.standard_normal((5, 4))
arr.mean()          # 全局均值（等价 np.mean(arr)）
arr.sum()           # 全局和
arr.mean(axis=1)    # 每行均值（结果长度 = 行数）
arr.sum(axis=0)     # 每列之和
arr.cumsum()        # 累计和（不聚合，返回同形状数组）
arr.cumprod(axis=1) # 沿列累计积

(arr > 0).sum()     # 正数个数（布尔值视为 1/0）
bools.any()         # 是否存在 True
bools.all()         # 是否全部 True
```

#### 排序与唯一化

```python
arr.sort()               # 就地排序（修改原数组）
arr.sort(1)              # 沿轴 1 排序
np.sort(arr)             # 返回排序副本（不修改原数组）
large_arr.sort()
large_arr[int(0.05 * len(large_arr))]   # 5% 分位数（先排序再取位置）

np.unique(names)         # 唯一值（返回已排序结果）
np.in1d(values, [2, 3, 6])   # 成员资格测试（布尔数组）
```

#### 线性代数

矩阵乘法使用 `dot` / `@`；元素级乘法使用 `*`：

```python
x = np.array([[1., 2., 3.], [4., 5., 6.]])
y = np.array([[6., 23.], [-1, 7], [8, 9]])
x.dot(y)            # 等价 np.dot(x, y)、x @ y
np.dot(x, np.ones(3))    # 二维 × 一维

from numpy.linalg import inv, qr
mat = X.T.dot(X)    # Gram 矩阵（X 已中心化时才与协方差矩阵成比例）
np.cov(X, rowvar=False)   # 直接计算协方差矩阵（每列一个变量）
inv(mat)            # 求逆
qr(mat)             # QR 分解
```

其他常用函数：`det`（行列式）、`eig`（特征值）、`svd`（奇异值分解）、`lstsq`（最小二乘）。

#### 文件输入输出

```python
np.save('some_array', arr)        # 保存为 .npy（自动补扩展名）
np.load('some_array.npy')         # 加载
np.savez('archive.npz', a=arr, b=arr)    # 多个数组
np.savez_compressed('archive.npz', a=arr)  # 压缩保存
```

> 实际工作中更常使用 pandas 读写表格数据（见"数据加载、存储与文件格式"一章）。NumPy 的二进制格式适合保存中间计算结果，速度优于文本格式。

### 伪随机数生成

`numpy.random` 提供高效生成各种概率分布样本的函数，性能优于 Python 内置 `random`（作者机器上生成 100 万样本约 62ms，对比 1.77s）。

NumPy 1.17+ 推荐使用 `default_rng()` 接口：它返回独立的生成器对象，避免全局状态污染，且随机序列质量更好。原书使用的 `np.random.seed` + 全局函数方式属于遗留接口，新代码应统一使用生成器对象：

```python
rng = np.random.default_rng(1234)    # 传入种子以保证可复现
rng.normal(size=(4, 4))              # 标准正态分布
rng.integers(0, 2, size=10)          # 随机整数
rng.standard_normal(size=1000)       # 标准正态分布
```

| 函数 | 分布 |
|---|---|
| `rng.normal(loc, scale, size)` | 正态分布 |
| `rng.uniform(low, high, size)` | 均匀分布 |
| `rng.integers(low, high, size)` | 离散均匀整数 |
| `rng.choice(seq, size, replace)` | 从序列随机抽样 |
| `rng.binomial(n, p, size)` | 二项分布 |
| `rng.permutation(n)` | 随机排列 |

### 综合示例：随机漫步

问题设定：从 0 出发，每一步以等概率取 ±1，模拟 1000 步；再模拟 5000 次并求统计量。

关键思路：随机漫步的路径是步长序列的累计和，因此可通过"生成步长数组 → cumsum"两步矢量化完成，无需循环：

```python
nsteps = 1000
rng = np.random.default_rng(42)
draws = rng.integers(0, 2, size=nsteps)   # 掷硬币 0/1
steps = np.where(draws > 0, 1, -1)        # 转为 ±1 步长
walk = steps.cumsum()                     # 累计和 = 路径

walk.min(); walk.max()                              # 极值
(np.abs(walk) >= 10).argmax()                       # 首次穿越 ±10 的时刻
```

一次模拟 5000 次（二维数组，每行一条路径）：

```python
nwalks, nsteps = 5000, 1000
draws = rng.integers(0, 2, size=(nwalks, nsteps))
steps = np.where(draws > 0, 1, -1)
walks = steps.cumsum(1)                       # 沿轴 1 累计

hits30 = (np.abs(walks) >= 30).any(1)         # 哪些路径穿越了 ±30
hits30.sum()                                  # 3410 条（seed=42 下的示例输出）
crossing_times = (np.abs(walks[hits30]) >= 30).argmax(1)
crossing_times.mean()                         # 平均穿越时间约 498.9 步（示例输出）
```

**本章小结**：NumPy 的核心为连续内存、同质 dtype 与矢量化运算；索引需区分视图与副本；布尔与花式索引实现过滤与重排；ufunc 提供元素级函数库；`axis` 控制聚合方向；随机数使用 `default_rng()`。

---

## pandas 入门：Series 与 DataFrame

**本章目标**：理解 pandas 的设计理念（标签对齐、缺失值、时间序列）；熟练使用 Series 与 DataFrame 两大核心结构；掌握选取、运算、聚合的基本操作。

### pandas 的设计理念

pandas 由 Wes McKinney 于 2008 年在量化投资公司 AQR 开发（名称源于 **pan**el **da**ta 面板数据与 Python **da**ta analysis）。其设计目标包括：

- 带标签轴的数据结构，支持自动或显式的数据对齐，防止来源不同、索引不同的数据因不对齐而产生错误；
- 灵活处理缺失数据；
- 集成时间序列功能；
- SQL 风格的关系操作（合并、连接）。

上述需求的核心可概括为：pandas 使"标签"成为数据结构的组成部分。NumPy 数组以整数位置索引，pandas 则为每个数据点提供名称（索引），并在运算时自动按名称对齐。这是 pandas 与 NumPy、Excel 的本质区别，也是理解 pandas 的关键。

### Series：一维带标签数组

Series 是"数据 + 索引"的一维结构，可视为"索引到值的有序字典"，也可视为"带标签的一维 NumPy 数组"。

```python
import pandas as pd

obj = pd.Series([4, 7, -5, 3])
# 0    4
# 1    7
# 2   -5
# 3    3
# dtype: int64

obj.values          # array([ 4,  7, -5,  3]) —— 底层为 ndarray
obj.index           # RangeIndex(start=0, stop=4, step=1)

# 指定索引
obj2 = pd.Series([4, 7, -5, 3], index=['d', 'b', 'a', 'c'])
obj2['a']           # -5，按标签访问
obj2[['c', 'a', 'd']]   # 标签列表取子集
obj2[obj2 > 0]      # 布尔过滤（索引保留）
obj2 * 2            # 运算保留索引链接
np.exp(obj2)        # 数学函数同样保留索引
```

由字典创建时，字典的键自动成为索引，未匹配的索引位置填入 `NaN`（缺失值）：

```python
sdata = {'Ohio': 35000, 'Texas': 71000, 'Oregon': 16000, 'Utah': 5000}
obj4 = pd.Series(sdata, index=['California', 'Ohio', 'Oregon', 'Texas'])
obj3 = pd.Series(sdata)          # 用于下方演示自动对齐
# California    NaN      <- sdata 中没有 California
# Ohio       35000.0
# Oregon     16000.0
# Texas      71000.0

pd.isnull(obj4)      # 检测缺失（也有实例方法 obj4.isnull()）
```

自动数据对齐（data alignment）是 pandas 的核心特性：两个 Series 相加时，按索引标签对齐，不重叠的位置结果为 NaN：

```python
obj3 + obj4
# California     NaN      <- 仅一边有值
# Ohio       70000.0      <- 35000 + 35000
# Oregon     32000.0
# Texas     142000.0
# Utah           NaN
```

> 对数据库用户而言，这相当于按索引自动执行外连接（outer join），无需手动保证两个表的顺序一致，pandas 会自动完成对齐。

Series 与索引均可命名（`name` 属性），用于在合并、透视表等操作中标识来源：

```python
obj4.name = 'population'
obj4.index.name = 'state'
```

### DataFrame：二维表格结构

DataFrame 是"由一组 Series 组成的字典（共用同一索引）"，具有行索引与列索引，每列可为不同类型（数值、字符串、布尔）。它是 pandas 使用频率最高的对象。

#### 创建 DataFrame

```python
data = {'state': ['Ohio', 'Ohio', 'Ohio', 'Nevada', 'Nevada', 'Nevada'],
        'year': [2000, 2001, 2002, 2001, 2002, 2003],
        'pop': [1.5, 1.7, 3.6, 2.4, 2.9, 3.2]}
frame = pd.DataFrame(data)       # 字典的键 -> 列名
frame.head()                     # 前五行（大数据集的默认查看方式）

# 指定列顺序与行索引；未提供的列自动填充 NaN
frame2 = pd.DataFrame(data, columns=['year', 'state', 'pop', 'debt'],
                      index=['one', 'two', 'three', 'four', 'five', 'six'])
```

其他常见的创建方式：

```python
# 嵌套字典：外层键 -> 列，内层键 -> 行索引
pop = {'Nevada': {2001: 2.4, 2002: 2.9},
       'Ohio': {2000: 1.5, 2001: 1.7, 2002: 3.6}}
pd.DataFrame(pop)
#       Nevada  Ohio
# 2000     NaN   1.5
# 2001     2.4   1.7
# 2002     2.9   3.6

# 从 NumPy 数组 / 二维列表
pd.DataFrame(np.arange(12).reshape(3, 4), columns=['a', 'b', 'c', 'd'])
```

#### 列操作

```python
frame2['state']           # 取列 -> Series（与 DataFrame 共享索引）
frame2.year               # 属性式访问（列名需为合法变量名）
frame2.loc['three']       # 取行 -> Series

frame2['debt'] = 16.5            # 列赋值（标量广播）
frame2['debt'] = np.arange(6.)   # 数组赋值（长度须匹配）
frame2['eastern'] = frame2.state == 'Ohio'   # 布尔列
del frame2['eastern']            # 删除列
```

> 关于"视图"：pandas 3.0（写时复制 CoW 默认开启）下，`frame2['col']` 返回的 Series 与原表共享底层数据，但任何就地修改都会先触发复制，**不会**再反向影响原 DataFrame；要修改原表的列，应直接使用 `frame2.loc[行, 'col'] = 值` 赋值。旧版本（CoW 关闭）中修改取出的列会传导到原表，这正是链式赋值 `df['col'][行] = 值` 的经典陷阱（3.0 起链式赋值会直接报错）。需要独立副本时使用 `.copy()`。

#### values 与转置

```python
frame2.values            # 返回二维 ndarray（混合类型时 dtype=object）
frame2.T                 # 转置（交换行列）
```

### 索引对象（Index）

Index 是 pandas 管理轴标签（行名、列名）的对象。其关键特性为不可变（不能修改，因此可安全地在多个 DataFrame 之间共享），且支持集合式操作：

```python
obj = pd.Series(range(3), index=['a', 'b', 'c'])
index = obj.index
index[1:]                 # Index(['b', 'c'])
'state' in frame2.columns  # True（哈希查找，较快）
dup_labels = pd.Index(['foo', 'foo', 'bar', 'bar'])   # 允许重复
```

Index 的常用属性与方法：`is_unique`、`is_monotonic_increasing`、`name`、`union`、`intersection`、`difference`。注意：`Index.append` 已在 pandas 2.0 弃用，合并索引应使用 `union` 或 `pd.concat`。

### 基本操作：重索引、丢弃、选取

#### reindex：按新索引重排

`reindex` 创建符合新索引顺序的新对象，缺失的索引引入 NaN；对有序数据可用 `method` 参数插值：

```python
obj = pd.Series([4.5, 7.2, -5.3, 3.6], index=['d', 'b', 'a', 'c'])
obj.reindex(['a', 'b', 'c', 'd', 'e'])       # e 位置 -> NaN
obj3 = pd.Series(['blue', 'purple', 'yellow'], index=[0, 2, 4])
obj3.reindex(range(6), method='ffill')       # 前向值填充
frame.reindex(columns=states)                # 重排列（使用 columns 关键字）
```

#### drop：丢弃轴上的项

```python
obj.drop('c')                  # Series 丢弃标签（返回新对象）

data = pd.DataFrame(np.arange(16).reshape((4, 4)),
                    index=['Ohio', 'Colorado', 'Utah', 'New York'],
                    columns=['one', 'two', 'three', 'four'])
data.drop(['Colorado', 'Ohio'])               # DataFrame 丢弃行
data.drop('two', axis=1)       # 丢弃列（axis=1 或 axis='columns'）
# 旧版常以 inplace=True 就地修改：该方法返回 None 且易与链式赋值混淆，现已不推荐
```

#### 选取：[] / loc / iloc

pandas 的选取语法曾较为混乱，官方目前推荐以下方式：

| 写法 | 含义 | 示例 |
|---|---|---|
| `df['col']` | 取一列（Series） | `df['two']` |
| `df[['a','b']]` | 取多列 | `df[['three','one']]` |
| `df.loc[行, 列]` | 按标签选取 | `df.loc['Colorado', ['two','three']]` |
| `df.iloc[行, 列]` | 按整数位置选取 | `df.iloc[2, [3, 0, 1]]` |
| `df.loc[条件]` | 布尔过滤行 | `df.loc[df['three'] > 5]` |
| `df.iloc[:3]` | 前 3 行 | `df.iloc[:3]` |

```python
data.loc['Colorado', ['two', 'three']]   # 标签行 + 标签列
data.iloc[2, [3, 0, 1]]                  # 位置行 + 位置列
data.loc[:'Utah', 'two']                 # 标签切片（含末端）
data.iloc[:, :3][data.three > 5]         # 组合使用
```

> 标签切片包含末端（`'b':'c'` 包含 c），与 Python 列表切片"含头不含尾"不同，这是初学者常见的问题。
>
> 历史说明：pandas 早期有 `ix` 同时支持标签与位置，因歧义过多被废弃，现仅使用 `loc`/`iloc`。索引为整数时尤其应注意区分——`ser[-1]` 是位置还是标签存在歧义，统一使用 `loc`（标签）/`iloc`（位置）即可消除。

### 算术运算与数据对齐

不同索引的对象进行算术运算时，结果索引取并集（自动外连接对齐），缺失处为 NaN：

```python
s1 + s2                          # 自动按索引对齐
df1.add(df2, fill_value=0)       # 使用 fill_value 填补缺失处
1 / df1                          # 等价 df1.rdiv(1)（r 开头 = 翻转参数）
```

DataFrame 与 Series 的运算（类似 NumPy 广播）：默认 Series 索引匹配列并沿行广播：

```python
frame - series                   # 每行减去第一行（列对齐）
frame.sub(series3, axis='index') # axis='index' 改为匹配行索引并广播
```

常用算术方法：`add`、`sub`、`mul`、`div`、`pow`（均有 `r` 前缀的反转版本与 `fill_value` 参数）。

### 函数应用与映射

pandas 提供三个层级的函数应用能力：

| 方法 | 作用对象 | 说明 |
|---|---|---|
| `df.apply(f)` | 每列/每行（Series） | f 接收一个 Series，返回标量或 Series |
| `df.map(f)` | DataFrame 每个元素 | pandas 2.1 起新增；原 `applymap` 已在 3.0 移除 |
| `s.map(f)` | Series 每个元素 | 也可传字典做映射（见"数据清洗与准备"一章） |

```python
rng = np.random.default_rng(42)
frame = pd.DataFrame(rng.standard_normal((4, 3)), columns=list('bde'),
                     index=['Utah', 'Ohio', 'Texas', 'Oregon'])   # 本节使用数值型 frame
np.abs(frame)                           # ufunc 直接作用于 DataFrame
f = lambda x: x.max() - x.min()
frame.apply(f)                          # 每列计算 max-min
frame.apply(f, axis='columns')          # 每行计算
frame.apply(lambda x: pd.Series([x.min(), x.max()], index=['min', 'max']))

fmt = lambda x: '%.2f' % x
frame.map(fmt)                          # DataFrame 元素级（applymap 已在 3.0 移除）
frame['e'].map(fmt)                     # Series 元素级
```

### 排序与排名

```python
obj.sort_index()                     # 按索引排序
frame.sort_index(axis=1, ascending=False)   # 按列索引降序
obj.sort_values()                    # 按值排序（缺失值默认在末尾）
frame.sort_values(by=['a', 'b'])     # 按一列或多列的值排序
obj.rank()                           # 排名（默认并列取平均名次）
obj.rank(method='first')             # 按出现顺序给名次
obj.rank(ascending=False, method='max')
frame.rank(axis='columns')           # 每行内排名
```

rank 的 `method` 选项：`average`（默认，并列取平均）、`min`、`max`、`first`（按出现顺序）、`dense`（并列同名次且不跳号）。

### 汇总与描述统计

pandas 的统计方法默认跳过缺失值：

```python
df.sum()                    # 每列求和（返回 Series）
df.sum(axis=1)              # 每行求和
df.mean(axis='columns', skipna=False)   # skipna=False 时含 NA 的结果为 NA
df.idxmax(); df.idxmin()    # 最大值/最小值所在索引
df.cumsum()                 # 累计和
df.describe()               # 输出 count/mean/std/min/25%/50%/75%/max
```

`describe` 是探索性分析的起点，通过一张表即可了解数据的大致分布（均值、离散度、极值）。对非数值列，它输出 count/unique/top/freq。

#### 相关系数与协方差

```python
returns['MSFT'].corr(returns['IBM'])    # 两列 Pearson 相关系数（-1~1）
returns['MSFT'].cov(returns['IBM'])     # 协方差
returns.corr()              # 完整相关系数矩阵（对角线为 1）
returns.cov()               # 协方差矩阵
returns.corrwith(returns.IBM)   # 每列与指定列的相关系数
```

#### 唯一值、值计数与成员资格

```python
obj.unique()                # 唯一值数组（未排序）
obj.value_counts()          # 各值频数（默认降序）
df['col'].value_counts(normalize=True)   # 频率而非计数
mask = obj.isin(['b', 'c']) # 成员资格 -> 布尔掩码
obj[mask]                   # 过滤
```

**本章小结**：pandas 的根基为标签与自动对齐；Series 为一维带标签数据，DataFrame 为二维表；选取使用 `[]`/`loc`/`iloc`；算术运算自动对齐、缺失值自动传播；`apply` 系列完成函数映射；`describe`/`corr`/`value_counts` 为探索性分析的常用工具。

---

## 数据加载、存储与文件格式

**本章目标**：掌握 pandas 读写各类数据格式的方法；理解不同格式的适用场景；能够通过 Web API 与数据库交互。

### 数据格式选择总览

选择格式后再学习对应 API。各类格式的适用场景如下：

| 格式 | 适用场景 | 优点 | 缺点 |
|---|---|---|---|
| CSV/TSV 文本 | 通用交换、人类可读 | 通用性强、可手写可版本控制 | 速度慢、无类型信息、大文件体积大 |
| JSON | Web API、嵌套结构 | 灵活、层级清晰 | 不适合超大表格 |
| pickle | Python 内部短期缓存 | 速度快、对象完整保留 | 版本不稳定、仅限 Python |
| **Parquet**（推荐） | 大数据集、列式分析 | 列式压缩、速度快、跨语言、保留类型 | 人类不可读 |
| HDF5 | 海量科学数据 | 支持分块读、压缩 | 非数据库，并发写会损坏 |
| Excel | 业务报表交互 | 通用、可带格式 | 速度慢、二进制、行数上限 |
| SQL 数据库 | 生产系统、并发访问 | 查询强大、事务安全 | 需要服务器 |

格式选择原则：日常探索与分享使用 CSV；对性能或大数据量要求较高时使用 Parquet；嵌套数据使用 JSON；正式存储使用数据库。

### 读写文本格式：read_csv

`read_csv`（以及 `read_fwf`、`read_excel` 等）是加载表格数据的主要入口。其参数较多，可按目的分为：索引设置、类型推断与转换、日期解析、逐块迭代、处理不规整数据。注意：旧版中的 `read_table` 与 `read_csv` 功能相同，新代码统一使用 `read_csv` 并显式指定 `sep`。

#### 基本用法

```python
df = pd.read_csv('examples/ex1.csv')           # 首行自动作为列名
pd.read_csv('examples/ex1.csv', sep=';')       # 自定义分隔符
pd.read_csv('examples/ex2.csv', header=None)   # 无标题行：自动分配 0,1,2...
pd.read_csv('examples/ex2.csv', names=['a', 'b', 'c', 'd', 'message'])  # 自定义列名
pd.read_csv('examples/ex2.csv', names=names, index_col='message')        # 指定索引列
pd.read_csv('examples/csv_mindex.csv', index_col=['key1', 'key2'])       # 多列层次化索引
```

#### 加速引擎

pandas 2.0 起 `read_csv` 可选用 PyArrow 引擎（需安装 `pyarrow`），解析速度更快、类型推断更完善，适合较大的文本文件：

```python
pd.read_csv('examples/ex1.csv', engine='pyarrow')
```

> PyArrow 引擎对部分参数（如自定义缺失值标记）的支持与默认 C 引擎略有差异，遇到不支持的情况可回退到默认引擎。

#### 类型推断

`read_csv` 会扫描数据并自动推断每列类型（数值/整数/布尔/字符串）。该机制在便利的同时存在隐患：列中出现一个 `NA` 即会使整列变为浮点类型（NaN 为浮点值）。需要精确控制时，可显式指定 `dtype` 与 `parse_dates`：

```python
pd.read_csv('examples/ex5.csv', dtype={'a': 'int64'})          # 显式指定 dtype
# parse_dates 指定需解析为日期的列（列名须与文件一致，此处仅示意）
# pd.read_csv('examples/ex5.csv', parse_dates=['date_col'])
```

#### 处理不规整文件

```python
# 空白符（数量不定）分隔：使用正则表达式
pd.read_csv('examples/ex3.txt', sep='\s+')

# 跳过指定行（注释、页眉页脚）
pd.read_csv('examples/ex4.csv', skiprows=[0, 2, 3])

# 缺失值标记
pd.read_csv('examples/ex5.csv')                  # 默认识别 NA/NULL/空串
pd.read_csv('examples/ex5.csv', na_values=['NULL'])       # 追加自定义标记
sentinels = {'message': ['foo', 'NA'], 'something': ['two']}   # 按列指定
pd.read_csv('examples/ex5.csv', na_values=sentinels)
```

#### 逐块读取大文件

大文件不应一次性读入内存：

```python
pd.read_csv('examples/ex6.csv', nrows=5)              # 只读前几行
chunker = pd.read_csv('examples/ex6.csv', chunksize=1000)   # 分块迭代器

tot = pd.Series([])                       # 逐块聚合"key"列频数
for piece in chunker:
    tot = tot.add(piece['key'].value_counts(), fill_value=0)
tot.sort_values(ascending=False)
```

#### 写出：to_csv

```python
data.to_csv('examples/out.csv')
data.to_csv(sys.stdout, sep='|')            # 自定义分隔符
data.to_csv(sys.stdout, na_rep='NULL')      # 缺失值表示
data.to_csv(sys.stdout, index=False, header=False)   # 去掉行/列标签
data.to_csv(sys.stdout, index=False, columns=['a', 'b', 'c'])  # 只写部分列
```

#### 手工处理：Python csv 模块

当文件格式不规则（特殊引号、多字符分隔符）导致 pandas 解析器失效时，可使用标准库 `csv` 模块手工规整：

```python
import csv
with open('examples/ex7.csv') as f:
    lines = list(csv.reader(f))
header, values = lines[0], lines[1:]
data_dict = {h: v for h, v in zip(header, zip(*values))}   # 行转列
```

### JSON、HTML 与 XML

#### JSON

JSON（JavaScript Object Notation）是 HTTP 请求中交换数据的标准格式，支持嵌套结构，比 CSV 更灵活：

```python
import json
result = json.loads(obj)          # JSON 字符串 -> Python 对象
json.dumps(result)                # Python 对象 -> JSON 字符串

data = pd.read_json('examples/example.json')   # JSON 数组 -> DataFrame
print(data.to_json(orient='records'))          # DataFrame -> JSON（每行一个对象）
```

#### HTML

`read_html` 自动解析网页中的 `<table>` 标签（依赖 lxml / BeautifulSoup）：

```python
tables = pd.read_html('examples/fdic_failed_bank_list.html')
failures = tables[0]                       # 返回 DataFrame 列表（可能含多个表格）
close_timestamps = pd.to_datetime(failures['Closing Date'])
close_timestamps.dt.year.value_counts()    # 按年份统计倒闭银行数
```

#### XML

XML 支持层级嵌套与元数据。使用 `lxml.objectify` 解析后按标签名取字段：

```python
from lxml import objectify
parsed = objectify.parse(open(path))
root = parsed.getroot()
data = []
for elt in root.INDICATOR:
    el_data = {child.tag: child.pyval for child in list(elt)}   # getchildren() 已弃用，用 list()
    data.append(el_data)
pd.DataFrame(data)
```

### 二进制格式

#### pickle：适用于短期存储

pickle 是 Python 内置的序列化机制：

```python
frame.to_pickle('examples/frame_pickle')
pd.read_pickle('examples/frame_pickle')
```

> pickle 仅建议用于短期缓存：其格式随版本演化，当前版本生成的对象可能无法被未来版本读取。不应使用 pickle 做长期存档或跨语言交换。

#### Parquet：推荐的大数据格式

Parquet 是 Apache 基金会的独立列式存储格式（设计源于 Google Dremel 论文），已成为数据工程中的常用标准：列式存储带来高压缩比、可只读所需列、保留类型与嵌套结构、支持跨语言（Python/R/Java/SQL 引擎）。它与 Arrow 是互补关系——Arrow 是内存中的列式格式，PyArrow 在提供 Arrow 数组的同时也提供高性能的 Parquet 读写实现（另有 fastparquet 可选）：

```python
df.to_parquet('data.parquet')        # 需要 pyarrow 或 fastparquet
pd.read_parquet('data.parquet')
```

#### HDF5：大规模科学数据

HDF5 是存储大规模数组的层次化格式，支持分块读写（内存放不下的数据集也可处理）。pandas 的 `HDFStore` 以类似字典的方式使用：

```python
store = pd.HDFStore('mydata.h5')
store['obj1'] = frame
store.select('obj2', where=['index >= 10 and index <= 15'])   # 表格式查询
store.close()

frame.to_hdf('mydata.h5', 'obj3', format='table')
pd.read_hdf('mydata.h5', 'obj3', where=['index < 5'])
```

> HDF5 不是数据库，最适合"一次写多次读"；多个写操作并发可能损坏文件。常规表格数据建议优先使用 Parquet，HDF5 多用于科学计算领域的超大数组。

#### Excel

```python
xlsx = pd.ExcelFile('examples/ex1.xlsx')
pd.read_excel(xlsx, 'Sheet1')              # 读指定表单
frame = pd.read_excel('examples/ex1.xlsx', 'Sheet1')
frame.to_excel('examples/ex2.xlsx')        # 写出（可配合 pd.ExcelWriter 写多表）
```

### Web API 交互

多数网站提供 JSON 格式的公共 API。使用 `requests` 发送 HTTP 请求，返回的 JSON 可直接导入 DataFrame：

```python
import requests
url = 'https://api.github.com/repos/pandas-dev/pandas/issues'
resp = requests.get(url)          # HTTP GET，200 表示成功
data = resp.json()                # 解析 JSON 为 Python 对象
issues = pd.DataFrame(data, columns=['number', 'title', 'labels', 'state'])
```

### 数据库交互

商业场景中多数数据存储在 SQL 数据库中。两种连接方式：

```python
# 方式一：原生驱动（sqlite3 内置于 Python）
import sqlite3
con = sqlite3.connect('mydata.sqlite')
cursor = con.execute('select * from test')
rows = cursor.fetchall()          # 元组列表
pd.DataFrame(rows, columns=[x[0] for x in cursor.description])

# 方式二：SQLAlchemy（推荐，统一不同数据库的差异）
import sqlalchemy as sqla
db = sqla.create_engine('sqlite:///mydata.sqlite')   # 可更换为 postgresql:// 等
pd.read_sql('select * from test', db)
```

> `pd.read_sql(query, engine)` 可将 SQL 查询结果直接转为 DataFrame；配合 `df.to_sql('table', engine)` 实现 pandas 与数据库的双向读写。

---

## 数据清洗与准备

**本章目标**：理解数据清洗在数据分析中的地位；掌握缺失值、重复值、异常值的处理方法；学会使用映射、离散化、哑变量进行特征工程；掌握字符串与正则处理。

### 数据清洗的重要性

数据流水线中，清洗与规整通常占分析师 80% 的时间。原因在于生产环境的数据较少直接可用，常见问题包括：

- 缺失（问卷未填写、传感器故障、字段废弃）；
- 重复（重复录入、多源合并）；
- 格式混乱（大小写、空格、拼写变体、编码问题）；
- 异常值（录入错误、极端事件）。

pandas 与 Python 标准库提供了相应的数据整形工具。本章目标是使数据达到可供分析的整洁状态。

### 处理缺失数据

#### 缺失值的表示与检测

pandas 以多种方式表示缺失：数值列使用 `NaN`（Not a Number，浮点哨兵值）；对象列中 `None` 与 `NaN` 可混存；pandas 3.0 起默认的字符串列（Arrow 存储）与可空扩展类型使用 `pd.NA` 表示缺失。无论容器为何，检测统一由 `isna`/`notna`（`isnull`/`notnull` 为其别名）完成：

```python
string_data = pd.Series(['aardvark', 'artichoke', np.nan, 'avocado'])
string_data.isnull()
# 0    False
# 1    False
# 2     True
# 3    False
```

> 缺失值（NA）具有统计含义：可能表示"不存在"或"存在但未观测到"（数据采集问题）。清洗前应对缺失数据本身进行分析（缺失率、缺失模式），以发现数据采集问题或潜在偏差。直接删除是最简单但风险最高的做法。

#### 滤除缺失：dropna

```python
data = pd.Series([1, np.nan, 3.5, np.nan, 7])
data.dropna()                  # 等价 data[data.notnull()]

df = pd.DataFrame([[1., 6.5, 3.], [1., np.nan, np.nan],
                   [np.nan, np.nan, np.nan], [np.nan, 6.5, 3.]])
df.dropna()                    # 默认丢弃任何含 NA 的行
df.dropna(how='all')           # 只丢弃全为 NA 的行
df.dropna(axis=1, how='all')   # 丢弃全为 NA 的列
df.dropna(thresh=2)            # 保留至少 2 个非 NA 值的行（时间序列常用）
```

> `thresh` 在时间序列中较为常用：某天仅缺一个观测则保留，缺失过多才丢弃。

#### 填充缺失：fillna

删除会连带丢失数据，更精细的做法是填充：

```python
df.fillna(0)                        # 常数填充
df.fillna({1: 0.5, 2: 0})           # 按列字典填充
df.ffill()                          # 前向填充（使用上一个有效值；fillna(method=...) 已弃用）
df.ffill(limit=2)                   # 限制连续填充次数
data.fillna(data.mean())            # 用均值/中位数填充（分组填充见"数据聚合与分组运算"一章）
# 需要就地修改时直接重新赋值：df = df.fillna(0)（inplace 参数已不推荐）
```

> 填充策略需结合业务判断：时间序列多用前向/后向填充；调查数据常用均值/中位数；建模场景常用中位数（对异常值稳健）。不存在普遍适用的方案。

### 数据转换

#### 移除重复数据

```python
data.duplicated()                     # 各行是否为重复行
data.drop_duplicates()                # 去重（默认保留首次出现）
data.drop_duplicates(['k1'])          # 按指定列判断重复
data.drop_duplicates(['k1', 'k2'], keep='last')   # 保留最后一次
```

#### 使用映射做值转换：map

适用场景：某列的值是代码或缩写，需要转换为可读类别（数据字典操作）：

```python
meat_to_animal = {'bacon': 'pig', 'pulled pork': 'pig', 'pastrami': 'cow',
                  'corned beef': 'cow', 'honey ham': 'pig', 'nova lox': 'salmon'}
data['animal'] = data['food'].str.lower().map(meat_to_animal)   # 先统一大小写再映射
data['food'].map(lambda x: meat_to_animal[x.lower()])
```

#### 替换值：replace

```python
data.replace(-999, np.nan)                 # 单值替换（-999 常作缺失哨兵值）
data.replace([-999, -1000], np.nan)        # 多值替换为同一值
data.replace([-999, -1000], [np.nan, 0])   # 多值逐一替换
data.replace({-999: np.nan, -1000: 0})     # 字典形式
```

#### 重命名轴索引

```python
data.index = data.index.map(transform)         # 就地修改索引
data.rename(index=str.title, columns=str.upper)   # 返回新对象（str.title/str.upper 作为函数传入）
data.rename(index={'OHIO': 'INDIANA'}, columns={'three': 'peekaboo'})
data = data.rename(index={'OHIO': 'INDIANA'})   # 需要就地时直接重新赋值
```

#### 离散化与面元划分：cut 与 qcut

把连续变量划分为区间（面元 bin）是特征工程的基础操作，可将年龄划分为年龄段、将金额划分为金额档，使连续值变为有序分类：

```python
ages = [20, 22, 25, 27, 21, 23, 37, 31, 61, 45, 41, 32]
bins = [18, 25, 35, 60, 100]
cats = pd.cut(ages, bins)              # 按给定边界切分
cats.codes                             # 各值所在面元编码（0,1,2,3）
cats.categories                        # 面元边界（区间对象）
cats.value_counts()                  # 各面元计数（新版写法；顶层 pd.value_counts 已不推荐）

pd.cut(ages, bins, labels=['Youth', 'YoungAdult', 'MiddleAged', 'Senior'])  # 命名
pd.cut(data, 4, precision=2)           # 传数量：按数值范围切等长面元
pd.qcut(data, 4)                       # 按分位数切：每个面元样本数相等
pd.qcut(data, [0, 0.1, 0.5, 0.9, 1.])  # 自定义分位数
```

> `cut` 与 `qcut` 的区别：`cut` 按值域等宽切分（各面元样本数可能差异较大）；`qcut` 按分位数切分（各面元样本数相等）。分布偏斜的数据使用 `qcut` 更为合理。

#### 检测和过滤异常值

```python
col = data[2]
col[np.abs(col) > 3]                   # 单列中绝对值 >3 的值
data[(np.abs(data) > 3).any(1)]        # 含异常值的所有行
data[np.abs(data) > 3] = np.sign(data) * 3   # 截断（winsorize）到 [-3, 3]
```

> 异常值的处理方式有三：保留（可能为真实极端事件）、过滤（确认是错误）、截断（保留信息但限制影响）。应先观察分布再决定，不应默认删除。

#### 排列与随机采样

```python
rng = np.random.default_rng()
df.take(rng.permutation(len(df)))     # 随机重排行
df.sample(n=3)                            # 无放回随机采样
choices.sample(n=10, replace=True)        # 有放回采样（自助法 bootstrap）
```

#### 计算指标/哑变量

统计模型与机器学习算法仅接受数值输入。将 k 个类别的分类变量转换为 k 列 0/1 指标（每行在所属类别列上为 1），称为哑变量（dummy variable）或 one-hot 编码：

```python
df = pd.DataFrame({'key': ['b', 'b', 'a', 'c', 'a', 'b'], 'data1': range(6)})
pd.get_dummies(df['key'])                              # 哑变量矩阵
dummies = pd.get_dummies(df['key'], prefix='key')      # 加前缀便于识别
df[['data1']].join(dummies)                            # 与原表拼接

# 一行属于多个类别（如电影类型 "Action|Adventure"）：先拆再编码
genres = pd.unique(all_genres)
dummies = pd.DataFrame(np.zeros((len(movies), len(genres))), columns=genres)
for i, gen in enumerate(movies.genres):
    dummies.iloc[i, dummies.columns.get_indexer(gen.split('|'))] = 1

# 常见组合：连续值离散化后转哑变量
pd.get_dummies(pd.cut(values, bins))
```

### 字符串操作

#### 字符串方法速查

```python
val = 'a,b,  guido'
val.split(',')                    # ['a', 'b', '  guido']
[x.strip() for x in val.split(',')]   # 配合 strip 去首尾空白
'::'.join(['a', 'b', 'guido'])    # 'a::b::guido'
'guido' in val                    # 子串检测
val.index(',')                    # 1（找不到抛 ValueError）
val.find(':')                     # -1（找不到返回 -1）
val.count(',')                    # 2
val.replace(',', '::')            # 替换
```

#### 正则表达式

正则表达式（regex）以特殊语法描述字符串模式。基本操作包括：`split`（按模式拆分）、`findall`（找出所有匹配）、`sub`（按模式替换）。对同一模式多次使用时，应通过 `re.compile` 编译复用：

```python
import re
text = "foo    bar\t baz  \tqux"
re.split('\s+', text)                        # ['foo', 'bar', 'baz', 'qux']
regex = re.compile('\s+')                    # 编译复用
regex.findall(text)                          # ['    ', '\t ', '  \t']
regex.search(text)                           # 第一个匹配对象
regex.sub('REDACTED', text)                  # 替换

# 分组捕获：用 () 分组，\1 \2 引用
pattern = r'([A-Z0-9._%+-]+)@([A-Z0-9.-]+)\.([A-Z]{2,4})'
email_re = re.compile(pattern)               # 编译复用
m = email_re.match('wesm@bright.net')
m.groups()                                   # ('wesm', 'bright', 'net')
email_re.sub(r'Username: \1, Domain: \2, Suffix: \3', 'Contact: wesm@bright.net')
# 'Contact: Username: wesm, Domain: bright, Suffix: net'
```

> 正则表达式的完整内容可独立成书。日常数据分析中，掌握 `\d`、`\w`、`\s`、`+`、`*`、`?`、`[]`、`()`、`^`、`$` 等基础符号即可解决多数问题。

#### pandas 的矢量化字符串方法：str 属性

`Series.str` 提供跳过缺失值的矢量化字符串操作：对 Series 应用字符串方法或正则时，NA 自动传播而不报错，是清洗整列文本的标准方式：

```python
data = pd.Series({'Dave': 'dave@google.com', 'Rob': 'rob@gmail.com',
                  'Steve': 'steve@gmail.com', 'Wes': np.nan})
data.str.contains('gmail')          # 逐元素检测（Wes -> NaN 不报错）
data.str.findall(pattern, flags=re.IGNORECASE)
data.str[:5]                        # 截取前 5 个字符
data.str.lower()                    # 统一小写
data.str.split('@').str[1]          # 先拆分再取第 1 段
```

常用方法：`lower/upper/title`、`strip`、`split`、`join`、`contains`、`replace`、`findall`、`startswith/endswith`、`extract`（正则提取）、`len`、`get`。

**本章小结**：清洗操作包括四类——缺失值（`dropna`/`fillna`）、重复值（`drop_duplicates`）、异常值（过滤/截断）、格式统一（`map`/`replace`/`str` 方法）；特征工程包含两类主要工具——`cut`/`qcut` 离散化与 `get_dummies` 哑变量。

---

## 数据规整：合并、重塑与旋转

**本章目标**：掌握多表合并（merge/concat/combine_first）与数据重塑（stack/unstack、pivot/melt）两类操作，将分散的数据组合为可分析的形态。

### 层次化索引（MultiIndex）

层次化索引使一个轴拥有多个索引级别，从而以低维度结构表达高维度数据，是一系列高级操作（分组、透视表、重塑）的底层机制：

```python
rng = np.random.default_rng(42)
data = pd.Series(rng.standard_normal(9),
                 index=[['a', 'a', 'a', 'b', 'b', 'c', 'c', 'd', 'd'],
                        [1, 2, 3, 1, 3, 1, 2, 2, 3]])
# a  1   -0.2047
#    2    0.4789
#    ...

data['b']              # 部分索引：按一级索引取
data.loc[:, 2]         # 内层选取
data.unstack()         # 内层索引"旋转"为列 -> DataFrame
data.unstack().stack() # stack 是逆运算（默认滤除缺失）
```

常用操作：

```python
frame.index.names = ['key1', 'key2']    # 级别命名
frame.swaplevel('key1', 'key2')         # 交换级别顺序
frame.sort_index(level=1)               # 按指定级别排序
frame.groupby(level='key2').sum()          # 按级别汇总统计（聚合方法的 level= 已弃用，改用 groupby）

# 列转索引 / 索引转列
frame2 = frame.set_index(['c', 'd'])    # 将列设为行索引
frame.set_index(['c', 'd'], drop=False) # 保留原列
frame2.reset_index()                    # 反向：索引变回列
```

### 合并数据集：merge

#### 连接类型

pandas 的 `how` 参数与 SQL 的四类连接对应：

| how | 含义 | 保留的行 |
|---|---|---|
| `'inner'`（默认） | 内连接 | 两表都有的键 |
| `'left'` | 左连接 | 左表全部 + 右表匹配 |
| `'right'` | 右连接 | 右表全部 + 左表匹配 |
| `'outer'` | 外连接 | 两表键的并集，缺失处 NaN |

```python
df1 = pd.DataFrame({'key': ['b', 'b', 'a', 'c', 'a', 'a', 'b'],
                    'data1': range(7)})
df2 = pd.DataFrame({'key': ['a', 'b', 'd'], 'data2': range(3)})

pd.merge(df1, df2)                  # 自动以重叠列名为键（建议显式 on='key'）
pd.merge(df1, df2, on='key')        # 显式指定键
pd.merge(df3, df4, left_on='lkey', right_on='rkey')   # 两表键名不同
pd.merge(df1, df2, how='outer')     # 外连接：c、d 的行也会出现（NaN 补齐）
pd.merge(left, right, on=['key1', 'key2'])            # 多键合并
pd.merge(left, right, on='key1', suffixes=('_left', '_right'))  # 重名列加后缀
```

> 多对多合并会产生笛卡尔积：左表 3 个 "b" 行与右表 2 个 "b" 行合并为 6 个 "b" 行。这是预期行为，但应注意行数会相应膨胀。

#### 索引上的合并

连接键位于索引时，使用 `left_index`/`right_index` 或 `join`：

```python
pd.merge(left1, right1, left_on='key', right_index=True)  # 左表列 + 右表索引
pd.merge(left2, right2, how='outer', left_index=True, right_index=True)
left2.join(right2, how='outer')      # join 专为按索引合并设计（默认左连接）
left1.join(right1, on='key')         # 左表列 + 右表索引
left2.join([right2, another])        # 一次连接多个
```

### 轴向连接：concat

`concat` 沿一条轴堆叠多个对象，用于拼接分散的同类数据（如按年分文件的数据）：

```python
pd.concat([s1, s2, s3])                  # 默认 axis=0 纵向堆叠
pd.concat([s1, s2, s3], axis=1)          # axis=1 变 DataFrame（外连接并集）
pd.concat([s1, s4], axis=1, join='inner')  # 交集（默认外连接）
pd.concat([s1, s1, s3], keys=['one', 'two', 'three'])  # 生成层次化索引
pd.concat([df1, df2], axis=1, keys=['level1', 'level2'], names=['upper', 'lower'])
pd.concat([df1, df2], ignore_index=True)   # 忽略原索引
```

> `ignore_index=True` 是较易忽略的参数：纵向拼接多个带默认整数索引的 DataFrame 时，若不忽略原索引会导致重复索引。原书中的 `df.append()` 已在 pandas 2.0 移除，统一使用 `pd.concat`。

### 合并重叠数据：combine_first

两个数据集索引部分重叠时，可用其中一个为另一个的缺失值填充：

```python
b[:-2].combine_first(a[2:])    # Series：b 的非缺失值优先，其余补 a
df1.combine_first(df2)         # DataFrame：同样逻辑逐列生效
```

### 重塑：长格式与宽格式

#### 两种格式

| 格式 | 特点 | 典型来源 |
|---|---|---|
| 宽格式（wide） | 每个变量一列，一行一个观测对象 | Excel 报表、透视表结果 |
| 长格式（long/stacked） | 每个观测一行，变量名存放于"变量列" | 数据库存储、统计建模输入 |

数据分析中大量时间用于两种格式之间的转换：`stack`/`unstack`（行列互转）、`pivot`（长→宽）、`melt`（宽→长）。

```python
# stack：列 -> 行（宽变长）
result = data.stack()
# unstack：行 -> 列（长变宽）
result.unstack()
result.unstack(0)            # 指定级别
data2.unstack().stack(dropna=False)   # stack 默认滤除缺失

# pivot：长 -> 宽（指定 行键、列键、值列）
pivoted = ldata.pivot('date', 'item', 'value')
# pivot 本质 = set_index(['date','item']).unstack('item') 再选列

# melt：宽 -> 长（指定 分组指标列）
melted = pd.melt(df, ['key'])                 # key 保留，其余列合并
pd.melt(df, id_vars=['key'], value_vars=['A', 'B'])   # 只合并指定列
reshaped = melted.pivot('key', 'variable', 'value')   # 转回宽格式
```

> 记忆方式：`melt` 将多列合并为 `variable`（原列名）与 `value`（原值）两列；`pivot` 是其逆运算。

---

## 绘图与可视化

**本章目标**：理解 matplotlib 的 Figure-Axes 对象模型；掌握常用图元素设置；学会使用 pandas 绘图方法与 seaborn 进行统计可视化。

### 可视化的目的与工具分层

可视化的目的包括探索（发现异常、观察分布、验证假设）与沟通（呈现结论）。Python 可视化生态分为三层：

- **matplotlib**：底层绘图库，对象模型精细，功能全面，但需自行组装各元素；
- **pandas 绘图方法**：`df.plot()` 系列，将 DataFrame 直接绘制为图表，是常用的快捷方式；
- **seaborn**：基于 matplotlib 的高层统计可视化库，可直接传入 DataFrame 与列名，自动完成分组统计、置信区间与样式设置。

工作流建议：探索阶段使用 pandas/seaborn 快速出图；需要精细控制（出版、定制）时使用 matplotlib API。

### matplotlib 的对象模型：Figure 与 Axes

matplotlib 的所有绘图均围绕两个对象：

- **Figure**（画布）：整个图形窗口/文件；
- **Axes**（坐标系）：画布上的一个绘图区域（可有多个，称为 subplot）。

```python
import matplotlib.pyplot as plt
%matplotlib inline          # Jupyter 中图表内嵌（交互式使用 %matplotlib widget）

fig, ax = plt.subplots()    # 同时创建 Figure 和 Axes（推荐写法）
ax.plot([1.5, 3.5, -2, 1.6])      # 在 ax 上绘图

# 多子图：plt.subplots 返回 axes 数组
fig, axes = plt.subplots(2, 3)          # 2 行 3 列
rng = np.random.default_rng()
axes[0, 1].hist(rng.standard_normal(100), bins=20, color='k', alpha=0.3)
fig, axes = plt.subplots(2, 2, sharex=True, sharey=True)  # 共享坐标轴
plt.subplots_adjust(wspace=0, hspace=0)                   # 调整间距
```

> 应优先使用面向对象风格（`ax.plot(...)`、`ax.set_title(...)`）而非 `plt.plot(...)`、`plt.title(...)`：后者操作"当前轴"，在多子图时可能出错。`plt.` 前缀的函数适合快速草图。

#### 颜色、标记、线型

```python
rng = np.random.default_rng()
ax.plot(x, y, 'g--')                        # 缩写：绿 虚线
ax.plot(x, y, linestyle='--', color='g')    # 显式写法
plt.plot(rng.standard_normal(30).cumsum(), 'ko--')    # 黑 圆点 虚线（标记+线型）
ax.plot(data, 'k-', drawstyle='steps-post', label='Steps')
ax.legend(loc='best')                       # 图例（有 label 才显示）
```

#### 刻度、标签、图例

```python
ax.set_xticks([0, 250, 500, 750, 1000])                 # 刻度位置
ax.set_xticklabels(['one', 'two', 'three', 'four', 'five'],
                   rotation=30, fontsize='small')        # 刻度标签
ax.set_title('My first matplotlib plot')
ax.set_xlabel('Stages')
ax.set_ylabel('Values')
ax.legend(loc='best')
ax.set(xlim=(0, 10), ylim=(-1, 1))   # 批量设置
```

#### 注解、图形与保存

```python
ax.text(x, y, 'Hello world!', family='monospace', fontsize=10)
ax.annotate('Lehman Bankruptcy', xy=(date, spx.asof(date) + 75),
            xytext=(date, spx.asof(date) + 225),
            arrowprops=dict(facecolor='black', headwidth=4, headlength=4))

# 图形（patch）对象：矩形、圆、多边形
rect = plt.Rectangle((0.2, 0.75), 0.4, 0.15, color='k', alpha=0.3)
circ = plt.Circle((0.7, 0.2), 0.15, color='b', alpha=0.3)
ax.add_patch(rect); ax.add_patch(circ)

# 保存：扩展名决定格式
plt.savefig('figpath.png', dpi=400, bbox_inches='tight')   # 高分辨率、去除白边
```

#### 样式系统

```python
plt.style.use('seaborn-v0_8')    # 新版样式名（旧 'seaborn' 已失效）
print(plt.style.available)       # 查看全部可用样式
plt.rc('figure', figsize=(10, 10))    # 全局默认图大小
plt.rc('font', family='monospace', weight='bold', size='small')
```

#### 中文字体显示

matplotlib 的默认字体不含中文字符，图表出现中文标签时会显示为方块。常用解决方案是全局指定中文字体，并关闭负号的特殊渲染（否则负号也会显示为方块）：

```python
plt.rcParams['font.sans-serif'] = ['SimHei']     # Windows 黑体（macOS 可用 'PingFang SC'、'Arial Unicode MS'）
plt.rcParams['axes.unicode_minus'] = False       # 解决负号显示为方块的问题
```

设置后 `ax.set_title('中文标题')` 即可正常显示。若系统没有所需字体，可先注册字体文件（如思源黑体）再将其加入列表：

```python
import matplotlib.font_manager as fm
fm.fontManager.addfont('path/to/SourceHanSansSC-Regular.otf')
plt.rcParams['font.sans-serif'] = ['Source Han Sans SC']
```

### pandas 绘图方法

pandas 将 `plot` 方法挂载于 DataFrame/Series，索引自动成为 X 轴：

```python
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(10).cumsum(), index=np.arange(0, 100, 10))
s.plot()                              # 线图
df.plot()                             # DataFrame 各列一条线，自动图例
df.plot(subplots=True, layout=(2, 2)) # 每列单独子图
```

常用图表类型（`df.plot.kind` 或 `df.plot(kind=...)`）：

| 方法 | 图表 | 典型用途 |
|---|---|---|
| `df.plot.line()` | 线图 | 趋势（尤其时间序列） |
| `df.plot.bar()` / `.barh()` | 柱状图 | 类别比较 |
| `df.plot.hist()` | 直方图 | 单变量分布 |
| `df.plot.density()` | 密度图 | 平滑分布估计 |
| `df.plot.scatter(x, y)` | 散点图 | 两变量关系 |
| `df.plot.box()` | 盒图 | 分布与离群点 |
| `df.plot.area()` | 面积图 | 累计占比 |

```python
data.plot.bar(ax=axes[0], color='k', alpha=0.7)   # 垂直柱状图
data.plot.barh(ax=axes[1], color='k', alpha=0.7)  # 水平
df.plot.bar(stacked=True, alpha=0.5)              # 堆积柱状图
s.value_counts().plot.bar()                       # 频数柱状图
```

小费数据集实例（交叉表 + 归一化 + 柱状图）：

```python
tips = pd.read_csv('examples/tips.csv')
party_counts = pd.crosstab(tips['day'], tips['size'])
party_counts = party_counts.loc[:, 2:5]                    # 去掉极端规模
party_pcts = party_counts.div(party_counts.sum(1), axis=0) # 每行归一化到 1
party_pcts.plot.bar()
```

### seaborn：统计可视化

seaborn 的特点是数据驱动：直接传入 DataFrame 与列名，自动完成分组统计、置信区间与配色。注意新版（0.13+）API 变化：`sns.set()` 改为 `sns.set_theme()`；`distplot` 改为 `histplot`/`kdeplot`/`displot`；`factorplot` 改为 `catplot`。

```python
import seaborn as sns
sns.set_theme(style="whitegrid")     # 新版主题设置（旧 sns.set 已弃用）

tips['tip_pct'] = tips['tip'] / (tips['total_bill'] - tips['tip'])

# 柱状图：自动聚合均值 + 95% 置信区间误差条
sns.barplot(x='tip_pct', y='day', data=tips)
sns.barplot(x='tip_pct', y='day', hue='time', data=tips)   # hue 增加分组维度

# 分布图：直方图 + 密度
tips['tip_pct'].plot.hist(bins=50)             # pandas 直方图
sns.histplot(tips['tip_pct'], bins=50, kde=True)   # 新版替代 distplot
sns.displot(tips['tip_pct'], bins=100, kde=True)   # 分面版

# 关系图
sns.regplot(x='m1', y='unemp', data=trans_data)    # 散点 + 回归线
sns.pairplot(trans_data, diag_kind='kde', plot_kws={'alpha': 0.2})  # 散布图矩阵

# 分面网格（新版替代 factorplot）
sns.catplot(x='day', y='tip_pct', hue='time', col='smoker',
            kind='bar', data=tips[tips.tip_pct < 0.5])
sns.catplot(x='tip_pct', y='day', kind='box', data=tips[tips.tip_pct < 0.5])
```

seaborn 主要图表类型：

| 函数 | 用途 |
|---|---|
| `sns.barplot` / `sns.countplot` | 分类对比 / 计数 |
| `sns.histplot` / `sns.kdeplot` | 单变量分布 |
| `sns.boxplot` / `sns.violinplot` | 分布与离群点 |
| `sns.scatterplot` / `sns.regplot` | 两变量关系 |
| `sns.pairplot` / `sns.heatmap` | 多变量探索 / 相关矩阵 |
| `sns.catplot` | 分面网格通用入口 |

> `sns.heatmap(df.corr(), annot=True)` 是检查多列相关性的常用方式，相关矩阵热力图在探索性分析中应用广泛。

> 交互式可视化：Bokeh、Plotly 支持浏览器中的缩放与平移；静态出版图仍以 matplotlib 与 seaborn 为默认选择。

---

## 数据聚合与分组运算

**本章目标**：理解拆分–应用–合并（split-apply-combine）范式；掌握 groupby 的聚合、转换、apply 三种用法；会使用透视表与交叉表汇总多维数据。

### 核心概念：split-apply-combine 范式

"按某列分组，再对每组执行某种操作"是数据分析中出现频率较高的操作。统计学家 Hadley Wickham 将其抽象为 split-apply-combine 三步：

1. **拆分（split）**：按一个或多个键，将数据分为若干组；
2. **应用（apply）**：对每个分组应用一个函数（聚合、转换或过滤）；
3. **合并（combine）**：将各组结果组装为最终对象。

```
DataFrame ──split──▶ [组1, 组2, ...] ──apply──▶ [结果1, 结果2, ...] ──combine──▶ 结果
```

关键认知：`groupby` 本身是惰性的——它只记录分组信息，不进行计算；直到调用聚合方法（`mean`、`sum`、`agg`、`apply` 等）才真正执行。分组键的形式灵活：列名、等长数组、字典/Series（映射）、函数（处理索引）均可。

### GroupBy 机制

```python
rng = np.random.default_rng(42)
df = pd.DataFrame({'key1': ['a', 'a', 'b', 'b', 'a'],
                   'key2': ['one', 'two', 'one', 'two', 'one'],
                   'data1': rng.standard_normal(5),
                   'data2': rng.standard_normal(5)})

grouped = df['data1'].groupby(df['key1'])   # 惰性对象，尚未计算
grouped.mean()                              # 触发计算：分组均值

df.groupby('key1').mean()                   # 直接按列名分组（所有数值列聚合）
df.groupby(['key1', 'key2']).mean()         # 多键分组 -> 层次化索引
df.groupby(['key1', 'key2']).size()         # 分组大小（各组行数）
```

分组键的四种形式：

```python
# 1) 等长数组/列表
df['data1'].groupby([states, years]).mean()

# 2) DataFrame 列名（最常用）
df.groupby('key1').mean()

# 3) 字典或 Series：将索引/列映射到分组名
mapping = {'a': 'red', 'b': 'red', 'c': 'blue', 'd': 'blue', 'e': 'red'}
people.T.groupby(mapping).sum().T          # 对"列"分组（groupby 的 axis= 已弃用，改用转置）

# 4) 函数：对每个索引值调用，返回值作为分组名
people.groupby(len).sum()                   # 按索引字符串长度分组
people.groupby([len, key_list]).min()       # 函数与数组混合

# 按索引级别分组（层次化索引）
hier_df.T.groupby(level='cty').count().T   # 按索引级别分组（同样以转置替代 axis=1）
```

对分组迭代可了解其内部结构：

```python
for name, group in df.groupby('key1'):
    print(name)
    print(group)
pieces = dict(list(df.groupby('key1')))     # 转为 {分组名: 子DataFrame}
```

选取部分列聚合（语法糖）：`df.groupby('key1')['data1'].mean()` 等价于 `df['data1'].groupby(df['key1']).mean()`。

### 数据聚合：agg

聚合（aggregation）指从数组产生标量的转换。pandas 内置了多种优化过的聚合方法：`count`、`sum`、`mean`、`median`、`std`、`var`、`min`、`max`、`prod`、`first`、`last`、`quantile`。

```python
grouped['data1'].quantile(0.9)              # 90% 分位数

def peak_to_peak(arr):
    return arr.max() - arr.min()
grouped.agg(peak_to_peak)                   # 自定义聚合函数

# 多函数聚合：结果列以函数名命名
grouped_pct.agg(['mean', 'std', peak_to_peak])
grouped_pct.agg([('foo', 'mean'), ('bar', np.std)])   # 元组自定义列名

# 不同列应用不同函数（字典形式）
grouped.agg({'tip': np.max, 'size': 'sum'})
grouped.agg({'tip_pct': ['min', 'max', 'mean', 'std'], 'size': 'sum'})

# 现代写法：命名聚合（named aggregation），一步指定列名
grouped.agg(avg_tip=('tip_pct', 'mean'),
            max_tip=('tip_pct', 'max'),
            total_size=('size', 'sum'))

# 不以分组键为索引返回
tips.groupby(['day', 'smoker'], as_index=False).mean()
```

> 自定义聚合函数明显慢于内置方法（每次调用存在 Python 函数开销）。应优先使用内置方法或字符串别名；性能敏感时可考虑在 `agg` 中使用矢量化表达式。

### apply：通用的分组方法

`apply` 接受返回任何对象（标量、Series、DataFrame）的函数，pandas 自动组装结果：

```python
def top(df, n=5, column='tip_pct'):
    return df.sort_values(by=column)[-n:]
tips.groupby('smoker').apply(top)                 # 每组取 tip_pct 最高的 5 行
tips.groupby(['smoker', 'day']).apply(top, n=1, column='total_bill')  # 传额外参数
tips.groupby('smoker', group_keys=False).apply(top)   # 禁止分组键进入结果索引

# describe 的本质即 apply
result = tips.groupby('smoker')['tip_pct'].describe()
```

典型应用模式：

```python
# 分位数/面元分析：cut + groupby
quartiles = pd.cut(frame.data1, 4)
frame.data2.groupby(quartiles).apply(get_stats).unstack()

# 用分组均值填充缺失值（不同组不同填充值）
fill_mean = lambda g: g.fillna(g.mean())
data.groupby(group_key).apply(fill_mean)
fill_values = {'East': 0.5, 'West': -1}
data.groupby(group_key).apply(lambda g: g.fillna(fill_values[g.name]))

# 分组随机采样
deck.groupby(get_suit).apply(draw, n=2)

# 分组加权平均
grouped.apply(lambda g: np.average(g['data'], weights=g['weights']))

# 分组线性回归（statsmodels）
def regress(data, yvar, xvars):
    Y = data[yvar]; X = data[xvars]; X['intercept'] = 1.
    return sm.OLS(Y, X).fit().params
by_year.apply(regress, 'AAPL', ['SPX'])
```

### 透视表与交叉表

透视表（pivot table）是按行键和列键进行二维分组聚合的工具。`pivot_table` 本质是 `groupby` 与 `unstack` 的封装，额外支持 `margins`（分项小计）：

```python
tips.pivot_table(index=['day', 'smoker'])                     # 默认均值
tips.pivot_table(['tip_pct', 'size'], index=['time', 'day'],
                 columns='smoker')                            # 行列分组
tips.pivot_table(['tip_pct', 'size'], index=['time', 'day'],
                 columns='smoker', margins=True)              # 分项小计 All
tips.pivot_table('tip_pct', index=['time', 'smoker'],
                 columns='day', aggfunc=len, margins=True)    # 计数
tips.pivot_table('tip_pct', index=['time', 'size', 'smoker'],
                 columns='day', aggfunc='mean', fill_value=0) # 空组合填 0
```

交叉表（crosstab）是专用于分组频率的特殊透视表：

```python
pd.crosstab(data.Nationality, data.Handedness, margins=True)
pd.crosstab([tips.time, tips.day], tips.smoker, margins=True)
```

> 关键参数：`aggfunc` 指定聚合函数（默认 `'mean'`）、`margins` 是否添加小计、`fill_value` 空组合填充值、`dropna` 是否排除全 NA 组合。

**本章小结**：groupby 为惰性操作，支持四种分组键；聚合使用 `agg`（内置方法、自定义函数、命名聚合）；`apply` 最为灵活；多维汇总使用 `pivot_table`/`crosstab`。

---

## 时间序列分析

**本章目标**：理解时间戳、时期、时间间隔三类时间数据；掌握日期解析、频率生成、移动、重采样、移动窗口五组核心工具。

### 时间序列的概念

时间序列（time series）是按时间顺序观测的数据，应用广泛，如股价、气温、服务器日志、销量。pandas 的 `DatetimeIndex` 支持亚秒级（最高纳秒）精度时间戳（pandas 3.0 的 Arrow 后端亦支持微秒精度），并提供频率、重采样、滑动窗口等工具，这是 pandas 相对其他表格工具的优势之一。

时间数据有三种形态，需按形态选择工具：

| 形态 | 含义 | pandas 表示 |
|---|---|---|
| 时间戳（timestamp） | 特定的时刻 | `Timestamp` / `DatetimeIndex` |
| 时期（period） | 一段时间区间（如"2024 年 3 月"） | `Period` / `PeriodIndex` |
| 时间间隔（interval） | 起止时间戳表示的一段 | `Interval` / `IntervalIndex` |

### 日期解析：字符串与 datetime 的转换

```python
from datetime import datetime, timedelta

# 标准库
stamp = datetime(2011, 1, 3)
stamp.strftime('%Y-%m-%d')                  # datetime -> 字符串
datetime.strptime('2011-01-03', '%Y-%m-%d') # 字符串 -> datetime

# dateutil 智能解析（可解析多数人类可读格式）
from dateutil.parser import parse
parse('Jan 31, 1997 10:45 PM')
parse('6/12/2011', dayfirst=True)           # 日在前

# pandas 批量解析（处理成组日期的主要工具）
pd.to_datetime(['2011-07-06 12:00:00', '2011-08-06 00:00:00'])
pd.to_datetime(['2011-07-06', None])        # 缺失 -> NaT（Not a Time）
```

> 读取 CSV 时，可在 `read_csv` 中通过 `parse_dates=['date_col']` 一次完成日期解析。

### 时间序列基础

```python
rng = np.random.default_rng(42)
ts = pd.Series(rng.standard_normal(6), index=dates)   # datetime 索引
ts.index                       # DatetimeIndex（dtype='datetime64[ns]'）
ts + ts[::2]                   # 算术运算自动按日期对齐

# 切片与索引
ts['1/10/2011']                # 字符串日期索引
longer_ts['2001']              # 按年切片（整年数据）
longer_ts['2001-05']           # 按年月切片
ts['1/6/2011':'1/11/2011']     # 日期范围切片（视图，含端点）
ts.truncate(after='1/9/2011')  # 截取到指定日期

# 重复时间戳：按日期聚合
dup_ts['1/2/2000']             # 重复时间戳返回 Series
dup_ts.groupby(level=0).mean() # 按日期分组取均值
```

### 日期范围与频率

#### date_range：生成固定频率日期序列

```python
pd.date_range('2012-04-01', '2012-06-01')            # 默认按天（D）
pd.date_range(start='2012-04-01', periods=20)        # 指定长度
pd.date_range('2012-05-02 12:56:31', periods=5, normalize=True)  # 规范化到午夜
```

#### 频率代码

pandas 以字符串别名表示频率，如 `'D'`（天）、`'H'`（小时）、`'min'`（分钟，旧别名 `'T'`）。

> pandas 2.2 起频率代码更新：月末 `'M'` 改为 `'ME'`、年末 `'A'`/`'Y'` 改为 `'YE'`、季末 `'Q'` 改为 `'QE'`；旧代码在 pandas 3.0 中已不可用。工作日版本对应 `'BME'`、`'BYE'` 等。

```python
pd.date_range('2000-01-01', '2000-12-01', freq='BME')   # 每月最后工作日（新版）
pd.date_range('2000-01-01', '2000-01-03 23:59', freq='4h')   # 4 小时
pd.date_range('2000-01-01', periods=10, freq='90min')        # 90 分钟
pd.date_range('2012-01-01', '2012-09-01', freq='WOM-3FRI')   # 每月第 3 个周五
```

#### 移动（shift）：超前与滞后

`shift` 沿时间轴移动数据，是计算环比、同比变化的标准工具：

```python
ts.shift(2)                      # 数据后移 2 期，开头变 NaN
ts.shift(-2)                     # 前移
ts / ts.shift(1) - 1             # 计算百分比变化
ts.shift(2, freq='ME')           # 按时间戳位移（保留数据，仅改索引）
```

#### 日期偏移量（DateOffset）

```python
from pandas.tseries.offsets import Day, MonthEnd
now = datetime(2011, 11, 17)
now + 3 * Day()                  # datetime + 偏移量
now + MonthEnd()                 # 锚点偏移量：滚动到月末
offset = MonthEnd()
offset.rollforward(now); offset.rollback(now)   # 显式前后滚动
ts.groupby(offset.rollforward).mean()   # 按"滚动到月末"分组（等价 resample）
```

### 时区处理

时间戳以 UTC 存储（自 1970-01-01 起的纳秒数），展示时转换为目标时区。两步操作：`tz_localize`（赋予时区）与 `tz_convert`（转换时区）：

```python
from zoneinfo import ZoneInfo                     # 标准库时区（旧写法为第三方库 pytz）
ts_utc = ts.tz_localize('UTC')                    # 给 naive 时间戳赋予 UTC
ts_utc.tz_convert(ZoneInfo('America/New_York'))   # 转换到纽约时区（也可直接传时区名字符串）
ts.index.tz_localize('Asia/Shanghai')             # 索引级操作

# 不同时区的序列做运算 -> 自动统一为 UTC
ts1 = ts[:7].tz_localize('Europe/London')
ts2 = ts1[2:].tz_convert('Europe/Moscow')
result = ts1 + ts2                                # 结果索引为 UTC
```

### 时期（Period）与季度数据

时期表示时间区间（一个月、一个季度、一年），适用于财务、会计数据：

```python
p = pd.Period(2007, freq='YE-DEC')     # 年度时期（12 月结束的财年；旧代码 A-DEC 已不可用）
p + 5                                  # 位移: Period('2012', 'YE-DEC')
p.asfreq('ME', how='S')                # 转月初: Period('2007-01', 'ME')（how 用 'S'/'E'）
p.asfreq('ME', how='E')                # 转月末

rng = pd.period_range('2000-01-01', '2000-06-30', freq='ME')
pd.PeriodIndex(values, freq='QE-DEC')  # 季度时期

# 时间戳与时期互转
ts.to_period()                         # Timestamp -> Period
pts.to_timestamp(how='end')            # Period -> Timestamp
pd.PeriodIndex(year=data.year, quarter=data.quarter, freq='QE-DEC')  # 从列构建
```

### 重采样：频率转换

重采样（resampling）将时间序列从一个频率转换到另一个频率。降采样（高频→低频）需要聚合；升采样（低频→高频）需要插值：

```python
# 降采样：聚合
ts.resample('ME').mean()               # 按月均值（新版频率代码）
ts.resample('QE').sum()                # 按季求和
ts.resample('5min').sum()              # 5 分钟聚合
ts.resample('5min').ohlc()             # 金融 OHLC（开高低收）

# 降采样细节：closed（哪边闭合）与 label（如何标记）
ts.resample('5min', closed='right').sum()
ts.resample('5min', closed='right', label='right').sum()

# 升采样：插值
frame.resample('D').asfreq()           # 不聚合，引入缺失值
frame.resample('D').ffill()            # 前向填充
frame.resample('D').ffill(limit=2)     # 限制连续填充次数

# 时期数据重采样
annual_frame.resample('YE').mean()     # 年度聚合（新版代码）
annual_frame.resample('QE').ffill()    # 升采样目标频率须比源频率更细
```

> 降采样三要素：聚合函数（mean/sum/ohlc 等）、边界闭合（closed）、标签位置（label）。默认右闭、以右边界标记，这是金融 OHLC 数据的标准设定。

### 移动窗口函数

移动窗口函数在滑动的时间窗口上计算统计量（均值、标准差、相关系数等），用于平滑噪声、揭示趋势。三种操作符：

| 操作符 | 含义 | 用途 |
|---|---|---|
| `rolling(window)` | 固定窗口滑动 | 移动平均线、滚动波动率 |
| `expanding()` | 从起点不断扩大的窗口 | 累计统计量 |
| `ewm(span=...)` | 指数加权（近期权重更大） | 对变化更敏感的平滑 |

```python
close_px = close_px_all[['AAPL', 'MSFT', 'XOM']]
close_px = close_px.resample('B').ffill()   # 重采样为工作日

close_px.AAPL.rolling(250).mean().plot()              # 250 日均线
close_px.AAPL.rolling(250, min_periods=100).std()     # 最小非 NA 观测数
appl_std250.expanding().mean()                        # 扩展窗口均值
aapl_px.ewm(span=30).mean()                           # 指数加权移动平均
close_px.rolling('20D').mean()                        # 按时间窗口（处理不规则序列）

# 二元窗口：滚动相关系数（个股与大盘）
returns.AAPL.rolling(125, min_periods=100).corr(spx_rets).plot()

# 自定义窗口函数（scipy 统计函数）
from scipy.stats import percentileofscore
returns.AAPL.rolling(250).apply(lambda x: percentileofscore(x, 0.02)).plot()
```

**本章小结**：时间戳/时期/间隔三类数据需选择对应的容器；`to_datetime` 与 `parse_dates` 完成解析；`date_range` 与频率代码生成序列；`shift` 计算变化率；`resample` 完成频率转换；`rolling`/`expanding`/`ewm` 进行滑动分析。

---

## pandas 高级应用

**本章目标**：理解分类数据的编码机制与性能优势；掌握 transform 与 apply 的区别；学会使用链式编程组织数据处理流程。

### 分类数据（Categorical）

#### 分类编码的概念

表格中一列常只有少量不同取值却有大量重复（如性别、省份、品类）。分类（categorical）表示法以整数编码替代重复字符串：维护一个类别表（categories），数据本身只存储整数编码（codes）。这是数据仓库领域的常用做法，pandas 将其实现为原生类型。

其优势包括：内存占用显著减少（1000 万元素的字符串列约从 80MB 降至 10MB）；groupby 等操作更快（底层按整数分组）；自带有序类别语义，便于排序与建模。

```python
df['fruit'] = df['fruit'].astype('category')     # 转换
c = df['fruit'].values                            # pandas.Categorical 实例
c.categories      # Index(['apple', 'orange'])    # 类别表
c.codes           # array([0, 1, 0, 0, 0, 1, 0, 0], dtype=int8)

# 显式创建、有序分类
pd.Categorical(['foo', 'bar', 'baz', 'foo', 'bar'])
pd.Categorical.from_codes(codes, categories, ordered=True)   # foo < bar < baz

# 内存对比
labels = pd.Series(['foo', 'bar', 'baz', 'qux'] * 2500000, dtype=object)  # 1000 万元素（object 存储）
labels.memory_usage()                              # 80000080 字节
labels.astype('category').memory_usage()           # 10000272 字节（约 1/8）
```

> 注：pandas 3.0 起字符串默认使用 Arrow 存储（dtype 为 `str`），列本身已较紧凑，分类编码的实际收益取决于数据基数与重复度；上例用 `dtype=object` 复现了传统对象存储下的对比。

#### 分类与 qcut 结合

```python
bins = pd.qcut(draws, 4, labels=['Q1', 'Q2', 'Q3', 'Q4'])   # 返回有序分类
pd.Series(draws).groupby(bins).agg(['count', 'min', 'max']).reset_index()
```

#### 分类方法（cat 属性）

```python
cat_s = s.astype('category')
cat_s.cat.codes                                # 编码
cat_s.cat.categories                           # 类别
cat_s.cat.set_categories(actual_categories)    # 重设类别集（可含未出现的类别）
cat_s.cat.remove_unused_categories()           # 删除未出现的类别
cat_s.value_counts()                           # 计数（含 0 次类别）

# 建模：one-hot 编码
pd.get_dummies(cat_s)
```

### GroupBy 高级应用：transform

`transform` 与 `apply` 均执行"分组后应用函数"，区别在于返回形状：`apply` 可返回任意形状（聚合或拆分均可）；`transform` 要求结果与输入组形状相同（或为可广播的标量）。因此 `transform` 适用于为每一行计算基于本组的值，如组内标准化、组内排名、以组均值填充缺失：

```python
g = df.groupby('key').value

g.transform(lambda x: x.mean())    # 组均值广播回每一行（形状不变）
g.transform('mean')                # 内置聚合可用字符串
g.transform(lambda x: x * 2)       # 元素级变换
g.transform(lambda x: x.rank(ascending=False))   # 组内降序排名

def normalize(x):
    return (x - x.mean()) / x.std()
g.transform(normalize)             # 组内标准化（z-score）
```

性能要点：内置聚合（`mean`/`sum`）基于矢量化实现，明显快于 apply。能用 `(df['value'] - g.transform('mean'))` 表达的操作，不应使用 apply 循环：

```python
normalized = (df['value'] - g.transform('mean')) / g.transform('std')
```

分组时间重采样（现代写法）：原书的 `pd.TimeGrouper` 已废弃，现使用 `pd.Grouper`：

```python
grouper = pd.Grouper(freq='5min')
resampled = (df2.set_index('time')
                .groupby(['key', grouper])
                .sum())
```

### 链式编程

多步数据处理若采用传统写法，会产生大量无用的中间变量：

```python
df2 = df[df['col2'] < 0]
df2['col1_demeaned'] = df2['col1'] - df2['col1'].mean()
result = df2.groupby('key').col1_demeaned.std()
```

函数式思路是每步返回新对象，以链式调用串联，无需保存中间结果。`assign` 是函数式的列赋值（返回新 DataFrame，而非就地修改）：

```python
result = (df2
          .assign(col1_demeaned=df2.col1 - df2.col2.mean())   # 新增列
          .groupby('key')
          .col1_demeaned.std())

# 配合可调用对象（callable），实现无临时变量的完整链
result = (load_data()
          [lambda x: x['col2'] < 0]                          # 过滤
          .assign(col1_demeaned=lambda x: x.col1 - x.col2.mean())
          .groupby('key')
          .col1_demeaned.std())
```

管道方法 `pipe` 将自定义函数接入链式流程——`df.pipe(f)` 等价于 `f(df)`：

```python
def group_demean(df, by, cols):
    """对指定列执行组内去均值（可复用的管道函数）"""
    result = df.copy()
    g = df.groupby(by)
    for c in cols:
        result[c] = df[c] - g[c].transform('mean')
    return result

result = (df[df.col1 < 0]
            .pipe(group_demean, ['key1', 'key2'], ['col1']))
```

> 链式编程可提升可读性，但过度链式会降低调试性（中间结果不可见）。建议：分析过程使用链式，关键步骤拆出变量进行检查。

**本章小结**：分类类型由类别表与整数编码构成，可节省内存、加速分组、便于建模；`transform` 执行形状不变的分组变换，`apply` 执行任意变换；`assign` 与 `pipe` 支持函数式链式编程。

---

## Python 建模库入门

**本章目标**：理解特征工程与模型接口；会使用 Patsy 公式定义模型；掌握 statsmodels 进行统计推断、scikit-learn 进行预测的标准流程。

### 从数据规整到建模

建模的标准工作流为：

```
pandas 清洗/规整 → 特征工程 → 转换为模型输入（数组/设计矩阵）→ 拟合 → 评估
```

特征工程（feature engineering）指从原始数据中提取对建模有用的信息的任何变换，前述分组聚合、离散化、哑变量均属此列。本章介绍 pandas 与建模库的接口，以及两个主流建模库：statsmodels（统计推断）与 scikit-learn（预测）。

### pandas 与模型代码的接口

多数建模库以 NumPy 数组为输入。转换时需注意：混合类型列会退化为 object 数组（失去数值运算能力）：

```python
data.values                    # DataFrame -> ndarray（同质数值时最佳）
pd.DataFrame(data.values, columns=['one', 'two', 'three'])   # 转回

# 只取模型所需列（推荐 loc + values）
model_cols = ['x0', 'x1']
data.loc[:, model_cols].values

# 分类列 -> 哑变量
dummies = pd.get_dummies(data.category, prefix='category')
data_with_dummies = data.drop('category', axis=1).join(dummies)
```

### 用 Patsy 创建模型描述

Patsy 以短字符串公式语法描述统计模型（受 R 语言启发）。公式中的 `+` 不是加法，而是"将该变量加入设计矩阵"：

> 注意：patsy 已基本停止积极维护；statsmodels 的公式接口仍基于它，新项目可关注其继任者 Formulaic。

```python
import patsy
y, X = patsy.dmatrices('y ~ x0 + x1', data)   # 自动加截距列
np.asarray(X)                                 # 5×3 矩阵（Intercept, x0, x1）
patsy.dmatrices('y ~ x0 + x1 + 0', data)      # + 0 去掉截距

# 用公式矩阵执行最小二乘
coef, resid, _, _ = np.linalg.lstsq(X, y)
pd.Series(coef.squeeze(), index=X.design_info.column_names)
```

公式内的数据变换是 Patsy 的功能之一（使用新数据预测时应保持变换参数一致）：

```python
patsy.dmatrices('y ~ x0 + np.log(np.abs(x1) + 1)', data)   # 任意 Python 表达式
patsy.dmatrices('y ~ standardize(x0) + center(x1)', data)  # 内置标准化/中心化
patsy.build_design_matrices([X.design_info], new_data)     # 以相同参数变换新数据
patsy.dmatrices('y ~ I(x0 + x1)', data)                    # I() 表示"真正的相加"

# 分类变量自动转哑变量（有截距时去掉一个以避免共线性）
patsy.dmatrices('v2 ~ key1', data)             # Intercept + key1[T.b]
patsy.dmatrices('v2 ~ key1 + 0', data)         # 无截距：每类一列
patsy.dmatrices('v2 ~ C(key2)', data)          # 数值列转分类
patsy.dmatrices('v2 ~ key1 + key2 + key1:key2', data)   # 交互项（ANOVA 用）
```

### statsmodels：经典统计推断

statsmodels 提供回归、ANOVA、时间序列等经典统计方法，输出重点是推断：系数、标准误、t 值、p 值、置信区间。

```python
import statsmodels.api as sm
import statsmodels.formula.api as smf

# 数组接口：需手动加截距
X_model = sm.add_constant(X)
results = sm.OLS(y, X_model).fit()
results.params                               # 系数
print(results.summary())                     # 完整诊断（R²、F 检验、DW 统计量等）

# 公式接口（推荐）：自动处理列名与截距
results = smf.ols('y ~ col0 + col1 + col2', data).fit()
results.params; results.tvalues; results.pvalues
results.predict(data[:5])                    # 样本外预测
```

时间序列模型（新版写法）：原书的 `sm.tsa.AR` 已废弃，使用 `AutoReg` 拟合自回归模型：

```python
model = sm.tsa.AutoReg(values, lags=5)       # AR(5) 模型
results = model.fit()
results.params                               # [截距, 滞后1, 滞后2, ...]
```

statsmodels 的其他模型族：`sm.GLM`（广义线性模型）、`sm.RLM`（稳健回归）、`sm.MixedLM`（混合效应）、`sm.tsa.ARIMA`（ARIMA 预测）。

### scikit-learn：机器学习标准流程

scikit-learn 是通用机器学习库，统一 API 设计（`fit`/`predict`/`transform`）。以泰坦尼克号生存预测演示完整标准流程（含当前标配的 `train_test_split`）：

```python
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score

# 1. 数据清洗：缺失值填充（使用训练集统计量，避免数据泄漏）
impute_value = train['Age'].median()
train['Age'] = train['Age'].fillna(impute_value)
test['Age'] = test['Age'].fillna(impute_value)

# 2. 特征工程
train['IsFemale'] = (train['Sex'] == 'female').astype(int)
test['IsFemale'] = (test['Sex'] == 'female').astype(int)

# 3. 准备特征矩阵
predictors = ['Pclass', 'IsFemale', 'Age']
X = train[predictors].values
y = train['Survived'].values

# 4. 划分训练/验证集
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2,
                                                  random_state=42)

# 5. 拟合与评估
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)
y_pred = model.predict(X_val)
accuracy_score(y_val, y_pred)                # 验证集准确率

# 6. 交叉验证与参数调优
scores = cross_val_score(LogisticRegression(max_iter=1000), X, y, cv=5)
scores.mean()
from sklearn.linear_model import LogisticRegressionCV
model_cv = LogisticRegressionCV(Cs=10, max_iter=1000)
model_cv.fit(X, y)
```

> `train_test_split` 的意义：在训练集上学到的任何统计量（均值、中位数）都不能用于测试集，否则属于数据泄漏，会高估模型表现。标准做法是仅在训练集上计算填充值或缩放参数，再应用于测试集。

#### Pipeline：串联预处理与模型

实际项目中特征工程包含多个步骤。`Pipeline` 将"标准化 + 模型"串联为单一估计器，避免在交叉验证中泄漏预处理参数：

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression(max_iter=1000)),
])
scores = cross_val_score(pipe, X, y, cv=5)   # 每折独立拟合预处理参数
```

#### 继续学习建模的推荐书籍

- 《Introduction to Machine Learning with Python》（Andreas Mueller & Sarah Guido）
- 《Python Data Science Handbook》（Jake VanderPlas）
- 《Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow》（Aurélien Géron，第三版）

**本章小结**：特征工程连接数据规整与建模；Patsy 以公式定义设计矩阵；statsmodels 用于推断（p 值、置信区间），scikit-learn 用于预测（准确率、交叉验证）；`train_test_split` 与 `Pipeline` 是现代建模流程的标准组件。

---

## 真实数据分析案例

**本章目标**：将前述工具应用于五个真实数据集，体会面对陌生数据的分析流程。每个案例包含分析目标、数据形态、处理套路与结论。所有数据可在 [pydata-book 仓库](https://github.com/wesm/pydata-book) 的 datasets 目录获取。

### 案例一：Bitly 的 USA.gov 数据（JSON 日志分析）

**分析目标**：统计 gov 短链接用户的地域分布，即最常出现的时区，以及 Windows 与非 Windows 用户的差异。

**数据形态**：每行一个 JSON 对象（浏览器信息、时区、来源等），共 3560 条。逐行 JSON 是日志分析的典型形态。

**处理套路**：逐行解析 JSON → DataFrame → 值计数 → 缺失清洗 → 分组交叉 → 归一化 → 可视化。

```python
import json
with open('datasets/bitly_usagov/example.txt') as f:
    records = [json.loads(line) for line in f]

# 纯 Python 方式（对比用）：注意 KeyError——并非所有记录都有 tz 字段
time_zones = [rec['tz'] for rec in records if 'tz' in rec]
from collections import Counter
counts = Counter(time_zones)
counts.most_common(10)

# pandas 方式：DataFrame 加载后直接值计数
frame = pd.DataFrame(records)
tz_counts = frame['tz'].value_counts()

# 清洗缺失（NaN）与未知（空串），再可视化
clean_tz = frame['tz'].fillna('Missing')
clean_tz[clean_tz == ''] = 'Unknown'
subset = clean_tz.value_counts()[:10]
sns.barplot(y=subset.index, x=subset.values)      # 水平柱状图

# 按浏览器系统分解：np.where 生成二元分组
cframe = frame[frame.a.notnull()].copy()          # 去掉无浏览器信息的行（显式 .copy() 获得独立副本）
cframe['os'] = np.where(cframe['a'].str.contains('Windows'),
                        'Windows', 'Not Windows')

# 时区 × 系统交叉计数：groupby.size + unstack
by_tz_os = cframe.groupby(['tz', 'os'])
agg_counts = by_tz_os.size().unstack().fillna(0)
agg_counts.sum(1).nlargest(10)                    # 频数最高的 10 个时区

# 取前 10 时区，归一化后绘制堆积图
count_subset = agg_counts.sum(1).nlargest(10).index
count_subset = agg_counts.loc[count_subset].stack().reset_index(name='total')
g = count_subset.groupby('tz')
count_subset['normed_total'] = count_subset.total / g.total.transform('sum')
sns.barplot(x='normed_total', y='tz', hue='os', data=count_subset)
```

**结论**：纽约时区占比最高；Windows 用户在小时区中的占比高于非 Windows 用户。

### 案例二：MovieLens 1M 电影评分数据（多表合并与透视）

**分析目标**：比较男女观众的口味差异，找出女性更偏好的电影以及评分分歧最大的电影。

**数据形态**：三个表（用户 6040 人、评分 100 万条、电影 4000 部），通过 `user_id`、`movie_id` 关联，属于典型的关系型多表数据。

**处理套路**：多表 merge → 宽表 → 透视表 → 按样本量过滤 → 排序发现规律。

```python
unames = ['user_id', 'gender', 'age', 'occupation', 'zip']
users = pd.read_csv('datasets/movielens/users.dat', sep='::',
                    header=None, names=unames)
rnames = ['user_id', 'movie_id', 'rating', 'timestamp']
ratings = pd.read_csv('datasets/movielens/ratings.dat', sep='::',
                      header=None, names=rnames)
mnames = ['movie_id', 'title', 'genres']
movies = pd.read_csv('datasets/movielens/movies.dat', sep='::',
                     header=None, names=mnames)

# 两次 merge 串成一张宽表（按重叠列名自动推断连接键）
data = pd.merge(pd.merge(ratings, users), movies)

# 透视表：按电影 × 性别计算平均分
mean_ratings = data.pivot_table('rating', index='title', columns='gender')

# 过滤：只保留评分数量不少于 250 的电影（样本量过小的均值不可靠）
ratings_by_title = data.groupby('title').size()
active_titles = ratings_by_title.index[ratings_by_title >= 250]
mean_ratings = mean_ratings.loc[active_titles]

# 女性评分最高的电影
top_female_ratings = mean_ratings.sort_values(by='F', ascending=False)

# 男女分歧最大的电影：新增差值列后排序
mean_ratings['diff'] = mean_ratings['M'] - mean_ratings['F']
sorted_by_diff = mean_ratings.sort_values(by='diff')       # 女性更偏好
sorted_by_diff[::-1][:10]                                  # 男性更偏好

# 评分分歧（不分性别）：按片名的评分标准差
rating_std_by_title = data.groupby('title')['rating'].std()
rating_std_by_title.loc[active_titles].sort_values(ascending=False)
```

**结论**：女性高分片以情感、家庭题材为主（如《Dirty Dancing》），男性高分片以动作、西部片为主（如《The Good, The Bad and The Ugly》）；分歧最大的电影是评价两极分化较明显的电影。

### 案例三：1880–2010 全美婴儿姓名（多文件合并与趋势分析）

**分析目标**：基于 131 年的全美出生姓名数据研究命名趋势，包括流行度变迁、多样性增长、末字母变化与性别转换。

**数据形态**：每年一个 CSV 文件（name, sex, births），共 131 个文件、169 万行，是同构多文件批量加载的典型场景。

**处理套路**：批量读取 → concat 合并 → 分组聚合 → apply 计算占比 → 透视表与时间序列绘图。

```python
# 1. 批量读取 131 个年度文件并合并（concat + ignore_index 为标准做法）
pieces = []
for year in range(1880, 2011):
    frame = pd.read_csv(f'datasets/babynames/yob{year}.txt',
                        names=['name', 'sex', 'births'])
    frame['year'] = year
    pieces.append(frame)
names = pd.concat(pieces, ignore_index=True)

# 2. 按年/性别聚合出总出生数
total_births = names.pivot_table('births', index='year',
                                 columns='sex', aggfunc=sum)
total_births.plot(title='Total births by sex and year')

# 3. 计算每个名字的占比 prop（transform 把组内总和广播回每一行，避免在 apply 中就地修改）
names['prop'] = (names['births'] /
                 names.groupby(['year', 'sex'])['births'].transform('sum'))
names.groupby(['year', 'sex']).prop.sum()      # 验证：每组占比之和应为 1.0

# 4. 每年/性别 Top1000（先排序再 groupby.head，避免 apply 的分组键处理差异）
top1000 = (names.sort_values('births', ascending=False)
                .groupby(['year', 'sex'], group_keys=False)
                .head(1000))

# 5. 命名趋势：经典名字的年度使用量
total_births = top1000.pivot_table('births', index='year',
                                   columns='name', aggfunc=sum)
total_births[['John', 'Harry', 'Mary', 'Marilyn']].plot(subplots=True,
                                                        figsize=(12, 10))

# 6. 命名多样性：覆盖前 50% 出生数所需的名字数量（searchsorted 二分查找）
def get_quantile_count(group, q=0.5):
    group = group.sort_values(by='prop', ascending=False)
    return group.prop.cumsum().values.searchsorted(q) + 1
diversity = (top1000.groupby(['year', 'sex'])
                    .apply(get_quantile_count).unstack('sex'))
diversity.plot(title="Number of popular names in top 50%")

# 7. 末字母变化
last_letters = names.name.map(lambda x: x[-1])
table = names.pivot_table('births', index=last_letters,
                          columns=['sex', 'year'], aggfunc=sum)
letter_prop = table / table.sum()
letter_prop.loc[['d', 'n', 'y'], 'M'].T.plot()   # 男孩名末字母 d/n/y 趋势

# 8. 性别转换的名字（如 Leslie）
lesley_like = pd.Series(top1000.name.unique())[lambda s: s.str.lower().str.startswith('lesl')]
filtered = top1000[top1000.name.isin(lesley_like)]
table = filtered.pivot_table('births', index='year', columns='sex', aggfunc=sum)
table.div(table.sum(1), axis=0).plot(style={'M': 'k-', 'F': 'k--'})
```

**结论**：John、Mary 等名字的使用量持续下降；命名多样性（覆盖前 50% 出生数所需名字数）从 1900 年的约 25 个增至 2010 年的 117 个；男孩名以 "n" 结尾的比例自 1960 年代显著上升；Leslie 由男孩名逐渐变为以女孩名为主。

### 案例四：USDA 食品数据库（嵌套 JSON 规整）

**分析目标**：从 6636 种食物的营养数据库中找出每种营养含量最高的食物。

**数据形态**：单个 JSON 文件，每条记录含嵌套的 `nutrients` 列表（每食物约 60 条营养记录），是嵌套结构摊平（flatten）的典型示例。

**处理套路**：提取顶层字段 + 摊平嵌套列表 → concat → 去重 → 重命名消歧 → 按 id 合并 → 分组求极值。

```python
import json
with open('datasets/usda_food/database.json') as f:
    db = json.load(f)

# 1. 提取食物信息（顶层字段）
info_keys = ['description', 'group', 'id', 'manufacturer']
info = pd.DataFrame(db, columns=info_keys)
info['group'].value_counts()[:10]             # 食物类别分布（新版写法）

# 2. 摊平嵌套的营养成分列表（为每条营养记录附加食物 id）
nutrients = []
for rec in db:
    fnuts = pd.DataFrame(rec['nutrients'])
    fnuts['id'] = rec['id']
    nutrients.append(fnuts)
nutrients = pd.concat(nutrients, ignore_index=True)
nutrients = nutrients.drop_duplicates()      # 移除 14179 个重复记录

# 3. 重命名避免合并时列名冲突，再按 id 合并
info = info.rename(columns={'description': 'food', 'group': 'fgroup'})
nutrients = nutrients.rename(columns={'description': 'nutrient', 'group': 'nutgroup'})
ndata = pd.merge(nutrients, info, on='id', how='outer')

# 4. 分组分析：每种营养 × 食物类别的中位数
result = ndata.groupby(['nutrient', 'fgroup'])['value'].quantile(0.5)
result['Zinc, Zn'].sort_values().plot(kind='barh')   # 锌含量最高的食物类别

# 5. 每种营养含量最高的食物
by_nutrient = ndata.groupby(['nutgroup', 'nutrient'])
max_foods = by_nutrient.apply(lambda x: x.loc[x.value.idxmax()])[['value', 'food']]
max_foods.loc['Amino Acids']                 # 氨基酸组中含量最高的食物（多为大豆制品）
```

**结论**：蛋白质与氨基酸含量最高的多为大豆制品（如 Soy protein isolate）；速食类（Fast Foods）的钠含量中位数显著偏高。

### 案例五：2012 联邦选举委员会数据库（大规模 CSV）

**分析目标**：从 100 万条竞选捐款记录中分析捐款人特征，包括职业、雇主、金额档位与州的党派倾向。

**数据形态**：单个 150MB CSV，16 列、100 万行以上，是前述案例中规模最大的数据。

**处理套路**：read_csv 加载 → map 字典编码（党派/职业）→ 布尔过滤 → 透视聚合 → cut 分箱 → 归一化比例。

```python
fec = pd.read_csv('datasets/fec/P00000001-ALL.csv')

# 1. 添加党派列（候选人到党派的字典映射）
parties = {'Bachmann, Michelle': 'Republican',
           'Cain, Herman': 'Republican',
           'Gingrich, Newt': 'Republican',
           'Obama, Barack': 'Democrat',
           'Paul, Ron': 'Republican',
           'Pawlenty, Tim': 'Republican',
           'Perry, Rick': 'Republican',
           'Santorum, Rick': 'Republican'}
fec['party'] = fec.cand_nm.map(parties)
fec['party'].value_counts()

# 2. 只保留正出资额（数据含退款，负值无分析意义），聚焦两位主要候选人
fec = fec[fec.contb_receipt_amt > 0]
fec_mrbo = fec[fec.cand_nm.isin(['Obama, Barack', 'Romney, Mitt'])]

# 3. 职业/雇主信息清洗：dict.get 使未映射值原样保留
occ_mapping = {'INFORMATION REQUESTED PER BEST EFFORTS': 'NOT PROVIDED',
               'C.E.O.': 'CEO'}
fec.contbr_occupation = fec.contbr_occupation.map(lambda x: occ_mapping.get(x, x))

# 4. 职业 × 党派聚合（过滤总出资 200 万美元以上的职业）
by_occupation = fec.pivot_table('contb_receipt_amt',
                                index='contbr_occupation', columns='party')
over_2mm = by_occupation[by_occupation.sum(1) > 2000000]
over_2mm.plot(kind='barh')                    # 律师偏向民主党，企业主偏向共和党

# 5. 两位候选人各自的前五大职业/雇主（groupby.apply + nlargest）
def get_top_amounts(group, key, n=5):
    totals = group.groupby(key)['contb_receipt_amt'].sum()
    return totals.nlargest(n)
fec_mrbo.groupby('cand_nm').apply(get_top_amounts, 'contbr_occupation', n=5)
fec_mrbo.groupby('cand_nm').apply(get_top_amounts, 'contbr_employer', n=5)

# 6. 出资额分箱（cut 离散化）+ 分组统计
bins = np.array([0, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000])
labels = pd.cut(fec_mrbo.contb_receipt_amt, bins)
grouped = fec_mrbo.groupby(['cand_nm', labels])
grouped.size().unstack(0)                     # 各金额档的捐款笔数
bucket_sums = grouped.contb_receipt_amt.sum().unstack(0)
normed_sums = bucket_sums.div(bucket_sums.sum(axis=1), axis=0)
normed_sums[:-2].plot(kind='barh')            # 各档位两位候选人占比

# 7. 按州聚合：各候选人每州占比
grouped = fec_mrbo.groupby(['cand_nm', 'contbr_st'])
totals = grouped.contb_receipt_amt.sum().unstack(0)
totals = totals[totals.sum(1) > 100000]       # 过滤样本过少的州
percent = totals.div(totals.sum(1), axis=0)
```

**结论**：Obama 在小额捐款（1–1000 美元）上的笔数明显多于 Romney，而 Romney 在大额（1000–10000 美元）上的占比更高，反映两人竞选募资策略的差异。

**本章小结**：五个案例覆盖五类常见真实场景——JSON 日志、多表关系数据、多文件合并、嵌套 JSON、大规模 CSV。其共同主线是：先明确要回答的问题，再选择"加载 → 清洗 → 重塑 → 聚合 → 可视化"中的对应工具。

---

## 附录：NumPy 进阶与 IPython 生产力

**本章目标**：补充正文未展开但日常常用的两块内容——NumPy 的广播机制与高级数组技巧，以及 IPython 的调试、计时与性能分析工具。

### 广播（Broadcasting）

广播是 NumPy 对不同形状数组进行算术运算的处理规则：较小的数组沿缺失或长度为 1 的维度自动扩展，以匹配较大数组。该机制使"每列减去列均值"等操作无需编写循环。

最简单的广播是标量：`arr * 4` 将 4 广播到每个元素。

广播规则（从最后一个轴开始向前比较两个数组的形状，满足任一条件即可广播）：

1. 维度相等；
2. 其中一个维度为 1；
3. 其中一个数组的维度数较少（缺失维度视为 1）。

不满足条件时报错：`ValueError: operands could not be broadcast together`。

```python
# 例 1：二维数组减去列均值——后缘维度 (3,) 匹配，直接广播
rng = np.random.default_rng(42)
arr = rng.standard_normal((4, 3))
demeaned = arr - arr.mean(0)          # 每列去均值

# 例 2：减去行均值——行均值形状为 (4,)，需改为 (4,1) 才能按行广播
row_means = arr.mean(1)               # shape (4,)
demeaned = arr - row_means.reshape((4, 1))

# 使用 np.newaxis 插入长度为 1 的新轴
arr_1d[:, np.newaxis]                 # (3,) -> (3,1) 列向量
depth_means[:, :, np.newaxis]         # 三维距平化

# 通用距平化函数（适用于任意轴）
def demean_axis(arr, axis=0):
    means = arr.mean(axis)
    indexer = [slice(None)] * arr.ndim
    indexer[axis] = np.newaxis
    return arr - means[indexer]
```

### ufunc 高级方法

ufunc 除元素级运算外，还提供四类替代循环的聚合操作：

```python
np.add.reduce(arr)                   # 聚合：等价 arr.sum()
np.logical_and.reduce(arr[:, :-1] < arr[:, 1:], axis=1)   # 每行是否有序
np.add.accumulate(arr, axis=1)       # 累计：等价 cumsum
np.multiply.outer(arr, np.arange(5)) # 外积（两数组所有元素对）
np.add.reduceat(arr, [0, 5, 8])      # 局部约简（按边界分组聚合）
```

### 排序进阶

```python
# 间接排序：返回排序后的索引，而非直接重排数组
indexer = values.argsort()
values[indexer]                        # 等价于排序结果
arr[:, arr[0].argsort()]               # 按第一行排序（常用于重排表格）
sorter = np.lexsort((first_name, last_name))   # 多键字典序（键从后往前生效）

# 稳定排序：mergesort 保持等价元素的相对位置
key.argsort(kind='mergesort')

# 部分排序：partition 只保证第 k 个位置正确（快于全排序）
np.partition(arr, 3)                   # 前 3 个为最小元素（内部无序）

# searchsorted：有序数组上的二分查找（返回保持有序的插入位置）
arr.searchsorted([0, 8, 11, 16])
bins.searchsorted(data)                # 数据点所属面元编号 -> 配合 groupby 分桶
```

### 使用 Numba 编写快速函数

当 NumPy 矢量化无法表达某个算法（如复杂循环逻辑）时，Numba 通过 LLVM 将 Python 循环编译为机器码，可获得接近 C 的执行速度：

```python
import numba as nb

@nb.njit                 # nopython 模式：速度最快
def mean_distance(x, y):
    nx = len(x)
    result = 0.0
    count = 0
    for i in range(nx):
        result += x[i] - y[i]
        count += 1
    return result / count

# numba.vectorize 创建自定义 ufunc
from numba import vectorize
@vectorize
def nb_add(x, y):
    return x + y
nb_add.accumulate(x, 0)
```

> 实测数据（作者机器，仅作量级参考）：同一 `mean_distance` 函数，纯 Python 约 2s，NumPy 矢量化约 15ms，Numba 编译后约 10ms。使用 Numba 前需安装：`pip install numba`（或 `conda install numba`）。

### IPython 生产力进阶

#### 命令历史与输入输出变量

```python
# 历史搜索：Ctrl-P / 上箭头（向后），Ctrl-N / 下箭头（向前），Ctrl-R（增量搜索）
# 输入输出变量：_（上一次输出）、__（上上次）、_27（第 27 次输出）、_i27（第 27 次输入）
exec(_i27)                 # 重新执行第 27 次输入
%hist                      # 打印输入历史
%reset                     # 清理命名空间
```

> IPython 会保留所有输入/输出对象的引用。处理超大 DataFrame 时，即使执行 `del` 删除变量，历史引用仍占用内存，可使用 `%xdel obj` 彻底删除。

#### 与操作系统交互

```python
!ls                        # 执行 shell 命令（Windows 下可用 !dir）
ip_info = !ipconfig        # 捕获命令输出为对象（macOS/Linux 用 !ifconfig）
!ls $foo                   # $变量 注入 Python 值
%alias ll ls -l            # 自定义别名（session 内有效）
%bookmark py4da /path/to/dir   # 目录书签（跨 session 保持）
%cd py4da                  # 跳转到书签
```

#### 调试工具

```python
%debug                     # 异常后进入调试器
%pdb                       # 让任何异常自动进入调试器
%run -d -b12 script.py     # 带断点运行脚本

# 调试器命令：u/d 上下切换堆栈帧、s 步入、n 下一步、c 继续、b 行号 设断点
# 查看变量：!var 或 p var

# 代码内断点
from IPython.core.debugger import Pdb
def set_trace():
    Pdb(color_scheme='Linux').set_trace(sys._getframe().f_back)
```

#### 计时与性能分析

```python
%time statement            # 运行一次，报告总耗时
%timeit statement          # 多次运行取稳定均值
%prun -l 7 -s cumulative run_experiment()   # cProfile 函数级分析（宏观）
%lprun -f add_and_sum add_and_sum(x, y)     # line_profiler 逐行分析（微观）
```

> 使用原则：`%prun` 用于定位耗时函数，`%lprun` 用于定位函数内耗时语句。`%lprun` 必须指定函数名（逐行追踪开销较大）。

---

## 结语

数据分析的本质，是将混乱的现实数据转化为可信结论的一套纪律，其核心能力在于面对陌生数据时，能够按"加载 → 清洗 → 规整 → 探索 → 聚合 → 可视化 → 建模"的流程完成分析。本文提供的所有 API 知识都会随时间继续演化，但面对陌生数据时按流程推进的分析能力不会过时。将文中的代码逐一运行、修改并应用于你自己的数据，是从阅读转向实践的最短路径。

