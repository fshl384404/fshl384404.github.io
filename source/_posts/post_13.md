---
title: 从卷积到序列
date: 2026-10-04 23:00:00
updated: 2026-10-04 23:00:00
categories:
  - 穷理
tags:
  - 机器学习
  - 深度学习
description: 介绍卷积神经网络、循环神经网络与注意力机制三大类现代网络结构，涵盖数据增强、批量归一化等训练技巧
cover: /img/blog13.webp
---

## 引言

深度学习主要解决三类问题：图像、序列，以及序列内部的关联。它们分别由三类网络结构承载：**卷积神经网络（CNN）**、**循环神经网络（RNN）** 与 **注意力机制/Transformer**。本文在 Tensor、autograd、`nn`/`optim`、优化算法与训练范式的基础上，逐类介绍这三种结构：先介绍设计理论，再给出数学定义，最后以 PyTorch 从零实现与简洁实现两种方式落地，并配以可直接运行的小型实验。

> 本文示例基于 PyTorch 2.x 编写，全部代码可直接在 Jupyter Notebook 或 Python 脚本中运行。文中运行结果取自参考实验的输出，实际运行时因随机初始化、框架版本与硬件差异，数值会略有不同，请以动手验证为准。

---

## 卷积神经网络

### 图像分类与全连接的局限

全连接网络（MLP）在 Fashion-MNIST 上的测试准确率相比线性模型有提升，但离可用水平仍有距离。要理解卷积网络为什么是图像任务的默认选择，先看全连接网络处理图像时的两个固有缺陷：

**第一，丢失空间结构。** 全连接网络把 $28\times28$ 的图像"展平"成 784 维向量再送入网络，像素之间的**相邻关系**（局部性）被彻底抹掉。而图像的统计特性恰恰建立在局部性上：一个像素最相关的信息来自它附近的像素（物体的边缘、纹理都是局部的），展平让网络无从利用这一先验。

**第二，参数爆炸。** 展平后每个输出神经元都要连接全部输入：$28\times28$ 图像的一层全连接就是 784 个输入；换成 $1000\times1000$ 的图像则是 100 万个输入，一层全连接的参数量即以亿计。前文 CNN 小节已经指出，**卷积层**的局部连接与权值共享恰好同时解决这两个问题——本文给出其完整定义与实现。

### 卷积层：从直觉到实现

#### 互相关运算：滑动窗口

卷积层的核心运算是**互相关（cross-correlation）**：一个可学习的**卷积核（filter/kernel）**在输入上滑动，在每个位置做"逐元素相乘再求和"，得到输出（又称**特征图，feature map**）中对应位置的一个数。先看二维情况下的从零实现：

```python
import math
import torch
from torch import nn
from torch.nn import functional as F

def corr2d(X, K):
    """二维互相关运算：核 K 在输入 X 上滑动，逐元素相乘后求和"""
    h, w = K.shape
    Y = torch.zeros((X.shape[0] - h + 1, X.shape[1] - w + 1))
    for i in range(Y.shape[0]):
        for j in range(Y.shape[1]):
            Y[i, j] = (X[i:i + h, j:j + w] * K).sum()
    return Y
```

例如输入 $3\times3$、核 $2\times2$，输出尺寸为 $(3-2+1)\times(3-2+1)=2\times2$——输出每个位置的值是"核覆盖区域"与核的逐元素乘积之和。

卷积核可以看作一个**特征检测器**。用一个具体例子体会：检测竖直边缘的核 $K=[[1,-1]]$（核高 1、宽 2），作用于一个"左半亮右半暗"的图像，输出中亮暗交界处取值非零，即标记了边缘位置：

```python
torch.manual_seed(0)          # 固定随机种子，保证结果可复现

X = torch.ones((6, 8))
X[:, 2:6] = 0                 # 中间 4 列置 0：形成两条竖直边缘
K = torch.tensor([[1.0, -1.0]])
Y = corr2d(X, K)
print(Y.shape)                # torch.Size([6, 7])
print(Y)                      # 第 1、5 列（交界处）非零，其余为 0
```

更关键的是：**核不需要手工设计**。把核当作可学习参数、用"输出应等于目标边缘图"的平方损失训练它，几轮梯度下降后学到的核就自动逼近 $[1,-1]$ 的形状——这就是"特征由数据学得"的最朴素体现，也是前文"深度学习 = 表示学习"论断的微观验证：

```python
conv2d = nn.Conv2d(1, 1, kernel_size=(1, 2), bias=False)   # 1 输入通道、1 输出通道
X4 = X.reshape((1, 1, 6, 8))
Y4 = Y.reshape((1, 1, 6, 7))
for i in range(10):
    Y_hat = conv2d(X4)
    l = (Y_hat - Y4) ** 2
    conv2d.zero_grad()
    l.sum().backward()
    conv2d.weight.data[:] -= 3e-2 * conv2d.weight.grad
    if (i + 1) % 2 == 0:
        print(f'batch {i + 1}, loss {l.sum():.3f}')
print(conv2d.weight.data.reshape(1, 2))   # 学到的核，逼近 [[1, -1]]
```

> 这里手工做了一次梯度下降（`weight.data -= lr * weight.grad`），目的是看清"参数更新"这一步本身；后文一律改用 `torch.optim.SGD`。注意 `bias=False` 是必须的：若带偏置，网络可以用"核恒为 0、偏置拟合输出"完成同样的目标，学到的核就不一定是 $[1,-1]$ 了——这也是"改变一个变量看差别"的实例。

> **理论补充：互相关与卷积的区别。** 严格地说，深度学习中的"卷积"是**互相关**运算（核不做翻转）；数学上的卷积需要对核做 180° 翻转。二者只在符号约定上不同，可学习核能自动吸收翻转，因此实践中互相关直接被称为卷积。`nn.Conv2d` 实现的正是互相关。

#### 填充（padding）与步幅（stride）

互相关默认有两个行为：核每滑动一格（步幅 1），且核不能越出输入边界。由此产生两个超参数：

- **填充（padding）**：在输入四周补 0。让核"看到"输入边缘的像素，并控制输出尺寸——填充 $p$ 后输出高为 $(n_h + 2p - k_h) + 1$。典型做法是 $p=k-1$（$k$ 为核大小）时输出高为 $n_h + k - 1$（尺寸变大，常用于生成类任务）；若要与输入同尺寸，取 $p=(k-1)/2$，如 LeNet 第一层 `kernel_size=5, padding=2` 保持 $28\times28$；
- **步幅（stride）**：核每次滑动的格数。步幅 $s$ 使输出尺寸约为输入的 $1/s$，用于快速降采样（如 `stride=2` 让尺寸减半）。当 $s>1$ 时，若 $\lfloor(n_h+2p-k_h)/s\rfloor$ 不能整除，边缘的若干行/列会被直接丢弃。

综合两者，输出尺寸公式为

$$\text{输出高} = \left\lfloor\frac{n_h + 2p_h - k_h}{s_h}\right\rfloor + 1$$

#### 多输入/多输出通道

真实图像是**多通道**的（RGB 三通道；灰度图 1 通道），卷积层随之处理多输入通道：一个输出通道对应一个卷积核，该核必须**同时覆盖所有输入通道**（核的形状为"输入通道数 × 高 × 宽"），对每个输入通道分别卷积后相加。多个输出通道则并列多个这样的核，各自检测一种特征。用 PyTorch 验证维度：

```python
conv = nn.Conv2d(in_channels=3, out_channels=6, kernel_size=5)   # 6 个 3×5×5 的核
X = torch.randn((2, 3, 32, 32))          # (批量, 通道, 高, 宽)
print(conv(X).shape)                     # torch.Size([2, 6, 28, 28])
```

注意**参数量**：6 个核共 $6\times3\times5\times5=450$ 个参数（不含偏置），与图像尺寸无关；而同样输入输出的全连接层参数以百万计——这正是卷积层参数效率的来源（局部连接 + 权值共享）。

### 池化层

卷积输出仍然很大，且对像素的微小平移过于敏感（同一个物体平移一个像素，边缘检测结果整体移动）。**池化（pooling）** 层对特征图降采样：在固定大小的窗口内取**最大值**（最大池化）或**均值**（平均池化），窗口滑动与卷积相同（同样可配填充、步幅），但没有可学习参数。下面给出一个含填充与步幅的通用从零实现：

```python
def pool2d(X, pool_size, mode='max', stride=None, padding=0):
    """通用二维池化：支持最大/平均、步幅与填充（与 nn.MaxPool2d 语义一致）"""
    p_h, p_w = pool_size
    if stride is None:
        s_h = s_w = p_h          # 框架默认：步幅等于窗口大小
    elif isinstance(stride, int):
        s_h = s_w = stride
    else:
        s_h, s_w = stride
    if isinstance(padding, int):
        pad = (padding, padding, padding, padding)
    else:
        pad = padding            # (左, 右, 上, 下)
    X = F.pad(X, pad, value=0)   # 最大池化的填充应取 -inf 才严格正确，见下方说明
    out_h = (X.shape[0] - p_h) // s_h + 1
    out_w = (X.shape[1] - p_w) // s_w + 1
    Y = torch.zeros((out_h, out_w))
    for i in range(out_h):
        for j in range(out_w):
            window = X[i * s_h:i * s_h + p_h, j * s_w:j * s_w + p_w]
            Y[i, j] = window.max() if mode == 'max' else window.mean()
    return Y

X = torch.arange(16, dtype=torch.float32).reshape(4, 4)
print(pool2d(X, (2, 2), 'max', stride=2))     # 4×4 -> 2×2
print(pool2d(X, (2, 2), 'avg', stride=2))
```

