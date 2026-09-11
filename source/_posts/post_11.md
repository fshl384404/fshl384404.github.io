---
title: 从张量到深度网络
date: 2026-09-20 23:00:00
updated: 2026-09-20 23:00:00
categories:
  - 穷理
tags:
  - 机器学习
  - 深度学习
description: 介绍深度学习的预备知识、线性回归、softmax 回归、多层感知机、模型选择与正则化、正反向传播以及优化算法
cover: /img/blog11.webp
---

## 引言

深度学习是机器学习的一个重要分支，其核心思想是用多层非线性变换的神经网络自动地从数据中学习特征表示。本文按照"预备知识 → 深度学习基础 → 优化算法"的脉络，系统介绍深度学习从理论到 PyTorch 实践的核心内容：先阐述深度学习的起源、发展、特点以及 PyTorch 的环境配置，再介绍深度学习的两块基石——张量（Tensor）数据操作与自动求梯度（autograd）；随后从线性回归入手建立"从零开始实现"与"简洁实现"（`nn.Module` + `optim`）两种代码范式，并推广到 softmax 回归与图像分类（Fashion-MNIST）以及多层感知机；接着讨论机器学习中最核心的泛化问题——模型选择、欠拟合与过拟合，及其两大正则化手段（权重衰减与丢弃法）；之后深入正（前）向传播、反向传播与计算图的原理，以及数值稳定性与参数初始化；最后系统梳理深度学习中的优化算法——从梯度下降、随机梯度下降到小批量随机梯度下降，再到动量法、AdaGrad、RMSProp、AdaDelta 与 Adam。文中所有示例均为可运行的 PyTorch 代码，关键概念处附有"理论补充"，公式与术语采用深度学习领域的通行表述。

> 本文示例基于 PyTorch 编写，全部代码可直接在 Jupyter Notebook 或 Python 脚本中运行，运行结为参考输出，实际运行时因随机初始化与硬件差异，数值会略有不同。

---

## 深度学习的预备知识

### 深度学习简介

**起源**：深度学习并非新概念。1940 年代 McCulloch 与 Pitts 提出神经元的数学模型，1958 年 Rosenblatt 提出感知机（perceptron）——单层神经网络；1986 年反向传播算法的普及使多层网络可训练；2006 年前后 Hinton 等人提出逐层预训练，深度学习的概念正式确立。

**发展**：深度学习在 2012 年迎来转折——AlexNet 在 ImageNet 图像识别竞赛中以远超传统方法的成绩夺冠，此后深度学习在图像、语音、自然语言处理等领域全面突破。其背后的三大驱动力是：

| 要素 | 说明 |
|---|---|
| **数据** | 数字化社会产生的海量数据为训练大模型提供了燃料 |
| **算力** | GPU 的大规模并行计算使训练深层网络成为可能 |
| **算法** | 反向传播、ReLU、Dropout、BatchNorm、ResNet 等关键创新不断降低训练难度 |

**特点**：与传统机器学习"人工设计特征 + 浅层模型"的范式不同，深度学习是**端到端（end-to-end）** 的学习——原始数据直接输入网络，特征表示由数据自动学习，即"深度学习 = 表示学习"。这一特性使深度学习在图像、语音、文本等非结构化数据上具有显著优势。

### 环境配置

**Anaconda** 是科学计算最常用的 Python 发行版，预装了大量常用包，并通过 conda 管理包与虚拟环境。**Jupyter Notebook** 提供交互式编程环境——代码、输出、图表与说明文字共存于一个文档，是深度学习实验的标准工具。**PyTorch** 是本文使用的深度学习框架，其安装命令为：

```bash
# conda 方式（推荐）
conda install pytorch torchvision torchaudio cpuonly -c pytorch

# pip 方式
pip install torch torchvision torchaudio
```

安装完成后验证：

```python
import torch
print(torch.__version__)          # 例如 2.x
print(torch.cuda.is_available())  # 有 GPU 时为 True
```

> **框架选择**：PyTorch 与 TensorFlow 是当前两大主流深度学习框架。PyTorch 采用动态计算图（define-by-run），代码与 Python 语法一致、调试直观，学术界使用广泛；TensorFlow 2.x 亦已转向类似风格。本文全部代码以 PyTorch 实现，理解其底层机制后迁移到其他框架并不困难。

### 数据操作：Tensor

深度学习的计算对象是**张量（tensor）**——即 N 维数组的统称：标量是 0 维张量，向量是 1 维张量，矩阵是 2 维张量。在 PyTorch 中，`torch.Tensor` 与 NumPy 的 `ndarray` 类似，但额外支持 GPU 加速与自动求梯度。

#### 创建 Tensor

```python
import torch

x = torch.empty(5, 3)      # 未初始化内存的 5x3 张量（值不确定）
print(x)

x = torch.rand(5, 3)       # [0,1) 均匀分布的随机张量
x = torch.zeros(5, 3, dtype=torch.long)   # 全 0，可指定数据类型
x = torch.tensor([5.5, 3]) # 直接由列表创建
```

常用创建函数：

| 函数 | 说明 |
|---|---|
| `torch.tensor(data)` | 由 Python 列表/NumPy 数组创建（复制） |
| `torch.zeros(*sizes)` / `torch.ones(*sizes)` | 全 0 / 全 1 张量 |
| `torch.eye(*sizes)` | 单位矩阵（对角线为 1） |
| `torch.arange(s, e, step)` | 序列 `[s, e)` 步长为 step |
| `torch.linspace(s, e, steps)` | 在 `[s, e]` 上取 steps 个均匀分布的点 |
| `torch.rand(*sizes)` / `torch.randn(*sizes)` | 均匀 / 标准正态随机张量 |
| `torch.randperm(m)` | 0 到 m-1 的随机排列 |

通过 `x.shape` 或 `x.size()` 查看张量形状。还可以基于已有张量创建同类型的新张量：

```python
x = x.new_ones(5, 3, dtype=torch.float64)   # 与 x 同类型（dtype/device）的全 1 张量
x = torch.randn_like(x, dtype=torch.float)  # 与 x 同形状的随机张量
print(x.size())   # torch.Size([5, 3])
```

#### 基本操作

**算术运算**有多种等价写法：`x + y`、`torch.add(x, y)`、指定输出张量 `torch.add(x, y, out=result)`。**inplace 操作**以 `_` 结尾，直接修改原张量，如 `y.add_(x)`（等价于 `y += x`）。

**索引**与 NumPy 一致：`x[0, :]` 取第一行，`x[:, 1]` 取第二列。**注意**：索引得到的仍是原张量的**视图（view）**——对视图的修改会影响原张量：

```python
y = x[0, :]
y += 1
print(x[0, :])   # 原张量第一行也被修改
```

**改变形状**使用 `view()`：

```python
y = x.view(15)
z = x.view(-1, 5)   # -1 表示该维度由其他维度推断
print(x.size(), y.size(), z.size())   # torch.Size([5, 3]) torch.Size([15]) torch.Size([3, 5])
```

`view()` 返回的也是视图，共享底层内存。若需要独立的副本，先调用 `clone()` 再 `view()`（`x.clone().view(15)`），否则对视图的修改会污染原张量。较新的 `reshape()` 在无法共享内存时会自动复制，语义更安全。单个元素的张量可用 `x.item()` 取出为 Python 数值。

**线性代数**：`mm`（矩阵乘）、`bmm`（批量矩阵乘）、`t`（转置）、`dot`（点积）、`inverse`（求逆）、`svd`（奇异值分解）等。

#### 广播机制

当两个形状不同的张量做运算时，PyTorch 会触发**广播机制（broadcasting）**：先扩展维度使形状一致，再逐元素运算。规则是：从尾部维度开始比较，维度相等或其一为 1 时即可广播。例如 `1x2` 与 `3x1` 的矩阵相加：

```python
x = torch.arange(1, 3).view(1, 2)   # tensor([[1, 2]])
y = torch.arange(1, 4).view(3, 1)   # tensor([[1], [2], [3]])
print(x + y)
```

运行结果：

```
tensor([[2, 3],
        [3, 4],
        [4, 5]])
```

`x` 沿行方向（第 0 维）复制 3 份扩展为 3x2，`y` 沿列方向（第 1 维）复制 2 份扩展为 3x2，然后逐元素相加。广播机制让代码简洁且不浪费内存（扩展是逻辑上的，并不真正复制数据）。

#### 运算的内存开销

深度学习训练中张量频繁创建，内存管理直接影响性能。关键规则：**`y = x + y` 会开辟新内存**，而**索引赋值 `y[:] = x + y` 或 `torch.add(x, y, out=y)`（即 `y += x`、`y.add_(x)`）不改变 y 的地址**。用 Python 内建函数 `id()` 可以验证：

```python
x = torch.tensor([1, 2])
y = torch.tensor([3, 4])
id_before = id(y)
y = y + x
print(id(y) == id_before)   # False：开辟了新内存

y = torch.tensor([3, 4])
id_before = id(y)
y[:] = y + x
print(id(y) == id_before)   # True：原地修改
```

#### Tensor 与 NumPy 相互转换

用 `numpy()` 与 `from_numpy()` 可以实现两种数组的互换。**要点**：这两种转换共享底层内存，修改一方会影响另一方；而用 `torch.tensor(a)` 转换则是复制，互不影响：

```python
import numpy as np
a = np.ones(5)
b = torch.from_numpy(a)      # 共享内存
a += 1
print(a, b)                  # b 也变为 2
c = torch.tensor(a)          # 复制，独立
a += 1
print(a, c)                  # c 保持为 2
```

#### Tensor on GPU

PyTorch 的核心优势之一是 GPU 加速。用 `to()` 方法可以在 CPU 与 GPU 之间迁移张量：

```python
if torch.cuda.is_available():
    device = torch.device("cuda")                 # GPU 设备
    y = torch.ones_like(x, device=device)         # 直接在 GPU 上创建
    x = x.to(device)                              # 从 CPU 迁移到 GPU（等价于 .to("cuda")）
    z = x + y
    print(z)
    print(z.to("cpu", torch.double))              # to() 还可同时转换数据类型
```

> **理论补充：为什么深度学习需要 GPU。** 深度网络训练的主要计算是矩阵乘法，其特点是"高并行、低依赖"——输出元素的每个分量可以独立计算。GPU 拥有数千个计算核心，可同时对大量元素执行运算；而 CPU 核心少、主频高，更适合串行任务。对小模型（如线性回归）CPU 与 GPU 差距不大，但对卷积网络、Transformer 等大规模模型，GPU 可将训练时间缩短一至两个数量级。

### 自动求梯度：autograd

训练神经网络的核心是**梯度下降**——需要计算损失函数对每个参数的偏导数。PyTorch 的 `autograd` 包根据计算过程自动完成这一任务，无需手动推导与编码链式法则。

#### 概念

对需要求梯度的张量，设置 `requires_grad=True`，PyTorch 就会**追踪（track）** 所有基于它的运算，构建计算图；调用 `backward()` 后，梯度自动回传并累积到张量的 `.grad` 属性中。

```python
x = torch.ones(2, 2, requires_grad=True)
print(x.grad_fn)      # None：x 是手动创建的叶子节点

y = x + 2
print(y.grad_fn)      # <AddBackward0>：y 由加法运算产生，记录了产生它的函数
print(x.is_leaf, y.is_leaf)   # True False

z = y * y * 3
out = z.mean()
print(z, out)         # out 是标量，可直接 backward
```

#### 梯度计算

`backward()` 要求输出为标量（或提供与输出同形状的梯度权重）：

```python
out.backward()        # 等价于 out.backward(torch.tensor(1.))
print(x.grad)
```

运行结果：

```
tensor([[4.5000, 4.5000],
        [4.5000, 4.5000]])
```

由 $y=x+2$、$z=3y^2$、$\text{out}=\frac{1}{4}\sum z$ 可验证 $\frac{\partial \text{out}}{\partial x}=\frac{1}{4}\cdot 6(x+2)=4.5$，与输出一致。

> **理论补充：Jacobian 与向量-雅可比积。** 设 $x$ 是 $m$ 维向量、$y$ 是 $n$ 维向量，则 $\partial y/\partial x$ 是 $n\times m$ 的**雅可比矩阵（Jacobian matrix）**。PyTorch 不直接存储雅可比矩阵（维度过高），而是计算**向量-雅可比积**：`y.backward(w)` 等价于先计算标量 $l=\text{sum}(y\cdot w)$ 再对 $x$ 求梯度。上文 `out.backward()` 中默认 $w$ 为全 1 向量，故等价于对 `out.sum()` 求导。对向量输出直接调用 `backward()` 会报错，必须提供权重 $w$。

#### 梯度累加与清零

**梯度是累积的**：多次 `backward()` 会不断累加到 `.grad`，而不是覆盖。因此每轮更新参数前必须清零，否则梯度会叠加错误：

