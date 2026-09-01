---
title: 从卷积到序列
date: 2026-10-20 23:00:00
updated: 2026-10-20 23:00:00
categories:
  - 穷理
tags:
  - 机器学习
  - 深度学习
description: 介绍卷积神经网络（LeNet、ResNet）、循环神经网络（RNN、LSTM）与注意力机制（Transformer）三大类现代网络结构，涵盖数据增强、批量归一化等训练技巧，全部以 PyTorch 从零实现与简洁实现双范式呈现
cover: /img/blog13.webp
---

## 引言

深度学习解决的三类核心问题——图像、序列与"序列内部的关联"——分别由三大类网络结构承载：**卷积神经网络（CNN）**、**循环神经网络（RNN）** 与 **注意力机制/Transformer**。本文承接《从张量到深度网络》，在其 Tensor、autograd、`nn`/`optim`、优化算法与训练范式的基础上，逐类介绍这三种结构：先讲"为什么要这样设计"的直觉，再给出数学定义，最后以 PyTorch 从零实现与简洁实现两种方式落地，并配以可直接运行的小型实验。

> 本文示例基于 PyTorch 编写，，全部代码可直接在 Jupyter Notebook 或 Python 脚本中运行。文中运行结果取自参考实验的输出，实际运行时因随机初始化、框架版本与硬件差异，数值会略有不同，请以动手验证为准。

---

## 卷积神经网络

### 图像分类与全连接的局限

第 4 篇用全连接网络（MLP）在 Fashion-MNIST 上把测试准确率做到约 0.845——比线性模型（0.82）有提升，但离可用水平仍有距离。要理解卷积网络为什么是图像任务的默认选择，先看全连接网络处理图像时的两个固有缺陷：

**第一，丢失空间结构。** 全连接网络把 $28\times28$ 的图像"展平"成 784 维向量再送入网络，像素之间的**相邻关系**（局部性）被彻底抹掉。而图像的统计特性恰恰建立在局部性上：一个像素最相关的信息来自它附近的像素（物体的边缘、纹理都是局部的），展平让网络无从利用这一先验。

**第二，参数爆炸。** 展平后每个输出神经元都要连接全部输入：$28\times28$ 图像的一层全连接就是 784 个输入；换成 $1000\times1000$ 的图像则是 100 万个输入，一层全连接的参数量即以亿计。第 3 篇 CNN 小节已经指出，**卷积层**的局部连接与权值共享恰好同时解决这两个问题——本文给出其完整定义与实现。

### 卷积层：从直觉到实现

#### 互相关运算：滑动窗口

卷积层的核心运算是**互相关（cross-correlation）**：一个可学习的**卷积核（filter/kernel）**在输入上滑动，在每个位置做"逐元素相乘再求和"，得到输出（又称**特征图，feature map**）中对应位置的一个数。先看二维情况下的从零实现：