> **一个容易忽略的细节**：最大池化的填充值理论上应取 $-\infty$（否则补进去的 0 可能"赢"过窗口内的负数，输出就不再是真实最大值）。上面的实现为保持与 D2L 教学代码一致补了 0；练习时可把 `value=0` 改成 `value=float('-inf')`，构造一个含负值的输入对比两种实现，观察差异。`nn.MaxPool2d` 内部正是按 $-\infty$ 语义处理的。

池化的作用有三：① **降维**——窗口 $2\times2$、步幅 2 时特征图尺寸减半，计算量与参数量随之下降；② **平移鲁棒性**——窗口内最大值对微小位移不敏感；③ **扩大感受野**——后续卷积核能"看到"更大的原始区域。`nn.MaxPool2d(kernel_size=2, stride=2)` 是简洁实现。

### LeNet：第一个完整卷积网络

**LeNet-5**（LeCun et al., 1998）是现代 CNN 的原型：为手写数字识别设计，结构为"卷积 + 池化"交替两次、再接三个全连接层。它奠定了此后一切卷积网络的骨架：**局部特征提取（卷积）→ 降采样压缩（池化）→ 高层判别（全连接）**。

#### 结构解析

| 层 | 输出形状 | 说明 |
|---|---|---|
| 输入 | $1\times28\times28$ | 灰度图 |
| 卷积 5×5，padding=2，Sigmoid | $6\times28\times28$ | 6 个核，保持尺寸 |
| 平均池化 2×2 | $6\times14\times14$ | 尺寸减半 |
| 卷积 5×5，Sigmoid | $16\times10\times10$ | 16 个核 |
| 平均池化 2×2 | $16\times5\times5$ | 尺寸减半 |
| 展平 → 全连接 120 → 84 → 10 | $10$ | 最后输出 10 类得分 |

（原论文的池化带可学习系数，实践中普遍用最大池化替代，效果相近且更简洁；原论文输出层用高斯连接，现代实现统一用全连接 + Softmax/交叉熵。全连接部分的参数量占绝对多数：$16\times5\times5\times120+120\times84+84\times10\approx 6.2\times10^4$，而卷积部分仅约 $1.4\times10^3$——深层网络的参数分布不均，这也是后来"卷积替代全连接"的动机之一。）

#### 实现与训练

用 `nn.Sequential` 直接搭出上述结构：

```python
net = nn.Sequential(
    nn.Conv2d(1, 6, kernel_size=5, padding=2), nn.Sigmoid(),
    nn.AvgPool2d(kernel_size=2, stride=2),
    nn.Conv2d(6, 16, kernel_size=5), nn.Sigmoid(),
    nn.AvgPool2d(kernel_size=2, stride=2),
    nn.Flatten(),
    nn.Linear(16 * 5 * 5, 120), nn.Sigmoid(),
    nn.Linear(120, 84), nn.Sigmoid(),
    nn.Linear(84, 10))
```

数据加载与图像分类数据集一节相同（Fashion-MNIST，`ToTensor` 转张量，`DataLoader` 批量）。训练前先定义两个通用函数，本部分后续所有模型复用：

```python
def evaluate_accuracy(net, data_iter, device):
    """测试集准确率：不计算梯度，模型置于评估模式"""
    net.eval()                                   # 关闭 dropout、切换 BN 到推理统计量
    acc, n = 0.0, 0
    with torch.no_grad():
        for X, y in data_iter:
            X, y = X.to(device), y.to(device)
            acc += (net(X).argmax(dim=1) == y).sum().item()
            n += y.numel()
    net.train()                                  # 归还训练模式，避免影响主循环
    return acc / n

def train_ch6(net, train_iter, test_iter, num_epochs, lr, device):
    """通用训练函数：卷积/全连接层用 Xavier 初始化，SGD 优化"""
    def init_weights(m):
        if type(m) == nn.Linear or type(m) == nn.Conv2d:
            nn.init.xavier_uniform_(m.weight)
        elif type(m) == nn.Linear:
            nn.init.zeros_(m.bias)
    net.apply(init_weights)
    net.to(device)
    optimizer = torch.optim.SGD(net.parameters(), lr=lr)
    loss = nn.CrossEntropyLoss()
    for epoch in range(num_epochs):
        net.train()
        train_l, train_acc, n = 0.0, 0.0, 0
        for X, y in train_iter:
            X, y = X.to(device), y.to(device)
            y_hat = net(X)
            l = loss(y_hat, y)
            optimizer.zero_grad()
            l.backward()
            optimizer.step()
            train_l += l.item() * y.numel()
            train_acc += (y_hat.argmax(dim=1) == y).sum().item()
            n += y.numel()
        test_acc = evaluate_accuracy(net, test_iter, device)
        print(f'epoch {epoch + 1}, loss {train_l / n:.4f}, '
              f'train acc {train_acc / n:.3f}, test acc {test_acc:.3f}')
```

> **注意 `evaluate_accuracy` 里的 `net.train()`**：评估函数自己切到 `eval()`，就应当自己切回来，否则调用方稍不留神就会让后续训练在评估模式下进行（BatchNorm 不再更新统计量、Dropout 被关闭），表现为"训练莫名其妙变慢、精度上不去"。**函数对状态的修改要自洽**，是写训练工具时的一条硬规矩。

训练 10 轮（SGD，学习率 0.9）：

```
epoch 1, loss 0.7958, train acc 0.701, test acc 0.772
epoch 5, loss 0.3537, train acc 0.864, test acc 0.867
epoch 10, loss 0.2638, train acc 0.898, test acc 0.900
```

测试准确率约 0.90，显著超过第 4 篇 MLP 的 0.845——同样的输入、同样的优化器与训练轮数，差异只来自网络结构：卷积的局部先验 + 更少的参数换来了更好的泛化。注意训练准确率（0.898）与测试准确率（0.900）几乎持平，说明 LeNet 在这个任务上尚未过拟合，还有提升空间（后文 ResNet 会利用这一点）。

> **训练的基本习惯**（从现在开始养成，不再重复强调）：
> ① **固定随机种子**——`torch.manual_seed(0)` 只固定 CPU 侧的随机性；若使用 GPU，还需 `torch.cuda.manual_seed_all(0)`，并考虑把 `torch.backends.cudnn.benchmark` 设为 `False`（`benchmark=True` 会自动挑选卷积算法，引入不确定性）与 `torch.use_deterministic_algorithms(True)`。数据加载的随机性由 `DataLoader(shuffle=True)` 引入，它使用的全局随机数生成器同样被 `manual_seed` 覆盖；
> ② **记录曲线**——逐轮打印或绘制损失与准确率曲线，用于判断收敛与过拟合（判断方法见前文学习曲线与偏差/方差诊断）；
> ③ **划分纪律**——测试集只用于最终评估，调参看训练集与验证集。

### 数据增强

卷积网络登上历史舞台的标志是 AlexNet（Krizhevsky et al., 2012）在 ImageNet 上的突破，其成功依赖的组合拳——ReLU 激活、Dropout 与数据增强（前两者见前文）——至今仍是图像模型的标配。其中**数据增强（data augmentation）** 是对样本施加"保持标签不变"的随机变换，生成语义相同的新样本：水平翻转、随机裁剪、颜色抖动等。直觉：图像分类器应当对翻转、平移、亮度变化鲁棒，让模型见过这些"变形"能提升泛化（增强必须代表测试时真实出现的失真，见前文偏差/方差诊断部分）。PyTorch 中增强由 `transforms` 组合完成：

```python
import torchvision
from torchvision import transforms

# CIFAR-10：32×32 彩色图，三通道归一化
cifar_mean = (0.4914, 0.4822, 0.4465)
cifar_std = (0.2023, 0.1994, 0.2010)

transform_train = transforms.Compose([
    transforms.RandomHorizontalFlip(),                    # 随机水平翻转
    transforms.RandomCrop(32, padding=4),                 # 先补 4 像素再随机裁剪回 32×32
    transforms.ToTensor(),
    transforms.Normalize(cifar_mean, cifar_std)])
transform_test = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(cifar_mean, cifar_std)])         # 测试集不做增强，只归一化
```

> **归一化统计量必须与数据集匹配。** 上面的均值/标准差是 CIFAR-10 的；Fashion-MNIST 是单通道灰度图，应改用 `transforms.Normalize((0.2860,), (0.3530,))` 这类灰度统计量（可由训练集自行统计）。把 CIFAR-10 的三通道统计量套到 28×28 灰度图上，轻则通道数不匹配直接报错，重则悄悄降低精度。**统计量一律从训练集算，测试集沿用同一组**，否则构成数据泄漏。

两点注意：① **测试集不做增强**（只归一化），否则评估不稳定，因为每次评估用的都是不同的随机变换样本；② `RandomCrop(32, padding=4)` 要求图像本身是 32×32 以上——这正是"增强策略与数据集绑定"的例子，换数据集时务必检查。

### 批量归一化（BatchNorm）

