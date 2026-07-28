---
title: 基于8086的流水灯控制器
date: 2026-07-28 23:00:00
updated: 2026-07-28 23:00:00
categories:
  - 履践
tags:
  - Assembly
  - Proteus
  - 微机原理
description: 一个基于8086与8255A的简易流水灯控制器设计，介绍了其硬件架构与算法实现
cover: /img/blog2.webp
---

## 前言
该项目为本人微机原理与接口技术课程设计，旨在完成一个基于8086的简易流水灯控制器设计。项目以8255A可编程并行接口为核心扩展IO资源，在Proteus仿真环境下实现了8种独立流水动画、9级速度调节、自动轮播、暂停/恢复、数码管档位显示及上电自检等功能。

## 系统硬件架构
### 总体拓扑
系统采用8086最小模式作为控制核心，通过74LS373地址锁存器分离地址/数据复用总线，经74LS138译码器生成外设片选信号，最终由8255A扩展出24路可编程IO，驱动LED阵列、按键矩阵及数码管显示模块。
| 器件      | 功能定义                          |
| ------- | ----------------------------- |
| 8086    | 运算控制核心，执行汇编控制逻辑，完成IO端口读写与状态调度 |
| 74LS373 | 锁存AD0~AD7低8位地址，实现地址与数据总线分离    |
| 74LS138 | 3-8地址译码，生成8255A片选信号，划定IO地址区间  |
| 8255A   | 可编程并行IO扩展，实现多路输入输出资源复用        |
| 74LS247 | BCD转七段数码管译码，驱动共阳极数码管显示速度档位    |

![Proteus仿真图](/img/blog2.1.webp "Proteus仿真图")

### 地址译码与端口映射
74LS138译码逻辑将8255A映射至IO地址空间60H~66H。译码器输入端C、B、A分别接锁存地址LA7、LA6、LA5，选通端E1接VCC持续使能，E2接LA4，E3接CPU的M/IO引脚。仅当CPU执行IO访问且地址高4位为0110时，Y3输出低电平选中8255A。
8255A内部端口地址分配如下（A2接8255A的A1，A1接8255A的A0）：
| 端口 | 地址 | 传输方向 | 外设负载 |
|------|------|---------|---------|
| PA | 60H | 输出 | 8位LED阵列（共阳极，输出0点亮） |
| PB | 62H | 输入 | 模式选择按键K1~K8 |
| PC | 64H | 混合IO | 高四位输出(数码管BCD)；低四位输入(控制按键) |
| 控制寄存器 | 66H | 只写 | 8255A工作模式配置 |

### 8255A控制字配置
8255A工作于方式0（基本输入输出），控制字配置为83H（1000 0011B），逐位定义如下：
D7=1：方式设置标志位，固定为1
D6D5=00：A组工作于方式0
D4=0：PA口定义为输出（驱动LED）
D3=0：PC高四位定义为输出（驱动数码管BCD输入）
D2=0：B组工作于方式0
D1=1：PB口定义为输入（读取模式按键）
D0=1：PC低四位定义为输入（读取控制按键）
方式0支持端口的无条件读写，无需握手信号。PA口作为输出口，CPU执行OUT指令即可将数据锁存至PA口输出寄存器并驱动LED。PB口和PC低4位作为输入口，CPU执行IN指令即可读取引脚当前电平状态。PC口高4位与低4位独立配置方向，实现了端口C的位拆分使用，在不额外占用IO资源的情况下同时支持数码管显示和按键输入。