```python
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

卷积核可以看作一个**特征检测器**。用一个具体例子体会：检测竖直边缘的核 $K=[[1,-1]]$（核宽 2、高 1），作用于一个"左半亮右半暗"的图像，输出中亮暗交界处取值非零，即标记了边缘位置：

```python
X = torch.ones((6, 8))
X[:, 2:6] = 0                 # 中间 4 列置 0：形成两条竖直边缘
K = torch.tensor([[1.0, -1.0]])
Y = corr2d(X, K)
print(Y.shape)                # torch.Size([6, 7])
```

更关键的是：**核不需要手工设计**。把核当作可学习参数、用"输出应等于目标边缘图"的平方损失训练它，几轮梯度下降后学到的核就自动逼近 $[1,-1]$ 的形状——这就是"特征由数据学得"的最朴素体现，也是第 3 篇"深度学习 = 表示学习"论断的微观验证：

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

> **理论补充：互相关与卷积的区别。** 严格地说，深度学习中的"卷积"是**互相关**运算（核不做翻转）；数学上的卷积需要对核做 180° 翻转。二者只在符号约定上不同，可学习核能自动吸收翻转，因此实践中互相关直接被称为卷积。`nn.Conv2d` 实现的正是互相关。

#### 填充（padding）与步幅（stride）

互相关默认有两个行为：核每滑动一格（步幅 1），且核不能越出输入边界。由此产生两个超参数：

- **填充（padding）**：在输入四周补 0。让核"看到"输入边缘的像素，并控制输出尺寸——填充 $p$ 后输出高为 $(n_h + 2p - k_h) + 1$。典型做法是 `padding=k-1`（$k$ 为核大小），使输出与输入同尺寸（如 LeNet 第一层 `kernel_size=5, padding=2` 保持 $28\times28$）；
- **步幅（stride）**：核每次滑动的格数。步幅 $s$ 使输出尺寸约为输入的 $1/s$，用于快速降采样（如 `stride=2` 让尺寸减半）。

综合两者，输出尺寸公式为

$$\text{输出高} = \left\lfloor\frac{n_h + 2p_h - k_h}{s_h}\right\rfloor + 1$$

#### 多输入/多输出通道

真实图像是**多通道**的（RGB 三通道；灰度图 1 通道），卷积层随之处理多输入通道：一个输出通道对应一个卷积核，该核必须**同时覆盖所有输入通道**（核的形状为"输入通道数 × 高 × 宽"），对每个输入通道分别卷积后相加。多个输出通道则并列多个这样的核，各自检测一种特征。用 PyTorch 验证维度：

```python
conv = nn.Conv2d(in_channels=3, out_channels=6, kernel_size=5)   # 6 个 3×5×5 的核
X = torch.randn((2, 3, 32, 32))          # (批量, 通道, 高, 宽)
print(conv(X).shape)                     # (2, 6, 28, 28)
```

注意**参数量**：6 个核共 $6\times3\times5\times5=450$ 个参数（不含偏置），与图像尺寸无关；而同样输入输出的全连接层参数以百万计——这正是卷积层参数效率的来源（局部连接 + 权值共享，见第 3 篇 CNN 小节）。

### 池化层

卷积输出仍然很大，且对像素的微小平移过于敏感（同一个物体平移一个像素，边缘检测结果整体移动）。**池化（pooling）** 层对特征图降采样：在固定大小的窗口内取**最大值**（最大池化）或**均值**（平均池化），窗口滑动与卷积相同（可配填充、步幅），但没有可学习参数。

```python
def pool2d(X, pool_size, mode='max'):
    p_h, p_w = pool_size
    Y = torch.zeros((X.shape[0] - p_h + 1, X.shape[1] - p_w + 1))
    for i in range(Y.shape[0]):
        for j in range(Y.shape[1]):
            if mode == 'max':
                Y[i, j] = X[i:i + p_h, j:j + p_w].max()
            elif mode == 'avg':
                Y[i, j] = X[i:i + p_h, j:j + p_w].mean()
    return Y
```

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
| 全连接 120 → 84 → 10 | $10$ | 最后输出 10 类得分 |

（原论文的池化带可学习系数，实践中普遍用最大池化替代，效果相近且更简洁；原论文输出层用高斯连接，现代实现统一用全连接 + Softmax/交叉熵。）

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

数据加载与第 4 篇相同（Fashion-MNIST，`ToTensor` 转张量，`DataLoader` 批量）。训练前先定义两个通用函数，本部分后续所有模型复用：

```python
def evaluate_accuracy(net, data_iter, device):
    """测试集准确率：不计算梯度，模型置于评估模式"""
    net.eval()
    acc, n = 0.0, 0
    with torch.no_grad():
        for X, y in data_iter:
            X, y = X.to(device), y.to(device)
            acc += (net(X).argmax(dim=1) == y).sum().item()
            n += y.numel()
    return acc / n

def train_ch6(net, train_iter, test_iter, num_epochs, lr, device):
    """通用训练函数：卷积/全连接层用 Xavier 初始化，SGD 优化"""
    def init_weights(m):
        if type(m) == nn.Linear or type(m) == nn.Conv2d:
            nn.init.xavier_uniform_(m.weight)
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

训练 10 轮（SGD，学习率 0.9）：