深层网络训练中，各层输入的分布随前层参数更新而不断变化（内部协变量漂移），迫使后续层持续"追着"变化的目标学习。**批量归一化（batch normalization，Ioffe & Szegedy, 2015）** 在每个小批量上对每个通道做标准化（减均值除标准差），再用两个**可学习参数**（缩放 $\gamma$、平移 $\beta$）恢复表达能力：

$$\hat{x} = \gamma \odot \frac{x - \mu_\mathcal{B}}{\sqrt{\sigma_\mathcal{B}^2 + \epsilon}} + \beta$$

其中 $\mu_\mathcal{B},\sigma_\mathcal{B}$ 是小批量内该通道的均值与方差。关键细节：**训练时**用当前小批量的统计量；**推理时**用训练期间累积的全局统计量（running mean/var）——因为推理时可能只有一个样本，没有"批量"可言。PyTorch 的 `nn.BatchNorm2d` 自动处理这一切，通常紧跟卷积层之后、激活函数之前：

```python
blk = nn.Sequential(nn.Conv2d(6, 6, kernel_size=5, padding=2),
                    nn.BatchNorm2d(6), nn.ReLU())
```

> **一个实践陷阱**：BatchNorm 的统计量在 `net.train()` 期间才会更新。如果评估时忘记 `net.eval()`，或者评估函数切换模式后没有切回来（见上文 LeNet 一节），running mean/var 就会被测试数据污染——测试集信息由此"泄漏"进模型，评估结果虚高。

> **理论补充：为什么批量归一化有效。** 一个直观解释是它让每层输入保持"单位尺度"，从而允许更大的学习率并减轻对初始化的依赖（衔接前文"数值稳定性与模型初始化"）。现代研究认为其作用机制更为复杂（平滑损失曲面等），但作为训练技巧，它几乎总能加速收敛并轻微提升最终精度。实践中 BatchNorm 与 ReLU 的组合已是卷积网络的标配，二者配合也能缓解梯度衰减。

### 残差连接与 ResNet

#### 退化问题

VGG（Simonyan & Zisserman, 2014）用统一的小卷积核（3×3）堆叠，把网络系统性地加深到 16~19 层并刷新了 ImageNet 精度，确立了"加深网络"这一通用策略。但加得更深之后新问题出现了：直觉上网络越深表达能力越强，实验却发现把网络从 20 层加到 56 层，**训练误差反而升高**——这不是过拟合（训练误差高），而是优化困难：深层网络难以学习**恒等映射**（当最优解接近恒等时，多层非线性变换很难恰好实现"什么都不做"）。ResNet（He et al., 2015）的解决思路极简：让网络显式地去学"残差"。

**残差块**：普通块计算 $F(x)$，残差块计算 $F(x)+x$，其中 $x$ 通过**跳跃连接（skip connection）**直接加到输出上。若最优映射就是恒等映射，网络只需把 $F$ 学成 0——这远比让多层非线性去逼近恒等容易。实现如下：

```python
class Residual(nn.Module):
    def __init__(self, input_channels, num_channels, use_1x1conv=False, strides=1):
        super().__init__()
        self.conv1 = nn.Conv2d(input_channels, num_channels, kernel_size=3,
                               padding=1, stride=strides)
        self.conv2 = nn.Conv2d(num_channels, num_channels, kernel_size=3, padding=1)
        if use_1x1conv:                     # 维度不匹配时用 1×1 卷积投影
            self.conv3 = nn.Conv2d(input_channels, num_channels,
                                   kernel_size=1, stride=strides)
        else:
            self.conv3 = None
        self.bn1 = nn.BatchNorm2d(num_channels)
        self.bn2 = nn.BatchNorm2d(num_channels)

    def forward(self, X):
        Y = F.relu(self.bn1(self.conv1(X)))
        Y = self.bn2(self.conv2(Y))
        if self.conv3 is not None:
            X = self.conv3(X)               # 将 X 投影到与 Y 相同形状
        Y = Y + X                           # 跳跃连接（用 out-of-place 写法，见下方说明）
        return F.relu(Y)
```

**这里有一处必须讲清的形状约束。** 跳跃连接做的是逐元素相加，因此 `conv3 is None` 时**要求 $X$ 与 $F(X)$ 的形状完全一致**，即同时满足

$$s=1 \quad\text{且}\quad \text{input\_channels}=\text{num\_channels}$$

只要有一个不满足，就会在相加处报形状错误（实测 `use_1x1conv=False, strides=2` 时 PyTorch 抛出 `The size of tensor a (4) must match the size of tensor b (8) at non-singleton dimension 3`）。两个条件各对应一种失配：

- **尺寸失配**（$s\neq 1$）：`conv1` 用步幅 $s$ 把特征图缩小了 $s$ 倍，而恒等分支 $X$ 没有缩小；
- **通道失配**（输入输出通道数不同）：`conv2` 输出的通道数是 `num_channels`，而 $X$ 是 `input_channels`。

因此**约定**：当通道数或尺寸需要改变时，必须同时打开 `use_1x1conv=True` 并设置对应 `strides`，让 1×1 卷积把 $X$ 投影到与 $Y$ 相同的形状。若担心调用者写错，可在构造时加一道断言，把错误提前到"搭网络"阶段：

```python
class Residual(nn.Module):
    def __init__(self, input_channels, num_channels, use_1x1conv=False, strides=1):
        super().__init__()
        if not use_1x1conv and (strides != 1 or input_channels != num_channels):
            raise ValueError(f'恒等分支形状不匹配：input_channels={input_channels}, '
                             f'num_channels={num_channels}, strides={strides}；'
                             f'请使用 use_1x1conv=True')
        # ...（其余定义同上）
```

> **为什么把 `Y += X` 写成 `Y = Y + X`？** 两者在常规前向传播中等价，但 `+=` 是原地操作。当同一张量被多处引用、或在 `torch.autograd` 需要保留原值做梯度计算时，原地修改可能触发 "a variable needed for gradient computation has been modified by an inplace operation" 一类的报错或静默的错误结果。写残差这类"叠加"结构时，优先用 out-of-place 写法。另外，反向传播经过 `Y = F(x) + x` 时，对 $x$ 的梯度含一个恒为 1 的直通项，这也是为了让梯度更顺畅地回传——用原地 `+=` 反而可能破坏这条路径。

当输入输出通道数与尺寸一致时，残差块直接相加；不一致时（如通道数翻倍、尺寸减半的分界处），用步幅 2 的 1×1 卷积把 $x$ 投影到与 $F(x)$ 相同的形状。**ResNet-18** 即按"每段 2 个残差块、通道数 64→128→256→512 逐段翻倍"堆叠而成。

> **理论补充：残差为什么让深层可训练。** 从梯度角度看，跳跃连接为反向传播提供了"捷径"：$\partial L/\partial x$ 中的直通项始终为 1，连乘的梯度衰减被绕过（衔接前文"数值稳定性"中梯度消失的讨论）。需要注意这只是"提供了捷径"，而非"保证梯度不消失"：当 $\|1 + F'(x)\|<1$ 时梯度仍会衰减，残差的价值在于它把"必须学会恒等映射"变成了"只需学会接近 0 的残差"，从而大幅降低了深层网络的优化难度。从表示角度看，同样的道理让网络在"恒等映射附近"做增量学习。**对照实验**：同一数据上，去掉跳跃连接（改成普通块）的网络收敛明显更慢、最终精度更低——"改一个变量看差别"，是验证任何设计有效性的基本方法，后文多次使用。

#### 小型 ResNet 与对比实验

在 Fashion-MNIST 上训练"含/不含残差"的两个同规模网络（10 轮），参考输出：

```
含残差连接:  test acc 0.925
不含残差连接: test acc 0.899
```

残差连接带来了约 2.5 个百分点的提升——这一对照验证了"残差让网络更容易优化"的判断。

> **对照实验的公平性检查**：真正的"只改一个变量"要求两个网络除了跳跃连接之外**完全同构**（层数、每层通道数、卷积核尺寸、初始化、优化器、轮数、数据顺序全同）。因此"去掉残差"应当是把 `Residual.forward` 中的 `Y = Y + X` 删掉，其余一行不改，而不是换成另一套网络定义——否则参数量与结构深度都会变，差异就无法归因于跳跃连接。下面给出这种最小改动写法：
>
> ```python
> class Residual(nn.Module):
>     def __init__(self, input_channels, num_channels, use_1x1conv=False,
>                  strides=1, use_skip=True):      # 唯一的开关
>         # ...（层定义完全相同）
>         self.use_skip = use_skip
>
>     def forward(self, X):
>         Y = F.relu(self.bn1(self.conv1(X)))
>         Y = self.bn2(self.conv2(Y))
>         if self.conv3 is not None:
>             X = self.conv3(X)
>         return F.relu(Y + X) if self.use_skip else F.relu(Y)
> ```
>
> 含残差与不含残差两次训练共用同一种子，其余设置全同，差值才可归因。

### 实战：CIFAR-10

把本部分全部内容（卷积、池化、增强、归一化、残差）串成一个完整项目：CIFAR-10 图像分类。数据加载带增强与归一化（见"数据增强"一节），模型用适配 CIFAR-10 的小型 ResNet（首个卷积改为 3 通道输入）：