```python
out2 = x.sum()
out2.backward()
print(x.grad)               # 在之前 4.5 的基础上累加

x.grad.data.zero_()         # 清零
out3 = x.sum()
out3.backward()
print(x.grad)               # tensor([[1., 1.], [1., 1.]])
```

#### 停止追踪

推理（预测）阶段不需要梯度，可用两种方式停止追踪：

- `x.detach()`：返回与 x 共享数据但不参与追踪的新张量，其 `requires_grad=False`；
- `with torch.no_grad():`：上下文管理器，块内所有运算都不构建计算图，节省内存与时间，是评估模型时的标准写法。

```python
x = torch.tensor(1.0, requires_grad=True)
y1 = x ** 2
with torch.no_grad():
    y2 = x ** 3                    # 不追踪
y3 = y1 + y2
print(y1.requires_grad, y2.requires_grad, y3.requires_grad)  # True False True
y3.backward()
print(x.grad)                      # 2x = 2（y2 的贡献 3x² 未参与）
```

> **理论补充：`.data` 的陷阱。** 张量的 `.data` 属性返回一个"断开追踪"的共享数据视图。若通过 `x.data *= 100` 修改数据，虽然不会破坏计算图，但梯度仍是基于旧值计算的，产生不一致；且原地修改 `requires_grad=True` 的张量数据本身是危险操作。现代 PyTorch 建议用 `.detach()` 取代 `.data`。此外，`requires_grad` 可以在创建后通过 `x.requires_grad_(True)` 原地开启。

---

## 线性回归

线性回归是深度学习的基础模型，其结构简单却包含了深度学习的全部要素：**模型定义、训练数据、损失函数、优化算法、模型预测**。本节先讲解这些基本要素，再分别以"从零开始实现"与"简洁实现"两种方式用 PyTorch 完成训练——前者让读者理解每一步的数学本质，后者展示现代深度学习框架如何将流程封装为几行代码。

### 线性回归的基本要素

#### 模型定义

以房屋价格预测为例：设房屋面积为 $x_1$、房龄为 $x_2$，价格 $y$。线性回归假设价格是特征的线性组合：

$$\hat{y} = x_1 w_1 + x_2 w_2 + b$$

其中 $w_1, w_2$ 是**权重（weight）**，$b$ 是**偏置（bias）**。模型输出 $\hat{y}$ 是对真实价格 $y$ 的预测。权重与偏置统称为模型的**参数（parameter）**，训练的目的就是学得使预测最准确的参数取值。

#### 模型训练

训练由三个环节组成：

**(1) 训练数据**。通常收集一系列真实数据点，例如多个房屋的面积、房龄与售价。每个数据点称为**样本（sample）**，其真实售价称为**标签（label）**，用于预测标签的特征（面积、房龄）称为**特征（feature）**。特征用于表征样本的特点。假设训练集有 $n$ 个样本，记第 $i$ 个样本的特征为 $x^{(i)}$（两个特征 $x^{(i)}_1, x^{(i)}_2$），标签为 $y^{(i)}$。

**(2) 损失函数**。训练需要量化"预测与真实标签的差距"，即**损失函数（loss function）**。回归任务最常用的是**平方损失（square loss）**：

$$\ell^{(i)}(w_1, w_2, b) = \frac{1}{2}\left(\hat{y}^{(i)} - y^{(i)}\right)^2$$

系数 $\frac{1}{2}$ 是化简约定（求导时抵消因子 2）。训练的目标是使训练集上所有样本损失的平均值最小：

$$\ell(w_1, w_2, b) = \frac{1}{n}\sum_{i=1}^{n}\ell^{(i)}(w_1, w_2, b) = \frac{1}{2n}\sum_{i=1}^{n}\left(x^{(i)}_1 w_1 + x^{(i)}_2 w_2 + b - y^{(i)}\right)^2$$

**(3) 优化算法**。模型与损失函数确定后，剩下的问题是求解使损失最小的参数。当模型简单（参数线性）时存在**解析解（analytical solution）**；但深度学习模型普遍不存在解析解，只能使用**数值解（numerical solution）**。最常用的数值优化算法是**小批量随机梯度下降（mini-batch stochastic gradient descent）**，其思想：迭代地选取一小批训练样本，计算它们损失的平均值关于模型参数的**梯度（gradient）**（导数），再沿着梯度反方向调整参数：

$$w_1 \leftarrow w_1 - \frac{\eta}{|\mathcal{B}|}\sum_{i\in\mathcal{B}}\frac{\partial \ell^{(i)}}{\partial w_1}$$

其中 $\mathcal{B}$ 是小批量样本的索引集合，$|\mathcal{B}|$ 为**批量大小（batch size）**，$\eta$ 为**学习率（learning rate）**——两者都是需要人工设定的**超参数（hyperparameter）**。学习率控制每次更新的步幅：过大则越过最优点、甚至发散，过小则收敛缓慢。

#### 模型预测

训练完成后，用学到的参数对新的输入（如新房屋的面积、房龄）计算输出，即完成预测。模型在未见过的数据上的表现取决于其**泛化能力**，这是后续"模型选择"部分的核心议题。

### 线性回归的表示方法

#### 神经网络图

线性回归可以看作一个**单层神经网络**：输入层有两个特征（神经元），输出层有一个神经元（价格预测）；输出层的权重即 $w_1, w_2$，偏置为 $b$。输入层与输出层之间是全连接关系（每个输入都连接到输出神经元），这样的层称为**全连接层（fully-connected layer）**或**稠密层（dense layer）**。神经网络图直观地表达了数据流的计算过程，是描述深度学习模型的通用语言。

#### 矢量计算表达式

当样本数很大时，逐样本循环计算效率极低。矢量（矩阵）化计算可一次处理整个小批量：设批量大小为 $n$，特征数为 $d$，则小批量特征 $\mathbf{X}$ 为 $n\times d$ 矩阵，权重 $\mathbf{w}$ 为 $d$ 维向量，预测为

$$\hat{\mathbf{y}} = \mathbf{X}\mathbf{w} + b$$

其中广播机制使偏置 $b$ 自动加到每一行。PyTorch 中一行 `torch.mm(X, w) + b` 即可完成。矢量化的收益是数量级的：底层并行硬件（CPU 的 SIMD 指令、GPU 的并行核心）对整块矩阵同时运算，而非逐元素串行。

**Python 示例**：矢量 vs 循环的性能对比。

```python
import torch
from time import time

a = torch.ones(1000)
b = torch.ones(1000)

start = time()
c = torch.zeros(1000)
for i in range(1000):
    c[i] = a[i] + b[i]
print(time() - start)          # 循环版本耗时

start = time()
d = a + b                      # 矢量版本
print(time() - start)
```

运行结果（不同机器有差异，但比值稳定）：

```
0.02039504051208496
0.0008330345153808594
```

矢量版本比显式循环快约 20 倍，且数据量越大差距越显著——这正是深度学习必须依赖向量化实现的原因。

### 线代的三个几何视角

前面用 `@` 和 `mm` 做了无数次矩阵乘法，但"矩阵乘法到底在做什么"往往是学完线代也没建立起来的直觉。这里集中交代三个视角——它们是理解**前向传播**、**PCA 降维**与**权重衰减**的共同语言，也是本系列反复提到的"线代直觉"的具体内容。

**视角一：矩阵乘法 = 线性变换（换一组坐标看同一个对象）。** 把向量 $\mathbf{x}$ 看成空间中的一个点（或一根箭头），那么 $W\mathbf{x}$ 就是对它做一次**线性变换**：可以分解为旋转、缩放、切变三种基本操作的组合。关键性质是"直线还是直线、原点不动"：

```python
import torch

W = torch.tensor([[2.0, 1.0], [0.0, 1.0]])     # 一个切变矩阵
x = torch.tensor([1.0, 1.0])
print('变换后:', (W @ x).tolist())              # [3.0, 1.0]：x 轴方向被"推倒"了

# 线性性：W(a*u + b*v) == a*W(u) + b*W(v)
u, v, a, b = torch.tensor([1.0, 0.0]), torch.tensor([0.0, 1.0]), 2.0, -3.0
left, right = W @ (a * u + b * v), a * (W @ u) + b * (W @ v)
print('线性性成立:', bool(torch.allclose(left, right)))
```

**为什么这个视角重要**：一层全连接 $\mathbf{y}=W\mathbf{x}+\mathbf{b}$ 就是"一次线性变换 + 一次平移"。若没有激活函数，多层全连接串起来仍是**一个**线性变换（$W_2(W_1\mathbf{x})= (W_2W_1)\mathbf{x}$）——这正是"没有激活函数的深层网络等价于单层"的原因，也是激活函数必须存在、且必须是**非线性**的根本理由。多层感知机的表达能力来自"线性变换"与"非线性扭曲"的交替叠加。

**视角二：特征值与特征向量 = 变换的"不变方向"。** 大多数向量被 $W$ 变换后方向都会偏转，但有一类特殊向量只被**拉伸**、方向不变：

$$W\mathbf{v} = \lambda\mathbf{v}$$

$\lambda$ 是**特征值**（拉伸倍数，可为负或复数），$\mathbf{v}$ 是**特征向量**（不变方向）。它给出了理解迭代式变换的钥匙：反复施加同一个变换，长期行为由**绝对值最大的特征值**支配——这解释了为什么 RNN 的梯度会随步数指数衰减/爆炸（连乘 $W_{hh}$ 的特征值）、为什么 Power Iteration 能求主特征向量、为什么 PageRank 的收敛速度取决于第二特征值。

**视角三：SVD = 任何矩阵都是"旋转 → 缩放 → 旋转"。** 特征值分解只对**方阵**、且要求有足够多的线性无关特征向量；**奇异值分解（SVD）** 对**任意**矩阵都成立：

$$A = U\Sigma V^\top$$

其中 $U,V$ 是正交矩阵（旋转/反射），$\Sigma$ 是对角矩阵且对角元 $\sigma_1\ge\sigma_2\ge\cdots\ge0$ 是**奇异值**（沿各主轴的缩放倍数）。这个分解把"任意线性变换"标准化成三步，并且给出一个极其实用的结论：**保留最大的前 $r$ 个奇异值、其余置零，得到的 $A_r$ 是所有秩不超过 $r$ 的矩阵中与原矩阵差距最小的那个**（Eckart–Young 定理）。这正是降维与压缩的理论依据。

```python
A = torch.randn(6, 4)
U, S, Vh = torch.linalg.svd(A, full_matrices=False)
print('奇异值:', [round(float(s), 3) for s in S])   # 已按降序排列
A2 = U[:, :2] @ torch.diag(S[:2]) @ Vh[:2]          # 秩 2 近似
print('秩 2 近似的相对误差:', round(float((A - A2).norm() / A.norm()), 4))
print('原矩阵秩:', int(torch.linalg.matrix_rank(A)), '| 近似矩阵秩:', int(torch.linalg.matrix_rank(A2)))
```

**与 PCA 的关系（本系列后文会用到）**：对**中心化**后的数据矩阵 $X_c$ 做 SVD，$X_c = U\Sigma V^\top$，则 $V$ 的各列就是**主成分方向**，奇异值的平方与样本协方差矩阵的特征值成正比（$\sigma_i^2/(n-1)=\lambda_i$）。也就是说，"PCA 就是中心化数据的 SVD"，而"协方差矩阵的特征值分解"给出的是同一组方向的另一种算法：

```python
X = torch.randn(200, 5)                  # 200 个样本、5 维特征
Xc = X - X.mean(0, keepdim=True)         # 中心化：降维前必须做

U, S, Vh = torch.linalg.svd(Xc, full_matrices=False)
C = Xc.T @ Xc / (Xc.shape[0] - 1)        # 样本协方差矩阵
evals, evecs = torch.linalg.eigh(C)      # 对称矩阵专用，返回升序
evals, evecs = evals.flip(0), evecs.T.flip(0)     # 转成降序

print('SVD 的主方向与特征向量一致:', round(abs(float(Vh[0] @ evecs[0])), 6))
print('奇异值平方/(n-1) 与特征值一致:',
      bool(torch.allclose(S ** 2 / (Xc.shape[0] - 1), evals, atol=1e-5)))
```

> **把三个视角与深度学习对应起来**：① 前向传播 = 线性变换（矩阵乘法）+ 非线性扭曲（激活函数）交替；② 归一化与初始化要控制的"尺度"，本质是奇异值/特征值的量级（谱范数）；③ 降维、压缩、推荐系统的隐语义，都建立在 SVD 的低秩近似上；④ RNN 的梯度消失/爆炸直接源于 $W_{hh}$ 的谱半径。**线代不是独立的预备知识，而是这些结论的共同语言。**

### 线性回归的从零开始实现

本节不用任何深度学习框架的高级封装，仅用 Tensor 与 autograd 实现线性回归，完整走一遍训练流程。

#### 生成数据集

构造一个带噪声的合成数据集：设真实参数 $w=[2, -3.4]^\top$、$b=4.2$，特征从标准正态分布采样，标签在真实值上叠加均值为 0、标准差为 0.01 的高斯噪声：