```
epoch 1, loss 0.7958, train acc 0.701, test acc 0.772
epoch 5, loss 0.3537, train acc 0.864, test acc 0.867
epoch 10, loss 0.2638, train acc 0.898, test acc 0.900
```

测试准确率约 0.90，显著超过第 4 篇 MLP 的 0.845——卷积的局部先验 + 更少的参数换来了更好的泛化。注意训练准确率（0.898）与测试准确率（0.900）几乎持平，说明 LeNet 在这个任务上尚未过拟合，还有提升空间（后文 ResNet 会利用这一点）。

> **训练的基本习惯**（从现在开始养成，不再重复强调）：① **固定随机种子**——`torch.manual_seed(0)` 等使每次运行结果一致，实验之间才可对比；② **记录曲线**——逐轮打印或绘制损失与准确率曲线，用于判断收敛与过拟合（判断方法见第 3 篇第六部分的学习曲线与偏差/方差诊断）；③ **划分纪律**——测试集只用于最终评估，调参看训练集与验证集（见第 2 篇与第 4 篇）。

### 数据增强

卷积网络登上历史舞台的标志是 AlexNet（Krizhevsky et al., 2012）在 ImageNet 上的突破，其成功依赖的组合拳——ReLU 激活、Dropout 与数据增强（前两者见第 3/4 篇）——至今仍是图像模型的标配。其中**数据增强（data augmentation）** 是对样本施加"保持标签不变"的随机变换，生成语义相同的新样本：水平翻转、随机裁剪、颜色抖动等。直觉：图像分类器应当对翻转、平移、亮度变化鲁棒，让模型见过这些"变形"能提升泛化（增强必须代表测试时真实出现的失真，见第 3 篇第六部分）。PyTorch 中增强由 `transforms` 组合完成：

```python
import torchvision
from torchvision import transforms

transform_train = transforms.Compose([
    transforms.RandomHorizontalFlip(),                    # 随机水平翻转
    transforms.RandomCrop(32, padding=4),                 # 先补 4 像素再随机裁剪回 32×32
    transforms.ToTensor(),
    transforms.Normalize((0.4914, 0.4822, 0.4465),        # CIFAR-10 各通道均值
                         (0.2023, 0.1994, 0.2010))])      # 与标准差
transform_test = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.4914, 0.4822, 0.4465),
                         (0.2023, 0.1994, 0.2010))])      # 测试集不做增强，只归一化
```

两点注意：① **测试集不做增强**（只归一化），否则评估不稳定；② 归一化的均值/标准差从训练集统计，测试集沿用同一组——统计量只能来自训练集，避免数据泄漏（见第 1 篇与第 4 篇）。

### 批量归一化（BatchNorm）

深层网络训练中，各层输入的分布随前层参数更新而不断变化（内部协变量漂移），迫使后续层持续"追着"变化的目标学习。**批量归一化（batch normalization，Ioffe & Szegedy, 2015）** 在每个小批量上对每个通道做标准化（减均值除标准差），再用两个**可学习参数**（缩放 $\gamma$、平移 $\beta$）恢复表达能力：

$$\hat{x} = \gamma \odot \frac{x - \mu_\mathcal{B}}{\sqrt{\sigma_\mathcal{B}^2 + \epsilon}} + \beta$$

其中 $\mu_\mathcal{B},\sigma_\mathcal{B}$ 是小批量内该通道的均值与方差。关键细节：**训练时**用当前小批量的统计量；**推理时**用训练期间累积的全局统计量（running mean/var）——因为推理时可能只有一个样本，没有"批量"可言。PyTorch 的 `nn.BatchNorm2d` 自动处理这一切，通常紧跟卷积层之后、激活函数之前：

```python
blk = nn.Sequential(nn.Conv2d(6, 6, kernel_size=5, padding=2),
                    nn.BatchNorm2d(6), nn.ReLU())
```