```python
def resnet_block(input_channels, num_channels, num_residuals, first_block=False):
    blk = []
    for i in range(num_residuals):
        if i == 0 and not first_block:      # 非首个块：通道翻倍、尺寸减半
            blk.append(Residual(input_channels, num_channels,
                                use_1x1conv=True, strides=2))
        else:
            blk.append(Residual(num_channels, num_channels))
    return blk

def resnet18(num_classes=10, in_channels=3):
    net = nn.Sequential(
        nn.Conv2d(in_channels, 64, kernel_size=7, stride=2, padding=3),
        nn.BatchNorm2d(64), nn.ReLU(),
        nn.MaxPool2d(kernel_size=3, stride=2, padding=1))
    net.add_module('b1', nn.Sequential(*resnet_block(64, 64, 2, first_block=True)))
    net.add_module('b2', nn.Sequential(*resnet_block(64, 128, 2)))
    net.add_module('b3', nn.Sequential(*resnet_block(128, 256, 2)))
    net.add_module('b4', nn.Sequential(*resnet_block(256, 512, 2)))
    net.add_module('pool', nn.AdaptiveAvgPool2d((1, 1)))
    net.add_module('fc', nn.Sequential(nn.Flatten(), nn.Linear(512, num_classes)))
    return net
```

> **为什么用 `AdaptiveAvgPool2d((1, 1))` 而不是固定尺寸的 `Flatten`？** 自适应池化把任意 $H\times W$ 的特征图压成 $1\times1$，因此输入尺寸变化时（如从 CIFAR-10 换到其它分辨率）全连接层的输入维度不变。若像 LeNet 那样写死 `nn.Linear(512 * 4 * 4, ...)`，换个数据集就要重算维度——这是新手最常遇到的"形状不匹配"来源之一。

训练 20 轮（Adam，学习率 0.001，配合学习率调度与早停——实现见前文优化算法"学习率调度与早停"），参考输出：

```
epoch 20, loss 0.682, train acc 0.815, test acc 0.784
```

（参考区间：不同实现与随机种子下 20 轮约 0.78~0.82。训练与测试准确率接近且都偏低，说明模型尚未充分利用数据——提升方向是更长的训练（配合学习率调度）与更强的数据增强（加上后可达 0.92 以上），这正是偏差/方差诊断方法论的应用场景：训练误差与测试误差都高，属于**欠拟合**（高偏差）一侧，因此增加模型容量、训练更久、减小正则化强度都可能有帮助，而增加正则化只会更糟。）

---

## 循环神经网络

### 序列数据与 RNN 的直觉

图像之外的另一大类数据是**序列**：文本（字符/词按顺序排列）、语音、传感器时间序列。序列问题有两个全连接/CNN 难以处理的特点：

1. **长度可变**：句子的长度不固定，而全连接/CNN 的输入维度固定；
2. **顺序敏感**："猫追老鼠"与"老鼠追猫"含义相反，但"词袋式"的输入无法体现顺序。

**循环神经网络（recurrent neural network，RNN）** 的核心思想：引入**隐状态（hidden state）**——一个随输入逐时间步更新的向量，携带"到目前为止看到了什么"的记忆。用一个类比：RNN 像逐字读一段话的人，每读一个字，大脑中"当前理解"（隐状态）就被更新一次，最后的理解携带全文信息。数学上，设第 $t$ 步输入为 $x_t$、隐状态为 $h_t$：

$$h_t = \tanh(W_{hh} h_{t-1} + W_{xh} x_t + b_h)$$

其中 $W_{hh}, W_{xh}, b_h$ 是所有时间步**共享**的参数（权值共享——与卷积核的思想同源）。$h_{t-1}$ 携带历史信息，$x_t$ 提供当前输入，二者经线性变换与 $\tanh$ 压缩后成为新的记忆。输出层再对每个时间步的 $h_t$ 做线性变换得到预测 $y_t = W_{hq} h_t + b_q$。

> **理论补充：为什么 RNN 能处理变长序列。** 因为参数在所有时间步共享，模型对序列长度本身无要求——长度只是隐状态更新的次数。这也带来一个特点：同一套参数被"复用"了 $T$ 次（时间维度上的权值共享），与卷积在空间维度上的权值共享异曲同工。

### RNN 从零实现

用一个具体任务把 RNN 跑起来：**字符级语言模型**——给定一段文本的前 $t$ 个字符，预测第 $t+1$ 个字符。数据用《时间机器》（H. G. Wells）英文原文（约 170KB），预处理为字符序列：

```python
import os, re, urllib.request

def download(url, folder='../data'):
    os.makedirs(folder, exist_ok=True)
    fname = os.path.join(folder, url.split('/')[-1])
    if not os.path.exists(fname):
        urllib.request.urlretrieve(url, fname)
    return fname

class Vocab:
    """字符词典：字符 <-> 索引"""
    def __init__(self, tokens):
        self.idx_to_token = ['<unk>'] + sorted(set(tokens))
        self.token_to_idx = {t: i for i, t in enumerate(self.idx_to_token)}
    def __len__(self):
        return len(self.idx_to_token)

def load_corpus(batch_size, num_steps):
    """读取语料，只做一次预处理，返回语料列表与字符词典（不返回迭代器）"""
    fname = download('http://d2l-data.s3-accelerate.amazonaws.com/timemachine.txt')
    with open(fname, encoding='utf-8') as f:
        lines = f.readlines()
    corpus = [re.sub('[^A-Za-z]+', ' ', line).strip().lower() for line in lines]
    corpus = [line for line in corpus if line]
    tokens = [ch for line in corpus for ch in list(line)]   # 字符级切分
    vocab = Vocab(tokens)
    corpus = [vocab.token_to_idx[ch] for ch in tokens]
    return corpus, vocab                                      # 注意：返回列表，不是迭代器
```

> **`load_corpus` 为什么返回列表而不是迭代器？** 这是本节的第一处关键修正，也是整套实验能否跑完 100 轮的前提。D2L 教材的 `load_data_time_machine` 是**每次调用都新读一遍语料**（内部用 `with open(...)`），所以每个 epoch 调用一次都能拿到新的迭代器；若把它改写成"只读一次、缓存结果"的版本，再把返回的迭代器跨 epoch 复用，就会撞上下面的生成器陷阱。**缓存的是"语料"（列表），不是"迭代器"**——这是把教材代码工程化时最容易破坏的一条边界。
>
> `load_corpus` 的 `batch_size, num_steps` 两个参数当前未使用（批量划分交给 `seq_data_iter`），保留它们是为了与 D2L 的函数签名一致，便于对照阅读。另外 `re.sub` 会把原文的标点、数字、换行全部替换为空格（词表因此只有 27~28 个字符），标点与大小写信息被丢弃——这一点与 D2L 一致，属于刻意简化；若想要更真实的结果，可改成按词切分并保留标点。

**小批量迭代器**把连续文本切成等长片段：把语料（截断到 batch_size 的整数倍）重排为"批 × 步数"的矩阵，每一批内第 $i$ 行是第 $i$ 个样本的连续 $T$ 个字符，标签为同位置的**后移一个字符**：

```python
def seq_data_iter(corpus, batch_size, num_steps):
    """生成 (X, Y)：X 为输入字符序列，Y 为对应的下一字符"""
    num_tokens = (len(corpus) - 1) // batch_size * batch_size
    corpus = torch.tensor(corpus[:num_tokens + 1])  # 多取一个用于 Y
    X = corpus[:-1].reshape(batch_size, -1)
    Y = corpus[1:].reshape(batch_size, -1)
    num_batches = X.shape[1] // num_steps
    for i in range(0, num_batches * num_steps, num_steps):
        yield X[:, i:i + num_steps], Y[:, i:i + num_steps]
```

> **⚠️ 关键修正：`seq_data_iter` 是生成器函数，只能被迭代一次。**
>
> 函数体里有 `yield`，所以它返回的是**生成器对象**：状态只能向前走，耗尽即空。若写成
>
> ```python
> train_iter = seq_data_iter(corpus, batch_size, num_steps)   # 只创建一次
> for epoch in range(num_epochs):
>     for X, Y in train_iter:        # 第 1 个 epoch 正常，第 2 个 epoch 起一次都不进循环
>         ...
> ```
>
> 则从**第 2 个 epoch 开始训练集"消失"**：内层循环一次也不执行，`n` 保持为 0，随后计算 `ppl_sum / n` 直接抛 `ZeroDivisionError: float division by zero`（若没有除法，则会静默地"空转"到训练结束，模型停留在第 1 轮的参数上，最难排查）。实测每个 epoch 拿到的批次数为 `[9, 0, 0]`。
>
> 正确做法有两种，二者都值得掌握：
>
> ```python
> # 方案 A（推荐）：每个 epoch 重新创建迭代器
> for epoch in range(num_epochs):
>     train_iter = seq_data_iter(corpus, batch_size, num_steps)
>     for X, Y in train_iter:
>         ...
>
> # 方案 B：把生成器函数包成一个可重复迭代的类
> class SeqDataLoader:
>     def __init__(self, corpus, batch_size, num_steps):
>         self.corpus, self.batch_size, self.num_steps = corpus, batch_size, num_steps
>     def __iter__(self):
>         return seq_data_iter(self.corpus, self.batch_size, self.num_steps)
> ```
>
> 方案 B 与 PyTorch 的 `DataLoader` 语义一致：**一个 epoch 对应一次完整的 `__iter__` 调用**。这条经验不只适用于本例——凡是把 `DataLoader`、生成器、`map`/`filter` 对象保存到变量里跨 epoch 复用的写法，都要先问一句："它迭代完之后，还能再来一轮吗？"