```python
import torch
import numpy as np
import random

num_inputs = 2
num_examples = 1000
true_w = [2, -3.4]
true_b = 4.2

features = torch.from_numpy(np.random.normal(0, 1, (num_examples, num_inputs))).float()
labels = true_w[0] * features[:, 0] + true_w[1] * features[:, 1] + true_b
labels += torch.from_numpy(np.random.normal(0, 0.01, size=labels.size())).float()
print(features[0], labels[0])
```

#### 读取数据

训练时逐个小批量读取数据。自定义生成器 `data_iter`：每轮迭代前打乱样本顺序，然后按批量大小切分并产出特征与标签：

```python
def data_iter(batch_size, features, labels):
    num_examples = len(features)
    indices = list(range(num_examples))
    random.shuffle(indices)                     # 样本读取顺序随机化
    for i in range(0, num_examples, batch_size):
        j = torch.LongTensor(indices[i: min(i + batch_size, num_examples)])
        yield features.index_select(0, j), labels.index_select(0, j)

batch_size = 10
for X, y in data_iter(batch_size, features, labels):
    print(X, y)
    break
```

#### 初始化模型参数

将权重初始化为均值为 0、标准差为 0.01 的正态随机数，偏置初始化为 0，并开启梯度追踪：

```python
w = torch.tensor(np.random.normal(0, 0.01, (num_inputs, 1)), dtype=torch.float32)
b = torch.zeros(1, dtype=torch.float32)
w.requires_grad_(requires_grad=True)
b.requires_grad_(requires_grad=True)
```

#### 定义模型、损失函数与优化算法

```python
def linreg(X, w, b):            # 线性回归模型：矩阵乘 + 广播
    return torch.mm(X, w) + b

def squared_loss(y_hat, y):     # 平方损失（保留 1/2 因子）
    return (y_hat - y.view(y_hat.size())) ** 2 / 2

def sgd(params, lr, batch_size):   # 小批量随机梯度下降
    for param in params:
        param.data -= lr * param.grad / batch_size
```

`squared_loss` 中 `y.view(y_hat.size())` 用于对齐形状（`y` 是形状为 `(10,)` 的向量，`y_hat` 是 `(10,1)` 的矩阵）。`sgd` 中必须通过 `param.data` 更新参数——`param` 本身参与计算图，直接对其赋值会破坏梯度追踪。

#### 训练模型

训练的核心是两层循环：外层遍历**周期（epoch）**（整个训练集完整过一遍），内层遍历每个小批量：

```python
lr, num_epochs, batch_size = 0.03, 3, 10
net, loss = linreg, squared_loss

for epoch in range(num_epochs):
    for X, y in data_iter(batch_size, features, labels):
        l = loss(net(X, w, b), y).sum()   # 小批量损失之和
        l.backward()                      # 自动求梯度
        sgd([w, b], lr, batch_size)       # 更新参数
        w.grad.data.zero_()               # 梯度清零（重要！）
        b.grad.data.zero_()
    train_l = loss(net(features, w, b), labels)
    print('epoch %d, loss %f' % (epoch + 1, train_l.mean().item()))
```

运行结果：

```
epoch 1, loss 0.028127
epoch 2, loss 0.000095
epoch 3, loss 0.000050
```

训练结束后检查学到的参数与真实参数的接近程度：

```
[2, -3.4]
tensor([[ 1.9998],
        [-3.3998]], requires_grad=True)
4.2
tensor([4.2001], requires_grad=True)
```

仅 3 个 epoch，学到的 $\hat{w}\approx[2, -3.4]^\top$、$\hat{b}\approx 4.2$ 已与真实值非常接近——因为数据本身由线性模型生成，且噪声很小。

> **理论补充：为什么 `l.sum().backward()` 而不是 `l.mean()`？** 前文定义的 `squared_loss` 保留了 $\frac{1}{2}$ 因子且未求均值，`l` 是形状为 `(batch, 1)` 的张量，不能直接 `backward()`（非标量）。`l.sum()` 得到标量损失之和；`sgd` 中除以 `batch_size` 等价于对平均损失求梯度，与理论公式一致。若直接 `l.mean().backward()` 则 sgd 中不能再除 batch_size。两种写法本质相同，注意配套即可。

### 线性回归的简洁实现

现代深度学习框架将上述流程封装为高层 API，使实现大幅简化。PyTorch 提供了 `torch.utils.data`（数据读取）、`torch.nn`（神经网络层与损失函数）、`torch.nn.init`（参数初始化）与 `torch.optim`（优化算法）四个模块。

#### 读取数据

用 `TensorDataset` 将特征与标签打包为数据集，再用 `DataLoader` 提供小批量读取（自动支持乱序 `shuffle=True`）：

```python
import torch
import torch.utils.data as Data

batch_size = 10
dataset = Data.TensorDataset(features, labels)              # 打包特征与标签
data_iter = Data.DataLoader(dataset, batch_size, shuffle=True)  # 小批量迭代器
```

#### 定义模型

用 `nn.Sequential` 按顺序堆叠层，`nn.Linear(in, out)` 即全连接层（内部自动管理权重与偏置参数）：

```python
from torch import nn
from torch.nn import init
import torch.optim as optim

net = nn.Sequential(nn.Linear(num_inputs, 1))
print(net)   # 打印网络结构
```

输出：

```
Sequential(
  (0): Linear(in_features=2, out_features=1, bias=True)
)
```

#### 初始化参数、定义损失与优化器

```python
init.normal_(net[0].weight, mean=0, std=0.01)   # 权重正态初始化
init.constant_(net[0].bias, val=0)              # 偏置置 0
loss = nn.MSELoss()                             # 均方误差损失（返回 batch 均值，不含 1/2 因子）
optimizer = optim.SGD(net.parameters(), lr=0.03)  # 优化器管理全部参数
```

> `nn.MSELoss` 默认返回 batch 上的**平均**损失，与从零实现中"求和后除以 batch_size"的更新方向一致（两者相差的 1/2 因子被学习率吸收，不影响训练），因此训练循环中不再手动除以批量大小。`optimizer.zero_grad()` 等价于对所有参数的 `.grad.zero_()`。

#### 训练模型

```python
num_epochs = 3
for epoch in range(1, num_epochs + 1):
    for X, y in data_iter:
        output = net(X)
        l = loss(output, y.view(-1, 1))   # y 变形为列向量与输出对齐
        optimizer.zero_grad()             # 梯度清零
        l.backward()
        optimizer.step()                  # 更新全部参数
    print('epoch %d, loss: %f' % (epoch, l.item()))
```

运行结果：

```
epoch 1, loss: 0.000457
epoch 2, loss: 0.000081
epoch 3, loss: 0.000198
```

训练后同样可以访问学到的参数：`net[0].weight`、`net[0].bias`，其值逼近真实参数。

**两种实现的对照**：从零实现展示了"数据迭代 → 前向计算 → 计算损失 → 反向求梯度 → 梯度更新 → 梯度清零"的完整训练骨架，这是所有深度学习模型训练的通用模板；简洁实现则体现了框架的价值——`nn.Linear` 封装参数管理、`nn.MSELoss` 封装损失计算、`optim.SGD` 封装参数更新。后续的 softmax 回归与多层感知机将复用完全相同的训练骨架，只需替换模型与损失函数。

---

## softmax 回归与图像分类

线性回归解决的是输出为连续数值的回归问题；当输出是有限个离散类别时，问题变为**分类（classification）**。softmax 回归是线性回归向多分类的自然推广，也是理解神经网络分类任务的基础。

### 分类问题

以图像分类为例：输入是 $28\times28=784$ 像素的图像（灰度），输出是 10 个类别（如 0-9 的手写数字）中的某一个。与回归不同，分类问题的输出是**离散的类别标签**，模型应输出"图像属于每个类别的概率"。

softmax 回归与线性回归一样是单层神经网络：输出层的神经元个数等于类别数（10），每个神经元输出一个类别对应的分数，再经 softmax 运算归一化为概率分布。

### softmax 运算

设输入特征为 $\mathbf{x}$，输出层权重为 $\mathbf{W}$（$d\times q$ 矩阵，$q$ 为类别数）、偏置为 $\mathbf{b}$，则第 $i$ 类的线性得分 $o_i = \mathbf{x}^\top\mathbf{w}_i + b_i$（$\mathbf{w}_i$ 为 $\mathbf{W}$ 的第 $i$ 列）。**softmax 运算**将 $q$ 个得分转换为 $q$ 个和为 1 的非负概率：

$$\hat{y}\_1, \hat{y}\_2, \ldots, \hat{y}\_q = \text{softmax}(o_1, o_2, \ldots, o_q), \qquad \hat{y}\_j = \frac{\exp(o_j)}{\sum_{k=1}^{q}\exp(o_k)}$$

**性质**：① $\hat{y}_j \in (0,1)$ 且 $\sum_j \hat{y}_j = 1$，构成合法概率分布；② 指数运算放大得分差异——得分最高的类别获得最高的概率；③ softmax 对得分做的是单调变换，**不改变类别的相对排序**，因此分类决策取 $\arg\max_j \hat{y}_j$（等价于 $\arg\max_j o_j$）。

**数值稳定性**：当得分很大时 $\exp(o_j)$ 可能溢出（上溢）。实践中通常对所有得分减去最大值再求 exp（$\hat{y}_j = \frac{\exp(o_j - \max_k o_k)}{\sum_k \exp(o_k - \max_k o_k)}$），数学上等价但数值稳定。更好的做法是把 softmax 与交叉熵损失合并计算（见下文），彻底避免中间概率的显式求值。

### 交叉熵损失函数

分类问题为何不用平方损失？关键在于**学习效率**：平方损失对"自信但错误"的预测（$\hat{y}_y$ 接近 0 或 1）惩罚不足、梯度趋于消失；而**交叉熵（cross entropy）** 直接衡量两个概率分布的差异，对错误分类施加对数级惩罚。

设真实类别为 $y$，则交叉熵损失只取真实类别对应的预测概率：

$$\ell(\mathbf{o}, y) = -\log \hat{y}\_y = -\log\frac{\exp(o_y)}{\sum_{k=1}^{q}\exp(o_k)}$$

直观理解：若模型给真实类别 $y$ 的概率 $\hat{y}_y$ 接近 1，损失接近 0；若给的概率很小，损失急剧增大。交叉熵还可解释为**最大似然估计**：对真实标签 $y$ 使用独热（one-hot）编码后，交叉熵等价于多项分布假设下的负对数似然——这与线性回归中"平方损失 = 高斯噪声假设下的负对数似然"的结构完全平行。

> **理论补充：为什么分类不用平方损失。** 记得分向量为 $\mathbf{o}$，平方损失对输出层第 $j$ 个得分的梯度为 $\frac{\partial \ell}{\partial o_j} = 2(\hat{y}_j - y_j)\frac{\partial \hat{y}_j}{\partial o_j}$。softmax 的偏导 $\partial \hat{y}_j/\partial o_j = \hat{y}_j(1-\hat{y}_j)$ 在 $\hat{y}_j$ 接近 0 或 1 时趋近 0——即模型"相当有把握"（无论预测对错，$\hat{y}_j$ 接近 0 或 1）时梯度都极小，学习停滞（注意 $\hat{y}_j\approx 0.5$ 即"没把握"时导数反而取最大值 0.25）。而交叉熵的梯度为 $\frac{\partial \ell}{\partial o_j} = \hat{y}_j - y_j$（独热编码下），错误越大梯度越大，学习始终高效。这是分类任务标配交叉熵的根本原因。

**Python 示例**：用 `gather` 取出每个样本真实类别对应的预测概率。

```python
import torch

y_hat = torch.tensor([[0.1, 0.3, 0.6], [0.3, 0.2, 0.5]])  # 2 个样本在 3 类上的概率
y = torch.LongTensor([0, 2])                                # 真实类别
print(y_hat.gather(1, y.view(-1, 1)))                       # 取出对应概率
```

运行结果：

```
tensor([[0.1000],
        [0.5000]])
```

第一个样本真实类别为 0，其预测概率 0.1；第二个样本真实类别为 2，其预测概率 0.5。`y_hat.gather(1, y.view(-1,1))` 按索引收集元素，是向量化实现交叉熵的关键操作。

### MLE、MAP 与损失函数

前面一直在用各种损失函数，但为什么回归用**平方损失**、分类用**交叉熵**、正则化用 **L2 范数**？这三者并非任意约定，而是同一套统计推理（极大似然与最大后验）在不同分布假设下的产物。看透这层对应关系，就能在遇到新任务时**自己推导出**该用什么损失。

**极大似然估计（MLE）的基本逻辑**：假定数据由某个带参数的分布生成，那么"最合理的参数"就是让**已观测到的这批数据出现概率最大**的参数：

