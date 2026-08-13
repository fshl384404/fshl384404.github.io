---
title: I use Arch BTW
date: 2026-08-08 23:00:00
updated: 2026-08-08 23:00:00
categories:
  - 拾遗
tags:
  - Linux
  - Debian
  - 虚拟机
  - 操作系统
description: 面向零基础者的Arch Linux虚拟机安装详细教程，附赠Debian Linux虚拟机安装教程。
cover: /img/blog4.webp
---

## 前言

Linux​ 是一套免费、开源的类 Unix 操作系统内核（Kernel），由 Linus Torvalds 于 1991 年首次发布。我们通常所说的 "Linux系统" 实际上是指Linux 内核 + GNU 工具链 + 图形界面及应用软件的完整操作系统（通常称为 GNU/Linux）。它凭借稳定、安全、开源和高度可定制的特性，成为服务器、云计算、超级计算机乃至安卓手机的核心基石。

由于 Linux 内核本身只是一个裸内核，普通用户无法直接安装使用，因此不同的社区或商业公司会将内核与各种软件包、包管理器、桌面环境打包在一起，形成了不同的 **Linux 发行版（Distro）**。不同版本在稳定性、易用性、更新策略及适用场景上差异明显，面向的受众各不相同。主流 Linux 发行版按衍生关系分类如下：

| 发行版系 | 包格式 | 包管理器 | 特点 | 代表 |
|---------|--------|---------|------|------|
| Debian 系 | .deb | apt / dpkg | 社区庞大、软件兼容性极佳、文档丰富 | Ubuntu / Debian / Linux Mint |
| Red Hat 系 | .rpm | dnf / yum | 广泛用于金融、政府等关键业务系统 | RHEL / CentOS Stream / Fedora |
| Arch 系 | - | pacman | 滚动更新、软件最新、高度可定制 | Arch Linux / Manjaro |
| SUSE 系 | .rpm | zypper | YaST 配置管理工具强大、企业级支持好 | openSUSE / SLES |