RNN 的前向传播：输入先做**独热编码**（每个字符映射为 vocab_size 维单位向量），再逐时间步更新隐状态并输出 logits：

```python
def init_rnn_state(batch_size, num_hiddens, device):
    return (torch.zeros((batch_size, num_hiddens), device=device),)

def rnn(inputs, state, params):
    """inputs: (时间步数, 批量, 词表大小)；返回展平的 logits 与新状态"""
    W_xh, W_hh, b_h, W_hq, b_q = params
    H, = state
    outputs = []
    for X in inputs:                            # X: (批量, 词表大小)
        H = torch.tanh(torch.mm(X, W_xh) + torch.mm(H, W_hh) + b_h)
        Y = torch.mm(H, W_hq) + b_q
        outputs.append(Y)
    return torch.cat(outputs, dim=0), (H,)      # (步数×批量, 词表)

def get_params(vocab_size, num_hiddens, device):
    def normal(shape):
        return torch.randn(size=shape, device=device) * 0.01
    params = [normal((vocab_size, num_hiddens)),
              normal((num_hiddens, num_hiddens)), torch.zeros(num_hiddens, device=device),
              normal((num_hiddens, vocab_size)), torch.zeros(vocab_size, device=device)]
    for p in params:
        p.requires_grad_(True)
    return params
```

训练循环引入两个此前未见的机制：**截断**与**梯度裁剪**。

```python
def grad_clipping(params, theta, device):
    """梯度裁剪：把全体参数梯度的 L2 范数限制在 theta 内"""
    if not isinstance(params, list):
        params = list(params)      # 关键：先把生成器实体化，否则下面的两次遍历必有一次落空
    norm = torch.sqrt(sum(torch.sum(p.grad ** 2) for p in params if p.grad is not None)).to(device)
    if norm > theta:
        for p in params:
            if p.grad is not None:
                p.grad.data *= theta / norm

def train_rnn(model, corpus, vocab, num_hiddens, num_epochs=100, lr=0.01,
              batch_size=32, num_steps=35, device='cpu'):
    params = get_params(len(vocab), num_hiddens, device)
    loss = nn.CrossEntropyLoss()
    updater = torch.optim.Adam(params, lr=lr)
    for epoch in range(num_epochs):
        train_iter = seq_data_iter(corpus, batch_size, num_steps)   # 每个 epoch 重建
        state = None
        ppl_sum, n = 0.0, 0
        for X, Y in train_iter:
            X = F.one_hot(X.T, len(vocab)).float().to(device)   # (步数, 批量, 词表)
            if state is None:
                state = init_rnn_state(X.shape[1], num_hiddens, device)  # 批量取自当前样本
            Y_hat, state = model(X, state, params)
            state = (state[0].detach(),)             # 截断：梯度不跨小批量回传
            l = loss(Y_hat, Y.T.reshape(-1))
            updater.zero_grad(); l.backward()
            grad_clipping(params, 1, device)
            updater.step()
            ppl_sum += torch.exp(l).item() * Y.shape[0]
            n += Y.shape[0]
        if n == 0:
            raise RuntimeError('本 epoch 未取到任何批次：检查数据迭代器是否被跨 epoch 复用')
        print(f'epoch {epoch + 1}, 困惑度 {ppl_sum / n:.2f}')
```

> **第二个必须讲清的点：`grad_clipping` 里的生成器陷阱。**
>
> `model.parameters()` 返回的是**生成器**，不是列表；`params = [p for p in params]` 这行"看起来无害"的代码会把它实体化成列表——但**第一行的 `params` 遍历已经把生成器消耗完了**，如果这两次遍历用的是同一个对象，后面的裁剪体就永远不会执行，梯度裁剪静默失效（实测：grad norm 16277 裁剪后仍是 16277，而非预期的 0.01）。上面的实现用 `isinstance(params, list)` 判断后**只实体化一次**，因此列表与生成器都能正确处理。这类"生成器遍历两次"的问题与数据迭代器是同一类错误，属于 Python 迭代协议最常被忽视的语义。

- **随时间反向传播（BPTT）与截断**：RNN 的梯度沿时间维度回传（链式法则连乘 $T$ 步，衔接前文反向传播与数值稳定性）。完整回传计算量随序列长度线性增长，实践中普遍**截断**：每处理一个小批量就 detach 隐状态，梯度只在本批量内回传；
- **梯度裁剪**：时间维度上的连乘使梯度**有可能爆炸**——一旦溢出为 NaN，之后的训练全部作废，比梯度消失更难挽回。梯度裁剪把梯度的 L2 范数限制在阈值 $\theta$ 内，是训练 RNN 的标准保险。注意 `norm > theta` 时是**整体等比缩小**（`*= theta / norm`），因此不会改变梯度方向，只改变步长。

**"极易爆炸"这个说法需要加个限定：爆炸与学习率强相关。** 在同一组随机语料上实测最大梯度范数，可以看到阈值并不是随时都在发挥作用：

| 学习率 | 不裁剪时的最大梯度范数 | 裁剪到 1.0 后 |
|---|---|---|
| 0.05 | 1.66 | 1.08 |
| 0.3 | **1,457,174** | 66.2 |
| 1.0 | 1.75e10 | 1.78e13（裁剪也救不回来） |

也就是说：**学习率合适（0.05）时梯度范数只有 1.7 上下，裁剪几乎不起作用；学习率一旦偏大（0.3），梯度立刻爆到 1e6 量级，裁剪从"保险"变成"必需品"；再大到 1.0，连裁剪都压不住（裁剪只把当前批次的范数拉回阈值，但参数已经被破坏）。** 结论是：梯度裁剪**必须始终打开**（它没有副作用，且代价极低），但**不能指望它兜住所有错误的学习率**——真正决定训练能否稳定的，是学习率与初始化的搭配。这也解释了为什么"调参要先调学习率"：它是唯一一个能让训练从"完全正常"直接跳到"数值溢出"的超参数。

训练 100 轮后（批量 32、步数 35、隐单元 256），参考输出困惑度约 6.0；用学到的模型生成文本：

```python
@torch.no_grad()
def predict(prefix, num_preds, model, params, vocab, num_hiddens, device='cpu'):
    """给定前缀，逐字符生成后续文本"""
    state = init_rnn_state(1, num_hiddens, device)
    outputs = [vocab.token_to_idx[prefix[0]]]
    # 用前缀本身推进状态（最后一步的前向结果同时给出第一个预测）
    for i in range(len(prefix) - 1):
        X = F.one_hot(torch.tensor([[outputs[-1]]], device=device),
                      len(vocab)).float().swapaxes(0, 1)      # (1, 1, 词表)
        Y, state = model(X, state, params)
        outputs.append(vocab.token_to_idx[prefix[i + 1]])
    for _ in range(num_preds):                      # 逐字符生成
        X = F.one_hot(torch.tensor([[outputs[-1]]], device=device),
                      len(vocab)).float().swapaxes(0, 1)
        Y, state = model(X, state, params)
        outputs.append(int(Y.argmax(dim=1).reshape(-1)))
    return ''.join(vocab.idx_to_token[i] for i in outputs)
```

> **生成时要 `no_grad`**：推理不需要梯度，`@torch.no_grad()` 既省显存又更快。另外，原写法把前缀推进与生成分成两段，前 `len(prefix)-1` 步算出的 `Y` 被丢弃——这没问题，但状态必须逐字符喂入，**不能一次把整个前缀塞进去**：RNN 的状态是按时间步递推的，一次喂入只会更新一次状态，等价于"只看了一个字符"。上面保留了逐字符推进的正确写法，并显式用 `.swapaxes(0, 1)`（而非对三维张量用 `.T`，后者在 PyTorch 2.x 中已弃用并会给出警告）完成维度置换。
>
> 用 `.T` 对超过二维的张量做转置时，PyTorch 会发出 `The use of x.T on tensors of dimension other than 2 ... is deprecated` 的警告；对 `(批量, 步数)` 这样的二维张量用 `.T` 仍然合法（等价于 `.mT`），本文在二维情形继续沿用 `.T` 以贴近教材写法。

参考输出示例：

```
predict('the time ', 50):  the time traveller held a candle
```

### LSTM 与 GRU

#### 长程依赖问题

RNN 的记忆是"一锅端"：每个时间步的 $h_t$ 都要同时承担"短期更新"与"长期记忆"，梯度沿时间连乘导致**长距离信息难以保留**（梯度消失，衔接前文数值稳定性）。**长短期记忆网络（LSTM，Hochreiter & Schmidhuber, 1997）** 通过两条设计解决：引入独立的**细胞状态（cell state）** $C_t$ 作为"记忆传送带"，并让信息流经**门控**控制写入与遗忘。

LSTM 的核心方程（$x_t$ 为当前输入，$h_{t-1}$ 为上一隐状态，$\odot$ 为逐元素乘）：