$$\hat\theta_{\text{MLE}} = \arg\max_\theta \prod_{i=1}^{N} p(y_i\mid x_i;\theta) = \arg\min_\theta \left[-\sum_{i=1}^{N}\log p(y_i\mid x_i;\theta)\right]$$

注意第二步：连乘取对数后变成求和，而"最大化似然"等价于"最小化**负对数似然**"。**这就是几乎所有损失函数的形式来源**——负对数似然（negative log-likelihood）。

**对应关系一：平方损失 ⟺ 高斯噪声假设。** 若假设 $y = f_\theta(x) + \epsilon$，其中噪声 $\epsilon\sim\mathcal{N}(0,\sigma^2)$，则 $p(y\mid x;\theta)=\frac{1}{\sqrt{2\pi}\sigma}\exp\left(-\frac{(y-f_\theta(x))^2}{2\sigma^2}\right)$，负对数似然为

$$-\log p = \frac{(y-f_\theta(x))^2}{2\sigma^2} + \text{常数}$$

**最小化负对数似然 = 最小化平方误差**。所以"回归用 MSE"的前提是"误差近似高斯分布、且各样本同方差"。若数据含大量离群点（重尾噪声），MSE 会被少数极端值主导，此时改用拉普拉斯噪声假设会自然导出**绝对误差损失（MAE）**——这正是 MAE 对离群点更稳健的统计学解释。

**对应关系二：交叉熵 ⟺ 分类分布假设。** 二分类中 $y\sim\text{Bernoulli}(p_\theta(x))$，负对数似然为 $-y\log p-(1-y)\log(1-p)$，就是**二元交叉熵**；多分类中 $y$ 服从类别分布，负对数似然为 $-\log p_\theta(y\mid x)$，就是 **softmax + 交叉熵**。因此交叉熵不是"为分类发明的一种损失"，而是分类分布下的标准 MLE——这也解释了为什么它配合 softmax 时梯度形式特别简洁（$\partial L/\partial z = \hat p - y$）。

**对应关系三：L2 正则 ⟺ 高斯先验（MAP）。** 最大后验估计（MAP）在 MLE 基础上加入对参数的**先验信念**：

$$\hat\theta_{\text{MAP}} = \arg\max_\theta \left[\log p(\mathcal{D}\mid\theta) + \log p(\theta)\right]$$

若假设权重服从零均值高斯先验 $w\sim\mathcal{N}(0,\tau^2)$，则 $\log p(w) = -\frac{\|w\|^2}{2\tau^2}+\text{常数}$，于是最大化后验等价于

$$\text{最小化}\ \underbrace{\text{负对数似然}}_{\text{数据拟合}} + \underbrace{\frac{1}{2\tau^2}\|w\|^2}_{\text{L2 惩罚}}$$

**L2 正则（权重衰减）就是"权重服从高斯先验"的 MAP**，惩罚强度 $\lambda$ 与先验方差成反比：先验越强（$\tau$ 越小）→ $\lambda$ 越大 → 权重被压得越接近 0。同理，若假设权重服从**拉普拉斯先验**（在 0 处有尖峰），导出的就是 **L1 正则**，它倾向于产生稀疏解（部分权重恰为 0）——这解释了 L1 为什么能做特征选择，而 L2 只能把权重压小。

| 假设 | 导出的损失 / 正则项 | 稳健性与特点 |
|---|---|---|
| 高斯噪声 | 平方损失（MSE） | 对离群点敏感，梯度处处可导 |
| 拉普拉斯噪声 | 绝对误差损失（MAE） | 对离群点稳健，0 点不可导 |
| 伯努利 / 类别分布 | 交叉熵（BCE / softmax+CE） | 分类的标准损失，梯度简洁 |
| 高斯先验 | L2 正则（权重衰减） | 压缩权重幅度，不产生稀疏 |
| 拉普拉斯先验 | L1 正则 | 产生稀疏解，可用于特征选择 |

**用一个可复现的小实验体会"损失来自似然"**：下面构造服从温度 $T=2$ 的 softmax 分布的数据（温度为 1 的 logits 乘上 $T$），然后**只优化一个温度参数**去最大化似然，看它能否恢复出真值 2。这就是 MLE 在最小尺度上的完整演示：

```python
import torch
import torch.nn.functional as F

torch.manual_seed(0)
T_TRUE = 2.0

# 数据生成：真实概率 = softmax(logits_obs * 2)
logits_obs = torch.randn(100000, 5)
y = torch.multinomial(torch.softmax(logits_obs * T_TRUE, dim=-1), 1).squeeze(1)

# 用 MLE 估计温度：唯一可训练参数就是 T
T_hat = torch.nn.Parameter(torch.ones(1))
opt = torch.optim.Adam([T_hat], lr=0.05)
for step in range(300):
    loss = F.cross_entropy(logits_obs * T_hat, y) + 1e-3 * T_hat ** 2
    opt.zero_grad(); loss.backward(); opt.step()

print(f'MLE 估计的温度: {float(T_hat.detach()):.3f}（真值 {T_TRUE}）')
```

运行结果约为 `1.98`——与真值 2 非常接近。这里的最小化交叉熵就是最大化似然，而温度参数正是被"数据出现的概率最大"这一原则推到了正确的值上。

> **两点收尾提醒**：① **MLE 与 MAP 的取舍**——MLE 不含先验，数据少时容易过拟合（它会把 train 集完美拟合）；MAP 通过先验做正则化，代价是引入了一个需要选择的超参数 $\lambda$（或等价地先验方差 $\tau^2$），而 $\lambda$ 的确定又回到"模型选择"一章的交叉验证。**"正则化"与"贝叶斯先验"是同一件事的两种说法**；② 上面所有推导都假设了**样本独立同分布**（i.i.d.），因此似然才能写成连乘。时序数据不满足独立同分布假设，这也是后文《从卷积到序列》中序列建模与普通分类任务在方法论上分道扬镳的起点。

### 图像分类数据集：Fashion-MNIST

MNIST 手写数字数据集在深度学习早期被广泛使用，但 95% 以上的准确率使模型间的区分度不足。**Fashion-MNIST** 是它的现代替代：同样 $28\times28$ 灰度图、6 万训练样本 + 1 万测试样本，但内容是 10 类服装物品（T 恤、长裤、套头衫、连衣裙、外套、凉鞋、衬衫、运动鞋、包、短靴），难度更高。

PyTorch 通过 `torchvision` 包加载数据集，无需手动下载：

```python
import torch
import torchvision
import torchvision.transforms as transforms

mnist_train = torchvision.datasets.FashionMNIST(
    root='~/Datasets/FashionMNIST', train=True, download=True,
    transform=transforms.ToTensor())        # 转换为 Tensor
mnist_test = torchvision.datasets.FashionMNIST(
    root='~/Datasets/FashionMNIST', train=False, download=True,
    transform=transforms.ToTensor())

print(len(mnist_train), len(mnist_test))    # 60000 10000
feature, label = mnist_train[0]
print(feature.shape, label)                 # torch.Size([1, 28, 28]) tensor(9)
```

`transforms.ToTensor()` 将 PIL 图像（形状 $H\times W\times C$、取值 0-255 的 uint8）转换为形状 $C\times H\times W$、取值 $[0,1]$ 的 float32 张量——通道维前置是 PyTorch 的标准约定。用 `DataLoader` 构造小批量迭代器：

```python
batch_size = 256
train_iter = torch.utils.data.DataLoader(mnist_train, batch_size=batch_size,
                                         shuffle=True, num_workers=0)
test_iter = torch.utils.data.DataLoader(mnist_test, batch_size=batch_size,
                                        shuffle=False, num_workers=0)
```

### 自定义 Dataset 类

`FashionMNIST` 是 torchvision 提供的内置数据集；处理**自己的数据**时（CSV 表格、本地图片文件夹等），需要自定义数据集类。做法是继承 `torch.utils.data.Dataset` 并实现两个方法：

- `__len__`：返回样本总数，供 `DataLoader` 计算迭代轮数；
- `__getitem__(idx)`：返回第 `idx` 个样本的（特征, 标签），`DataLoader` 按此方法逐批取数。

```python
import torch
from torch.utils.data import Dataset, DataLoader

class MyDataset(Dataset):
    def __init__(self, features, labels, transform=None):
        self.features = features          # 如 NumPy 数组（样本 × 特征）
        self.labels = labels
        self.transform = transform        # 数据变换（可选）

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        x, y = self.features[idx], self.labels[idx]
        if self.transform is not None:
            x = self.transform(x)
        return x, y

# 用法与内置数据集完全一致
dataset = MyDataset(features, labels,
                    transform=lambda x: torch.tensor(x, dtype=torch.float32))
data_iter = DataLoader(dataset, batch_size=64, shuffle=True)
```

要点：① 特征与标签必须按**索引对齐**（第 `idx` 个特征对应第 `idx` 个标签）；② 把 `transform` 与数据加载解耦——同一数据在不同实验（是否增强、是否归一化）间复用，只需更换变换函数；③ 实际项目中常把"读取原始文件 → 预处理 → 返回张量"全部放进 `__getitem__`，并配合 `DataLoader(num_workers>0)` 并行读取。对图像数据，`torchvision.transforms` 提供现成变换（`ToTensor`、`Normalize`、`RandomHorizontalFlip` 等），可与自定义 `Dataset` 组合使用。

### softmax 回归的从零开始实现

#### 初始化参数与实现 softmax 运算

输入是 $28\times28=784$ 维的展平向量，输出 10 类：

```python
num_inputs, num_outputs = 784, 10
W = torch.tensor(np.random.normal(0, 0.01, (num_inputs, num_outputs)), dtype=torch.float)
b = torch.zeros(num_outputs, dtype=torch.float)
W.requires_grad_(requires_grad=True)
b.requires_grad_(requires_grad=True)

def softmax(X):
    X_exp = X.exp()
    partition = X_exp.sum(dim=1, keepdim=True)   # 行求和（keepdim 保持维度以便广播）
    return X_exp / partition                     # 利用广播机制逐行归一化

X = torch.rand((2, 5))
X_prob = softmax(X)
print(X_prob, X_prob.sum(dim=1))                 # 每行和为 1
```

运行结果：

```
tensor([[0.2206, 0.1520, 0.1446, 0.2690, 0.2138],
        [0.1540, 0.2290, 0.1387, 0.2019, 0.2765]]) tensor([1., 1.])
```

#### 定义模型、损失函数与准确率

```python
def net(X):
    return softmax(torch.mm(X.view((-1, num_inputs)), W) + b)

def cross_entropy(y_hat, y):
    return -torch.log(y_hat.gather(1, y.view(-1, 1)))

def accuracy(y_hat, y):
    return (y_hat.argmax(dim=1) == y).float().mean().item()
```

`accuracy` 中 `y_hat.argmax(dim=1)` 取每行最大概率的索引作为预测类别，与真实标签比较后求均值即为准确率。对测试集整体评估的函数：

```python
def evaluate_accuracy(data_iter, net):
    acc_sum, n = 0.0, 0
    for X, y in data_iter:
        acc_sum += (net(X).argmax(dim=1) == y).float().sum().item()
        n += y.shape[0]
    return acc_sum / n
```

#### 训练模型

训练骨架与线性回归完全一致，区别仅在于损失函数与评估指标：

```python
num_epochs, lr, batch_size = 5, 0.1, 256

def train_ch3(net, train_iter, test_iter, loss, num_epochs, batch_size,
              params=None, lr=None, optimizer=None):
    for epoch in range(num_epochs):
        train_l_sum, train_acc_sum, n = 0.0, 0.0, 0
        for X, y in train_iter:
            y_hat = net(X)
            l = loss(y_hat, y).sum()
            if optimizer is not None:
                optimizer.zero_grad()              # 简洁实现：优化器清零
            elif params is not None and params[0].grad is not None:
                for param in params:
                    param.grad.data.zero_()        # 从零实现：手动清零
            l.backward()
            if optimizer is None:
                sgd(params, lr, batch_size)
            else:
                optimizer.step()
            train_l_sum += l.item()
            train_acc_sum += (y_hat.argmax(dim=1) == y).sum().item()
            n += y.shape[0]
        test_acc = evaluate_accuracy(test_iter, net)
        print('epoch %d, loss %.4f, train acc %.3f, test acc %.3f'
              % (epoch + 1, train_l_sum / n, train_acc_sum / n, test_acc))

train_ch3(net, train_iter, test_iter, cross_entropy, num_epochs, batch_size, [W, b], lr)
```

运行结果：

```
epoch 1, loss 0.7878, train acc 0.749, test acc 0.794
epoch 2, loss 0.5702, train acc 0.814, test acc 0.813
epoch 3, loss 0.5252, train acc 0.827, test acc 0.819
epoch 4, loss 0.5010, train acc 0.833, test acc 0.824
epoch 5, loss 0.4858, train acc 0.836, test acc 0.815
```

线性模型在 Fashion-MNIST 上测试准确率约 0.82——远未达到可用水平，说明类别间的关系并非线性可分，需要更强的模型（多层感知机、卷积网络）。