> **理论补充：为什么批量归一化有效。** 一个直观解释是它让每层输入保持"单位尺度"，从而允许更大的学习率并减轻对初始化的依赖（衔接第 4 篇"数值稳定性与模型初始化"）。现代研究认为其作用机制更为复杂（平滑损失曲面等），但作为训练技巧，它几乎总能加速收敛并轻微提升最终精度。实践中 BatchNorm 与 ReLU 的组合已是卷积网络的标配，二者配合也能缓解梯度衰减（衔接第 3 篇激活函数小节）。

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
        Y += X                              # 跳跃连接
        return F.relu(Y)
```

当输入输出通道数与尺寸一致时，残差块直接相加；不一致时（如通道数翻倍、尺寸减半的分界处），用步幅 2 的 1×1 卷积把 $x$ 投影到与 $F(x)$ 相同的形状。**ResNet-18** 即按"每段 2 个残差块、通道数 64→128→256→512 逐段翻倍"堆叠而成。

> **理论补充：残差为什么让深层可训练。** 从梯度角度看，跳跃连接为反向传播提供了"捷径"：$\partial L/\partial x$ 沿 $x$ 分支的直通项始终为 1，连乘的梯度衰减被绕过（衔接第 4 篇"数值稳定性"中梯度消失的讨论）。从表示角度看，残差结构让网络在"恒等映射附近"做增量学习，任意深度的模型都不会比浅层版本更差。**对照实验**：同一数据上，去掉跳跃连接（改成普通块）的网络收敛明显更慢、最终精度更低——"改一个变量看差别"，是验证任何设计有效性的基本方法，后文多次使用。

#### 小型 ResNet 与对比实验

在 Fashion-MNIST 上训练"含/不含残差"的两个同规模网络（10 轮），参考输出：

```
含残差连接:  test acc 0.925
不含残差连接: test acc 0.899
```

残差连接带来了约 2.5 个百分点的提升——这一对照验证了"残差让网络更容易优化"的判断。

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

resnet18 = nn.Sequential(
    nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3), nn.BatchNorm2d(64), nn.ReLU(),
    nn.MaxPool2d(kernel_size=3, stride=2, padding=1))
resnet18.add_module('b1', nn.Sequential(*resnet_block(64, 64, 2, first_block=True)))
resnet18.add_module('b2', nn.Sequential(*resnet_block(64, 128, 2)))
resnet18.add_module('b3', nn.Sequential(*resnet_block(128, 256, 2)))
resnet18.add_module('b4', nn.Sequential(*resnet_block(256, 512, 2)))
resnet18.add_module('pool', nn.AdaptiveAvgPool2d((1, 1)))
resnet18.add_module('fc', nn.Sequential(nn.Flatten(), nn.Linear(512, 10)))
```

训练 20 轮（Adam，学习率 0.001，配合学习率调度与早停——实现见第 4 篇第七部分），参考输出：

```
epoch 20, loss 0.682, train acc 0.815, test acc 0.784
```

（参考区间：不同实现与随机种子下 20 轮约 0.78~0.82。训练与测试准确率接近且都偏低，说明模型尚未充分利用数据——提升方向是更长的训练（配合学习率调度）与数据增强（加上后可达 0.92 以上），这正是第 3 篇偏差/方差诊断方法论的应用场景。）

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

用一个具体任务把 RNN 跑起来：**字符级语言模型**——给定一段文本的前 $t$ 个字符，预测第 $t+1$ 个字符。数据用《时间机器》（H. G. Wells）英文原文（约 47KB），预处理为字符序列：

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
    """读取语料，返回小批量迭代器与字符词典"""
    fname = download('http://d2l-data.s3-accelerate.amazonaws.com/timemachine.txt')
    with open(fname, encoding='utf-8') as f:
        lines = f.readlines()
    corpus = [re.sub('[^A-Za-z]+', ' ', line).strip().lower() for line in lines]
    corpus = [line for line in corpus if line]
    tokens = [ch for line in corpus for ch in list(line)]   # 字符级切分
    vocab = Vocab(tokens)
    corpus = [vocab.token_to_idx[ch] for ch in tokens]
    return seq_data_iter(corpus, batch_size, num_steps), vocab