{% raw %}
$$
\begin{aligned}
f_t &= \sigma(W_f[h_{t-1}, x_t] + b_f) &&\quad\text{遗忘门：决定保留多少旧记忆}\\
i_t &= \sigma(W_i[h_{t-1}, x_t] + b_i) &&\quad\text{输入门：决定写入多少新信息}\\
o_t &= \sigma(W_o[h_{t-1}, x_t] + b_o) &&\quad\text{输出门：决定输出多少记忆}\\
\tilde{C}_t &= \tanh(W_c[h_{t-1}, x_t] + b_c) &&\quad\text{候选记忆}\\
C_t &= f_t \odot C_{t-1} + i_t \odot \tilde{C}_t &&\quad\text{更新细胞状态}\\
h_t &= o_t \odot \tanh(C_t) &&\quad\text{更新隐状态}
\end{aligned}
$$
{% endraw %}

三个门都是 Sigmoid（输出 0~1，逐元素决定"放行多少"）。**关键机制**：细胞状态 $C_t$ 的更新是"旧记忆按遗忘门衰减 + 新信息按输入门加入"的**加法路径**——加法不涉及连乘，梯度可以沿这条路径无损回传（更准确地说，梯度按遗忘门 $f_t$ 连乘，而 $f_t$ 由网络学得、可以接近 1，因此长程信息得以保留），长程信息因此得以保留。

**GRU（门控循环单元）** 是 LSTM 的简化版：只有两个门（重置门 $r_t$、更新门 $z_t$），没有独立细胞状态，参数量更少、训练更快，效果通常与 LSTM 相当。实践选择：数据量充足时 LSTM 略强，资源受限时 GRU 更划算。

#### 简洁实现与对比实验

PyTorch 的 `nn.LSTM` / `nn.GRU` 封装了全部细节，与嵌入层、输出层组合即可搭建语言模型：

```python
class LSTMModel(nn.Module):
    def __init__(self, vocab_size, num_hiddens):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, num_hiddens)
        self.lstm = nn.LSTM(num_hiddens, num_hiddens)
        self.fc = nn.Linear(num_hiddens, vocab_size)
    def forward(self, X, state=None):      # X: (批量, 步数)
        emb = self.embedding(X.T)          # (步数, 批量, 隐藏)
        out, state = self.lstm(emb, state)
        return self.fc(out), state         # (步数, 批量, 词表)
```

> **注意这里的接口约定**：这个模型接收的是**字符索引**（`(批量, 步数)` 的长整型张量），索引在模型内部才被嵌入层转成稠密向量。因此 **RNN 从零实现里用的独热编码在这条路径上完全不需要**——两者是"同一件事的两种实现"：独热 + 线性层 $\equiv$ 查表（`nn.Embedding`）。下面的 `predict` 也必须与之一致，不能把独热向量喂给嵌入层。

同一语料、同一训练设置下 RNN 与 LSTM 的对比（参考输出，100 轮）：

```
RNN 的困惑度:   约 6.0
LSTM 的困惑度:  约 4.5
```

LSTM 的困惑度更低（困惑度 = $\exp(\text{交叉熵损失})$，越小越好，1 表示完美预测），印证了门控对长程信息的保留能力。**对照实验**是这里的核心动作：结构不同、其余设置全同，差异只能来自门控机制，这是"改一个变量看差别"的体现。

### 真实批次里长度不齐：填充、掩码与压缩

前面所有序列实验都用了一个便利的假设：**同一批次里每一行的长度完全一样**（都是 `num_steps=35`）。这是把连续长文本切成长度相等的片段得到的，属于语言模型特有的取巧。真实任务的序列长度天然不齐——一句话 7 个词、另一句 23 个词，一个传感器片段 512 点、另一个 300 点。而张量必须是矩形的，于是必须先"补齐"。这一步怎么做，直接决定模型会不会把填充的假数据当成真实信号学习。

**第一步：用 `pad_sequence` 把不等长序列补成矩形。** `padding_value=0` 通常对应词表中的 `<pad>`；注意 `enforce_sorted=False` 时按原顺序返回，但长度信息必须单独保存。

```python
import torch
from torch import nn
from torch.nn.utils.rnn import pad_sequence, pack_padded_sequence, pad_packed_sequence

# 一个批次：3 条不等长的序列（词索引）
seqs = [torch.tensor([5, 3, 9, 1]),                # 长度 4
        torch.tensor([7, 2]),                       # 长度 2
        torch.tensor([4, 8, 6, 2, 1, 3])]           # 长度 6
lengths = torch.tensor([len(s) for s in seqs])      # [4, 2, 6]：必须自己记下来

padded = pad_sequence(seqs, batch_first=True, padding_value=0)
print('补齐后形状:', tuple(padded.shape))           # (3, 6) 即 (批量, 最大长度)
print(padded)
```

**第二步：让损失函数忽略填充位置。** 这是最容易出错的地方——若不处理，模型会花大量精力去预测那些人为补上的 0，指标也被稀释。

```python
# 交叉熵的 ignore_index 让 padding 位置不产生任何损失与梯度
loss_fn = nn.CrossEntropyLoss(ignore_index=0)
# 设 labels 中 padding 位置也是 0（与 padding_value 一致）即可
```

**第三步（进阶）：用 `pack_padded_sequence` 让 RNN 连计算都跳过填充。** 只屏蔽损失还不够——RNN 仍会在填充位置上跑时间步、污染隐状态，而且注意：**当序列被填充到同一长度时，最后一步的隐状态来自填充步而不是真实末字符**，若用它做句向量分类就错了。压缩（packing）让 RNN 按各序列的真实长度计算：

```python
embed = nn.Embedding(10, 8)
lstm = nn.LSTM(8, 8, batch_first=True)

emb = embed(padded)                                  # (3, 6, 8)
# 压缩前必须按长度降序排列（PyTorch 的强制要求）
sorted_len, order = lengths.sort(descending=True)
packed = pack_padded_sequence(emb[order], sorted_len, batch_first=True)
out_packed, (h, c) = lstm(packed)
out, out_lens = pad_packed_sequence(out_packed, batch_first=True)

# 还原原始顺序，并按各序列真实长度取最后一个时间步，作为句向量
inv = torch.argsort(order)
out = out[inv]
h_last = out[torch.arange(len(seqs)), lengths - 1]    # 注意用 lengths-1 而非 -1
print('句向量形状:', tuple(h_last.shape))              # (3, 8)
```

**三个必须记住的细节**：

1. **`lengths` 一定要显式保存**，不能事后从内容里"猜"（真实序列里 0 也可能是合法 token）；
2. **`pack_padded_sequence` 要求按长度降序排列**，否则 PyTorch 会报错或算出错误结果——常见做法是排序后前向、再用 `argsort(order)` 还原；
3. **取"最后一个有效时间步"要用 `lengths - 1`**，绝不能用 `-1` 或 `out[:, -1]`：后者取到的是填充步的隐状态，在小批量里长度不同时结果会**随批次构成而变**，这是极隐蔽的 bug。

**Transformer 侧对应的是 `src_key_padding_mask`。** `nn.TransformerEncoderLayer` 接受 `src_key_padding_mask`（形状 `(批量, 序列长)`，`True` 表示该位置是填充、需要屏蔽），其作用与上面的 packing 相同：让注意力不去"看"填充位。注意它与因果掩码是**两个不同的参数**、可以同时使用：

```python
# True = 该位置被屏蔽（与注意力掩码 -inf 的语义相反，注意区分）
key_padding_mask = (padded == 0)                      # (批量, 序列长)
# out = self.encoder(emb, mask=causal_mask, src_key_padding_mask=key_padding_mask)
```

> **为什么这一节值得单独讲？** 因为"序列长度可变"是 RNN 相对全连接的核心优势之一，但在**批量训练**的工程现实里，它并不会自动成立——必须由填充、掩码、压缩三者配合才能兑现。很多初学者在把 demo 搬到真实数据时，指标莫名偏低，根源就是"填充位参与了损失或污染了隐状态"。

### 词嵌入

到目前为止字符都是**独热编码**（vocab_size 维单位向量）。独热有两个缺陷：① 维度随词表爆炸（1 万个词 = 1 万维向量）；② 向量之间正交，无法体现语义相近（"猫"与"狗"的距离和"猫"与"飞机"一样远）。**词嵌入（word embedding）** 用一个低维稠密向量表示每个词/字符，且这个向量**随模型一起训练**（或在大型语料上预训练），使语义相近的符号在向量空间中靠近。

```python
embed = nn.Embedding(num_embeddings=28, embedding_dim=16)   # 词表 28，嵌入维度 16
x = torch.tensor([[1, 3, 5]])              # 三个字符的索引
print(embed(x).shape)                      # torch.Size([1, 3, 16])：每个索引映射为一个 16 维向量
```

`nn.Embedding` 本质是一张"索引 → 向量"的可学习查找表（权重矩阵形状为 `(num_embeddings, embedding_dim)`），梯度正常回传、随训练更新。注意它**只接受整型索引**：传入浮点张量会得到 `Expected tensor for argument #1 'indices' to have one of the following scalar types: Long, Int; but got torch.FloatTensor`——这条报错几乎是每个初学者都会撞一次的，看到它就该意识到"我把独热向量当成索引喂进去了"。嵌入维度是超参数：过小表达能力不足，过大则参数增多、容易过拟合（衔接前文模型选择）。上文 LSTM 模型的 `embedding` 层即嵌入的实战用法。

### 实战：字符级语言模型