### softmax 回归的简洁实现

```python
from torch import nn
from torch.nn import init
import torch.optim as optim

class FlattenLayer(nn.Module):
    """将 (batch, C, H, W) 展平为 (batch, C*H*W)"""
    def forward(self, x):
        return x.view(x.shape[0], -1)

net = nn.Sequential(
    FlattenLayer(),                       # 展平 28x28 图像
    nn.Linear(num_inputs, num_outputs)    # 全连接输出层
)
init.normal_(net[1].weight, mean=0, std=0.01)
init.constant_(net[1].bias, val=0)

loss = nn.CrossEntropyLoss()              # 内置 softmax + 交叉熵（数值稳定）
optimizer = optim.SGD(net.parameters(), lr=0.1)
```

`nn.CrossEntropyLoss` 将 softmax 运算与交叉熵合并为一个数值稳定的函数，直接输入未归一化的得分（logits）与类别索引即可，训练循环与线性回归的简洁实现相同（`loss(net(X), y)`，不再需要手动 softmax 与 `gather`）：

```
epoch 1, loss 0.0031, train acc 0.745, test acc 0.790
epoch 2, loss 0.0022, train acc 0.812, test acc 0.807
epoch 3, loss 0.0021, train acc 0.825, test acc 0.806
epoch 4, loss 0.0020, train acc 0.832, test acc 0.810
epoch 5, loss 0.0019, train acc 0.838, test acc 0.823
```

### 预测

训练完成后，对测试集中取若干图像，将真实标签与模型预测并列显示，可直观检查分类效果（借助 matplotlib 的 `imshow` 将 28x28 张量绘制为图像）。观察发现错误主要集中在形态相近的类别之间（如 T 恤与衬衫、套头衫与外套）——这为后续"误差分析"提供了方向。

---

## 多层感知机

softmax 回归只是单层线性模型，无法处理线性不可分的数据（Fashion-MNIST 上仅约 0.82 的准确率即是证据）。**多层感知机（multilayer perceptron，MLP）** 在输入与输出之间引入一个或多个**隐藏层（hidden layer）**，并施加非线性**激活函数**，从而获得拟合任意复杂函数的能力。

### 隐藏层

在输入层与输出层之间加入一个隐藏层，得到如下计算：

$$\mathbf{H} = \phi(\mathbf{X}\mathbf{W}_h + \mathbf{b}_h), \qquad \mathbf{O} = \mathbf{H}\mathbf{W}_o + \mathbf{b}_o$$

其中 $\mathbf{W}_h, \mathbf{b}_h$ 为隐藏层的权重与偏置，$\mathbf{W}_o, \mathbf{b}_o$ 为输出层的权重与偏置，$\phi$ 是激活函数。隐藏层的**隐藏单元（hidden unit）**数量是一个超参数——它决定模型的宽度。

**为什么必须引入非线性？** 若 $\phi$ 是恒等映射，则两层全连接可以合并为一层：$\mathbf{O} = (\mathbf{X}\mathbf{W}_h + \mathbf{b}_h)\mathbf{W}_o + \mathbf{b}_o = \mathbf{X}(\mathbf{W}_h\mathbf{W}_o) + (\mathbf{b}_h\mathbf{W}_o + \mathbf{b}_o)$，仍是一个线性函数——无论网络多深，线性复合仍是线性，表达能力与单层网络无异。**唯有非线性激活函数才能让深度带来新的表达能力**。这一结论是理解深度学习的关键：

> **理论补充：线性复合的退化。** 设 $a^{[1]} = W^{[1]}x + b^{[1]}$、$a^{[2]} = W^{[2]}a^{[1]} + b^{[2]}$，则 $a^{[2]} = (W^{[2]}W^{[1]})x + (W^{[2]}b^{[1]} + b^{[2]})$——任意多层线性变换都可以压缩为单层。推论：隐藏层全线性 + 输出线性 $\Leftrightarrow$ 线性回归；隐藏层全线性 + 输出 softmax $\Leftrightarrow$ softmax 回归。因此"隐藏层 + 非线性激活"是 MLP 与单层模型的本质区别。

### 激活函数

激活函数对仿射变换（$\mathbf{x}\mathbf{W}+\mathbf{b}$，即线性变换 + 平移）的输出施加逐元素非线性变换。常用的有三种。

#### ReLU 函数

$$\text{ReLU}(x) = \max(x, 0)$$

**导数**：$x>0$ 时为 1，$x<0$ 时为 0。ReLU 是当前**隐藏层的默认选择**，原因有二：① 计算极简（一次比较），前向与反向都很快；② 正半轴导数为常数 1，**梯度不会衰减**——这是其相对于 sigmoid 的关键优势。

#### sigmoid 函数

$$\text{sigmoid}(x) = \frac{1}{1 + e^{-x}}$$

将实数压缩到 $(0,1)$，常用于输出层（二分类概率）。**导数** $\text{sigmoid}(x)(1-\text{sigmoid}(x))$：在 $x=0$ 处最大（0.25），向两端迅速衰减至 0——即**梯度消失（vanishing gradient）**：深层网络中误差信号经过多层 sigmoid 后指数级缩小，学习极慢。这使其在隐藏层中被 ReLU 取代。

#### tanh 函数

$$\tanh(x) = \frac{1 - e^{-2x}}{1 + e^{-2x}}$$

将实数压缩到 $(-1,1)$，是关于原点对称的"零中心"函数（输出均值为 0，利于下一层学习）。**导数** $1-\tanh^2(x)$：在 $x=0$ 处最大（1），向两端衰减至 0，同样存在梯度消失问题。

| 函数 | 公式 | 值域 | 导数 | 典型用途 |
|---|---|---|---|---|
| **ReLU** | $\max(x,0)$ | $[0,+\infty)$ | $x>0$ 为 1，否则 0 | 隐藏层默认 |
| **sigmoid** | $\frac{1}{1+e^{-x}}$ | $(0,1)$ | $\sigma(x)(1-\sigma(x))$ | 二分类输出层 |
| **tanh** | $\frac{1-e^{-2x}}{1+e^{-2x}}$ | $(-1,1)$ | $1-\tanh^2(x)$ | 零中心场景 |

> **理论补充：ReLU 的梯度问题。** ReLU 在 $x<0$ 时导数为 0，若某神经元长期收到负输入，其梯度恒为 0，参数不再更新——称为"死亡 ReLU"。实践中可通过合理的初始化与较小的学习率缓解。ReLU 的变体（Leaky ReLU、Parametric ReLU 等）在负半轴保留小斜率，进一步规避该问题。

### 多层感知机

MLP 将多个隐藏层串联：前一层的输出作为后一层的输入，每层"仿射变换 + 非线性激活"。网络结构由**层数**（深度）与各层**隐藏单元数**（宽度）两个超参数描述。

**表达能力**：包含一个足够宽的隐藏层的 MLP 可以以任意精度逼近任意连续函数（万能逼近定理）。因此从理论上说，单隐藏层 MLP 已足够"万能"，但实践中**深而窄**的网络往往比浅而宽的网络更容易训练、泛化更好——深层结构通过逐层抽象（底层学边缘、高层学部件）天然符合数据的层次结构，参数效率更高。

**参数数量**：以 Fashion-MNIST 分类为例，隐藏单元数 256 的 MLP 参数量为 $784\times256 + 256 + 256\times10 + 10 = 203{,}530$，远超单层 softmax 回归的 $784\times10+10=7{,}850$。参数越多，模型越容易过拟合——这正是下一部分"模型选择与正则化"要解决的问题。

### 多层感知机的从零开始实现

沿用 softmax 回归的框架，仅需修改模型定义：

```python
num_inputs, num_outputs, num_hiddens = 784, 10, 256

W1 = torch.tensor(np.random.normal(0, 0.01, (num_inputs, num_hiddens)), dtype=torch.float)
b1 = torch.zeros(num_hiddens, dtype=torch.float)
W2 = torch.tensor(np.random.normal(0, 0.01, (num_hiddens, num_outputs)), dtype=torch.float)
b2 = torch.zeros(num_outputs, dtype=torch.float)
params = [W1, b1, W2, b2]
for param in params:
    param.requires_grad_(requires_grad=True)

def relu(X):
    return torch.max(input=X, other=torch.tensor(0.0))

def net(X):
    X = X.view((-1, num_inputs))
    H = relu(torch.matmul(X, W1) + b1)     # 隐藏层 + ReLU
    return torch.matmul(H, W2) + b2        # 输出层（线性，交给交叉熵）

loss = torch.nn.CrossEntropyLoss()
num_epochs, lr, batch_size = 5, 100.0, 256
train_ch3(net, train_iter, test_iter, loss, num_epochs, batch_size, params, lr)
```

运行结果：

```
epoch 1, loss 0.0030, train acc 0.714, test acc 0.753
epoch 2, loss 0.0019, train acc 0.821, test acc 0.777
epoch 3, loss 0.0017, train acc 0.842, test acc 0.834
epoch 4, loss 0.0015, train acc 0.857, test acc 0.839
epoch 5, loss 0.0014, train acc 0.865, test acc 0.845
```

测试准确率从 softmax 的约 0.82 提升到约 0.845——非线性隐藏层确实学到了线性模型无法表达的模式。（注：从零实现中学习率取 100.0，是因为 `nn.CrossEntropyLoss` 返回 batch 均值、手写 `sgd` 内又除以 `batch_size`，有效学习率被二次缩小为 $100/256\approx 0.39$，与简洁实现直接使用的 0.5 相当，故用大学习率补偿。）

### 多层感知机的简洁实现

用 `nn.Sequential` 依次堆叠展平层、隐藏层、激活函数与输出层，每层都是框架提供的现成组件：

```python
net = nn.Sequential(
    FlattenLayer(),                          # 展平 (batch, 1, 28, 28)
    nn.Linear(num_inputs, num_hiddens),      # 隐藏层
    nn.ReLU(),                               # 激活函数
    nn.Linear(num_hiddens, num_outputs),     # 输出层
)
for params in net.parameters():
    init.normal_(params, mean=0, std=0.01)

loss = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(net.parameters(), lr=0.5)
num_epochs = 5
# train_ch3(net, train_iter, test_iter, loss, num_epochs, batch_size,
#           None, None, optimizer)   # 走 optimizer 分支
```

运行结果：

```
epoch 1, loss 0.0030, train acc 0.712, test acc 0.744
epoch 2, loss 0.0019, train acc 0.823, test acc 0.821
epoch 3, loss 0.0017, train acc 0.844, test acc 0.842
epoch 4, loss 0.0015, train acc 0.856, test acc 0.842
epoch 5, loss 0.0014, train acc 0.864, test acc 0.818
```

从零实现与简洁实现的结果基本一致，验证了两种写法的等价性。**注意**：MLP 在训练集上的准确率（0.864）已高于测试集（0.818），二者出现差距——这是过拟合的早期信号，也是下一部分讨论的主题。

---

## 模型选择、欠拟合与过拟合

前文用 Fashion-MNIST 训练了 MLP，观察到训练准确率高于测试准确率的迹象。本节系统讨论机器学习最核心的泛化问题：**训练误差与泛化误差的区别、模型选择的正确流程、欠拟合与过拟合的成因，以及权重衰减与丢弃法两大正则化手段**。

### 训练误差和泛化误差

- **训练误差（training error）**：模型在训练数据集上表现出的误差，可通过优化算法不断降低；
- **泛化误差（generalization error）**：模型在**未见过的样本**上表现出的误差，只能通过测试数据集近似估计。

**关键事实**：训练误差是泛化误差的乐观估计——参数在训练集上拟合，训练误差系统性低于真实泛化误差；且模型越复杂，二者差距越大。机器学习的根本目标是降低**泛化误差**，而非训练误差。

### 模型选择

深度学习模型包含大量**超参数**（隐藏单元数、层数、学习率、正则化强度等），它们不通过训练学习，而由人工设定。选择超参数的过程称为**模型选择（model selection）**。

#### 验证数据集

**严谨的流程要求：测试集只能使用一次，用于最终评估，绝不能用于模型选择。** 若用测试集挑选超参数，测试误差会变成过于乐观的泛化误差估计（超参数间接"拟合"了测试集）。正确做法是从训练集中划分一部分作为**验证数据集（validation set）**：

| 数据集 | 用途 | 使用次数 |
|---|---|---|
| 训练集 | 学习模型参数 | 每轮训练 |
| 验证集 | 选择超参数 / 模型结构 | 反复使用 |
| 测试集 | 最终评估泛化误差 | 仅一次 |

#### K 折交叉验证

当训练数据不足时，划分验证集会进一步缩小训练集。**K 折交叉验证（K-fold cross-validation）** 将训练数据分成 $K$ 个不重叠的子集，依次用其中 $K-1$ 个子集训练、余下 1 个子集验证，取 $K$ 次验证误差的平均作为模型评估值（书中 Kaggle 房价预测实战即采用 5 折交叉验证）。代价是训练 $K$ 次模型，计算量增大。