```

**小批量迭代器**把连续文本切成等长片段：把语料（截断到 batch_size 的整数倍）重排为"批 × 步数"的矩阵，每一批内第 $i$ 行是第 $i$ 个样本的连续 $T$ 个字符，标签为同位置的**后移一个字符**：

```python
def seq_data_iter(corpus, batch_size, num_steps):
    """生成 (X, Y)：X 为输入字符序列，Y 为对应的下一字符"""
    corpus = corpus[:(len(corpus) - 1) // batch_size * batch_size]
    corpus = torch.tensor(corpus)
    X = corpus[:-1].reshape(batch_size, -1)    # (批量, 步数)：第 i 行是第 i 个样本
    Y = corpus[1:].reshape(batch_size, -1)
    num_batches = X.shape[1] // num_steps
    for i in range(0, num_batches * num_steps, num_steps):
        yield X[:, i:i + num_steps], Y[:, i:i + num_steps]
```

RNN 的前向传播：输入先做**独热编码**（每个字符映射为 vocab_size 维单位向量），再逐时间步更新隐状态并输出 logits：

```python
def init_rnn_state(batch_size, num_hiddens):
    return (torch.zeros((batch_size, num_hiddens)),)

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

def get_params(vocab_size, num_hiddens):
    def normal(shape):
        return torch.randn(size=shape) * 0.01
    params = [normal((vocab_size, num_hiddens)),
              normal((num_hiddens, num_hiddens)), torch.zeros(num_hiddens),
              normal((num_hiddens, vocab_size)), torch.zeros(vocab_size)]
    for p in params:
        p.requires_grad_(True)
    return params
```

训练循环引入两个此前未见的机制：**截断**与**梯度裁剪**。

```python
def grad_clipping(params, theta):
    """梯度裁剪：把全体参数梯度的 L2 范数限制在 theta 内"""
    params = [p for p in params]               # 兼容列表与生成器（如 model.parameters()）
    norm = torch.sqrt(sum(torch.sum(p.grad ** 2) for p in params if p.grad is not None))
    if norm > theta:
        for p in params:
            if p.grad is not None:
                p.grad.data *= theta / norm

def train_rnn(model, train_iter, vocab, num_hiddens, num_epochs=100, lr=0.01):
    params = get_params(len(vocab), num_hiddens)
    loss = nn.CrossEntropyLoss()
    updater = torch.optim.Adam(params, lr=lr)
    for epoch in range(num_epochs):
        state = None
        ppl_sum, n = 0.0, 0
        for X, Y in train_iter:
            X = F.one_hot(X.T, len(vocab)).float()   # (步数, 批量, 词表)
            if state is None:
                state = init_rnn_state(X.shape[1], num_hiddens)   # 批量取自当前样本
            Y_hat, state = model(X, state, params)
            state = (state[0].detach(),)             # 截断：梯度不跨小批量回传
            l = loss(Y_hat, Y.T.reshape(-1))
            updater.zero_grad(); l.backward()
            grad_clipping(params, 1)
            updater.step()
            ppl_sum += torch.exp(l).item() * Y.shape[0]
            n += Y.shape[0]
        print(f'epoch {epoch + 1}, 困惑度 {ppl_sum / n:.2f}')
```

- **随时间反向传播（BPTT）与截断**：RNN 的梯度沿时间维度回传（链式法则连乘 $T$ 步，衔接第 4 篇反向传播与数值稳定性）。完整回传计算量随序列长度线性增长，实践中普遍**截断**：每处理一个小批量就 detach 隐状态，梯度只在本批量内回传；
- **梯度裁剪**：时间维度上的连乘使梯度极易**爆炸**（比消失更常见且更致命——数值溢出为 NaN）。梯度裁剪把梯度的 L2 范数限制在阈值 $\theta$ 内，是训练 RNN 的标准保险。

训练 100 轮后（批量 32、步数 35、隐单元 256），参考输出困惑度约 6.0；用学到的模型生成文本：

```python
def predict(prefix, num_preds, model, params, vocab, num_hiddens):
    """给定前缀，逐字符生成后续文本"""
    state = init_rnn_state(1, num_hiddens)
    outputs = [vocab.token_to_idx[prefix[0]]]
    for i in range(len(prefix) - 1):                # 用前缀本身推进状态
        X = F.one_hot(torch.tensor([[outputs[-1]]]), len(vocab)).float().reshape(1, 1, -1)
        _, state = model(X, state, params)
        outputs.append(vocab.token_to_idx[prefix[i + 1]])
    for _ in range(num_preds):                      # 逐字符生成
        X = F.one_hot(torch.tensor([[outputs[-1]]]), len(vocab)).float().reshape(1, 1, -1)
        Y, state = model(X, state, params)
        outputs.append(int(Y.argmax(dim=1).reshape(-1)))
    return ''.join(vocab.idx_to_token[i] for i in outputs)
```

参考输出示例：

```
predict('the time ', 50):  the time traveller held a candle
```

### LSTM 与 GRU

#### 长程依赖问题

RNN 的记忆是"一锅端"：每个时间步的 $h_t$ 都要同时承担"短期更新"与"长期记忆"，梯度沿时间连乘导致**长距离信息难以保留**（梯度消失，衔接第 4 篇数值稳定性）。**长短期记忆网络（LSTM，Hochreiter & Schmidhuber, 1997）** 通过两条设计解决：引入独立的**细胞状态（cell state）** $C_t$ 作为"记忆传送带"，并让信息流经**门控**控制写入与遗忘。

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


三个门都是 Sigmoid（输出 0~1，逐元素决定"放行多少"）。**关键机制**：细胞状态 $C_t$ 的更新是"旧记忆按遗忘门衰减 + 新信息按输入门加入"的**加法路径**——加法不涉及连乘，梯度可以沿这条路径无损回传，长程信息因此得以保留。

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

同一语料、同一训练设置下 RNN 与 LSTM 的对比（参考输出，100 轮）：

```
RNN 的困惑度:   约 6.0
LSTM 的困惑度:  约 4.5
```

LSTM 的困惑度更低（困惑度 = $\exp(\text{交叉熵损失})$，越小越好，1 表示完美预测），印证了门控对长程信息的保留能力。**对照实验**是这里的核心动作：结构不同、其余设置全同，差异只能来自门控机制，这是的"改一个变量看差别"的体现。

### 词嵌入

到目前为止字符都是**独热编码**（vocab_size 维单位向量）。独热有两个缺陷：① 维度随词表爆炸（1 万个词 = 1 万维向量）；② 向量之间正交，无法体现语义相近（"猫"与"狗"的距离和"猫"与"飞机"一样远）。**词嵌入（word embedding）** 用一个低维稠密向量表示每个词/字符，且这个向量**随模型一起训练**（或在大型语料上预训练），使语义相近的符号在向量空间中靠近。

```python
embed = nn.Embedding(num_embeddings=28, embedding_dim=16)   # 词表 28，嵌入维度 16
x = torch.tensor([[1, 3, 5]])              # 三个字符的索引
print(embed(x).shape)                      # (1, 3, 16)：每个索引映射为一个 16 维向量
```

`nn.Embedding` 本质是一张"索引 → 向量"的可学习查找表，梯度正常回传、随训练更新。嵌入维度是超参数：过小表达能力不足，过大则参数增多、容易过拟合（衔接第 2 篇模型选择）。上文 LSTM 模型的 `embedding` 层即嵌入的实战用法。

### 实战：字符级语言模型

把嵌入 + LSTM + 生成拼成完整项目（语料、训练循环复用前文函数）：

```python
batch_size, num_steps, num_hiddens, num_epochs = 32, 35, 256, 100
train_iter, vocab = load_corpus(batch_size, num_steps)
model = LSTMModel(len(vocab), num_hiddens)

optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
loss = nn.CrossEntropyLoss()
state = None
for epoch in range(num_epochs):
    ppl_sum, n = 0.0, 0
    for X, Y in train_iter:
        emb = model.embedding(X.T)
        out, state = model.lstm(emb, state)
        out = model.fc(out)
        state = (state[0].detach(), state[1].detach())   # 截断
        l = loss(out.reshape(-1, len(vocab)), Y.T.reshape(-1))
        optimizer.zero_grad(); l.backward()
        grad_clipping(model.parameters(), 1)
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

---

## 注意力机制与 Transformer

### RNN 的局限与注意力的直觉

RNN 解决序列问题的代价是**顺序计算**：第 $t$ 步必须等前 $t-1$ 步算完，无法并行；且长距离信息即便有门控也仍会衰减（LSTM 只是缓解）。更深层的问题是**信息瓶颈**：seq2seq 式结构把整句信息压进最后一个隐状态，长句子必然"记不全"。

注意力机制（Bahdanau et al., 2015）提供了不同的思路：**不再把所有信息压缩进一个向量，而是保留全部中间状态，需要时按相关性"软性检索"**。类比查字典：要翻译"猫"，不是回忆整本书，而是直接定位到"猫"对应的条目。具体地，给定一个**查询（query）** $q$ 和一组"键-值"对 $(k_i, v_i)$，注意力输出为值的加权和，权重由查询与各键的相似度经 softmax 归一化得到：

$$\text{Attention}(q, K, V) = \sum_{i} \alpha_i v_i, \qquad \alpha_i = \frac{\exp(\text{score}(q, k_i))}{\sum_j \exp(\text{score}(q, k_j))}$$

打分函数常用**加性注意力**（Bahdanau 原论文）与**缩放点积注意力**（Transformer）：$\text{score}(q,k) = q^\top k / \sqrt{d}$（$d$ 为维度，除以 $\sqrt{d}$ 防止点积随维度增大而过大、softmax 进入饱和区）。权重 $\alpha_i$ 的含义是"查询 $q$ 与第 $i$ 个键的匹配程度"——注意力因此可解释为对 $V$ 的软检索。softmax 已在第 3/4 篇学过，此处直接复用。

### 自注意力与多头注意力

**自注意力（self-attention）**：查询、键、值**全部来自输入自身**——每个词都与句内其它词计算相关性，直接建模"词与词的关系"。以"它"为例：自注意力让"它"能直接"看到"句中与它相关的名词（距离多远都行），而不必像 RNN 那样逐步传递。数学上，对输入 $\mathbf{X}$（每行一个词），先经三个可学习矩阵投影得到

$$\mathbf{Q} = \mathbf{X}W^Q,\quad \mathbf{K} = \mathbf{X}W^K,\quad \mathbf{V} = \mathbf{X}W^V$$

再计算

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d_k}}\right)\mathbf{V}$$