把嵌入 + LSTM + 生成拼成完整项目（语料、训练循环复用前文函数）：

```python
torch.manual_seed(0)
device = 'cuda' if torch.cuda.is_available() else 'cpu'

batch_size, num_steps, num_hiddens, num_epochs = 32, 35, 256, 100
corpus, vocab = load_corpus(batch_size, num_steps)
model = LSTMModel(len(vocab), num_hiddens).to(device)

optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
loss = nn.CrossEntropyLoss()

for epoch in range(num_epochs):
    model.train()
    train_iter = seq_data_iter(corpus, batch_size, num_steps)   # 每个 epoch 重建
    state = None
    ppl_sum, n = 0.0, 0
    for X, Y in train_iter:
        X, Y = X.to(device), Y.to(device)
        emb = model.embedding(X.T)          # (步数, 批量, 隐藏)
        out, state = model.lstm(emb, state)
        out = model.fc(out)
        state = (state[0].detach(), state[1].detach())   # 截断
        l = loss(out.reshape(-1, len(vocab)), Y.T.reshape(-1))
        optimizer.zero_grad(); l.backward()
        grad_clipping(model.parameters(), 1, device)
        optimizer.step()
        ppl_sum += torch.exp(l).item() * Y.shape[0]
        n += Y.shape[0]
    if (epoch + 1) % 20 == 0:
        print(f'epoch {epoch + 1}, 困惑度 {ppl_sum / n:.2f}')
```

参考输出（生成 50 个字符）：

```
the time traveller's eyes rested on the dial of the clock
```

模型"学到"了词汇搭配与基本语法（冠词、名词、所有格），但语义尚不通顺——字符级模型没有词的概念，能到这个程度已说明循环结构的记忆有效。

与之配套的生成函数（与 `LSTMModel` 的接口一致，传入索引而非独热）：

```python
@torch.no_grad()
def predict_lstm(prefix, num_preds, model, vocab, device='cpu'):
    """给定前缀，用 LSTM 语言模型逐字符生成后续文本"""
    state = None
    outputs = [vocab.token_to_idx[prefix[0]]]
    for i in range(len(prefix) - 1):                    # 逐字符推进状态
        X = torch.tensor([[outputs[-1]]], device=device)
        _, state = model(X, state)
        outputs.append(vocab.token_to_idx[prefix[i + 1]])
    for _ in range(num_preds):
        X = torch.tensor([[outputs[-1]]], device=device)
        Y, state = model(X, state)                      # Y: (1, 1, 词表)
        outputs.append(int(Y.argmax(dim=2).reshape(-1)))
    return ''.join(vocab.idx_to_token[i] for i in outputs)
```

> **对照前文的从零实现**：从零实现的 `predict` 每次要手工构造 `(1, 1, 词表)` 的独热张量；简洁实现的 `predict_lstm` 只需传 `(1, 1)` 的索引，嵌入与状态管理全由 `nn.LSTM` 承担。**接口变了，生成循环也要跟着变**——把独热版 `predict` 直接套到 `LSTMModel` 上会在嵌入层报错（形状 `(1,1,词表)` 与期望的整型 `(1,1)` 不匹配），这是"复制旧代码复用"最典型的翻车点。

---

## 注意力机制与 Transformer

### RNN 的局限与注意力的直觉

RNN 解决序列问题的代价是**顺序计算**：第 $t$ 步必须等前 $t-1$ 步算完，无法并行；且长距离信息即便有门控也仍会衰减（LSTM 只是缓解）。更深层的问题是**信息瓶颈**：seq2seq 式结构把整句信息压进最后一个隐状态，长句子必然"记不全"。

注意力机制（Bahdanau et al., 2015）提供了不同的思路：**不再把所有信息压缩进一个向量，而是保留全部中间状态，需要时按相关性"软性检索"**。类比查字典：要翻译"猫"，不是回忆整本书，而是直接定位到"猫"对应的条目。具体地，给定一个**查询（query）** $q$ 和一组"键-值"对 $(k_i, v_i)$，注意力输出为值的加权和，权重由查询与各键的相似度经 softmax 归一化得到：

$$\text{Attention}(q, K, V) = \sum_{i} \alpha_i v_i, \qquad \alpha_i = \frac{\exp(\text{score}(q, k_i))}{\sum_j \exp(\text{score}(q, k_j))}$$

打分函数常用**加性注意力**（Bahdanau 原论文）与**缩放点积注意力**（Transformer）：$\text{score}(q,k) = q^\top k / \sqrt{d}$（$d$ 为维度，除以 $\sqrt{d}$ 防止点积随维度增大而过大、softmax 进入饱和区）。权重 $\alpha_i$ 的含义是"查询 $q$ 与第 $i$ 个键的匹配程度"——注意力因此可解释为对 $V$ 的软检索。softmax 已在前文学过，此处直接复用。

### 自注意力与多头注意力

**自注意力（self-attention）**：查询、键、值**全部来自输入自身**——每个词都与句内其它词计算相关性，直接建模"词与词的关系"。以"它"为例：自注意力让"它"能直接"看到"句中与它相关的名词（距离多远都行），而不必像 RNN 那样逐步传递。数学上，对输入 $\mathbf{X}$（每行一个词），先经三个可学习矩阵投影得到

$$\mathbf{Q} = \mathbf{X}W^Q,\quad \mathbf{K} = \mathbf{X}W^K,\quad \mathbf{V} = \mathbf{X}W^V$$

再计算

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d_k}}\right)\mathbf{V}$$

**多头注意力（multi-head attention）**：把 $Q,K,V$ 拆成 $h$ 组（多头），每组独立做注意力，最后拼接并线性变换。直觉：每个头可以关注不同的关系类型（语法、指代、语义），类似卷积层用多个核检测多种特征。注意"拆成 $h$ 组"通常是把 $d$ 维特征切成 $h$ 份（每份 $d/h$ 维）而不是复制 $h$ 份，因此**多头的参数量与单头同维度时基本相同**。

**与 RNN 的对比**：自注意力的复杂度为 $O(n^2)$（$n$ 为序列长度，每对词都计算相关），比 RNN 的 $O(n)$ 高，但**所有词对可以并行计算**——GPU 上 $n^2$ 的并行计算常快于 $n$ 步串行；且任意两词之间只有一步"距离"（RNN 需要 $O(\text{距离})$ 步），长程依赖不再衰减。代价是显存占用随 $n^2$ 增长，长序列需要稀疏/线性注意力等变体。

### 位置编码

自注意力对词的位置**一无所知**——它把所有词当"袋子"处理（交换任意两词，输出也对应交换）。要让模型利用顺序，必须在输入中注入位置信息。Transformer 的做法是**位置编码（positional encoding）**：给每个位置生成一个固定向量，与词嵌入相加：

{% raw %}
$$\text{PE}_{(pos, 2i)} = \sin\!\left(\frac{pos}{10000^{2i/d}}\right), \qquad \text{PE}_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d}}\right)$$
{% endraw %}

其中 $pos$ 是位置，$2i/2i+1$ 是维度下标，$d$ 是嵌入维度。正弦/余弦的形式使不同位置产生不同向量、且任意位置对的相对偏移可由线性变换表示（模型可借此学到"相对位置"关系）。

```python
class PositionalEncoding(nn.Module):
    def __init__(self, num_hiddens, max_len=1000):
        super().__init__()
        P = torch.zeros((1, max_len, num_hiddens))
        X = torch.arange(max_len, dtype=torch.float32).reshape(-1, 1) / \
            torch.pow(10000, torch.arange(0, num_hiddens, 2,
                                          dtype=torch.float32) / num_hiddens)
        P[:, :, 0::2] = torch.sin(X)
        P[:, :, 1::2] = torch.cos(X)
        self.num_hiddens = num_hiddens
        self.register_buffer('P', P)          # 不参与训练的参数（随 .to(device) 一起搬运）

    def forward(self, X):
        # 词嵌入先乘 sqrt(d) 放大，再与位置编码相加（原论文做法，见下方说明）
        return X * math.sqrt(self.num_hiddens) + self.P[:, :X.shape[1], :]
```

> **易错点**：
> ① `register_buffer` 而不是 `self.P = P`——`register_buffer` 注册的张量会随 `model.to(device)` 一起搬到 GPU，也不会被优化器更新；若直接写成普通属性，`X` 在 GPU 而 `P` 在 CPU，加法会直接报设备不匹配。
> ② 位置编码与词嵌入是**相加**而非拼接，因此要求两者维度相同（都是 `num_hiddens`）；`max_len` 必须不小于实际序列长度，否则切片会静默地产生长度不足的张量，进而在后续加法处报形状错误。
> ③ **词嵌入要先乘 $\sqrt{d}$，这不是可选项。** 原论文把词嵌入放大 $\sqrt{d_{\text{model}}}$ 倍后再与位置编码相加，目的是让位置信息处于"辅助"量级。以 $d=256$ 为例实测：`nn.Embedding` 默认初始化的词嵌入标准差约 1.00，而位置编码的标准差约 0.57——**不缩放时两者量级相当（比值 0.57），位置信号会与语义信号平起平坐甚至淹没它**；乘以 $\sqrt{256}=16$ 后比值降到 0.036，位置编码回到应有的从属地位。这也是上面 `forward` 里那行 `X * math.sqrt(self.num_hiddens)` 的由来。若跳过这一步，模型往往要花更多轮次才能学会利用位置信息，表现为收敛更慢、最终困惑度偏高。

