---
title: 从 Bandits 到 RLHF
date: 2026-10-18 23:00:00
updated: 2026-10-18 23:00:00
categories:
  - 穷理
tags:
  - 深度学习
  - 强化学习
description: 以奖励标量为主线，从多臂老虎机讲到 RLHF，再到语言模型强化学习中的信用分配、PPO/GRPO/GSPO 与评估偏差。
cover: /img/blog15.webp
---

## 序列级奖励与信用分配

语言模型做完一道数学题，验证器返回：

```python
reward = verify(answer, gold)   # 0.0 或 1.0
```

一条上千 token 的回答对应一个标量奖励。策略梯度的更新式为

$$\nabla_\theta J(\theta) = \mathbb{E}\left[\big(r(x,y) - b(x)\big)\sum_{t=1}^{\lvert y\rvert}\nabla_\theta\log\pi_\theta(y_t\mid x,y_{<t})\right].$$

其中 $r(x,y)-b(x)$ 不随 $t$ 变化，第 3 个 token 与第 900 个 token 的系数完全相同。系数共享不表示梯度共享，各位置的梯度由 $\nabla_\theta\log\pi_\theta$ 逐项决定；系数共享的含义是，所有位置的更新方向均来自序列级奖励这一个标量。

奖励为标量，策略需要在长达上千个位置的序列上作出决策。不同算法处理的是不同的失效环节：探索、信用分配、方差、稳定性、离线外推与偏好建模。

## 多臂老虎机

多臂老虎机（multi-armed bandit）是最小规模的强化学习问题。有 $K$ 个臂，每轮选择一个，得到独立奖励，目标是在 $T$ 轮内最大化累计奖励。该设定没有状态，动作不影响下一轮状态，适用于 A/B 测试、广告点击、推荐冷启动与超参数选择等即时反馈场景。

衡量指标为遗憾：

$$\operatorname{Regret}(T) = T\mu^* - \sum_{t=1}^T \mu_{a_t},$$

其中 $\mu^*$ 是最优臂的期望奖励。遗憾越小，探索越有效。

### ε-greedy

最简单的策略是以 $1-\varepsilon$ 的概率选择当前平均奖励最高的臂，以 $\varepsilon$ 的概率随机选择。

其优点是易于实现。缺点是探索分配均匀，会将大量试验用于明显较差的臂，遗憾近似线性增长。

### UCB

UCB 的原则是乐观面对不确定性。对每个臂维护平均奖励 $\hat\mu_a$ 与计数 $N_a$，UCB1 的选择准则为

$$a_t = \arg\max_a \left(\hat\mu_a + \sqrt{\frac{2\ln t}{N_a}}\right).$$

第一项为利用，第二项奖励探索。一个臂被选择的次数越少，不确定性越大，上界越高。UCB 的遗憾为 $O(\log T)$ 量级，效率高于 ε-greedy。

UCB 适用于奖励有界、臂数量不多的场景。其问题是选择过于确定：早期被偶然高估的臂会被反复选择，直到置信区间收窄。

### Thompson Sampling

Thompson Sampling 从贝叶斯角度处理同一问题，为每个臂维护奖励后验。以 Bernoulli 奖励为例，采用 Beta 后验：

$$\theta_a \sim \operatorname{Beta}(\alpha_a, \beta_a).$$

每轮对每个臂采样一个 $\tilde\theta_a$，选择其中最大者；观测到奖励后更新 $\alpha_a$ 或 $\beta_a$。

它同时实现探索与利用：后验方差大的臂会以一定概率采样出高值而被探索，后验均值高的臂被频繁选择。在小规模在线场景中，Thompson Sampling 的实现通常比 UCB 更简单，性能也更好。

多臂老虎机的核心结论是：在无状态设定下，算法只需处理探索与利用的权衡。引入上下文后，问题结构发生变化。

## 上下文老虎机

上下文老虎机每轮先观测上下文 $x$，再选择动作 $a$，得到奖励 $r(x,a)$。动作不改变下一轮的上下文分布。推荐系统、广告排序与新闻推送大多属于该设定。