**多头注意力（multi-head attention）**：把 $Q,K,V$ 拆成 $h$ 组（多头），每组独立做注意力，最后拼接并线性变换。直觉：每个头可以关注不同的关系类型（语法、指代、语义），类似卷积层用多个核检测多种特征。

**与 RNN 的对比**：自注意力的复杂度为 $O(n^2)$（$n$ 为序列长度，每对词都计算相关），比 RNN 的 $O(n)$ 高，但**所有词对可以并行计算**——GPU 上 $n^2$ 的并行计算常快于 $n$ 步串行；且任意两词之间只有一步"距离"（RNN 需要 $O(\text{距离})$ 步），长程依赖不再衰减。

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
        self.register_buffer('P', P)          # 不参与训练的参数

    def forward(self, X):
        return X + self.P[:, :X.shape[1], :]  # 与词嵌入相加
```

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

    def forward(self, X):                       # X: (批量, 步数)
        emb = self.pos_encoding(self.embedding(X))   # (批量, 步数, 隐藏)
        seq_len = X.shape[1]
        mask = torch.triu(torch.full((seq_len, seq_len), float('-inf')),
                          diagonal=1).to(X.device)    # 上三角掩码：屏蔽未来
        out = self.encoder(emb, mask=mask)
        return self.fc(out)                     # (批量, 步数, 词表)
```