### Transformer 编码器

**Transformer**（Vaswani et al., 2017，"Attention Is All You Need"）完全抛弃循环，只用自注意力堆叠网络。其**编码器块**由四部分组成：

1. **多头自注意力**（见上文）；
2. **前馈网络**：每个位置独立的两层全连接（中间层放大 4 倍），为模型补充非线性变换能力；
3. **残差连接**——每个子层输出 $x + \text{SubLayer}(x)$；
4. **层归一化（LayerNorm）**：与 BatchNorm 类似地对每个样本的特征维度做归一化（而非跨样本），更适合变长序列。

简洁实现直接用 `nn.TransformerEncoderLayer`（PyTorch 内置，包含上述全部组件）堆叠：

```python
encoder_layer = nn.TransformerEncoderLayer(
    d_model=num_hiddens, nhead=4, dim_feedforward=4 * num_hiddens,
    batch_first=True, dropout=0.1)
encoder = nn.TransformerEncoder(encoder_layer, num_layers=2)
```

> **注意 `nhead` 必须整除 `d_model`**，否则会报 "embed_dim must be divisible by num_heads"。`d_model=256, nhead=4` 合法；`d_model=100, nhead=8` 不合法。这是搭建 Transformer 时最常见的配置错误之一。

> **理论补充：BatchNorm 与 LayerNorm 的区别。** BatchNorm 对小批量内**同一通道**的所有样本做归一化（依赖批量，训练/推理行为不同）；LayerNorm 对**单个样本**的所有特征维度做归一化（与批量无关）。序列任务中批量与序列长度常变化，LayerNorm 更稳定，因此 Transformer 用 LayerNorm 而 CNN 用 BatchNorm。

### 实验：小型语言模型

把嵌入 + 位置编码 + Transformer 编码器 + 输出层组合为因果语言模型（只根据**过去**的字符预测下一个——自注意力本身能看到全部位置，需要**因果掩码**把未来屏蔽）：

```python
class TransformerLM(nn.Module):
    def __init__(self, vocab_size, num_hiddens, nhead=4, num_layers=2):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, num_hiddens)
        self.pos_encoding = PositionalEncoding(num_hiddens)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=num_hiddens, nhead=nhead, dim_feedforward=4 * num_hiddens,
            batch_first=True, dropout=0.1)
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(num_hiddens, vocab_size)

    def forward(self, X):                       # X: (批量, 步数) 的整型索引
        emb = self.pos_encoding(self.embedding(X))   # (批量, 步数, 隐藏)
        seq_len = X.shape[1]
        # 上三角掩码：-inf 表示"屏蔽"，与 0 相加后经 softmax 权重归零
        mask = torch.triu(torch.full((seq_len, seq_len), float('-inf')),
                          diagonal=1).to(X.device)
        out = self.encoder(emb, mask=mask)
        return self.fc(out)                     # (批量, 步数, 词表)
```

> **因果掩码为什么用 $-\infty$ 而不是 1/0 的布尔矩阵？** 两者 PyTorch 都支持：布尔矩阵中 `True` 表示"屏蔽"，浮点矩阵中 $-\infty$ 表示"屏蔽"。用 $-\infty$ 更直观地对应了公式——注意力权重来自 softmax，而 $e^{-\infty}=0$，被屏蔽位置的概率质量恰为 0；若用一个很大的负数（如 `-1e9`）代替 $-\infty$，在混合精度训练下可能出现精度问题（`-1e9` 转成 fp16 会溢出为 `-inf`，虽结果相同但更易触发 NaN 警告）。用 `torch.triu(..., diagonal=1)` 恰好保留对角线及以下（含自身），屏蔽其上（未来位置）。

训练循环与 LSTM 实战一致（交叉熵 + 梯度裁剪；Transformer 无隐状态，无需截断）：

```python
def train_transformer(model, corpus, vocab, num_epochs=100, lr=0.001,
                      batch_size=32, num_steps=35, device='cpu'):
    model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss = nn.CrossEntropyLoss()
    for epoch in range(num_epochs):
        model.train()
        train_iter = seq_data_iter(corpus, batch_size, num_steps)   # 每个 epoch 重建
        ppl_sum, n = 0.0, 0
        for X, Y in train_iter:
            X, Y = X.to(device), Y.to(device)
            Y_hat = model(X)                       # (批量, 步数, 词表)
            l = loss(Y_hat.reshape(-1, len(vocab)), Y.reshape(-1))
            optimizer.zero_grad(); l.backward()
            grad_clipping(model.parameters(), 1, device)
            optimizer.step()
            ppl_sum += torch.exp(l).item() * Y.shape[0]
            n += Y.shape[0]
        if (epoch + 1) % 20 == 0:
            print(f'epoch {epoch + 1}, 困惑度 {ppl_sum / n:.2f}')
```

参考输出（100 轮，隐藏 256、2 层、4 头；与 LSTM 保持同规模以便公平对比）：

```
Transformer 的困惑度: 约 4.6
```

与 LSTM（约 4.5）相当，但**计算可并行**是 Transformer 取代 RNN 成为现代序列建模基石的真正原因。

> **公平对比的前提**：比较不同结构时，"隐藏维度、层数、嵌入维度、训练轮数、批量与学习率"应当尽量对齐。若把 Transformer 的 `num_hiddens` 设成 128 而 LSTM 用 256，参数量的差距会直接反映在困惑度上，此时的差异就不能全部归因于结构。上面的代码把两者统一为 256，并各自单独调一次学习率（LSTM 常用 0.01，Transformer 常用更小的 0.001~0.0005），是比较的合理起点。

## 收尾

### 模型对比实验

学习结构的价值在于能公平地比较同一数据集、同一评估协议下，"改一个变量"看差异。汇总本文训练过的模型：

| 任务 | 模型 | 测试准确率 / 困惑度（参考值） | 关键差异 |
|---|---|---|---|
| Fashion-MNIST 图像分类 | MLP | 0.845 | 基线 |
| Fashion-MNIST 图像分类 | LeNet | 0.900 | 卷积的局部先验 |
| Fashion-MNIST 图像分类 | 小型 ResNet | 0.925 | 残差连接 |
| CIFAR-10 图像分类 | 小型 ResNet | 0.78~0.82（20 轮）→ 0.92+（增强+长训练） | 数据增强/归一化 |
| 文本（字符级） | RNN | 困惑度约 6.0 | 基线 |
| 文本（字符级） | LSTM | 困惑度约 4.5 | 门控记忆 |
| 文本（字符级） | Transformer | 困惑度约 4.6 | 可并行的自注意力 |

> 表中跨任务、跨数据集的数字不可直接横向比较（图像用准确率、语言用困惑度；数据集与训练轮数也不同）。同一行内的相邻两项才是真正可比的对照——这正是"控制变量"的意义。

### 经典论文索引

本文介绍的每个结构都源自一篇（或一簇）经典论文。以下索引按"解决什么问题 → 关键设计"整理，可作为按图索骥的阅读清单：

| 论文（年份） | 核心贡献 | 本篇章节 |
|---|---|---|
| LeNet-5（LeCun et al., 1998） | 卷积+池化+全连接的 CNN 原型 | "LeNet"一节 |
| LSTM（Hochreiter & Schmidhuber, 1997） | 门控与细胞状态保留长程记忆 | "LSTM 与 GRU"一节 |
| 梯度消失分析（Hochreiter, 1991；Bengio et al., 1994） | 指出长程依赖中梯度连乘导致的消失问题，是门控与残差的共同动机 | "退化问题"与"LSTM 与 GRU"两节 |
| AlexNet（Krizhevsky et al., 2012） | ReLU、Dropout、数据增强；深度学习引爆点 | "数据增强"一节 |
| Dropout（Srivastava et al., 2014） | 训练时随机丢弃神经元以抑制过拟合 | "批量归一化"一节（对照） |
| VGG（Simonyan & Zisserman, 2014） | 3×3 卷积堆叠与模块化深度 | "残差连接与 ResNet"一节（思想铺垫） |
| BatchNorm（Ioffe & Szegedy, 2015） | 批量归一化稳定训练 | "批量归一化"一节 |
| ResNet（He et al., 2015） | 残差连接使深层可训练 | "残差连接与 ResNet"一节 |
| 注意力机制（Bahdanau et al., 2015） | 软检索替代信息压缩，解决 seq2seq 信息瓶颈 | "RNN 的局限与注意力的直觉"一节 |
| Transformer（Vaswani et al., 2017） | 自注意力 + 多头 + 位置编码，完全抛弃循环 | "自注意力与多头注意力"至"实验：小型语言模型" |
| 综述（LeCun, Bengio & Hinton, 2015） | 三类结构的统一视角与深度学习的整体图景 | 全篇 |

---

## 结语

本文用三大部分解析了深度学习三大核心结构：卷积网络以局部连接与权值共享吃透图像的空间结构，循环网络以隐状态与门控驾驭序列的时间结构，Transformer 以自注意力直接建模元素间关系并赢得并行性。三者并非互相取代，而是各擅其长——图像任务首选 CNN（或其现代变体），序列任务正在被 Transformer 主导，而 RNN 家族仍在时间序列等场景发挥作用。