目标是学习策略 $\pi(a\mid x)$，最大化 $\mathbb{E}_{x\sim\mathcal{D},a\sim\pi}[r(x,a)]$。

### LinUCB

LinUCB 假设每个动作的奖励关于上下文线性：

$$r(x,a) = x^\top \theta_a + \eta.$$

对每个动作维护矩阵 $A_a$ 与向量 $b_a$，岭回归解为

$$\hat\theta_a = A_a^{-1}b_a,$$

选择准则为

$$a_t = \arg\max_a \left(x^\top \hat\theta_a + \alpha \sqrt{x^\top A_a^{-1} x}\right).$$

第二项为置信宽度。LinUCB 计算开销低、可解释，适用于特征维度中等、交互近似线性的场景。

### NeuralUCB

NeuralUCB 将线性均值替换为神经网络。常见做法为：

- 用网络预测 $\mu(x,a;\theta)$；
- 用最后层特征、梯度特征或 ensemble 估计不确定性 $u(x,a)$；
- 选择 $\mu(x,a;\theta) + \alpha u(x,a)$。

它适用于非线性上下文，代价是训练与不确定性估计的开销更高。NeuralUCB 并非单一标准算法，而是一类将神经网络与置信上界相结合的方法。

上下文老虎机与完整强化学习的区别在于不建模长期后果：动作只影响即时奖励，不影响下一状态。大模型的单轮生成与单轮打分更接近上下文老虎机，多轮交互、工具调用与对话策略进入完整强化学习。

## 值函数方法

在完整强化学习中，动作会改变状态，奖励存在延迟。最经典的做法是先学习价值函数。

定义回报

$$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots,$$

动作价值

$$Q^\pi(s,a) = \mathbb{E}_\pi[G_t \mid s_t=s, a_t=a].$$

### Q-learning

Q-learning 是 off-policy 的时序差分控制方法，更新为