## 核心算法设计
### 数据段与主程序
为保证代码完整性，先列出数据段关键变量与常量定义：
```x86asm
DATA SEGMENT
    CUR_MODE    DB  1   ; 当前模式编号
    STEP_IDX    DB  0   ; 当前帧在图案表中的索引
    CYC_CNT     DB  0   ; 当前模式已完成周期数
    SPEED_IDX   DB  5   ; 当前速度档位
    AUTO_ON     DB  0   ; 自动轮播开关
    NEW_MODE    DB  1   ; 模式切换标志
    KEY_HELD    DB  0   ; 模式键按住标志
    KEY_MASK    DB  0   ; 当前被按住模式键的位掩码
    PC0_LAST    DB  1   ; PC0上一状态
    PC1_LAST    DB  1   ; PC1上一状态
    PC2_LAST    DB  1   ; PC2上一状态
    PC3_LAST    DB  1   ; PC3上一状态
    PAUSE_FLAG  DB  0   ; 暂停标志 (0=运行, 1=暂停)
DATA ENDS
```
以及主循环状态机：
```x86asm
MAIN:
    CMP NEW_MODE, 1     ; 检查模式切换标志
    JNE SKIP_RST
    MOV NEW_MODE, 0     ; 清除标志
    MOV STEP_IDX, 0     ; 帧索引归零
    MOV CYC_CNT, 0      ; 周期计数归零
    
SKIP_RST:
    CALL KEY_MODE       ; 扫描PB口模式按键
    CALL DO_M1          ; 尝试模式1
    CMP CUR_MODE, 1
    JE STEP_DONE
    CALL DO_M2          ; 尝试模式2
    CMP CUR_MODE, 2
    JE STEP_DONE
    ; 依次尝试DO_M3~DO_M8
    
STEP_DONE:
    CMP AUTO_ON, 1      ; 检查轮播开关
    JNE MAIN
    CALL ROTATE
    JMP MAIN
```

### 流水灯图案表定义
系统共实现8组独立流水动画，每组动画的帧序列以字节表形式存储在代码段（CODE SEGMENT）中。LED采用共阳极接法，公共端接VCC，阴极接8255A PA口，因此输出0点亮，输出1熄灭。
| 模式编号 | 流动逻辑 | 帧长度 | 帧数据(十六进制) |
|---------|--------|-------|-----------------|
| M1 顺向单灯 | 单灯从最低位向高位移动 | 8 | FE,FD,FB,F7,EF,DF,BF,7F |
| M2 逆向单灯 | 单灯从最高位向低位移动 | 8 | 7F,BF,DF,EF,F7,FB,FD,FE |
| M3 收拢双灯 | 两侧灯向中间汇聚 | 4 | 7E,BD,DB,E7 |
| M4 扩散双灯 | 中间灯向两侧散开 | 4 | E7,DB,BD,7E |
| M5 累加全亮 | 由低位至高位逐灯点亮 | 9 | 7F,3F,1F,0F,07,03,01,00,FF |
| M6 递减熄灭 | 由高位至低位逐灯熄灭 | 9 | 01,03,07,0F,1F,3F,7F,FF,00 |
| M7 跳跃隔灯 | 间隔位跳跃点亮 | 8 | FE,FB,EF,BF,FD,F7,DF,7F |
| M8 往返流动 | 单向流动后折返 | 14 | FE,FD,FB,F7,EF,DF,BF,7F,BF,DF,EF,F7,FB,FD |

### 统一帧输出算法 DO_OUT
统一封装画面刷新逻辑，所有流水模式复用该子程序：
```x86asm
DO_OUT:
    PUSH AX
    PUSH BX
    ; 读取当前帧偏移，定位图案表数据
    MOV BL, STEP_IDX
    MOV BH, 0
    ADD SI, BX
    MOV AL, CS:[SI]
    OUT 60H, AL             ; 输出至PA口驱动LED
    INC STEP_IDX
    ; 获取当前模式总帧数，判定是否单周期结束
    MOV AL, CUR_MODE
    CALL GET_LEN
    CMP STEP_IDX, AL
    JB DO_DLY
    MOV STEP_IDX, 0
    INC CYC_CNT             ; 周期计数+1，用于自动轮播判定
DO_DLY:
    CALL SPD_DELAY          ; 变速延时，同步扫描控制按键
    POP BX
    POP AX
    RET
```

### 模式帧长度查询算法 GET_LEN
各模式帧长度不同（4/8/9/14帧），系统通过GET_LEN子程序根据当前模式编号返回对应图案表长度，供帧边界判定使用：
```x86asm
GET_LEN PROC NEAR
    CMP AL, 1
    JNE L2
    MOV AL, 8           ; M1: 8帧
    RET
L2: CMP AL, 2
    JNE L3
    MOV AL, 8           ; M2: 8帧
    RET
    ; L3~L8略
GET_LEN ENDP
```