训练循环与 LSTM 实战一致（交叉熵 + 梯度裁剪；Transformer 无隐状态，无需截断），参考输出（100 轮，隐藏 128、2 层、4 头）：

```
Transformer 的困惑度: 约 4.6
```

与 LSTM（约 4.5）相当，但**计算可并行**是 Transformer 取代 RNN 成为现代序列建模基石的真正原因。

---

## 综合实战与收尾

### 模型对比实验

学习结构的价值在于能**公平地比较**：同一数据集、同一评估协议下，"改一个变量"看差异。汇总本文训练过的模型：

| 任务 | 模型 | 测试准确率 / 困惑度（参考值） | 关键差异 |
|---|---|---|---|
| Fashion-MNIST 图像分类 | MLP | 0.845 | 基线 |
| Fashion-MNIST 图像分类 | LeNet | 0.900 | 卷积的局部先验 |
| Fashion-MNIST 图像分类 | 小型 ResNet | 0.925 | 残差连接 |
| CIFAR-10 图像分类 | 小型 ResNet | 0.78~0.82（20 轮）→ 0.92+（增强+长训练） | 数据增强/归一化 |
| 文本（字符级） | RNN | 困惑度约 6.0 | 基线 |
| 文本（字符级） | LSTM | 困惑度约 4.5 | 门控记忆 |
| 文本（字符级） | Transformer | 困惑度约 4.6 | 可并行的自注意力 |