### 欠拟合和过拟合

**欠拟合（underfitting）**：模型连训练数据都拟合不好，通常因模型容量不足；**过拟合（overfitting）**：训练误差远低于测试误差——模型"记忆"了训练数据的噪声而非规律。两个决定性因素是**模型复杂度**（容量过低→欠拟合、过高→过拟合）与**训练数据集大小**（样本越少越容易过拟合，样本数接近甚至少于特征数时过拟合几乎必然）。

### 多项式函数拟合实验

用 PyTorch 复现上述结论。生成数据：真实函数为 $y = 1.2x - 3.4x^2 + 5.6x^3 + 5 + \epsilon$（$\epsilon$ 为标准差 0.01 的噪声），训练集与测试集各 100 个样本，特征构造为 $x$ 的 1~3 次幂：

```python
import torch
import numpy as np

n_train, n_test, true_w, true_b = 100, 100, [1.2, -3.4, 5.6], 5
features = torch.randn((n_train + n_test, 1))
poly_features = torch.cat((features, torch.pow(features, 2), torch.pow(features, 3)), 1)
labels = (true_w[0] * poly_features[:, 0] + true_w[1] * poly_features[:, 1]
          + true_w[2] * poly_features[:, 2] + true_b)
labels += torch.tensor(np.random.normal(0, 0.01, size=labels.size()), dtype=torch.float)
```

定义训练与评估函数（用 `nn.Linear` 拟合，`nn.MSELoss` 作损失，SGD 训练 100 轮）：

```python
num_epochs, loss = 100, torch.nn.MSELoss()

def fit_and_plot(train_features, test_features, train_labels, test_labels):
    net = torch.nn.Linear(train_features.shape[-1], 1)
    batch_size = min(10, train_labels.shape[0])
    dataset = torch.utils.data.TensorDataset(train_features, train_labels)
    train_iter = torch.utils.data.DataLoader(dataset, batch_size, shuffle=True)
    optimizer = torch.optim.SGD(net.parameters(), lr=0.01)
    train_ls, test_ls = [], []
    for _ in range(num_epochs):
        for X, y in train_iter:
            l = loss(net(X), y.view(-1, 1))
            optimizer.zero_grad()
            l.backward()
            optimizer.step()
        train_ls.append(loss(net(train_features), train_labels.view(-1, 1)).item())
        test_ls.append(loss(net(test_features), test_labels.view(-1, 1)).item())
    print('final epoch: train loss', train_ls[-1], 'test loss', test_ls[-1])
    print('weight:', net.weight.data, '\nbias:', net.bias.data)
```

**情形一：三阶多项式拟合（正常）**——用完整的三次特征：

```
final epoch: train loss 0.00010175639908993617 test loss 9.790256444830447e-05
weight: tensor([[ 1.1982, -3.3992,  5.6002]]) 
bias: tensor([5.0014])
```

学到的权重 $[1.198, -3.399, 5.600]$ 与真实值 $[1.2, -3.4, 5.6]$ 高度一致，训练与测试损失都极小——模型容量与数据复杂度匹配。

**情形二：线性函数拟合（欠拟合）**——只给模型 $x$ 一个特征：

```
final epoch: train loss 249.35157775878906 test loss 168.37705993652344
weight: tensor([[19.4123]]) 
bias: tensor([0.5805])
```

线性模型无法表达三次关系，训练损失高达 249，学到的权重也无意义——**欠拟合**。

**情形三：训练样本不足（过拟合）**——模型仍是三阶多项式，但只用 2 个样本训练：

```
final epoch: train loss 1.198514699935913 test loss 166.037109375
weight: tensor([[1.4741, 2.1198, 2.5674]]) 
bias: tensor([3.1207])
```

训练损失不大，但测试损失高达 166——模型在 2 个样本上"自由发挥"，完全丧失了泛化能力——**过拟合**。这个三情形对照实验清晰展示了模型复杂度与数据量如何共同决定欠拟合/过拟合状态。

### 权重衰减

**权重衰减（weight decay）** 是最常用的正则化手段，等价于 $\ell_2$ 范数正则化：在损失函数中加入参数范数惩罚项，抑制参数幅值：

$$\ell(\mathbf{w}, b) + \frac{\lambda}{2}\|\mathbf{w}\|^2 = \ell(\mathbf{w}, b) + \frac{\lambda}{2}\sum_{j} w_j^2$$

其中 $\lambda$ 是**正则化超参数**。惩罚项迫使模型偏好**幅值小**的参数——小权重意味着函数更平滑、对输入的扰动更不敏感，从而降低过拟合。注意正则化通常**只惩罚权重、不惩罚偏置**（偏置不参与特征缩放，惩罚它没有意义）。

**从零开始实现**：在损失中显式加入惩罚项。实验设置：特征数 200、训练样本仅 20（极易过拟合），对比 $\lambda=0$ 与 $\lambda=3$ 学到的权重范数：

```python
n_train, n_test, num_inputs = 20, 100, 200
true_w, true_b = torch.ones(num_inputs, 1) * 0.01, 0.05
features = torch.randn((n_train + n_test, num_inputs))
labels = torch.matmul(features, true_w) + true_b
labels += torch.tensor(np.random.normal(0, 0.01, size=labels.size()), dtype=torch.float)
train_features, test_features = features[:n_train, :], features[n_train:, :]
train_labels, test_labels = labels[:n_train], labels[n_train:]

def l2_penalty(w):
    return (w ** 2).sum() / 2

# 训练循环中：l = loss(net(X, w, b), y) + lambd * l2_penalty(w)
```

分别以 $\lambda=0$ 与 $\lambda=3$ 训练，比较学到的权重 $\ell_2$ 范数：

```
λ = 0  →  L2 norm of w: 15.114808082580566
λ = 3  →  L2 norm of w: 0.035220853984355927
```

不加正则化时权重范数高达 15.1（在 20 个样本上疯狂拟合）；加入 $\lambda=3$ 的惩罚后范数骤降至 0.035，测试误差显著下降。

**简洁实现**：PyTorch 的优化器内置 `weight_decay` 参数（示意代码：`net` 为前文定义的网络，`lr`、`wd` 为既有超参数，实际使用时需配上完整训练循环）：

```python
optimizer_w = torch.optim.SGD(params=[net.weight], lr=lr, weight_decay=wd)  # 只对权重衰减
optimizer_b = torch.optim.SGD(params=[net.bias], lr=lr)                     # 偏置不衰减
```

> **理论补充：权重衰减的贝叶斯解释。** 对参数施加高斯先验并求最大后验估计（MAP），目标函数恰为"负对数似然 + $\ell_2$ 惩罚"——$\ell_2$ 正则化（Ridge、权重衰减）等价于高斯先验下的 MAP 估计；拉普拉斯先验对应 $\ell_1$ 正则化（LASSO），其解具有稀疏性（部分参数恰为 0），可实现自动特征选择。

### 丢弃法

**丢弃法（dropout）** 是另一种直观而有效的正则化手段：训练时**随机丢弃**隐藏层的一部分神经元（将其输出置 0），迫使网络不能依赖任何单个神经元，从而学习更鲁棒的冗余表示。以下实现的是现代通用的**倒置丢弃法（inverted dropout）**：

```python
def dropout(X, drop_prob):
    X = X.float()
    assert 0 <= drop_prob <= 1
    keep_prob = 1 - drop_prob
    if keep_prob == 0:
        return torch.zeros_like(X)
    mask = (torch.rand(X.shape) < keep_prob).float()   # 均匀分布随机生成 0/1 掩码
    return mask * X / keep_prob                        # 除以 keep_prob 保持期望不变
```

> 注：掩码须用均匀分布 `torch.rand` 生成，才能保证保留比例恰为 `keep_prob`；若误用标准正态的 `torch.randn`（`P(randn<keep_prob)≠keep_prob`，如丢弃 0.5 时实际只保留约 69%），"训练/预测期望一致"的性质会被破坏。

**倒置丢弃法的关键**：除以 `keep_prob` 使输出的期望在训练与预测时一致（被保留的神经元输出放大 $1/\operatorname{keep＿prob}$ 倍），因此**预测（推理）时不再需要任何调整**——只需关闭 dropout。

在模型中使用：训练时对每个隐藏层的输出施加 dropout（丢弃概率 `drop_prob` 是超参数），评估时关闭：

```python
num_inputs, num_outputs, num_hiddens1, num_hiddens2 = 784, 10, 256, 256
W1 = torch.tensor(np.random.normal(0, 0.01, (num_inputs, num_hiddens1)), dtype=torch.float, requires_grad=True)
b1 = torch.zeros(num_hiddens1, requires_grad=True)
W2 = torch.tensor(np.random.normal(0, 0.01, (num_hiddens1, num_hiddens2)), dtype=torch.float, requires_grad=True)
b2 = torch.zeros(num_hiddens2, requires_grad=True)
W3 = torch.tensor(np.random.normal(0, 0.01, (num_hiddens2, num_outputs)), dtype=torch.float, requires_grad=True)
b3 = torch.zeros(num_outputs, requires_grad=True)
drop_prob1, drop_prob2 = 0.2, 0.5

def net(X, is_training=True):
    X = X.view(-1, num_inputs)
    H1 = (torch.matmul(X, W1) + b1).relu()
    if is_training:
        H1 = dropout(H1, drop_prob1)     # 第一个隐藏层丢弃 20%
    H2 = (torch.matmul(H1, W2) + b2).relu()
    if is_training:
        H2 = dropout(H2, drop_prob2)     # 第二个隐藏层丢弃 50%
    return torch.matmul(H2, W3) + b3
```

评估（测试）时须以 `net(X, is_training=False)` 调用关闭丢弃；若复用前文的 `train_ch3`，其内置评估函数以 `net(X)` 调用，需改为 `net(X, is_training=False)` 或自定义评估函数。

**简洁实现**：`nn.Dropout(drop_prob)` 直接作为网络的一层；预测前调用 `net.eval()` 自动关闭 dropout（`net.train()` 恢复训练模式）：

```python
net = nn.Sequential(
    FlattenLayer(),
    nn.Linear(num_inputs, num_hiddens1), nn.ReLU(), nn.Dropout(drop_prob1),
    nn.Linear(num_hiddens1, num_hiddens2), nn.ReLU(), nn.Dropout(drop_prob2),
    nn.Linear(num_hiddens2, 10)
)
```

从零实现（含 dropout，评估时关闭丢弃）在 Fashion-MNIST 上的训练结果：

```
epoch 1, loss 0.0044, train acc 0.574, test acc 0.648
epoch 2, loss 0.0023, train acc 0.786, test acc 0.786
epoch 3, loss 0.0019, train acc 0.826, test acc 0.825
epoch 4, loss 0.0017, train acc 0.839, test acc 0.831
epoch 5, loss 0.0016, train acc 0.849, test acc 0.850
```

注意训练初期的训练准确率明显低于测试准确率——这是 dropout 的预期效果（训练时网络"被削弱"），随训练进行两者趋于一致，且测试准确率最终达到 0.85，与不加 dropout 的 MLP 相当甚至更优，而训练-测试差距显著缩小。

> **理论补充：dropout 的集成视角。** 每次随机丢弃都相当于训练一个不同的"子网络"，训练过程隐式地集成了指数多个子网络的平均效果；同时 dropout 对神经元施加乘法噪声，等效于一种正则化。Srivastava 等（2014）证明 dropout 能有效防止神经网络过拟合，是深度学习训练的标准组件。

---

## 正向传播、反向传播与计算图

前文一直在用 `backward()` 自动计算梯度，但未深入其原理。本节剖析深度学习训练的数学机制：**正向传播**如何从输入逐层计算输出与损失，**计算图**如何记录这一过程，**反向传播**如何依据链式法则高效地求出每个参数的梯度。

### 正向传播

**正向传播（forward propagation）** 指按神经网络的层次顺序，从输入逐层计算到输出（与损失）的过程。以一个含 $L_2$ 正则的 MLP 为例：输入 $\mathbf{x}\in\mathbb{R}^d$，隐藏层权重 $\mathbf{W}^{(1)}\in\mathbb{R}^{d\times h}$、偏置 $\mathbf{b}^{(1)}\in\mathbb{R}^{1\times h}$，输出层权重 $\mathbf{W}^{(2)}\in\mathbb{R}^{h\times q}$、偏置 $\mathbf{b}^{(2)}$，激活函数 $\phi$（如 ReLU）。单样本的正向传播为：

$$\mathbf{z}^{(1)} = \mathbf{x}\mathbf{W}^{(1)} + \mathbf{b}^{(1)}, \qquad \mathbf{h} = \phi(\mathbf{z}^{(1)}), \qquad \mathbf{z}^{(2)} = \mathbf{h}\mathbf{W}^{(2)} + \mathbf{b}^{(2)}, \qquad o = \mathbf{z}^{(2)}$$