### 按键检测算法
#### PB口模式按键（锁存释放检测）
K1~K8为模式切换按键，需求为"按一次切换一次，按住不动不连续触发"。采用按下锁定 + 等待特定键释放策略：
```x86asm
KEY_MODE PROC NEAR
    PUSH AX
    PUSH DX
    CMP KEY_HELD, 1     ; 检查是否有按键正处于按住状态
    JE KM_WAIT          ; 是→跳转至等待释放逻辑
    
    IN AL, 62H          ; 读取PB口状态
    CMP AL, 0FFH
    JE KM_DONE
    
    MOV KEY_HELD, 1     ; 有键按下，置全局按住标志
    TEST AL, 01H
    JZ KM1              ; PB0按下→模式1
    TEST AL, 02H
    JZ KM2              ; PB1按下→模式2
    ; 依次检测PB2~PB7
    MOV KEY_HELD, 0     ; 无匹配，清除标志
    JMP KM_DONE
    
KM1:MOV CUR_MODE, 1
    MOV KEY_MASK, 01H   ; 记录该键位掩码，用于释放检测
    JMP KM_OK
    ; KM2~KM8 类似，分别设置CUR_MODE为2~8，KEY_MASK为对应位
    
KM_OK:
    MOV NEW_MODE, 1     ; 置位模式切换标志，通知主循环重置状态
    MOV AUTO_ON, 0
    JMP KM_DONE
    
KM_WAIT:                ; 等待之前按下的特定键释放
    IN AL, 62H
    TEST AL, KEY_MASK   ; 检测该键对应位是否恢复高电平
    JZ KM_DONE
    MOV KEY_HELD, 0
    
KM_DONE:
    POP DX
    POP AX
    RET
KEY_MODE ENDP
```

#### PC口控制按键（下降沿边沿检测）
速度调节、暂停、自动轮播按键采用边沿触发，仅按下瞬间执行一次逻辑，避免速度连续跳变或暂停状态疯狂翻转：
```x86asm
CHK_PC PROC NEAR
    PUSH AX
    IN AL, 64H          ; 读取PC口状态
    
    ; --- PC0: 轮播开关 ---
    MOV AH, AL
    AND AH, 01H         ; 隔离bit0
    CMP AH, PC0_LAST    ; 与上一状态比较
    JE CHK_PC1          ; 状态未变，跳过
    MOV PC0_LAST, AH    ; 更新状态记录
    CMP AH, 0
    JNE CHK_PC1         ; 是释放沿，非按下沿，忽略
    XOR AUTO_ON, 1      ; 翻转轮播开关（0↔1）
    CMP AUTO_ON, 1
    JNE CHK_PC1
    MOV CYC_CNT, 0      ; 开启轮播时清零周期计数
    
    ; --- PC1: 加速 ---
CHK_PC1:
    MOV AH, AL
    AND AH, 02H         ; 隔离bit1
    CMP AH, PC1_LAST
    JE CHK_PC2
    MOV PC1_LAST, AH
    CMP AH, 0
    JNE CHK_PC2         ; 非按下沿
    CMP SPEED_IDX, 9
    JAE CHK_PC2         ; 已达最快速度
    INC SPEED_IDX       ; 速度档位+1
    CALL SHOW_SPEED     ; 实时刷新数码管显示
    
    ; --- PC2: 减速 ---
CHK_PC2:
    MOV AH, AL
    AND AH, 04H         ; 隔离bit2
    CMP AH, PC2_LAST
    JE CHK_PC3
    MOV PC2_LAST, AH
    CMP AH, 0
    JNE CHK_PC3
    CMP SPEED_IDX, 1
    JBE CHK_PC3         ; 已达最慢速度
    DEC SPEED_IDX       ; 速度档位-1
    CALL SHOW_SPEED     ; 实时刷新数码管显示
    
    ; --- PC3: 暂停/继续 ---
CHK_PC3:
    MOV AH, AL
    AND AH, 08H         ; 隔离bit3
    CMP AH, PC3_LAST
    JE CHK_DONE
    MOV PC3_LAST, AH
    CMP AH, 0
    JNE CHK_DONE        ; 非按下沿，忽略
    XOR PAUSE_FLAG, 1   ; 翻转暂停标志
    
CHK_DONE:
    POP AX
    RET
CHK_PC ENDP
```