而我们接下来主要讨论的 Arch Linux 是一个独立开发的、x86-64 通用 GNU/Linux 发行版，遵循KISS（Keep It Simple, Stupid）原则。它简约、现代、务实、通用、用户友好，但相对其它发行版来说有一定的上手门槛。传统的手动安装方式需要你亲手配置分区表、挂载点、引导加载器、网络、时区、用户账户……没有一键勾选，没有默认跳过。但也正因如此，走完一次安装流程的人，对 Linux 的理解会深入一个层次。不过别担心——现在有了`archinstall`这个官方引导式安装工具，Arch 的安装门槛已经大幅降低，现在我们可以仅通过简单设置就完成 Arch Linux 的安装。虽然“逃课”并不好，但它确实可以让新用户避免许多低级错误，快速装好一个完整可用的 Arch。如果你确实愿意尝试手动安装，可参考[ArchWiki官方安装指南](https://wiki.archlinuxcn.org/wiki/%E5%AE%89%E8%A3%85%E6%8C%87%E5%8D%97)。

但或许你只是想尝试性地探索学习，不打算放弃正在使用的 Windows 或 macOS，担心某些错误会对你的电脑带来灾难性的后果，且不愿意装双系统，那么虚拟机正是你现阶段的最佳选择。**虚拟机（Virtual Machine，VM）** 是一种通过软件模拟实现的、具备完整硬件系统功能的计算机系统，它在隔离环境中运行，逻辑上与物理机完全等价。简单来说，就是让你在一台物理电脑上"虚拟"出另一台或多台独立的电脑。Oracle VM VirtualBox 和 VMware Workstation Pro 是我们常用的创建和管理虚拟机，运行不同的操作系统和应用程序的软件。诚然，WSL (Windows Subsystem for Linux)​ 的出现打破了操作系统壁垒，允许 Windows 10/11 用户在不需要虚拟机的情况下，直接运行完整的 Linux 命令行环境。但对于想拥有完整 Linux 体验的使用者，虚拟机仍不可替代。

这篇教程会带你从零开始，在VMware虚拟机中搭建一个完整的Arch Linux系统。并且在文章最后的部分，也介绍了Debian Linux的系统安装。要注意的是，此教程仅根据作者使用经验，对于下文中不明确或与实际不符的地方，可通过查阅ArchWiki、参考其它教程或询问AI确认后再执行。

---

## 第一部分：前置准备

### 下载和安装VMware

我们将使用VMware Workstation Pro来完成后续操作（如果你是 Mac 用户，需使用 Fusion 或其它兼容虚拟机软件），它对个人用户免费。可前往[官网页面](https://www.vmware.com/products/desktop-hypervisor/workstation-and-fusion)下载。打开官网后，需要先注册一个博通（Broadcom）账号，然后在下载页面选择适用的最新版本。

下载完成后，以管理员身份运行安装程序。安装过程比较简单：
- 接受许可协议中的条款
- 如果你打开了 Hyper-v 且不考虑移除，推荐自动安装 Windows Hypervisor Platform（WHP）
- 对于安装位置，用户体验设置和快捷方式根据情况按个人偏好决定即可
- 许可证密钥部分直接跳过

### 下载Arch Linux ISO镜像

前往Arch Linux[官方下载主页](https://archlinux.org/download/)下载最新的ISO镜像，页面内可选择可选择：直链HTTP下载和BT种子/磁力链接。下载的文件名类似 `archlinux-YYYY.MM.DD-x86_64.iso`。如果官网下载慢，可以选择国内的开源镜像站（如清华、中科大）。

---

## 第二部分：创建虚拟机

打开VMware后，点击“创建新的虚拟机”。这里建议选择“自定义（高级）”模式，而不是“典型”模式。选择自定义模式可以避开简易安装的自动流程，确保安装过程完全由自己掌控。接下来按照向导一步步配置：

| 配置项 | 推荐设置 |
|--------|----------|
| 硬件兼容性 | 默认最新版本（如Workstation 17.x） |
| 安装来源 | 安装程序光盘映像文件并选择你刚刚下载的 Arch Linux ISO镜像文件地址 |
| 客户机操作系统 | Linux，版本如没有选“其它Linux 6.x内核64位” |
| 虚拟机名称 | 随意，比如“Arch-Linux-VM” |
| 存储位置 | 自定义即可 |
| 处理器 | 根据设备硬件配置决定，建议分配2个及以上处理器核心总数 |
| 内存 | 根据设备硬件配置决定，至少2GB，推荐4GB或以上 |
| 网络类型 | 选择“使用网络地址转换（NAT）”即可（虚拟机通过宿主机上网） |
| I/O 控制器类型 | 一般选择LSI Logic |
| 磁盘类型 | 建议 SCSI（安全稳定）或 SATA（兼容均衡） |
| 磁盘 | 默认“创建新虚拟磁盘” |
| 磁盘容量 | 根据使用需求和设备硬件配置决定，不建议低于20GB </br> 推荐将虚拟磁盘存储为单个文件 |
| 磁盘文件名 | 自定义即可 |

完成上述内容后，可以在“编辑虚拟机设置”里进一步视情况选择更改USB兼容性、开启3D图形加速、启用共享文件夹、禁用侧通道缓解等。

---

## 第三部分：使用archinstall安装Arch Linux

打开虚拟机后，会看到一个启动菜单。直接选择第一个选项 “Arch Linux install medium” 。等待加载进入纯命令行 Live 系统，届时你应该看到 `root@archiso ~ #` 提示符。

在VMware中，NAT模式下网络通常会自动连接。可以用以下命令测试：

```bash
ping -c 3 archlinux.org
```

如果看到数据包返回，说明网络没问题。然后输入命令启动脚本：

```bash
archinstall
```

进入archinstall主界面后，跟随系统引导逐步完成以下设置：

| 配置项 | 推荐设置 |
|--------|----------|
| Archinstall language | 不修改 |
| Locales | 不修改 |
| Mirrors and repositories | 选择第一项“select region”，在列表中选择“China”并确定 |
| Disk configuration | 建议选择“Use a best-effort default partition layout”，再选择ext4文件系统 |
| Swap | 默认推荐 Swap on zram |
| Bootloader | 默认即可 |
| Kernels | 默认推荐 linux |
| Hostname | 自定义主机名 |
| Authentication | 先设置Root password，再add a user创建一个日常使用的用户并赋予sudo权限 |
| Profile | 根据需要选择桌面环境Desktop（推荐Xfce、GNOME或KDE plasma，进一步选plasma-meta）或最小化安装 minial |
| Applications | 根据需要设置蓝牙、音频、打印机、防火墙和额外字体 |
| Network configuration | 选择Use NetworkManager（default backend） |
| Pacman | 默认即可 |
| Additional packages | 自行选择想要安装的包或之后再安装 |
| Timezone | 搜索并选择 “Asia/Shanghai” |
| Automatic time symc (NTP) | 默认启动 |

所有配置确认无误后，选择 “Install” 开始正式安装。脚本会自动分区、格式化、挂载、安装基础系统及所选软件包。安装过程耗时取决于网速和额外安装包，请耐心等待。完成后，根据脚本提示选择重启。虚拟机重启时，务必在 VMware 中**移除 ISO 镜像** ，否则会再次从安装介质启动。操作方式：在虚拟机设置中，将 CD/DVD 驱动器改为“使用物理驱动器”或取消勾选“启动时连接”。

再次启动时，输入自己创建的用户名和密码，你就能看到Arch Linux的登录界面了（如果安装了桌面环境，会进入图形登录界面）。

---

## 第四部分：安装后的基础配置

Arch是滚动更新发行版，装好后第一件事就是更新系统：

```bash
sudo pacman -Syu
```

刚装好的 Arch 系统非常干净，大部分常用命令和软件都需要自己动手安装。下表按类别列出了常见的工具包，你可以根据自己的需求并考虑系统设置选择性安装。

| 软件包名 | 功能说明 |
| ---- | ---- |
| base-devel | Arch Linux 元包集合，包含 gcc、make 等全套基础编译工具链 |
| git | 分布式版本控制系统，代码仓库管理、拉取提交、分支管理、版本回溯、协同开发 |
| neovim | Vim 重构升级版编辑器，兼容 vim 配置，异步架构、插件生态强大，主力代码编辑器 |
| tmux | 终端复用工具，SSH 后台保活、多会话、窗口分屏、任务持久化 |
| zsh | 交互式 Shell，替代 bash，优化命令补全、提示符、命令历史 |
| htop | 交互式终端进程与资源监视器，查看 CPU、内存、进程，支持进程管理 |
| neofetch | 系统信息展示工具，打印发行版、内核、硬件信息，附带系统 Logo |
| timeshift | 系统快照备份还原工具，系统故障、配置崩坏时一键回滚系统 |
| fzf | 命令行模糊搜索工具，搭配 shell、vim 实现文件、历史命令快速检索 |
| ripgrep | 极速递归文本搜索工具 rg，代码内关键词检索 |
| fd | 现代化文件查找工具，替代传统 find，语法简洁、搜索速度快 |
| man-db | Linux 手册文档支持，提供完整 man 帮助文档 |
| firefox | 开源网页浏览器，网页浏览、前端调试、多标签使用 |
| chromium | Chrome 开源内核浏览器，兼容各类网页与 Web 应用 |
| flameshot | 高级截图工具，区域截图、标注、马赛克、剪贴板快捷保存 |
| sxiv | 极简图片查看器，本地图片批量浏览、缩放旋转 |
| zathura | 轻量 PDF 阅读器，支持检索、跳转、插件扩展 |
| dolphin | KDE 原生文件管理器，分栏浏览、压缩解压、网络磁盘挂载 |
| rofi | 应用启动器、窗口切换工具，快速唤起程序、执行命令 |
| kdeconnect | 跨设备互联，Linux 与安卓互通：文件互传、通知同步、剪贴板共享 |
| qBittorrent | BT / 磁力下载客户端，资源下载、任务队列、限速管理 |
| vlc | 全能多媒体播放器，支持几乎全部音视频格式、转码、串流播放 |
| libreoffice-fresh | 开源办公套件，兼容 Office 文档，处理文档、表格、幻灯片 |
| obsidian | 双链本地知识库，Markdown 笔记、双向链接、知识图谱搭建 |
| gimp | 开源位图图像处理软件，图层修图、调色，简易 PS 替代品 |

安装命令示例如下：

```bash
sudo pacman -S base-devel git neovim htop man-db firefox
```

VMware Tools是一组增强工具，安装后虚拟机的性能、显示效果和操作体验会有质的提升——分辨率自动匹配窗口大小、鼠标可以在虚拟机和宿主机之间无缝穿梭、剪贴板也能共享互通。在Arch虚拟机中执行命令后重启生效：

```bash
sudo pacman -S open-vm-tools xf86-video-vmware
sudo systemctl enable vmtoolsd
```

若使用桌面环境，Xorg 驱动已包含，无需额外包。但建议安装 open-vm-tools-desktop 以支持图形界面的无缝功能：

```bash
sudo pacman -S open-vm-tools-desktop
sudo systemctl enable vmtoolsd.service
```

重启后（sudo reboot），你会发现窗口分辨率已自动适配，鼠标移动也更顺滑。

Arch 官方仓库（pacman）仅收录经审核的软件包，而庞大的用户贡献软件（AUR）则需借助辅助工具安装。yay 是目前最流行的 AUR 助手，安装方式如下（你也可以选择paru，这是另一个非常流行的 AUR 助手，它以更快的速度和更严格的包审核而闻名）：

```bash
cd /tmp
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
```
`makepkg -si` 会自动解析依赖、编译并安装。完成后，即可使用 yay 命令搜索和安装 AUR 软件（用法与 pacman 类似，如 `yay -S google-chrome`）。

如果你需要中文字体和中文输入法：

```bash
sudo pacman -S noto-fonts noto-fonts-cjk noto-fonts-extra noto-fonts-emoji ttf-dejavu ttf-liberation
sudo vim /etc/locale.gen # 去掉“zh_CN.UTF-8 UTF-8”前的“#”并保存（你需要了解vim的基本操作）
sudo locale-gen
echo 'LANG=zh_CN.UTF-8' | sudo tee /etc/locale.conf
sudo pacman -S fcitx5 fcitx5-chinese-addons fcitx5-qt fcitx5-gtk
sudo vim /etc/environment # 添加以下内容
```

```text
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
SDL_IM_MODULE=fcitx
INPUT_METHOD=fcitx
GLFW_IM_MODULE=ibus
```

保存后重启系统，在输入法配置中添加中文键盘。

---

## 常见问题

**Q：安装好后进入桌面环境不会操作？**
A：如果你没有顺便安装终端模拟器，可以通过快捷键Ctrl + Alt + F3 进入虚拟终端（TTY），输入账号密码后执行相关命令。必须注意的是，由于与VMware Workstation Pro的热键冲突，要想要将包含Ctrl + Alt的键组合直接发送到客户机，先按Ctl + Alt + Space，再释放空格键，同时不要释放Ctrl + Alt，然后按所需的键。

**Q：安装完网络未连接怎么办？**
A：用 NetworkManager 确认网络配置：

```bash
sudo pacman -S networkmanager
sudo systemctl enable --now NetworkManager
```

**Q：虚拟机共享文件夹为什么看不到文件？**
A：确保已安装 open-vm-tools-desktop，然后手动挂载：

```bash
mkdir /mnt/hgfs/vm-share
sudo vmhgfs-fuse .host:/ /mnt/hgfs/vm-share -o allow_other
```

**Q：什么是“滚挂”？如何避免？**
A：“滚挂”指滚动更新后系统出现各种故障（软件崩溃、驱动失效、无法启动等）。常见诱因包括：更新中途中断、长期不更新导致依赖脱节、未阅读官方公告而遗漏手动干预步骤、随意使用`--force`或混合测试仓库等。为避免这种情况发生，建议保持定期更新（每周1次`sudo pacman -Syu`）；更新前快速浏览 Arch 官网新闻是否需手动操作；使用 timeshift 或 btrfs 快照备份系统，以便回滚；确保更新时网络稳定、不断电，且不强行终止包管理器进程。

---

## IF Debian is your choice

好了，现在你的Arch系统崩溃了，你浪费了很长的时间，只得到了一片虚无。或许你一开始就做出了正确的决定：我们没有选择Arch的理由，Debian才是我们需要的。又或许你单纯只是想体验另一种Linux发行版。好在我们使用的是虚拟机，一切都留有余地，可以尽情尝试。只要仿照上述流程，完成前置工作并创建虚拟机（客户机操作系统版本选择Debian 12.x 64位），然后打开虚拟机，直接选择友好的“Graphical install”，享受丝滑顺畅的安装体验。

在图形化安装界面里，依次完成以下操作：

1. **选择语言和地区**：语言可选“中文（简体）”，地区选择“中国”，键盘选择“汉语”。
2. **配置网络**：输入主机名（如debian-vm），域名可留空。
3. **设置用户和密码**：设置root用户的密码。创建一个日常使用的普通用户账号，并设置密码。
4. **磁盘分区**：建议选“向导 - 使用整个磁盘”，然后“将所有文件放在同一个分区中”，选择“完成分区操作并将修改写入磁盘”，确认分区写入磁盘。
5. **配置软件包管理器**：不扫描额外的安装介质，使用网络镜像站点并选择一个站点（如清华源 mirrors.tuna.tsinghua.edu.cn）。
6. **软件选择**：对于桌面环境，根据需要可以勾选“Debian desktop environment”并选择，最少勾选“SSH server”、“标准系统工具”即可。
7. **安装GRUB引导程序**：选择“是”，并将引导程序安装到主硬盘（通常是 /dev/sda）。

等待安装完成，移除安装介质并重启系统。输入root和密码登录，完成一些基础的配置：

```bash
apt update # 更新软件源
apt install sudo -y # 安装sudo软件包
usermod -aG sudo [用户名] # 将普通用户加入sudo用户组
# 安装基础工具集（可根据需要增删）
apt install -y curl wget git ca-certificates gnupg \
    htop procps lsof tree ncdu \
    net-tools iputils-ping telnet \
    vim unzip zip ufw fail2ban \
    build-essential jq tmux
```

在上述配置中，如果你没有安装桌面环境，过程中出现菱形是正常的，因为 tty 控制台本身不支持中文。为了更方便地使用，你可以用`ip a`命令获得inet后面的IP地址，在宿主机上使用SSH工具连接：

```shell
ssh [用户名]@[虚拟机IP]
```

## 写在最后

至此，你已经完成了 Arch Linux 的完整安装与基础配置。通过这次实践，你不仅拥有了一台属于自己的高度定制化 Linux 系统，也对发行版安装流程有了初步了解。未来，你可以尝试完全手动安装一次 Arch 来深入理解引导、分区、内核参数等底层机制。不过现在嘛——不妨先放松一下，享受自定义的乐趣：去研究那些发光的字体、平铺的窗口、二次元壁纸，最后穿着过膝袜，打开neofetch，拍一张照片分享到社交网络，配文：*I use Arch BTW* .