设标签为 $y$，平方损失为 $\ell = \frac{1}{2}(o - y)^2$，加上 $\ell_2$ 正则化项（$\lambda$ 为正则化强度）后，**目标函数**为

$$L = \ell + \frac{\lambda}{2}\left(\|\mathbf{W}^{(1)}\|_F^2 + \|\mathbf{W}^{(2)}\|_F^2\right)$$

其中 $\|\cdot\|_F$ 是 Frobenius 范数（矩阵元素平方和的平方根）。训练的目标是求 $L$ 对全部参数的梯度。

### 正向传播的计算图

**计算图（computational graph）** 将上述计算过程显式化为有向无环图（DAG）：节点是数据与中间量（$\mathbf{x}, \mathbf{W}^{(1)}, \mathbf{b}^{(1)}, \mathbf{z}^{(1)}, \mathbf{h}, \ldots, L$），边是运算（矩阵乘、加法、激活、损失计算等）。正向传播按图的拓扑序（从输入到输出）执行运算；反向传播则按逆拓扑序（从输出到输入）传播梯度。

PyTorch 的 autograd 正是自动构建这一计算图：每个 `requires_grad=True` 的张量运算都会记录其 `grad_fn`（产生它的函数），形成图结构。前文见过的 `y.grad_fn`、`z.grad_fn` 就是计算图节点的句柄。

### 反向传播

**反向传播（back-propagation）** 依据微积分的**链式法则**，从输出端向输入端逐层计算目标函数对各中间量与参数的梯度。仍以上述 MLP 为例：

1. 对输出层，先求 $\partial L/\partial \ell = 1$ 与 $\partial \ell/\partial o = o - y$，进而
   $$\frac{\partial L}{\partial \mathbf{W}^{(2)}} = (o - y)\mathbf{h}^\top + \lambda\mathbf{W}^{(2)}, \qquad \frac{\partial L}{\partial \mathbf{b}^{(2)}} = o - y$$
2. 通过 $\mathbf{z}^{(1)}$ 将梯度传回隐藏层。因 $\mathbf{z}^{(1)}$ 与 $\mathbf{z}^{(2)}$ 通过 $\mathbf{h}$ 相连，由链式法则
   $$\frac{\partial L}{\partial \mathbf{h}} = (o - y)(\mathbf{W}^{(2)})^\top, \qquad \frac{\partial L}{\partial \mathbf{z}^{(1)}} = \frac{\partial L}{\partial \mathbf{h}} \odot \phi'(\mathbf{z}^{(1)})$$
   其中 $\odot$ 为逐元素乘法。注意激活函数的导数 $\phi'(\mathbf{z}^{(1)})$ 只出现在这一层——这正是"激活函数的导数决定梯度能否传得更远"的原因（sigmoid 导数最大值仅 0.25，多层累积后梯度指数衰减）。
3. 继续传回 $\mathbf{W}^{(1)}, \mathbf{b}^{(1)}$：
   $$\frac{\partial L}{\partial \mathbf{W}^{(1)}} = \mathbf{x}^\top\frac{\partial L}{\partial \mathbf{z}^{(1)}} + \lambda\mathbf{W}^{(1)}, \qquad \frac{\partial L}{\partial \mathbf{b}^{(1)}} = \frac{\partial L}{\partial \mathbf{z}^{(1)}}$$

**核心洞察**：反向传播的计算量（每个参数一次的乘加）与正向传播同阶，远小于"对每个参数单独用数值微分"的 $O(\text{参数量})$ 倍开销——这正是神经网络能够高效训练的关键。所有梯度就绪后，优化算法（如 SGD）据此更新参数，完成一轮训练。

### 训练深度学习模型

综合前文，训练一个深度学习模型就是反复执行如下**三层嵌套循环**：

```
初始化模型参数
重复（epoch 循环）：
    重复（小批量循环）：
        1. 正向传播：计算小批量输出与损失
        2. 反向传播：autograd 计算各参数梯度
        3. 优化更新：按梯度方向调整参数（sgd/Adam 等）
        4. 梯度清零：为下一小批量准备
    评估：在验证集上计算损失/准确率，据此调整超参数
```

前文线性回归、softmax 回归与 MLP 的训练代码全部是这个模板的实例——**模型的差异只体现在"模型定义"与"损失函数"两个位置**，训练机制完全通用。

### 数值稳定性和模型初始化

深层网络的训练还面临数值稳定性问题，根源同样在于链式法则的连乘效应。

#### 衰减和爆炸

**梯度衰减（vanishing）与梯度爆炸（explosion）**：设 MLP 有 $L$ 层，每层权重为 $\mathbf{W}^{(l)}$，激活为恒等映射（或导数接近常数的区域），则梯度从输出层传回输入层需要连乘 $L-1$ 个权重矩阵（$L$ 层间的 $L-1$ 次矩阵乘法）：$\frac{\partial L}{\partial \mathbf{W}^{(1)}} \propto \prod_{l=2}^{L}\mathbf{W}^{(l)}$。若权重尺度小于 1，连乘随 $L$ 指数衰减——浅层参数几乎得不到更新（梯度消失）；若大于 1，则指数爆炸，训练发散。**层数越深，问题越严重**——这是早期深层网络难以训练的根本原因。

对策包括：① 合理的参数初始化（使各层输出的方差保持稳定，见下文）；② 使用导数良好的激活函数（ReLU 替代 sigmoid）；③ 批归一化（BatchNorm）等归一化层；④ 残差连接（ResNet）让梯度有"捷径"直接传回浅层。

#### 随机初始化模型参数

**为什么不能全部初始化为 0？** 若所有参数初始化为同一值，正向传播中同层所有隐藏单元将收到相同输入、产生相同输出，反向传播中梯度也相同——所有单元退化为一个单元，网络失去表达能力（对称性问题）。因此必须**随机初始化**，打破对称性。

**PyTorch 的默认初始化**：`nn.Linear` 等层内置默认初始化策略（权重在 $[-\sqrt{k}, \sqrt{k}]$ 均匀分布，$k$ 与输入维度有关），可直接使用；也可用 `torch.nn.init` 显式指定，如前文的 `init.normal_(weight, mean=0, std=0.01)`。

**Xavier 随机初始化**（Glorot & Bengio, 2010）是经典理论初始化方案：考虑激活为线性时正向传播与反向传播的方差传递，令权重方差为

$$\text{Var}(W) = \frac{2}{n_{\text{in}} + n_{\text{out}}}$$

即权重从均匀分布 $U\left(-\sqrt{\frac{6}{n_{\text{in}}+n_{\text{out}}}}, \sqrt{\frac{6}{n_{\text{in}}+n_{\text{out}}}}\right)$ 采样（Xavier 均匀分布）。这样第 $l$ 层输出的方差与第 $l-1$ 层输入的方差相同，信号既不放大也不衰减，梯度可以稳定地在多层间传播。现代框架（含 PyTorch）对常见层默认采用类似思想（如 He 初始化，为 ReLU 适配的 Xavier 变体），实践上通常无需手动设置。

> **理论补充：为什么初始化能缓解梯度衰减。** 记第 $l$ 层输出 $h^{(l)} = W^{(l)}h^{(l-1)}$（忽略激活），若 $W^{(l)}$ 的元素独立且方差为 $\sigma^2$，则 $\text{Var}(h^{(l)}) = n^{(l-1)}\sigma^2\,\text{Var}(h^{(l-1)})$。令方差保持不变需 $\sigma^2 = 1/n^{(l-1)}$——即方差与输入维度成反比。Xavier 同时考虑反向传播（涉及输出维度），取两个维度的折中 $\frac{2}{n_{in}+n_{out}}$，使**正向信号与反向梯度都以 $O(1)$ 尺度传播**，这是深层网络可训练性的重要保障。

---

## 深度学习中的优化算法

训练深度学习模型本质上是**最小化目标函数**的优化问题。前文使用的梯度下降是基础，但现代深度学习需要更精巧的优化算法来应对高维非凸目标函数的挑战。本节从优化与深度学习的关系出发，依次介绍随机梯度下降家族：小批量随机梯度下降、动量法、AdaGrad、RMSProp、AdaDelta 与 Adam。

### 优化与深度学习的关系

**优化**的目标是最小化**损失函数**（基于训练数据的经验风险），而**深度学习**的目标是最小化**泛化误差**——优化只是手段而非目的。二者并不完全一致：优化做得好（训练损失低）不一定泛化好（测试损失高，即过拟合）；而某些"优化不充分"的解反而泛化更好（如早停）。因此深度学习中评价优化算法，既要看收敛速度，也要看其对泛化的影响。

深度学习的优化面临两大独特挑战：

**局部最小值（local minimum）**。目标函数非凸时，梯度下降可能收敛到局部极小点而非全局极小点。对 $f(x) = x\cos(\pi x)$ 这类函数，从不同初始点出发会落入不同的局部极小。不过实践中发现，深层网络损失曲面上的局部极小往往与全局极小性能相当，并非主要障碍。

**鞍点（saddle point）**。梯度为 0 的点未必是极值：$f(x) = x^3$ 在 $x=0$ 处导数为 0，但该点既非极大也非极小——它是**鞍点**。二维例子 $f(x,y) = x^2 - y^2$ 在原点处沿 $x$ 方向是极小、沿 $y$ 方向是极大。**判别法则**：梯度为 0 处，Hessian 矩阵正定 → 局部极小；负定 → 局部极大；特征值有正有负 → 鞍点。高维空间中鞍点远比局部极小常见（随机矩阵特征值正负各半的概率极高），深度学习优化算法必须能够"逃离"鞍点——噪声与动量正是为此而生。

### 梯度下降和随机梯度下降

**梯度下降（gradient descent）**：每次迭代用**全部**训练样本计算梯度并更新参数。以一维函数 $f(x) = x^2$（梯度 $f'(x) = 2x$）为例，从 $x=10$ 出发：

```python
def gd(eta):
    x = 10
    results = [x]
    for i in range(10):
        x -= eta * 2 * x      # f'(x) = 2x
        results.append(x)
    print('epoch 10, x:', x)
    return results

gd(0.2)   # epoch 10, x: 0.06046617599999997
```

**学习率的影响**：学习率 $\eta$ 太小（如 0.05）收敛极慢（10 轮后 $x=3.49$）；太大（如 1.1）则越过最优点来回震荡甚至发散（$x=61.9$）。合适的 $\eta$ 是优化成败的关键超参数。

**多维梯度下降**：目标函数 $f(\mathbf{x}) = 0.1x_1^2 + 2x_2^2$ 的等高线呈拉长的椭圆——$x_2$ 方向陡峭、$x_1$ 方向平缓。固定学习率下，沿 $x_2$ 方向振荡、沿 $x_1$ 方向爬行，收敛缓慢。这直观展示了**学习率无法同时适配各向异性目标**的问题，是自适应算法（AdaGrad 等）的动机。

**随机梯度下降（stochastic gradient descent，SGD）**：深度学习中样本量巨大，每步用全量数据计算梯度代价过高。SGD 每次迭代**随机抽取一个样本**（或小批量）估计梯度——梯度是真实梯度加噪声的无偏估计。噪声带来两个好处：① 计算量降到 $1/n$；② 噪声有助于跳出鞍点与浅的局部极小。代价是收敛路径曲折（目标函数值震荡下降）。

### 小批量随机梯度下降

**小批量随机梯度下降（mini-batch SGD）** 是两者的折中：每步从训练集中**有放回或无放回地**随机采样一小批样本（批量大小 `batch_size`）计算梯度。批量大小是重要的超参数：

| 批量大小 | 特点 |
|---|---|
| 1（纯 SGD） | 每步计算量最小，但梯度噪声大、震荡剧烈；无法利用矩阵运算的并行加速 |
| 适中（10~256） | 梯度估计稳定，且批量运算充分用上向量化与 GPU 并行，每 epoch 迭代次数适中 |
| 全量（梯度下降） | 梯度最准确，但每步开销大、无法利用冗余样本的并行性；且没有噪声帮助逃离鞍点 |

工程上批量大小通常取 2 的幂（32/64/128/256），由内存带宽与硬件特性决定。书中在 NASA 翼型噪声数据集（1500 样本、5 特征）上的对比实验显示：全批量（batch=1500）每 epoch 耗时 0.014 秒但需要 6 个 epoch 才收敛；单样本（batch=1）每 epoch 耗时 0.27 秒且路径震荡；batch=10 兼顾了速度与稳定性。**结论**：小批量 SGD 是深度学习训练的事实标准。

### 动量法

**问题**：梯度下降在条件数大的目标函数（等高线呈拉长椭圆）上沿陡峭方向来回振荡、沿平缓方向前进缓慢。

**动量法（momentum）** 引入**速度变量**，对梯度做**指数加权移动平均**（见下），用历史的"惯性"平滑更新方向：沿同一方向的梯度累积加速，来回震荡的梯度相互抵消。更新规则：