### 9级软件变速延时算法
系统不依赖硬件定时器，由CPU 5MHz的频率，采用固定约50ms基础延时嵌套循环实现分级调速，基础延时单元：
```x86asm
DLY_50MS PROC NEAR
    PUSH CX
    MOV CX, 3000H       ; 循环计数初值12288
D50:NOP                 ; 空操作微调时序
    LOOP D50            ; CX←CX-1，CX≠0则跳转
    POP CX
    RET
```
变速通过嵌套不同次数的基延时实现。SPEED_IDX取值1~9，对应嵌套次数如下：
| 档位 | 嵌套次数 | 总延时        | 档位 | 嵌套次数 | 总延时    |
| -- | ---- | ---------- | -- | ---- | ------ |
| 1  | 16   | ~800ms     | 6  | 6    | ~300ms |
| 2  | 14   | ~700ms     | 7  | 4    | ~200ms |
| 3  | 12   | ~600ms     | 8  | 2    | ~100ms |
| 4  | 10   | ~500ms     | 9  | 1    | ~50ms  |
| 5  | 8    | ~400ms（默认） |    |      |        |

```x86asm
SPD_DELAY PROC NEAR
    PUSH AX
    PUSH BX
    CMP PAUSE_FLAG, 1   ; 检查暂停标志
    JNE SP_NORM
    
SP_PS_LP:               ; 暂停空转循环
    CALL DLY_50MS
    CALL CHK_PC         ; 暂停期间仍扫描控制按键
    CMP PAUSE_FLAG, 1
    JE SP_PS_LP         ; 持续暂停，冻结动画但不冻结交互
    
SP_NORM:
    MOV AL, SPEED_IDX
    CMP AL, 1
    JNE SP2
    MOV BL, 16
    JMP SP_GO
SP2:CMP AL, 2
    JNE SP3
    MOV BL, 14
    JMP SP_GO
    ; SP3~SP9 类似，BL分别加载12,10,8,6,4,2,1
    
SP_GO:
SP_LP:
    CALL DLY_50MS       ; 执行一次50ms基延时
    CALL CHK_PC         ; 每50ms扫描一次控制按键
    DEC BL              ; 嵌套计数-1
    JNZ SP_LP           ; 未归零则继续
    
    POP BX
    POP AX
    RET
SPD_DELAY ENDP
```

### 自动轮播调度算法
全局标记AUTO_ON开启自动切换，单模式完整运行3个周期后切换下一模式：
```x86asm
ROTATE PROC NEAR
    PUSH AX
    CMP CYC_CNT, 3      ; 检查是否已完成3个完整周期
    JB RT_DONE          ; 不足3周期，维持当前模式
    INC CUR_MODE        ; 满3周期，切换至下一模式
    CMP CUR_MODE, 9     ; 检查是否超出模式8
    JB RT_OK
    MOV CUR_MODE, 1     ; 超出则回绕至模式1
    
RT_OK:
    MOV NEW_MODE, 1     ; 置位模式重置标志
    MOV CYC_CNT, 0      ; 周期计数归零
    
RT_DONE:
    POP AX
    RET
ROTATE ENDP
```

### 数码管速度档位输出算法
利用PC口高低4位分离特性，仅修改高4位BCD输出，不影响低4位按键输入读取：
```x86asm
SHOW_SPEED PROC NEAR
    PUSH AX
    MOV AL, SPEED_IDX
    MOV CL,4
    SHL AL,CL               ; 档位数据左移4位至PC4~PC7
    OUT 64H,AL
    POP AX
    RET
```

### 上电自检初始化逻辑
系统上电完成8255A配置后执行自检流程，验证8路LED及驱动电路是否正常工作：
```x86asm
    MOV AL, 00H
    OUT 60H, AL         ; 共阳极：00H=全部LED点亮
    MOV AL, 8
    CALL DLY_N          ; 延时400ms
    
    MOV AL, 0FFH
    OUT 60H, AL         ; 共阳极：FFH=全部LED熄灭
    MOV AL, 4
    CALL DLY_N          ; 延时200ms
    
    CALL SHOW_SPEED     ; 数码管显示默认速度档位5
```

## 结语
以上便是设计的基本说明。项目虽然简单，但碍于资源贫瘠和经验缺乏，在一开始也给我带来了诸多困难，幸得一一解决。特此记录。

---

> The moonlight was a little spoiled. But it was summer in Idle Valley and summer is never quite spoiled.