### 经典论文索引与后续路径

本文介绍的每个结构都源自一篇（或一簇）经典论文。以下索引按"解决什么问题 → 关键设计"整理，可作为按图索骥的阅读清单：

| 论文（年份） | 核心贡献 | 本篇章节 |
|---|---|---|
| LeNet-5（LeCun et al., 1998） | 卷积+池化+全连接的 CNN 原型 | "LeNet"一节 |
| AlexNet（Krizhevsky et al., 2012） | ReLU、Dropout、数据增强；深度学习引爆点 | "数据增强"一节（设计思想） |
| VGG（Simonyan & Zisserman, 2014） | 3×3 卷积堆叠与模块化深度 | "残差连接与 ResNet"一节（思想铺垫） |
| BatchNorm（Ioffe & Szegedy, 2015） | 批量归一化稳定训练 | "批量归一化"一节 |
| ResNet（He et al., 2015） | 残差连接使深层可训练 | "残差连接与 ResNet"一节 |
| LSTM（Hochreiter & Schmidhuber, 1997） | 门控与细胞状态保留长程记忆 | "LSTM 与 GRU"一节 |
| 注意力机制（Bahdanau et al., 2015） | 软检索替代信息压缩 | "RNN 的局限与注意力的直觉"一节 |
| Transformer（Vaswani et al., 2017） | 自注意力 + 多头 + 位置编码 | "自注意力与多头注意力"至"实验：小型语言模型" |

读完本文后，读者已经**亲手实现了其中多篇论文的核心结构**（LeNet、ResNet 块、LSTM 用法、Transformer 编码器）。面对一篇新论文，可用的方法完全一样：读懂"要解决的问题"与"关键设计"→ 提取结构与训练配方 → 用 PyTorch 搭出来 → 用对照实验验证设计是否有效。这套流程就是深度学习研究的日常工作；后续若深入现代架构（ViT、BERT、扩散模型等），会发现它们只是"换结构、换数据、换配方"的新一轮循环，方法与本文相同。

---

## 结语

本文用三大部分解析了深度学习三大核心结构：卷积网络以局部连接与权值共享吃透图像的空间结构，循环网络以隐状态与门控驾驭序列的时间结构，Transformer 以自注意力直接建模元素间关系并赢得并行性。三者并非互相取代，而是各擅其长——图像任务首选 CNN（或其现代变体），序列任务正在被 Transformer 主导，而 RNN 家族仍在时间序列等场景发挥作用。理解它们共同的骨架——"层"的抽象 + 残差连接 + 归一化 + 训练技巧的组合——比记住任何单一结构更重要。文中全部示例均为可运行的 PyTorch 代码，建议读者动手运行、修改超参数，亲自观察每处设计带来的差异。