$$Q(s,a) \leftarrow Q(s,a) + \alpha\left[r + \gamma \max_{a'} Q(s',a') - Q(s,a)\right].$$

它不需要环境模型，也不要求当前策略选择最优动作。只要每个状态动作对被访问足够多次，Q 表会收敛到最优 $Q^*$。

其局限是：动作离散、状态空间较大时，Q 表不可行。

### DQN

DQN 用神经网络拟合 $Q(s,a;\theta)$，并引入两个关键技巧：

- 经验回放：将 $(s,a,r,s')$ 存入缓冲区并随机采样，消除样本的时间相关性；
- 目标网络：用旧参数 $\theta^-$ 计算目标，稳定训练。

损失为

$$\mathcal{L}(\theta) = \mathbb{E}_{(s,a,r,s')\sim D}\left[\left(r + \gamma \max_{a'} Q(s',a';\theta^-) - Q(s,a;\theta)\right)^2\right].$$

行为策略通常为 ε-greedy。DQN 适用于离散动作，例如 Atari；不适用于连续动作，因为每步需要对 $a'$ 求解 $\max$。Double DQN、Dueling DQN 与优先回放均在此框架上修正偏差并提升效率。

值函数方法通过估计状态动作价值间接确定策略。当动作空间连续或策略需要保持随机性时，直接参数化策略更为合适。

## 策略梯度方法

策略梯度直接参数化 $\pi_\theta(a\mid s)$，优化

$$J(\theta) = \mathbb{E}_{\tau\sim\pi_\theta}[R(\tau)].$$

### REINFORCE

REINFORCE 用蒙特卡洛回报估计梯度：

$$\nabla_\theta J(\theta) = \mathbb{E}_{\tau\sim\pi_\theta}\left[\sum_{t=1}^T \nabla_\theta\log\pi_\theta(a_t\mid s_t) G_t\right].$$

其更新方向由轨迹回报的符号决定：轨迹回报为正时提高该轨迹上各动作的概率，回报为负时降低。

该方法的方差很大。改进方式是减去基线：

$$\nabla_\theta J(\theta) = \mathbb{E}\left[\sum_t \nabla_\theta\log\pi_\theta(a_t\mid s_t)\big(G_t - b(s_t)\big)\right].$$

通常取 $b(s_t)=V(s_t)$，得到优势

$$A_t = G_t - V(s_t).$$

REINFORCE 是 on-policy 方法，必须使用当前策略采样数据，实现简单但样本效率低。

## Actor-Critic 方法

Actor-Critic 由两个部分组成：

- Actor：策略 $\pi_\theta(a\mid s)$，决定动作；
- Critic：价值函数 $V_\phi(s)$ 或 $Q_\phi(s,a)$，用于估计预期回报并降低梯度方差。

### A2C / A3C

A2C 是同步优势 Actor-Critic 方法。多个环境并行采样，用

$$A_t = r_t + \gamma V_\phi(s_{t+1}) - V_\phi(s_t)$$

或 GAE 估计优势，同时更新策略与价值。

A3C 是异步版本，多个线程各自采样并更新。当前工程实践中更常用 A2C、PPO 与分布式 PPO。

### PPO

PPO 是当前最常用的 on-policy 算法之一，也是 RLHF 的默认优化器。策略梯度的更新幅度由步长与优势共同决定；当单次更新幅度过大时，新策略与采样所用旧策略显著偏离，后续更新会失去有效的数据支持。PPO 对此施加约束，限制单次更新的策略变化幅度，可视为 TRPO 信任域约束的一阶近似。

设重要性比率

$$w_t(\theta) = \frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}.$$

PPO 的裁剪目标为

$$\mathcal{J}_{\text{PPO}}(\theta) = \mathbb{E}\left[\min\left(w_t(\theta)\hat A_t,\ \operatorname{clip}(w_t(\theta),1-\varepsilon,1+\varepsilon)\hat A_t\right)\right].$$

当 $\hat A_t>0$ 时，比率超过 $1+\varepsilon$ 后梯度被截断；当 $\hat A_t<0$ 时，比率低于 $1-\varepsilon$ 后梯度被截断。

PPO 通常与 GAE 配合：

$$\hat A_t = \sum_{l=0}^{T-t} (\gamma\lambda)^l \delta_{t+l},\qquad \delta_t = r_t + \gamma V(s_{t+1}) - V(s_t).$$

$\lambda=0$ 为单步时序差分，$\lambda=1$ 退化为回报减基线。

PPO 的优点是训练稳定、实现简单、适用于并行采样。其代价有三项：on-policy 训练导致样本效率较低；裁剪阈值为固定超参数，需按任务调整；裁剪使部分 token 的梯度归零，目标函数随训练推进发生变化。

### SAC

SAC 适用于连续动作，是 off-policy 的最大熵算法。其目标不仅最大化回报，还最大化策略熵：

$$J(\pi) = \sum_t \mathbb{E}\left[r_t + \alpha \mathcal{H}(\pi(\cdot\mid s_t))\right].$$

它用双 Q 网络降低过估计，用重参数化采样使策略可导，并用温度 $\alpha$ 自动平衡探索。SAC 样本效率高，在机器人控制与连续控制任务中表现突出。

算法选择如下：

- 离散动作、样本充足：DQN；
- 连续动作、样本效率重要：SAC；
- 训练稳定、支持并行采样、面向大模型 RL：PPO。

## 离线强化学习

离线强化学习只有固定数据集 $D$，无法与环境交互，医疗、自动驾驶、推荐日志与金融风控均属于此类。其核心困难是分布偏移：策略选择的动作可能不在数据中，Q 函数对这些动作的估计属于外推值，其误差会被优化过程放大。

### BCQ

BCQ 的思路是只从数据支持范围内的动作中选择。它用生成模型（如 VAE）生成与数据相似的动作候选，加入小扰动，再用 Q 网络从中选取最优动作，从而避免查询数据中未出现过的动作。

### CQL

CQL 在 Q 更新中加入保守项，压低非数据动作的 Q 值，保持数据动作的 Q 值：

$$\mathcal{L}_{\text{CQL}} = \alpha \mathbb{E}_{s\sim D, a\sim \mu}[Q(s,a)] - \alpha \mathbb{E}_{s,a\sim D}[Q(s,a)] + \mathcal{L}_{\text{TD}}.$$

从而抑制策略选择数据分布之外被高估的动作。CQL 实现简单且有效，是离线强化学习的常用基线。

### IQL

IQL 不显式查询 OOD 动作。它用 expectile 回归拟合 $V(s)$，再计算

$$A(s,a) = Q(s,a) - V(s),$$

然后用 AWR 或类似方法提取策略。由于策略改进只依赖数据内动作的相对优势，它避开了对 OOD 动作的 Q 查询。

离线强化学习的共同点是：算法必须对数据未覆盖区域保持保守。在线强化学习可以试错，离线强化学习不能。

## 模仿学习

模仿学习假设存在专家轨迹，但奖励未知或难以定义。

### Behavior Cloning

Behavior Cloning 直接建立状态到动作的映射，以监督学习方式训练：

$$\min_\theta \mathbb{E}_{(s,a)\sim D_{\text{专家}}}\left[-\log\pi_\theta(a\mid s)\right].$$

它适用于专家数据充足、状态分布覆盖充分的场景。其问题是复合误差：策略一旦偏离专家状态，就会进入训练未覆盖的状态，误差随之累积。

### GAIL

GAIL 用对抗方式学习策略。判别器 $D$ 区分专家轨迹与策略轨迹，策略的目标是降低判别器对两类轨迹的区分能力：

$$\min_\pi \max_D \mathbb{E}_{\pi}[\log D(s,a)] + \mathbb{E}_{\pi_E}[\log(1-D(s,a))].$$

策略的奖励可以取 $-\log(1-D(s,a))$。GAIL 不需要显式奖励函数，适用于奖励难以定义但可获得专家轨迹的场景，代价是训练不稳定且需要大量交互。

模仿学习与离线强化学习的区别是：模仿学习通常假设数据来自专家，离线强化学习的数据可来自任意行为策略，且带有奖励。

## 人类偏好对齐：RLHF

RLHF 是大模型对齐中最常被提及的技术路线，它将人类偏好转化为可优化的奖励信号，再用强化学习优化语言模型。

步骤通常为：

1. 用 SFT 数据训练初始策略 $\pi_{\text{SFT}}$；
2. 对同一 prompt 采样多个回答，由人工标注偏好对 $y_w \succ y_l$；
3. 训练奖励模型 $r_\phi$，偏好概率建模为

$$P(y_w \succ y_l \mid x) = \sigma(r_\phi(x,y_w) - r_\phi(x,y_l));$$

4. 用 PPO 等算法优化策略，同时加入 KL 约束：

$$\max_\theta \mathbb{E}_{x,y\sim\pi_\theta}\left[r_\phi(x,y) - \beta D_{\mathrm{KL}}(\pi_\theta(\cdot\mid x)\|\pi_{\text{ref}}(\cdot\mid x))\right].$$

KL 项有三层作用：

- 限制奖励模型的外推范围；
- 为奖励零点提供锚点；
- 防止策略退化为少数高奖励点上的点质量分布。

RLHF 与普通强化学习的差别包括：

- 动作空间为词表，序列长度很大；
- 奖励通常只在序列末尾给出一个标量；
- 奖励模型是学习得到的，可被优化压力利用；
- 策略模型、参考模型、奖励模型与价值模型可能同时占用显存。

DPO 等后续方法绕开显式奖励模型与 PPO，但 RLHF 仍是理解大模型强化学习的基础。

## 语言模型强化学习的信用分配

语言模型强化学习的奖励为序列级标量，PPO、GRPO、GSPO 处理的是同一问题：该标量信号如何分配到序列中的各个 token。

### 信用分配中的反事实数据缺失

要将奖励分配到位置 $t$，需要

$$A_t = \text{在位置 } t \text{ 选取该 token 而非其他 token，对最终奖励所产生的差异}.$$

该量要求反事实：位置 $t$ 在选中与未选中两种情况下的结果之差。实际数据中位置 $t$ 只被采样一次。

需要区分三种性质不同的困难：

- 奖励稀疏：信号出现次数少，可通过增加采样缓解；
- 判据有噪声：信号不准确，可通过改进验证器缓解；
- 贡献不可观测：缺失的是反事实分支，采样量再大，位置 $t$ 也只有一条实现。

在仅使用末端二值判据、且不引入额外先验信息的条件下，位置级信用分配不存在无偏估计。现有分配方案均隐含先验假设：均匀分配、价值函数差分，或人工步骤标注。过程奖励的效用来自它部分提供了缺失的反事实信息，代价是标注的主观性以及标注者一致性的下降。

### PPO 的 token 级裁剪

PPO 在语言模型中的目标通常写作：

$$\mathcal{J}_{\mathrm{PPO}}(\theta) = \mathbb{E}\left[\frac{1}{\lvert y\rvert}\sum_{t=1}^{\lvert y\rvert}\min\left(w_t(\theta)\hat A_t,\ \operatorname{clip}(w_t(\theta),1-\varepsilon,1+\varepsilon)\hat A_t\right)\right],$$

其中

$$w_t = \frac{\pi_\theta(y_t\mid x,y_{<t})}{\pi_{\theta_{\text{old}}}(y_t\mid x,y_{<t})}.$$

问题在于：裁剪逐 token 生效，而 $\hat A_t$ 通常由整条序列共享。同一条回答中，部分 token 已越过边界、梯度为零，另一部分仍在贡献梯度。整条序列的更新方向由这些不完整的项组合而成，被裁剪的 token 取决于当前参数所在位置。

该现象并非实现缺陷，而是设计本身的结果。它带来两个后果：多轮小批量更新下目标非平稳；策略偏离旧策略越远，被裁剪的 token 越多，有效梯度越不完整。

### GRPO：移除价值模型

PPO 需要优势 $\hat A_t$，通常由价值模型给出。价值模型与策略规模相当，训练成本接近翻倍。其困难还在于待拟合目标的性质：在仅提供二值奖励的任务上，从当前前缀出发最终能否成功近似为指示函数，相邻前缀仅相差一个 token，输入高度相似而目标不同。

GRPO 用同一道题下多条回答的相对表现确定优势：

$$\hat A_i = \frac{r(x,y_i) - \operatorname{mean}(\{r(x,y_i)\}_{i=1}^G)}{\operatorname{std}(\{r(x,y_i)\}_{i=1}^G)},\qquad \hat A_{i,t}=\hat A_i.$$

跨题目比较均值没有意义：一道难题与一道简单题都得 0 分，无法说明模型表现相同。组内归一化将每道题限制在自身的坐标系内，只比较同一道题的多条尝试。

代价有三处：

- $\mathbb{E}[\hat A_i]\ne 0$，因为 $y_i$ 同时出现在分子与分母的标准差中。该偏差与 $1/G$ 同阶，$G$ 取 8 至 64 时很小，当 $G$ 取值较小以减少采样量时会上升；
- 每道题采样 $G$ 条，采样量乘以 $G$；
- 一组全部正确或全部错误时标准差为零，优势无定义，通常整组丢弃。被丢弃的恰好是已经掌握与超出当前能力两类样本。

### GSPO：序列级重要性比率与裁剪

GRPO 的重要性比率仍定义在每个 token 上：

$$\mathcal{J}_{\mathrm{GRPO}}(\theta) = \mathbb{E}\left[\frac{1}{G}\sum_{i=1}^G\frac{1}{\lvert y_i\rvert}\sum_{t=1}^{\lvert y_i\rvert}\min\left(w_{i,t}(\theta)\hat A_{i,t},\ \operatorname{clip}(w_{i,t}(\theta),1-\varepsilon,1+\varepsilon)\hat A_{i,t}\right)\right].$$

重要性采样恒等式

$$\mathbb{E}_{z\sim\pi_{\text{tar}}}[f(z)] = \mathbb{E}_{z\sim\pi_{\text{beh}}}\left[\frac{\pi_{\text{tar}}(z)}{\pi_{\text{beh}}(z)}f(z)\right]$$

成立的前提是右侧对行为分布取多个样本求平均。$w_{i,t}$ 使用的是位置 $t$ 上实际采出的单个 token，每个位置的下一个 token 分布只被抽样一次。用单个样本纠正分布错配无法起到纠正作用，剩余的只是不确定性。

GSPO 将比率提升到序列级：

$$s_i(\theta) = \left(\frac{\pi_\theta(y_i\mid x)}{\pi_{\theta_{\text{old}}}(y_i\mid x)}\right)^{\frac{1}{\lvert y_i\rvert}} = \exp\left(\frac{1}{\lvert y_i\rvert}\sum_{t=1}^{\lvert y_i\rvert}\log\frac{\pi_\theta(y_{i,t}\mid x,y_{i,<t})}{\pi_{\theta_{\text{old}}}(y_{i,t}\mid x,y_{i,<t})}\right).$$

目标变为

$$\mathcal{J}_{\mathrm{GSPO}}(\theta) = \mathbb{E}\left[\frac{1}{G}\sum_{i=1}^G \min\left(s_i(\theta)\hat A_i,\ \operatorname{clip}(s_i(\theta),1-\varepsilon,1+\varepsilon)\hat A_i\right)\right].$$

$1/\lvert y_i\rvert$ 次幂的作用如下。序列似然比是 $|y|$ 个近似为 1 的因子之积，偏离 1 的程度随长度放大：若每个 token 的比率平均为 1.001，1000 个 token 时为 $1.001^{1000}\approx 2.7$；平均为 0.999 时降至 0.37。取长度次方根将尺度拉回可比区间，使不同长度的回答处于同一尺度。

GSPO 与 GRPO 的梯度差异仅有一处。略去裁剪，GSPO 为

$$\nabla_\theta \mathcal{J}_{\mathrm{GSPO}} = \mathbb{E}\left[\frac{1}{G}\sum_{i=1}^G s_i(\theta)\hat A_i \cdot \frac{1}{\lvert y_i\rvert}\sum_{t=1}^{\lvert y_i\rvert}\nabla_\theta\log\pi_\theta(y_{i,t}\mid x,y_{i,<t})\right],$$

GRPO 为

$$\nabla_\theta \mathcal{J}_{\mathrm{GRPO}} = \mathbb{E}\left[\frac{1}{G}\sum_{i=1}^G \hat A_i \cdot \frac{1}{\lvert y_i\rvert}\sum_{t=1}^{\lvert y_i\rvert} w_{i,t}\nabla_\theta\log\pi_\theta(y_{i,t}\mid x,y_{i,<t})\right].$$

GSPO 将序列级 $s_i$ 提到内层求和之外，一条回答内所有 token 共享同一系数；GRPO 将 $w_{i,t}$ 保留在求和之内，逐 token 不同。奖励是序列级的量，$s_i$ 也是序列级的量，二者相乘后平均分配到各 token。目标函数的单位与修正项的单位对齐后，梯度中的权重不再随位置波动。

需要注意：$s_i$ 是逐 token 比率的几何平均，而 off-policy 期望纠正要求的是这些比率的乘积。两者在 $s_i=1$ 时重合，偏离 1 时分离。因此该方法更接近对整条回答施加统一缩放并将缩放限制在受控范围内，而非精确的期望纠正。

裁剪范围同样不通用。GSPO 与 GRPO 的裁剪范围通常相差一个数量级，因为 $s_i$ 是长度归一化后的量，取值范围比未归一化的逐 token 比率窄。将 GRPO 的 $\varepsilon$ 直接用于 GSPO，相当于更换尺度后仍沿用旧刻度。

GSPO 还有一个保留细粒度优势的变体：

$$s_{i,t}(\theta) = \operatorname{sg}[s_i(\theta)]\cdot\frac{\pi_\theta(y_{i,t}\mid x,y_{i,<t})}{\operatorname{sg}[\pi_\theta(y_{i,t}\mid x,y_{i,<t})]},$$

其中 $\operatorname{sg}[\cdot]$ 表示取数值但停止梯度。第一项提供序列级公共因子且不参与求导，第二项携带逐位置信息。该写法可推广为：当一个量需要在两个层级同时起作用时，使其在一个层级提供数值、在另一个层级提供梯度，并用 stop-gradient 隔断两者的相互影响。

### 信用分配的粒度

前述分析隐含一个前提：token 是奖励分配的合适单位。该前提并不成立。

在推理链中，对应一个决策的通常是一段 token。一次代数变形可能写成八十个 token，一个条件判断可能只有五个。按 token 分配等于假设贡献可以逐个位置拆分，而实际贡献的单位是语义步骤。

该问题的严重性在于：即使逐 token 贡献能够被精确估计，所估计的也不是语义步骤层面的贡献。在包含八十个 token 的变形步骤中，每个 token 分到的贡献都很小，而该步骤整体可能是整条链中关键程度最高的部分，逐 token 分配会将其稀释到八十个位置上。

改变分配单位需要先确定步骤边界，而步骤边界没有唯一标准：同一段推理按每行一个等式划分与按每个论证环节划分，步骤数可以相差数倍。步骤定义一旦变化，辅助监督的目标、奖励的分段与优势的分配都会随之改变。

### 过程奖励与验证器

过程奖励部分提供了缺失的反事实信息：标注者对该步骤的正确性作出判断，等价于引入了步骤级替换的部分反事实信息。这部分信息是优化算法自身无法获得的。

代价来自同一来源。步骤级判断在答案可判定的任务上没有等价物，它依赖领域判断，标准不统一，标注者之间的一致性明显低于答案正确性这类二值判断。引入步骤级监督的同时引入了标注噪声，二者来源相同，不可分离。

因此过程奖励的适用条件如下：任务需要具有相对公认的步骤级判据，且标注一致性可以被测量。在该条件之外，其密度优势会被噪声抵消。与答案判错不同，该噪声不会立即反映在训练指标上，因而更难以察觉。

奖励模型与可验证判据的失效方式也不同：

- 奖励模型处处可微，策略会沿其梯度方向更新，其中的不一致会被优化过程放大；通过独立评测与 KL 约束监控；
- 可验证判据给出离散信号，对优化压力具有天然鲁棒性；但它只奖励其定义覆盖的部分，通过扩大覆盖面监控。

### 评估中的偏差来源

**长度偏差。** 当奖励由偏好数据训练得到时，标注者对长度的偏好会进入奖励。即使只是轻微偏好更长或更短的输出，策略也会朝该方向优化。可验证判据下也存在相近通道：如果更长更细的回答命中率确实更高，优化压力会倾向于拉长输出。

其后果是不同方法之间的比较失真。两个方法的准确率相差 2 个百分点，若其中一个输出平均长 30%，这 2 个百分点中来自推理方式改变与来自输出更长的比例无法从准确率单指标中分离。报告准确率时必须同时给出长度分布。

**方差归一化的位置。** 组内归一化按标准差缩放优势，而标准差由有限样本估计。$G=8$ 时标准差估计本身存在约 25% 量级的波动，该波动会进入优势尺度，影响不同批次之间的有效步长。批内归一化不受该问题影响，但会损失题内相对比较的强度。

**阶段式训练中会漂移的量。** 将训练划分为监督预热、路由预热与端到端优化等阶段时，预热阶段由监督信号塑形的中间表示可能在阶段切换后发生变化。以控制信号为例：预热阶段它被训练为表达当前步骤的语义信息；进入端到端阶段后目标变为最大化回报，若重建类监督的权重很小，控制信号可以向任何提高回报的方向变化，包括放弃其原本承载的语义。它仍能提高回报，但不再控制任何可解释的量。

处理方式有两种：保留一个弱权重的语义约束项，或冻结提供该输入的模块。两种做法都需要在训练开始前写入方案，因为判断是否发生漂移本身需要一个未被漂移的参照。

**证据标准。** 表示聚类结果良好、线性探针能够预测标签、将某个变量置零导致性能下降，这些都不构成因果证据。它们都会产生符合预期结论的结果，且在损失曲线上不产生异常。有效的方法是受控替换：固定其余变量，只改变待检验的变量。困难在于固定其余变量往往无法实现。一个范围更窄但确定的做法是打乱控制信号与步骤的对应关系：保留边际分布，破坏时序结构。该检验针对的是控制信号是否携带时序信息。