$$\mathbf{v}\_t \leftarrow \gamma\\,\mathbf{v}\_{t-1} + \eta\\,\nabla f(\mathbf{x}_{t-1}), \qquad \mathbf{x}\_t \leftarrow \mathbf{x}\_{t-1} - \mathbf{v}_t$$

其中 $\gamma$（通常取 0.9）是**动量超参数**。与 SGD 相比，动量法能用更大的学习率而保持稳定，收敛显著加速；动量的"惯性"也帮助越过浅的局部极小与鞍点。

> **理论补充：指数加权移动平均（EWMA）。** 对序列 $x_t$ 定义 $y_t = \gamma y_{t-1} + (1-\gamma)x_t$（或如动量法中的变体 $y_t = \gamma y_{t-1} + \eta x_t$），则 $y_t$ 近似为最近 $\frac{1}{1-\gamma}$ 个观测的加权平均——$\gamma=0.9$ 对应约 10 个时间步，$\gamma=0.99$ 对应约 100 个。动量法的速度 $\mathbf{v}_t$ 正是梯度的 EWMA：$\gamma=0.5$ 约平均最近 2 步梯度，$\gamma=0.9$ 约平均最近 10 步。以批量大小 10 为例，$\gamma=0.9$ 的动量法相当于用最近约 $10\times10=100$ 个样本的加权平均梯度来更新，而普通小批量 SGD 每步只用当前 10 个样本——梯度估计更平滑，因此可用更大的学习率，但过大的 $\gamma$ 也需相应调小学习率以保持稳定（书中实验：$\gamma=0.9$ 时将学习率由 0.02 降至 0.004 获得更好收敛）。

**从零实现**：为每个参数维护速度状态，更新时 `v.data = momentum * v.data + lr * p.grad.data`，再 `p.data -= v.data`。简洁实现：`torch.optim.SGD(params, lr=..., momentum=0.9)`。

### AdaGrad 算法

动量法解决了**方向**问题，但所有参数仍共享一个学习率。**AdaGrad**（Duchi et al., 2011）让每个参数拥有**自适应学习率**：按参数历史梯度的平方累积调整步长——梯度大的参数学习率自动变小，梯度小的参数学习率相对变大。更新规则：

$$\mathbf{s}\_t \leftarrow \mathbf{s}_{t-1} + \mathbf{g}_t \odot \mathbf{g}_t, \qquad \mathbf{x}\_t \leftarrow \mathbf{x}\_{t-1} - \frac{\eta}{\sqrt{\mathbf{s}_t + \epsilon}} \odot \mathbf{g}_t$$

其中 $\mathbf{g}_t$ 是梯度，$\epsilon$（如 $10^{-6}$）防止除零。在 $f(x,y) = 0.1x^2 + 2y^2$ 上，AdaGrad 能以 $\eta=0.4$ 甚至 2.0 稳定收敛——大幅度的学习率不再导致发散，因为陡峭方向上的累积平方梯度迅速压低了有效步长。

**特点与局限**：① 无需手动调节学习率衰减——累积项 $\mathbf{s}_t$ 单调递增，学习率自动衰减；② **但累积项单调不减**，训练后期学习率趋于 0，可能过早停止——这是其主要缺陷，催生了 RMSProp。

**简洁实现**：`torch.optim.Adagrad(params, lr=0.1)`。

### RMSProp 算法

**RMSProp**（Tieleman & Hinton, 2012）针对 AdaGrad 学习率单调衰减的问题，将"累积全部历史平方梯度"改为**指数加权移动平均**——只关注最近的梯度幅度，学习率不会单调趋零：

$$\mathbf{s}\_t \leftarrow \gamma\\,\mathbf{s}\_{t-1} + (1-\gamma)\\,\mathbf{g}_t \odot \mathbf{g}_t, \qquad \mathbf{x}_t \leftarrow \mathbf{x}\_{t-1} - \frac{\eta}{\sqrt{\mathbf{s}_t + \epsilon}} \odot \mathbf{g}_t$$

$\gamma$（默认 0.9）控制移动平均窗口。在拉长椭圆目标上，RMSProp 以 $\eta=0.4$、$\gamma=0.9$ 快速收敛（20 轮后 $x_1\approx-0.011$，而 AdaGrad 同参数下为 $-2.38$）。**简洁实现**：`torch.optim.RMSprop(params, lr=0.01, alpha=0.9)`（PyTorch 中移动平均参数名为 `alpha`）。

### AdaDelta 算法

**AdaDelta**（Zeiler, 2012）在 RMSProp 基础上做了两点改进：① 用**参数增量**（而非梯度）的平方的 EWMA 替换学习率；② **完全消除学习率超参数**。更新规则：

$$\mathbf{s}\_t \leftarrow \rho\\,\mathbf{s}\_{t-1} + (1-\rho)\\,\mathbf{g}_t^2, \qquad \mathbf{g}'\_t = \sqrt{\frac{\Delta\_{t-1} + \epsilon}{\mathbf{s}_t + \epsilon}}\,\mathbf{g}_t, \qquad \mathbf{x}_t \leftarrow \mathbf{x}\_{t-1} - \mathbf{g}'_t$$

$$\Delta_t \leftarrow \rho\,\Delta_{t-1} + (1-\rho)\,(\mathbf{g}'_t)^2$$

分子 $\sqrt{\Delta_{t-1}+\epsilon}$ 是参数增量平方的 EWMA，其量纲与 $\sqrt{\mathbf{s}_t}$ 相同，二者相除使更新量具有"长度"的量纲，从而无需显式学习率。**简洁实现**：`torch.optim.Adadelta(params, rho=0.9)`。

### Adam 算法

**Adam**（Kingma & Ba, 2014）是当前深度学习的**事实标准优化器**，可视为**动量法 + RMSProp** 的结合：既维护梯度的一阶矩（动量 $\mathbf{v}_t$），又维护二阶矩（梯度平方的 EWMA $\mathbf{s}_t$），并引入**偏差修正**消除初始化阶段的偏差：

$$\mathbf{v}\_t \leftarrow \beta_1 \mathbf{v}\_{t-1} + (1-\beta_1)\mathbf{g}_t, \qquad \mathbf{s}\_t \leftarrow \beta_2 \mathbf{s}\_{t-1} + (1-\beta_2)\mathbf{g}_t^2$$

$$\hat{\mathbf{v}}_t = \frac{\mathbf{v}_t}{1 - \beta_1^t}, \qquad \hat{\mathbf{s}}_t = \frac{\mathbf{s}_t}{1 - \beta_2^t}, \qquad \mathbf{x}_t \leftarrow \mathbf{x}\_{t-1} - \frac{\eta}{\sqrt{\hat{\mathbf{s}}_t} + \epsilon}\hat{\mathbf{v}}_t$$

**偏差修正的必要性**：$\mathbf{v}_t, \mathbf{s}_t$ 初始化为 0，训练初期被严重低估——除以 $1-\beta^t$ 可消除该偏差（$t$ 为迭代步数，$\beta_1=0.9, \beta_2=0.999$ 为默认值，$\epsilon=10^{-6}$）。

**从零实现**的更新核心：

```python
def adam(params, states, hyperparams):
    beta1, beta2, eps = 0.9, 0.999, 1e-6
    for p, (v, s) in zip(params, states):
        v[:] = beta1 * v + (1 - beta1) * p.grad.data          # 一阶矩
        s[:] = beta2 * s + (1 - beta2) * p.grad.data ** 2     # 二阶矩
        v_bias_corr = v / (1 - beta1 ** hyperparams['t'])     # 偏差修正
        s_bias_corr = s / (1 - beta2 ** hyperparams['t'])
        p.data -= hyperparams['lr'] * v_bias_corr / (torch.sqrt(s_bias_corr) + eps)
    hyperparams['t'] += 1
```

**简洁实现**：`torch.optim.Adam(params, lr=0.01)`。

**实践定位**：Adam 对学习率的鲁棒性远高于 SGD（默认 0.001 即可），收敛快、几乎无需调参，适合作为**默认优化器**；SGD + 动量在精心调参时可获得更好的最终泛化性能与更陡峭的收敛末段，是竞赛与生产中的进阶选择。书中各算法在翼型数据集上的对比（2 epoch 后损失）：SGD 0.2428、momentum 0.2429、AdaGrad 0.2437、RMSProp 0.2435、AdaDelta 0.2437、Adam 0.2421——收敛速度与稳定性各有千秋，实践中应结合问题选择。

> **理论补充：优化算法的演进脉络。** 整条优化算法谱系可以浓缩为一个递进逻辑：梯度下降（全量、准确、慢）→ 随机梯度下降（采样、噪声、快）→ 小批量 SGD（折中、并行友好）→ 动量法（方向平滑、逃逸鞍点）→ AdaGrad（逐参数学习率、单调衰减）→ RMSProp（移动平均、不衰减）→ AdaDelta（免学习率）→ Adam（一阶 + 二阶矩 + 偏差修正）。**每一代算法都解决了前一代的一个具体缺陷**，理解这条脉络即可系统把握优化算法的设计思想。

### 学习率调度与早停

优化算法确定"更新方向"，学习率决定"更新步幅"。固定学习率要么训练初期过慢、要么后期在最优解附近震荡，因此实践中常用**训练过程中衰减学习率**的策略：

| 策略 | 做法 | 适用场景 |
|---|---|---|
| 阶梯衰减（StepLR） | 每若干 epoch 将学习率乘以固定因子（如每 30 epoch ×0.1） | 训练轮数确定时 |
| 余弦退火（CosineAnnealingLR） | 学习率按余弦曲线从初始值平滑降至接近 0 | 训练轮数确定时，效果通常更好 |
| 自适应（ReduceLROnPlateau） | 验证集指标连续若干轮不改善时降低学习率 | 无法预先确定轮数时 |

```python
optimizer = torch.optim.Adam(net.parameters(), lr=0.001)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5, patience=5)
# 每个 epoch 结束后：
scheduler.step(val_loss)      # 验证损失连续 5 轮不降 -> 学习率减半
```

**早停（early stopping）**：监控验证集指标，若连续若干轮（patience）不再改善则停止训练，并回滚到验证集最优时的参数——它同时是一种"正则化"：在模型开始过拟合（训练损失继续下降而验证损失回升）之前截断训练。实现要点：每轮保存"验证集最优"的模型副本，早停时恢复该副本而非最后一步的参数。

**组合建议**：标准训练管线通常为"Adam + 学习率调度（余弦退火或 ReduceLROnPlateau）+ 早停"，三者分别解决"方向"、"步幅"与"何时停止"；配合检查点保存（`torch.save` / `torch.load`）即可支撑长时间训练。

---

## 总结：深度学习知识框架与 PyTorch 对应关系

综合全文，可以从"模型—训练机制—泛化手段—优化算法"四个方向梳理本文内容，并建立与 PyTorch API 的对应关系：

| 主题 | 核心概念 | 从零实现要素 | PyTorch 简洁实现 |
|---|---|---|---|
| 数据操作 | Tensor、广播、视图、GPU | `torch.*` 张量运算 | `tensor.to(device)` |
| 自动求梯度 | 计算图、反向传播、梯度累加 | `requires_grad_()`、`backward()` | `autograd` 自动完成 |
| 线性回归 | 模型、损失、优化三要素 | `linreg`、`squared_loss`、手写 `sgd` | `nn.Linear` + `nn.MSELoss` + `optim.SGD` |
| softmax 回归 | softmax 运算、交叉熵 | 手写 `softmax`、`gather` 交叉熵 | `nn.CrossEntropyLoss` |
| 数据读取 | Dataset、DataLoader、迭代器 | 手写 `data_iter`、自定义 `Dataset` | `TensorDataset` + `DataLoader` |
| 多层感知机 | 隐藏层、激活函数、非线性 | 手写 `relu`、两层参数 | `nn.Sequential` + `nn.ReLU` |
| 模型选择 | 训练/验证/测试集、K 折交叉验证 | 手工划分 | `DataLoader` 划分 |
| 正则化 | 欠拟合/过拟合、权重衰减、丢弃法 | `l2_penalty`、手写 `dropout` | `weight_decay` 参数、`nn.Dropout` |
| 训练机制 | 正向传播、反向传播、计算图 | 三层嵌套训练循环 | `optimizer.zero_grad()` + `backward()` + `step()` |
| 初始化 | 梯度衰减/爆炸、Xavier | `init.normal_` | `torch.nn.init` |
| 优化算法 | SGD、动量、AdaGrad、RMSProp、Adam | 手写更新规则 | `torch.optim.*` |

---

## 结语

深度学习实践的本质，是在可微计算图和梯度下降的统一框架之下不断逼近数据内在规律的过程：张量运算与自动求梯度构成整套体系的基石；线性回归奠定模型训练的基础范式；softmax 回归与多层感知机进一步解锁分类任务与表示学习能力；模型选择与各类正则化手段守护模型泛化性能；各式各样的优化算法，则让大规模非凸问题的训练变得稳定且高效。
