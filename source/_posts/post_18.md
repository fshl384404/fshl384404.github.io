---
title: Java Swing 界面开发
date: 2026-11-08 23:00:00
updated: 2026-11-08 23:00:00
categories:
  - 穷理
tags:
  - Java
  - Swing
  - 图形界面
description: 以窗口、菜单、容器、常用组件、布局管理器与 ActionEvent 为主线，系统讲解 Java Swing 桌面界面开发的基础用法
cover: /img/blog18.webp
---

## Swing 的定位与结构

### 技术定位

Swing 是 Java 标准库中的桌面图形界面工具包，属于 Java Foundation Classes 的一部分。它建立在 AWT 之上，但绝大多数组件由 Java 自行绘制，不依赖操作系统的原生控件，因此称为轻量级组件。`JFrame`、`JDialog`、`JWindow` 三类顶层窗口仍然需要操作系统的窗口句柄，属于重量级组件。

与 JavaFX 相比，Swing 的 API 更陈旧，动画与样式能力较弱，但稳定、无额外依赖、与 Java 标准库集成紧密。大量桌面工具与 IDE 仍在使用 Swing。对于表单、管理面板、调试工具这类以控件组合为主的界面，Swing 的开发成本较低。

本文示例基于 JDK 17 及以上版本，使用 `record` 的示例需要 JDK 16 及以上。

### 组件层次

Swing 的组件体系以 `JComponent` 为根。`JComponent` 继承自 `Container`，`Container` 继承自 `Component`。常用的 `JPanel`、`JButton`、`JLabel`、`JTable` 都直接或间接继承 `JComponent`，具备绘制、事件处理、布局与外观控制能力。

```text
Component
  └── Container
        └── JComponent
              ├── JPanel
              ├── JLabel
              ├── AbstractButton
              │     ├── JButton
              │     ├── JToggleButton
              │     ├── JCheckBox
              │     └── JRadioButton
              ├── JTextComponent
              │     ├── JTextField
              │     └── JTextArea
              └── JTable、JTree、JList、JComboBox
```

界面是一棵树。`JFrame` 是根容器，内部包含内容面板，内容面板中放置其他容器与组件。布局管理器负责计算树中每个容器的子组件位置。

## 窗口

### JFrame 的创建

`JFrame` 是带标题栏、边框与系统按钮的顶层窗口。一个最小的可运行程序如下：

```java
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingUtilities;
import javax.swing.WindowConstants;

public class HelloSwing {
    private static void createAndShow() {
        JFrame frame = new JFrame("第一个 Swing 窗口");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.add(new JLabel("Hello, Swing", JLabel.CENTER));
        frame.setSize(420, 240);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(HelloSwing::createAndShow);
    }
}
```

各语句的作用如下：

- `setDefaultCloseOperation(EXIT_ON_CLOSE)` 指定点击关闭按钮时退出进程。默认值是 `HIDE_ON_CLOSE`，只隐藏窗口而不结束程序。
- `add(...)` 把组件加入内容面板。内容面板默认使用 `BorderLayout`，不指定区域时加入 `CENTER`。
- `setSize` 设置窗口尺寸。若希望窗口按内容的首选尺寸自适应，应调用 `pack()`。
- `setLocationRelativeTo(null)` 把窗口置于屏幕中央。
- `setVisible(true)` 触发窗口显示与首次布局。

`main` 方法运行在主线程，不属于事件分发线程。创建与修改界面的代码应通过 `SwingUtilities.invokeLater` 提交，原因在后文线程部分说明。

### 窗口属性

常用窗口属性如下：

| 方法 | 作用 |
| :--- | :--- |
| `setTitle(String)` | 设置标题栏文本 |
| `setSize(int, int)` | 设置窗口宽高 |
| `pack()` | 按内容首选尺寸调整窗口 |
| `setLocationRelativeTo(Component)` | 相对组件居中，参数为 `null` 时相对屏幕 |
| `setResizable(boolean)` | 是否允许调整大小 |
| `setMinimumSize(Dimension)` | 设置最小尺寸 |
| `setDefaultCloseOperation(int)` | 设置关闭行为 |
| `setJMenuBar(JMenuBar)` | 设置菜单栏 |
| `setIconImage(Image)` | 设置窗口图标 |
| `toFront()` | 把窗口移到最前 |

`setSize` 与 `pack` 同时使用时，后调用的方法生效。通常在 `pack()` 之后调用 `setLocationRelativeTo(null)`，保证窗口按内容调整后再居中。

### 关闭行为

关闭窗口时，`setDefaultCloseOperation` 决定后续行为：

| 常量 | 行为 |
| :--- | :--- |
| `EXIT_ON_CLOSE` | 调用 `System.exit(0)`，结束进程 |
| `DISPOSE_ON_CLOSE` | 释放窗口及其子组件占用的资源，进程继续运行 |
| `HIDE_ON_CLOSE` | 仅隐藏窗口，组件仍然存在 |
| `DO_NOTHING_ON_CLOSE` | 不执行任何操作，由监听器自行处理 |

需要保存数据或确认退出时，使用 `DO_NOTHING_ON_CLOSE` 并在 `windowClosing` 中处理：

```java
frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
frame.addWindowListener(new WindowAdapter() {
    @Override
    public void windowClosing(WindowEvent e) {
        int choice = JOptionPane.showConfirmDialog(frame, "确定退出吗",
                "确认", JOptionPane.YES_NO_OPTION);
        if (choice == JOptionPane.YES_OPTION) {
            frame.dispose();
            System.exit(0);
        }
    }
});
```

`dispose()` 释放窗口持有的原生资源，但不会结束事件分发线程。程序需要退出时，仍应调用 `System.exit(0)` 或确保没有非守护线程存活。

### 内容面板与窗口层次

`JFrame` 由根面板、分层窗格、内容面板与玻璃面板组成：

```text
JFrame
  └── JRootPane
        ├── glassPane        覆盖在最上层，用于拦截输入
        ├── layeredPane
        │     ├── menuBar    菜单栏
        │     └── contentPane 内容面板
        └── ...
```

日常开发主要操作内容面板。`add` 方法会转发到内容面板，`setJMenuBar` 则把菜单栏放入分层窗格。菜单栏不参与内容面板的布局，始终固定在窗口顶部。需要替换内容面板时调用 `setContentPane(Container)`。

### JDialog

`JDialog` 是独立的对话框窗口，可以设置为模态或非模态。模态对话框显示期间会阻止用户操作父窗口：

```java
JDialog dialog = new JDialog(frame, "详细信息", true);
dialog.add(new JLabel("这是一个模态对话框", SwingConstants.CENTER));
dialog.setSize(280, 140);
dialog.setLocationRelativeTo(frame);
dialog.setVisible(true);
```

`JDialog(Frame owner, String title, boolean modal)` 的第三个参数决定是否模态。对话框关闭后应调用 `dispose()` 释放资源。简单提示、确认与输入优先使用 `JOptionPane`，需要自定义布局时再继承 `JDialog`。

| 窗口类型 | 是否有标题栏与边框 | 是否可独立存在 | 典型用途 |
| :--- | :--- | :--- | :--- |
| `JFrame` | 有 | 是 | 主窗口 |
| `JDialog` | 有 | 是，通常依附于父窗口 | 对话框、设置页 |
| `JWindow` | 无 | 是 | 启动画面、无边框窗口 |

## 菜单

### 菜单栏与菜单项

菜单由 `JMenuBar`、`JMenu` 与 `JMenuItem` 组成。菜单栏通过 `setJMenuBar` 安装到窗口：

```java
JMenuBar menuBar = new JMenuBar();

JMenu fileMenu = new JMenu("文件");
JMenuItem newItem = new JMenuItem("新建");
JMenuItem openItem = new JMenuItem("打开");
JMenuItem exitItem = new JMenuItem("退出");

fileMenu.add(newItem);
fileMenu.add(openItem);
fileMenu.addSeparator();
fileMenu.add(exitItem);

menuBar.add(fileMenu);
frame.setJMenuBar(menuBar);
```

菜单项被选中时触发 `ActionEvent`，处理方式与按钮相同。菜单可以嵌套，`JMenu` 本身也可以作为另一个菜单的菜单项。

### 菜单项类型

| 类型 | 行为 |
| :--- | :--- |
| `JMenuItem` | 普通命令项 |
| `JCheckBoxMenuItem` | 带复选框的开关项，可独立选中 |
| `JRadioButtonMenuItem` | 带单选按钮的互斥项，需配合 `ButtonGroup` |
| `JMenu` | 子菜单 |
| `JSeparator` | 分隔线 |

```java
JCheckBoxMenuItem gridItem = new JCheckBoxMenuItem("显示网格", true);

JRadioButtonMenuItem smallIcon = new JRadioButtonMenuItem("小图标", true);
JRadioButtonMenuItem largeIcon = new JRadioButtonMenuItem("大图标");
ButtonGroup group = new ButtonGroup();
group.add(smallIcon);
group.add(largeIcon);
```

`ButtonGroup` 只负责互斥，不会自动选中第一个按钮，需要显式调用 `setSelected(true)`。

### 快捷键与助记符

助记符通过 Alt 组合键打开菜单，快捷键在窗口内直接触发命令：

```java
fileMenu.setMnemonic(KeyEvent.VK_F);
newItem.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_N, InputEvent.CTRL_DOWN_MASK));
```

`setMnemonic` 依赖当前外观对下划线的显示约定，`setAccelerator` 由 Swing 的输入映射统一处理。菜单项的快捷键通常与工具栏按钮、主窗口按钮共享同一套动作。

### 弹出菜单

`JPopupMenu` 用于右键菜单。组件可以直接设置弹出菜单，Swing 会在合适的时机显示：

```java
JPopupMenu popup = new JPopupMenu();
JMenuItem refreshItem = new JMenuItem("刷新");
refreshItem.addActionListener(e -> statusLabel.setText("已刷新"));
popup.add(refreshItem);

panel.setComponentPopupMenu(popup);
```

需要根据点击位置动态构建菜单时，可以监听 `mousePressed` 与 `mouseReleased`，判断 `isPopupTrigger()` 后调用 `popup.show(component, x, y)`。

### 工具栏

`JToolBar` 用于放置常用操作按钮，可以浮动或拖动到窗口边缘：

```java
JToolBar toolBar = new JToolBar();
toolBar.setFloatable(false);
toolBar.add(new JButton("新建"));
toolBar.add(new JButton("打开"));
toolBar.addSeparator();
toolBar.add(new JButton("保存"));
```

工具栏与菜单通常共享同一组 `Action`，从而复用文本、图标、快捷键与启用状态。`Action` 的用法在事件部分说明。
## 布局管理器

### 布局的作用

Swing 使用布局管理器计算子组件的位置与尺寸。组件不保存绝对坐标，布局管理器在窗口尺寸变化、组件增删或字体改变时重新计算布局。相比手工设置坐标，布局管理器能适应不同字体、分辨率与语言，是界面可维护性的基础。

`Container` 提供 `setLayout` 方法替换布局管理器。`JPanel` 默认使用 `FlowLayout`，`JFrame` 的内容面板默认使用 `BorderLayout`。

### FlowLayout

`FlowLayout` 按加入顺序从左到右排列组件，一行放不下时自动换行。它适合工具栏、按钮组与简单的行内布局。

| 构造方法 | 说明 |
| :--- | :--- |
| `FlowLayout()` | 居中对齐，水平与垂直间距为 5 |
| `FlowLayout(int align)` | 指定对齐方式 |
| `FlowLayout(int align, int hgap, int vgap)` | 指定对齐方式与间距 |

对齐常量包括 `LEFT`、`CENTER`、`RIGHT`、`LEADING`、`TRAILING`。`FlowLayout` 不会拉伸组件，组件保持首选尺寸。

```java
JPanel row = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 4));
row.add(new JLabel("关键字"));
row.add(new JTextField(16));
row.add(new JButton("查询"));
```

### BorderLayout

`BorderLayout` 把容器分为五个区域：`NORTH`、`SOUTH`、`WEST`、`EAST`、`CENTER`。`NORTH` 与 `SOUTH` 占满宽度，`WEST` 与 `EAST` 占满中间高度，`CENTER` 吸收剩余空间。

```java
JPanel panel = new JPanel(new BorderLayout(8, 8));
panel.add(toolBar, BorderLayout.NORTH);
panel.add(tree, BorderLayout.WEST);
panel.add(table, BorderLayout.CENTER);
panel.add(statusBar, BorderLayout.SOUTH);
```

同一区域重复加入组件时，后加入的组件会覆盖先加入的组件。只加入 `CENTER` 时，组件会填满整个容器。`BorderLayout` 的构造参数为水平与垂直间距。

### GridLayout

`GridLayout` 把容器划分为行列数固定的网格，每个单元格尺寸相同，组件填满单元格。它适合计算器键盘、均匀排列的按钮组。

```java
JPanel grid = new JPanel(new GridLayout(3, 4, 6, 6));
for (int i = 1; i <= 12; i++) {
    grid.add(new JButton(String.valueOf(i)));
}
```

| 构造方法 | 说明 |
| :--- | :--- |
| `GridLayout(int rows, int cols)` | 指定行列数 |
| `GridLayout(int rows, int cols, int hgap, int vgap)` | 指定行列数与间距 |

行列数中允许一个为 0，表示由另一个方向与组件数量推导。`GridLayout` 会忽略组件的首选尺寸，把可用空间平均分配。

### BoxLayout

`BoxLayout` 沿单一方向排列组件，适合表单与侧边栏。它必须显式指定容器的排列轴：

```java
JPanel sidebar = new JPanel();
sidebar.setLayout(new BoxLayout(sidebar, BoxLayout.Y_AXIS));
sidebar.add(new JButton("概览"));
sidebar.add(Box.createVerticalStrut(8));
sidebar.add(new JButton("设置"));
sidebar.add(Box.createVerticalGlue());
```

`createVerticalStrut` 插入固定间距，`createVerticalGlue` 插入可伸缩的空白。`BoxLayout` 在交叉轴上会尽量拉伸组件，若组件不应被拉伸，需要限制最大尺寸：

```java
button.setMaximumSize(button.getPreferredSize());
```

`Box` 类提供了 `createVerticalBox` 与 `createHorizontalBox` 两个便捷工厂方法。

### GridBagLayout

`GridBagLayout` 通过 `GridBagConstraints` 控制每个组件的位置、跨度与伸缩行为，是 Swing 中最灵活的布局管理器。常用字段如下：

| 字段 | 含义 |
| :--- | :--- |
| `gridx`、`gridy` | 组件所在单元格的列号与行号 |
| `gridwidth`、`gridheight` | 组件跨越的列数与行数 |
| `weightx`、`weighty` | 所在列与行分配额外空间的比例 |
| `fill` | 组件在单元格内的填充方式 |
| `anchor` | 组件小于单元格时的对齐位置 |
| `insets` | 组件四周的外边距 |

权重决定窗口放大时多余空间如何分配。若所有组件的 `weightx` 都为 0，多余空间集中在网格四周，组件尺寸不变；把输入框所在列的 `weightx` 设为 1，输入框就会随窗口变宽。

```java
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;

public class GridBagFormDemo {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("登录");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            JPanel form = new JPanel(new GridBagLayout());
            GridBagConstraints c = new GridBagConstraints();
            c.insets = new Insets(6, 6, 6, 6);
            c.anchor = GridBagConstraints.WEST;

            c.gridx = 0;
            c.gridy = 0;
            c.weightx = 0;
            c.fill = GridBagConstraints.NONE;
            form.add(new JLabel("用户名"), c);

            c.gridx = 1;
            c.gridy = 0;
            c.weightx = 1;
            c.fill = GridBagConstraints.HORIZONTAL;
            form.add(new JTextField(18), c);

            c.gridx = 0;
            c.gridy = 1;
            c.weightx = 0;
            c.fill = GridBagConstraints.NONE;
            form.add(new JLabel("密码"), c);

            c.gridx = 1;
            c.gridy = 1;
            c.weightx = 1;
            c.fill = GridBagConstraints.HORIZONTAL;
            form.add(new JPasswordField(18), c);

            c.gridx = 1;
            c.gridy = 2;
            c.weightx = 0;
            c.fill = GridBagConstraints.NONE;
            c.anchor = GridBagConstraints.EAST;
            form.add(new JButton("登录"), c);

            frame.add(form);
            frame.pack();
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
```

使用 `GridBagLayout` 时，通常先设置全局的边距与对齐方式，再逐个组件设置位置与权重。约束对象会被复用，修改前一个组件后要显式重置不再需要的字段，避免状态残留影响后续组件。

### CardLayout

`CardLayout` 在同一区域叠放多个面板，每次显示一个，适合分步向导与设置页：

```java
CardLayout cards = new CardLayout();
JPanel deck = new JPanel(cards);
deck.add(stepOne, "step1");
deck.add(stepTwo, "step2");
cards.show(deck, "step2");
```

每个面板需要一个字符串标识。`show` 按标识切换，`next` 与 `previous` 按加入顺序切换。切换不会销毁面板，面板中的输入内容会保留。

### 绝对定位

调用 `setLayout(null)` 后，组件通过 `setBounds(x, y, width, height)` 定位。这种方式可以精确控制像素位置，但无法适应字体变化、窗口缩放与不同平台的默认字体，因此正式界面不推荐使用。

只有在绘制固定尺寸的画布、叠加自定义图形等场景下，绝对定位才是合理选择。使用绝对定位时，必须在容器尺寸变化时重新计算子组件位置，否则窗口缩放后布局会错乱。

### 嵌套布局

实际界面通常由多个布局嵌套而成。下面的例子用 `BorderLayout` 划分主窗口，用 `FlowLayout` 排列顶部与底部，用 `GridLayout` 排列中部：

```java
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.GridLayout;

public class LayoutDemo {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("布局管理器");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setLayout(new BorderLayout(8, 8));

            JPanel top = new JPanel(new FlowLayout(FlowLayout.LEFT));
            top.add(new JLabel("关键字"));
            top.add(new JTextField(16));
            top.add(new JButton("查询"));

            JPanel center = new JPanel(new GridLayout(2, 3, 6, 6));
            for (int i = 1; i <= 6; i++) {
                center.add(new JButton("按钮 " + i));
            }

            JPanel bottom = new JPanel(new FlowLayout(FlowLayout.RIGHT));
            bottom.add(new JButton("取消"));
            bottom.add(new JButton("确定"));

            frame.add(top, BorderLayout.NORTH);
            frame.add(center, BorderLayout.CENTER);
            frame.add(bottom, BorderLayout.SOUTH);
            frame.setSize(520, 320);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
```

嵌套布局的关键是让每层容器只负责一个方向或一类排列，避免把所有组件塞进同一个复杂布局。层次清晰的结构更容易修改，也更适合在不同尺寸下保持可用。

## 容器

容器是能够容纳其他组件的组件。除顶层窗口外，常用的中间容器包括面板、滚动面板、分割面板、选项卡面板与工具栏。

### JPanel

`JPanel` 是最常用的中间容器，用于分组与布局。它默认使用 `FlowLayout`，可以设置边框与背景：

```java
JPanel panel = new JPanel(new BorderLayout());
panel.setBorder(BorderFactory.createTitledBorder("基本信息"));
panel.setBackground(new Color(0xF5F5F5));
```

`BorderFactory` 提供空边框、线边框、标题边框、蚀刻边框等常用边框。面板嵌套时，边框可以清楚地区分功能区域。

### JScrollPane

`JScrollPane` 为内容提供滚动条。`JTable`、`JList`、`JTree`、`JTextArea` 通常都需要放入滚动面板：

```java
JTextArea textArea = new JTextArea(10, 40);
JScrollPane scroll = new JScrollPane(textArea);
scroll.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
scroll.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
```

滚动策略包括 `AS_NEEDED`、`ALWAYS`、`NEVER`。默认策略为按需显示。`JScrollPane` 还可以设置视口边框、滚动条单位增量与角部组件。

### JSplitPane

`JSplitPane` 把区域分成可拖动的两部分：

```java
JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, leftPanel, rightPanel);
split.setResizeWeight(0.3);
split.setContinuousLayout(true);
split.setDividerLocation(220);
```

`setResizeWeight` 决定窗口缩放时新增空间如何在两侧分配，取值范围为 0 到 1。`HORIZONTAL_SPLIT` 表示左右分割，`VERTICAL_SPLIT` 表示上下分割。

### JTabbedPane

`JTabbedPane` 把多个面板组织为选项卡：

```java
JTabbedPane tabs = new JTabbedPane();
tabs.addTab("常规", generalPanel);
tabs.addTab("高级", advancedPanel);
tabs.addChangeListener(e -> {
    int index = tabs.getSelectedIndex();
    statusLabel.setText("当前页: " + tabs.getTitleAt(index));
});
```

选项卡可以附带图标与提示文本。`addTab`、`insertTab`、`removeTabAt` 分别用于添加、插入与删除页面。切换选项卡触发 `ChangeEvent`，不属于动作事件。

### 工具栏与桌面面板

`JToolBar` 用于放置常用操作按钮，可以浮动或拖动到窗口边缘。`setFloatable(false)` 禁止浮动，`addSeparator()` 插入分隔线。

`JDesktopPane` 与 `JInternalFrame` 用于构建多文档界面。`JInternalFrame` 是位于桌面面板内部的子窗口，具备标题栏、最大化与关闭按钮，适合在一个主窗口内管理多个文档。现代应用更常用选项卡替代多文档界面，`JDesktopPane` 只在特定场景下使用。

### 容器选择

| 需求 | 容器 |
| :--- | :--- |
| 分组与布局 | `JPanel` |
| 内容超出可视区域 | `JScrollPane` |
| 可调整比例的两栏 | `JSplitPane` |
| 多个并列页面 | `JTabbedPane` |
| 常用操作按钮 | `JToolBar` |
| 主窗口内的子窗口 | `JDesktopPane` + `JInternalFrame` |
## 常用组件

组件按用途可以分为文本输入、按钮与选择、数据展示、对话框几类。组件的状态通常保存在模型中，视图只负责显示与交互。

### 文本组件

`JLabel` 显示不可编辑的文本或图标，`JTextField` 接受单行输入，`JTextArea` 接受多行输入，`JPasswordField` 对输入内容做掩码显示。

```java
JLabel label = new JLabel("用户名");
JTextField nameField = new JTextField(16);
nameField.setToolTipText("请输入登录名");

JPasswordField passwordField = new JPasswordField(16);
char[] password = passwordField.getPassword();

JTextArea remark = new JTextArea(5, 30);
remark.setLineWrap(true);
remark.setWrapStyleWord(true);
JScrollPane remarkScroll = new JScrollPane(remark);
```

`JTextField` 在按下回车时触发 `ActionEvent`，适合搜索框与单字段表单。多行文本需要放入 `JScrollPane`，否则内容超出可视区域后无法滚动。

读取密码应使用 `getPassword()`，它返回 `char[]`，可以在使用后清零。`getText()` 返回的 `String` 会长期驻留在字符串池中，不适合处理敏感数据。

| 组件 | 主要方法 | 说明 |
| :--- | :--- | :--- |
| `JLabel` | `setText`、`setIcon`、`setHorizontalAlignment` | 显示文本或图标 |
| `JTextField` | `getText`、`setText`、`addActionListener` | 单行输入，回车触发动作事件 |
| `JTextArea` | `getText`、`append`、`setLineWrap` | 多行输入 |
| `JPasswordField` | `getPassword`、`setEchoChar` | 密码输入 |

### 按钮与选择组件

`JButton` 是命令按钮，点击触发 `ActionEvent`。`JToggleButton` 有选中与未选中两种状态。`JCheckBox` 与 `JRadioButton` 都是带状态的按钮，前者用于独立选项，后者用于互斥选项。

```java
JButton submit = new JButton("提交");
submit.addActionListener(e -> System.out.println("提交"));

JToggleButton pin = new JToggleButton("固定");
pin.addItemListener(e -> System.out.println("选中状态: " + pin.isSelected()));

JCheckBox remember = new JCheckBox("记住登录状态", true);

JRadioButton small = new JRadioButton("小杯");
JRadioButton large = new JRadioButton("大杯", true);
ButtonGroup sizeGroup = new ButtonGroup();
sizeGroup.add(small);
sizeGroup.add(large);
```

`ButtonGroup` 只负责互斥，不会自动选中组内第一个按钮。`JCheckBox` 与 `JRadioButton` 的状态变化触发 `ItemEvent`，需要监听 `ItemListener`；点击本身也会触发 `ActionEvent`，两种事件的语义不同。

`JComboBox` 提供下拉选择，`JList` 提供列表选择，`JSpinner` 提供带上下箭头的数值或枚举输入，`JSlider` 提供连续取值，`JProgressBar` 显示进度：

```java
JComboBox<String> city = new JComboBox<>(new String[]{"北京", "上海", "广州"});
city.setSelectedIndex(0);
String selectedCity = (String) city.getSelectedItem();

DefaultListModel<String> listModel = new DefaultListModel<>();
listModel.addElement("第一项");
listModel.addElement("第二项");
JList<String> list = new JList<>(listModel);
list.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);

JSpinner spinner = new JSpinner(new SpinnerNumberModel(1, 1, 100, 1));
int count = (Integer) spinner.getValue();

JSlider slider = new JSlider(0, 100, 50);
slider.setPaintTicks(true);
slider.setPaintLabels(true);
slider.addChangeListener(e -> System.out.println("当前值: " + slider.getValue()));

JProgressBar progress = new JProgressBar(0, 100);
progress.setStringPainted(true);
progress.setValue(40);
```

`JList` 的构造方法接受数组时会创建一个以该数组为数据的只读 `ListModel`，不支持增删元素。需要动态增删元素时，应直接持有 `DefaultListModel`。

### 表格

`JTable` 是最常用的数据展示组件。它把数据存放在 `TableModel` 中，视图只负责渲染。最简单的用法是使用 `DefaultTableModel`：

```java
String[] columns = {"名称", "数量", "单价"};
Object[][] rows = {
        {"笔记本", 2, 12.5},
        {"钢笔", 1, 38.0}
};
DefaultTableModel model = new DefaultTableModel(rows, columns) {
    @Override
    public boolean isCellEditable(int row, int column) {
        return column != 0;
    }
};
JTable table = new JTable(model);
JScrollPane scroll = new JScrollPane(table);
```

`JTable` 必须放入 `JScrollPane` 才会显示表头与滚动条。列宽由列模型给出，默认在自动调整模式下随表格宽度分配；需要指定列宽时调用 `getColumnModel().getColumn(i).setPreferredWidth(width)`。

排序与过滤通过 `TableRowSorter` 完成：

```java
TableRowSorter<TableModel> sorter = new TableRowSorter<>(model);
table.setRowSorter(sorter);
sorter.setRowFilter(RowFilter.regexFilter("笔", 0));
```

数据量较大或需要自定义列类型时，应继承 `AbstractTableModel`：

```java
import javax.swing.table.AbstractTableModel;
import java.util.ArrayList;
import java.util.List;

record Task(int id, String title, boolean done) {}

class TaskTableModel extends AbstractTableModel {
    private static final String[] COLUMNS = {"编号", "任务", "完成"};
    private final List<Task> tasks = new ArrayList<>();

    @Override
    public int getRowCount() {
        return tasks.size();
    }

    @Override
    public int getColumnCount() {
        return COLUMNS.length;
    }

    @Override
    public String getColumnName(int column) {
        return COLUMNS[column];
    }

    @Override
    public Class<?> getColumnClass(int columnIndex) {
        return switch (columnIndex) {
            case 0 -> Integer.class;
            case 1 -> String.class;
            default -> Boolean.class;
        };
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        Task task = tasks.get(rowIndex);
        return switch (columnIndex) {
            case 0 -> task.id();
            case 1 -> task.title();
            default -> task.done();
        };
    }

    @Override
    public boolean isCellEditable(int rowIndex, int columnIndex) {
        return columnIndex == 2;
    }

    @Override
    public void setValueAt(Object value, int rowIndex, int columnIndex) {
        if (columnIndex != 2) {
            return;
        }
        Task old = tasks.get(rowIndex);
        tasks.set(rowIndex, new Task(old.id(), old.title(), (Boolean) value));
        fireTableCellUpdated(rowIndex, columnIndex);
    }

    public void add(Task task) {
        tasks.add(task);
        fireTableRowsInserted(tasks.size() - 1, tasks.size() - 1);
    }
}
```

`getColumnClass` 返回 `Boolean.class` 时，`JTable` 会自动为该列使用复选框渲染器与编辑器。修改模型后必须触发对应事件，表格才会刷新。

### 树

`JTree` 用于展示层次数据，节点由 `DefaultMutableTreeNode` 表示：

```java
DefaultMutableTreeNode root = new DefaultMutableTreeNode("项目");
DefaultMutableTreeNode src = new DefaultMutableTreeNode("src");
src.add(new DefaultMutableTreeNode("Main.java"));
src.add(new DefaultMutableTreeNode("Utils.java"));
root.add(src);

JTree tree = new JTree(root);
tree.setRootVisible(true);
tree.setShowsRootHandles(true);
JScrollPane treeScroll = new JScrollPane(tree);
```

树的展开状态、选择模式与节点渲染都可以定制。数据量较大时应实现 `TreeModel`，而不是一次性构造全部节点。

### 对话框

`JOptionPane` 提供消息、确认与输入三类标准对话框：

```java
JOptionPane.showMessageDialog(frame, "保存成功", "提示", JOptionPane.INFORMATION_MESSAGE);

int choice = JOptionPane.showConfirmDialog(frame, "确定删除该记录吗", "确认",
        JOptionPane.YES_NO_OPTION);
if (choice == JOptionPane.YES_OPTION) {
    deleteRecord();
}

String input = JOptionPane.showInputDialog(frame, "请输入名称");
```

`JFileChooser` 用于选择文件，`JColorChooser` 用于选择颜色：

```java
JFileChooser chooser = new JFileChooser();
chooser.setFileFilter(new javax.swing.filechooser.FileNameExtensionFilter("文本文件", "txt", "md"));
if (chooser.showOpenDialog(frame) == JFileChooser.APPROVE_OPTION) {
    File file = chooser.getSelectedFile();
}

Color color = JColorChooser.showDialog(frame, "选择颜色", Color.WHITE);
```

需要自定义内容的对话框应继承 `JDialog`。模态对话框显示期间会阻止用户操作其他窗口，因此不应在其中执行耗时任务。

### 组件选择

| 需求 | 组件 |
| :--- | :--- |
| 单行短文本 | `JTextField` |
| 多行长文本 | `JTextArea` + `JScrollPane` |
| 密码 | `JPasswordField` |
| 命令按钮 | `JButton` |
| 独立开关 | `JCheckBox` |
| 互斥选项，选项较少 | `JRadioButton` + `ButtonGroup` |
| 互斥选项，选项较多 | `JComboBox` |
| 多选列表 | `JList` + `DefaultListModel` |
| 数值输入 | `JSpinner` |
| 连续取值范围 | `JSlider` |
| 二维数据 | `JTable` + `TableModel` |
| 层次数据 | `JTree` + `TreeModel` |
## ActionEvent 事件

### 事件模型的三个要素

Swing 的事件处理采用观察者模式。组件作为事件源，维护一组监听器；用户操作发生时，组件创建事件对象，并把它交给所有已注册的监听器。

一次事件处理包含三个要素：

- **事件源**：产生事件的组件，例如 `JButton`、`JMenuItem`、`JTextField`；
- **事件对象**：封装事件信息的对象，例如 `ActionEvent`；
- **监听器**：实现监听接口的对象，通过 `addActionListener` 注册。

`ActionListener` 是只有一个抽象方法的函数式接口：

```java
import java.awt.event.ActionEvent;
import java.util.EventListener;

@FunctionalInterface
public interface ActionListener extends EventListener {
    void actionPerformed(ActionEvent e);
}
```

因此可以使用 Lambda 表达式注册：

```java
JButton button = new JButton("确定");
button.addActionListener(e -> System.out.println("点击来源: " + e.getSource()));
```

### ActionEvent 的信息

`ActionEvent` 提供以下常用方法：

| 方法 | 返回内容 |
| :--- | :--- |
| `getSource()` | 触发事件的组件 |
| `getActionCommand()` | 组件的动作命令字符串 |
| `getModifiers()` | 触发时按下的修饰键 |
| `getWhen()` | 事件发生的时间戳 |
| `paramString()` | 事件的字符串描述，主要用于调试 |

动作命令默认来自组件的文本。按钮调用 `setText` 后，命令字符串可能随之变化，因此依赖命令字符串区分来源时，应显式调用 `setActionCommand`：

```java
JButton save = new JButton("保存");
save.setActionCommand("save");

save.addActionListener(e -> {
    System.out.println(e.getActionCommand());
});
```

`getModifiers()` 可以判断是否按住了 Shift、Ctrl 等修饰键，用于实现组合操作。返回值与 `ActionEvent.SHIFT_MASK`、`ActionEvent.CTRL_MASK` 等常量比较。

### 触发 ActionEvent 的组件

`ActionEvent` 并不只由按钮产生，常见来源如下：

| 组件 | 触发时机 |
| :--- | :--- |
| `JButton` | 点击按钮，或调用 `doClick()` |
| `JMenuItem` | 选择菜单项 |
| `JCheckBox`、`JRadioButton` | 点击组件 |
| `JTextField` | 按下回车 |
| `JComboBox` | 选择项发生变化 |
| `javax.swing.Timer` | 定时器触发 |
| `JFileChooser` | 确认选择文件 |

复选框与单选按钮的选中状态变化应使用 `ItemListener`。`ActionEvent` 只表示组件被激活，不携带选中状态的前后值。

### 共享监听器

多个按钮执行相似逻辑时，可以共用一个监听器，通过动作命令或事件源区分：

```java
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.event.ActionListener;

public class CounterDemo {
    private static int count = 0;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("计数器");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            JLabel label = new JLabel("0", JLabel.CENTER);
            label.setFont(label.getFont().deriveFont(36f));

            JButton plus = new JButton("加一");
            JButton minus = new JButton("减一");
            JButton reset = new JButton("归零");
            plus.setActionCommand("plus");
            minus.setActionCommand("minus");
            reset.setActionCommand("reset");

            ActionListener listener = e -> {
                switch (e.getActionCommand()) {
                    case "plus" -> count++;
                    case "minus" -> count--;
                    default -> count = 0;
                }
                label.setText(String.valueOf(count));
            };
            plus.addActionListener(listener);
            minus.addActionListener(listener);
            reset.addActionListener(listener);

            JPanel buttons = new JPanel(new FlowLayout());
            buttons.add(plus);
            buttons.add(minus);
            buttons.add(reset);

            frame.add(label, BorderLayout.CENTER);
            frame.add(buttons, BorderLayout.SOUTH);
            frame.setSize(360, 220);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
```

共享监听器减少了重复代码，但把多个命令的处理逻辑集中在一个方法中。命令数量较多时，应拆分监听器或使用 `Action` 对象。

### Action 接口

`Action` 把命令的文本、图标、快捷键、描述与启用状态封装为一个对象。`AbstractAction` 提供了默认实现，按钮、菜单项与工具栏可以直接使用同一个 `Action`：

```java
import javax.swing.AbstractAction;
import javax.swing.Action;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JToolBar;
import javax.swing.KeyStroke;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.event.ActionEvent;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;

public class ActionDemo {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Action 示例");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            JLabel status = new JLabel("就绪", JLabel.CENTER);
            Action saveAction = new AbstractAction("保存") {
                @Override
                public void actionPerformed(ActionEvent e) {
                    status.setText("已保存: " + e.getActionCommand());
                }
            };
            saveAction.putValue(Action.SHORT_DESCRIPTION, "保存当前内容");
            saveAction.putValue(Action.ACCELERATOR_KEY,
                    KeyStroke.getKeyStroke(KeyEvent.VK_S, InputEvent.CTRL_DOWN_MASK));

            JButton button = new JButton(saveAction);
            JMenuItem menuItem = new JMenuItem(saveAction);
            JToolBar toolBar = new JToolBar();
            toolBar.setFloatable(false);
            toolBar.add(saveAction);

            JMenuBar menuBar = new JMenuBar();
            JMenu fileMenu = new JMenu("文件");
            fileMenu.add(menuItem);
            menuBar.add(fileMenu);

            frame.setJMenuBar(menuBar);
            frame.add(toolBar, BorderLayout.NORTH);
            frame.add(button, BorderLayout.CENTER);
            frame.add(status, BorderLayout.SOUTH);
            frame.setSize(420, 240);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
```

`Action` 的常用键包括 `NAME`、`SMALL_ICON`、`ACCELERATOR_KEY`、`MNEMONIC_KEY`、`SHORT_DESCRIPTION` 与 `ENABLED`。调用 `setEnabled(false)` 会同时禁用使用该动作的按钮与菜单项，避免逐个组件修改状态。

### 默认按钮与程序触发

对话框通常把确认按钮设为默认按钮，按下回车即触发：

```java
frame.getRootPane().setDefaultButton(confirmButton);
```

`doClick()` 可以在代码中模拟点击，常用于测试与自动化操作：

```java
confirmButton.doClick();
```

`doClick()` 会在当前线程同步触发监听器。若当前线程不是 EDT，应通过 `invokeLater` 调用。

### 事件处理线程

`actionPerformed` 在事件分发线程上执行。监听器中的代码应当快速完成，只做状态更新与界面刷新。文件读写、网络请求、大量计算必须放到后台线程，否则事件队列被阻塞，界面停止响应。

## 其它常用事件

除 `ActionEvent` 外，Swing 还提供多类事件。多数场景只需了解触发时机与监听接口，不必深入事件分发机制。

| 监听器接口 | 事件类型 | 触发时机 |
| :--- | :--- | :--- |
| `ItemListener` | `ItemEvent` | 复选框、单选按钮、下拉框的选中状态变化 |
| `ListSelectionListener` | `ListSelectionEvent` | 列表或表格的选中项变化 |
| `MouseListener` | `MouseEvent` | 鼠标按下、释放、点击、进入、离开 |
| `MouseMotionListener` | `MouseEvent` | 鼠标移动与拖动 |
| `KeyListener` | `KeyEvent` | 键盘按下、释放、输入字符 |
| `WindowListener` | `WindowEvent` | 窗口打开、关闭、激活、最小化 |
| `DocumentListener` | `DocumentEvent` | 文本框内容插入、删除、修改 |
| `ChangeListener` | `ChangeEvent` | 滑块、选项卡、微调器的状态变化 |

`MouseListener` 与 `WindowListener` 定义了多个方法，直接实现接口需要写出全部空方法。对应的适配器类提供了空实现，只需覆盖关心的方法：

```java
panel.addMouseListener(new MouseAdapter() {
    @Override
    public void mouseClicked(MouseEvent e) {
        System.out.println("点击坐标: " + e.getX() + ", " + e.getY());
    }
});

frame.addWindowListener(new WindowAdapter() {
    @Override
    public void windowClosing(WindowEvent e) {
        System.out.println("窗口即将关闭");
    }
});
```

监听文本的每次变化应使用 `DocumentListener`：

```java
textField.getDocument().addDocumentListener(new DocumentListener() {
    public void insertUpdate(DocumentEvent e) { updatePreview(); }
    public void removeUpdate(DocumentEvent e) { updatePreview(); }
    public void changedUpdate(DocumentEvent e) { updatePreview(); }
});
```

`KeyListener` 只在组件获得键盘焦点时收到事件。需要处理全局快捷键时，应使用 `KeyStroke` 与输入映射，而不是依赖 `KeyListener`。

## 线程与后台任务

### EDT 规则

Swing 采用单线程模型。所有组件的创建、属性修改与事件处理都应当在事件分发线程上执行。违反该规则可能导致绘制异常或状态不一致，且这类错误往往只在特定时序下出现。

两条基本规则如下：

1. 界面构建与组件修改通过 `SwingUtilities.invokeLater` 提交到 EDT；
2. 耗时任务放到后台线程，执行完成后回到 EDT 更新界面。

```java
SwingUtilities.invokeLater(() -> label.setText("完成"));
SwingUtilities.invokeAndWait(() -> label.setText("完成"));
```

`invokeLater` 把任务放入事件队列后立即返回，适合大多数场景。`invokeAndWait` 会阻塞调用线程直到任务完成，不能在 EDT 上调用，否则会死锁。

### SwingWorker

`SwingWorker` 把任务拆分到后台线程，并在合适的时机把结果交回 EDT：

```java
SwingWorker<String, Void> worker = new SwingWorker<>() {
    @Override
    protected String doInBackground() throws Exception {
        Thread.sleep(1000);
        return "处理完成";
    }

    @Override
    protected void done() {
        try {
            statusLabel.setText(get());
        } catch (Exception ex) {
            statusLabel.setText("处理失败");
        }
    }
};
worker.execute();
```

`doInBackground` 在后台线程执行，`done` 在 EDT 执行。需要报告中途进度时，使用 `publish` 与 `process`。

### 定时器

`javax.swing.Timer` 的回调在 EDT 上执行，可以安全地更新界面：

```java
Timer timer = new Timer(1000, e -> label.setText(LocalTime.now().withNano(0).toString()));
timer.start();
```

`java.util.Timer` 的回调运行在独立线程，更新界面前必须切换到 EDT。界面动画、轮询状态与延迟刷新应优先使用 `javax.swing.Timer`。

## 综合示例：待办清单

下面的程序把窗口、菜单、工具栏、表格、布局与动作事件组合为一个可运行的待办清单。任务保存在制表符分隔的文本文件中，支持添加、删除、勾选完成、打开与保存。

```java
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JToolBar;
import javax.swing.KeyStroke;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.TableRowSorter;
import java.awt.BorderLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

record Task(int id, String title, boolean done) {}

class TaskTableModel extends AbstractTableModel {
    private static final String[] COLUMNS = {"编号", "任务", "完成"};
    private final List<Task> tasks = new ArrayList<>();

    @Override
    public int getRowCount() {
        return tasks.size();
    }

    @Override
    public int getColumnCount() {
        return COLUMNS.length;
    }

    @Override
    public String getColumnName(int column) {
        return COLUMNS[column];
    }

    @Override
    public Class<?> getColumnClass(int columnIndex) {
        return switch (columnIndex) {
            case 0 -> Integer.class;
            case 1 -> String.class;
            default -> Boolean.class;
        };
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        Task task = tasks.get(rowIndex);
        return switch (columnIndex) {
            case 0 -> task.id();
            case 1 -> task.title();
            default -> task.done();
        };
    }

    @Override
    public boolean isCellEditable(int rowIndex, int columnIndex) {
        return columnIndex == 2;
    }

    @Override
    public void setValueAt(Object value, int rowIndex, int columnIndex) {
        if (columnIndex != 2) {
            return;
        }
        Task old = tasks.get(rowIndex);
        tasks.set(rowIndex, new Task(old.id(), old.title(), (Boolean) value));
        fireTableCellUpdated(rowIndex, columnIndex);
    }

    public void add(Task task) {
        tasks.add(task);
        fireTableRowsInserted(tasks.size() - 1, tasks.size() - 1);
    }

    public void removeAt(int rowIndex) {
        tasks.remove(rowIndex);
        fireTableRowsDeleted(rowIndex, rowIndex);
    }

    public void clear() {
        int size = tasks.size();
        tasks.clear();
        if (size > 0) {
            fireTableRowsDeleted(0, size - 1);
        }
    }

    public Task get(int rowIndex) {
        return tasks.get(rowIndex);
    }
}

public class TodoApp {
    private final TaskTableModel model = new TaskTableModel();
    private final JTable table = new JTable(model);
    private final JLabel status = new JLabel("就绪");
    private final JFrame frame = new JFrame("待办清单");
    private int nextId = 1;
    private Path file = Paths.get("tasks.tsv");

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new TodoApp().start());
    }

    private void start() {
        table.setRowSorter(new TableRowSorter<>(model));
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setFillsViewportHeight(true);
        table.setRowHeight(26);
        table.getColumnModel().getColumn(0).setPreferredWidth(60);
        table.getColumnModel().getColumn(1).setPreferredWidth(320);
        table.getColumnModel().getColumn(2).setPreferredWidth(60);

        table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting() && table.getSelectedRow() >= 0) {
                int row = table.convertRowIndexToModel(table.getSelectedRow());
                status.setText("选中：" + model.get(row).title());
            }
        });

        JToolBar toolBar = new JToolBar();
        toolBar.setFloatable(false);
        JButton addButton = new JButton("添加");
        JButton removeButton = new JButton("删除");
        JButton saveButton = new JButton("保存");
        addButton.addActionListener(e -> addTask());
        removeButton.addActionListener(e -> removeTask());
        saveButton.addActionListener(e -> saveFile());
        toolBar.add(addButton);
        toolBar.add(removeButton);
        toolBar.addSeparator();
        toolBar.add(saveButton);

        frame.setJMenuBar(createMenuBar());
        frame.add(toolBar, BorderLayout.NORTH);
        frame.add(new JScrollPane(table), BorderLayout.CENTER);
        frame.add(status, BorderLayout.SOUTH);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        frame.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                saveFile();
                frame.dispose();
                System.exit(0);
            }
        });
        frame.setSize(680, 440);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
        loadFile();
    }

    private JMenuBar createMenuBar() {
        JMenuBar bar = new JMenuBar();
        JMenu fileMenu = new JMenu("文件");

        JMenuItem openItem = new JMenuItem("打开");
        openItem.setAccelerator(KeyStroke.getKeyStroke("control O"));
        openItem.addActionListener(e -> openFile());

        JMenuItem saveItem = new JMenuItem("保存");
        saveItem.setAccelerator(KeyStroke.getKeyStroke("control S"));
        saveItem.addActionListener(e -> saveFile());

        JMenuItem exitItem = new JMenuItem("退出");
        exitItem.addActionListener(e -> {
            saveFile();
            frame.dispose();
            System.exit(0);
        });

        fileMenu.add(openItem);
        fileMenu.add(saveItem);
        fileMenu.addSeparator();
        fileMenu.add(exitItem);
        bar.add(fileMenu);
        return bar;
    }

    private void addTask() {
        String title = JOptionPane.showInputDialog(frame, "任务内容");
        if (title == null || title.isBlank()) {
            return;
        }
        model.add(new Task(nextId++, title.trim(), false));
        status.setText("已添加");

        int lastViewRow = table.getRowCount() - 1;
        if (lastViewRow >= 0) {
            table.setRowSelectionInterval(lastViewRow, lastViewRow);
            table.scrollRectToVisible(table.getCellRect(lastViewRow, 0, true));
        }
    }

    private void removeTask() {
        int viewRow = table.getSelectedRow();
        if (viewRow < 0) {
            status.setText("请先选择一行");
            return;
        }
        int modelRow = table.convertRowIndexToModel(viewRow);
        Task task = model.get(modelRow);
        int choice = JOptionPane.showConfirmDialog(frame, "删除任务：" + task.title(),
                "确认", JOptionPane.YES_NO_OPTION);
        if (choice == JOptionPane.YES_OPTION) {
            model.removeAt(modelRow);
            status.setText("已删除");
        }
    }

    private void openFile() {
        JFileChooser chooser = new JFileChooser();
        chooser.setSelectedFile(file.toFile());
        if (chooser.showOpenDialog(frame) == JFileChooser.APPROVE_OPTION) {
            file = chooser.getSelectedFile().toPath();
            loadFile();
        }
    }

    private void loadFile() {
        if (!Files.exists(file)) {
            return;
        }
        try {
            model.clear();
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                String[] parts = line.split("\t", 3);
                if (parts.length < 3) {
                    continue;
                }
                int id = Integer.parseInt(parts[0]);
                model.add(new Task(id, parts[1], Boolean.parseBoolean(parts[2])));
                nextId = Math.max(nextId, id + 1);
            }
            status.setText("已载入 " + model.getRowCount() + " 条任务");
        } catch (IOException | NumberFormatException ex) {
            JOptionPane.showMessageDialog(frame, "读取失败：" + ex.getMessage(),
                    "错误", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void saveFile() {
        List<String> lines = new ArrayList<>();
        for (int i = 0; i < model.getRowCount(); i++) {
            Task task = model.get(i);
            String title = task.title().replace("\t", " ").replace("\n", " ");
            lines.add(task.id() + "\t" + title + "\t" + task.done());
        }
        try {
            Files.write(file, lines, StandardCharsets.UTF_8);
            status.setText("已保存到 " + file.toAbsolutePath());
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(frame, "保存失败：" + ex.getMessage(),
                    "错误", JOptionPane.ERROR_MESSAGE);
        }
    }
}
```

程序涉及以下几个关键点：

- 表格启用了排序器，`getSelectedRow` 返回视图行号。删除与读取任务时需要用 `convertRowIndexToModel` 转换为模型行号，否则排序后可能删错行。
- 添加任务后调用 `scrollRectToVisible`，保证新增行可见。直接设置选中行不会自动滚动。
- 关闭窗口时先保存再退出。`DO_NOTHING_ON_CLOSE` 配合 `WindowAdapter` 可以插入保存逻辑，若使用 `EXIT_ON_CLOSE` 则会跳过该逻辑。
- `TaskTableModel.clear` 在清空数据后触发删除事件，保证载入新文件时表格不会残留旧行。
- 文件读写使用 UTF-8，避免不同平台默认编码不一致导致中文乱码。

编译与运行：

```text
javac -encoding UTF-8 TodoApp.java
java TodoApp
```

首次保存或关闭窗口时会在工作目录创建 `tasks.tsv`。若需要打包为可执行 jar，可以用 `jar --create --file todo.jar --main-class TodoApp -C . .` 把当前目录的类文件与资源一并打包。

## 常见问题

Swing 的问题大多集中在布局、刷新、事件与线程四个方面。下表列出常见现象与处理方向：

| 现象 | 常见原因 | 处理 |
| :--- | :--- | :--- |
| 界面无响应 | 在 EDT 上执行耗时任务 | 使用 `SwingWorker` 或线程池，完成后回到 EDT |
| 组件不显示 | 未加入容器、未设置尺寸、被同区域组件覆盖 | 检查容器层次与布局约束，调用 `revalidate()` |
| 修改数据后表格不刷新 | 直接修改集合，未触发模型事件 | 通过模型方法修改并触发 `fireTableRows*` |
| 事件不触发 | 监听器注册到错误的组件 | 确认事件源与监听器类型匹配 |
| 文本框监听不到每次输入 | `ActionListener` 只在回车时触发 | 改用 `DocumentListener` |
| 中文显示为方框 | 字体缺少中文字形 | 使用 `SansSerif` 或系统中文字体 |
| 关闭窗口后进程不退出 | 事件分发线程仍在运行 | 使用 `EXIT_ON_CLOSE` 或显式退出 |
| 高 DPI 下界面模糊 | 缩放配置不一致 | 设置 `-Dsun.java2d.uiScale` |
| 服务器上创建窗口失败 | 无图形环境 | 使用无头模式并分离界面与业务逻辑 |

界面卡死的根本原因是事件分发线程被阻塞。Swing 不会因为 EDT 上的长任务抛出异常，界面只是停止响应，因此这类问题不能依赖日志发现。获取线程转储，查看 `AWT-EventQueue` 线程的调用栈，可以快速定位阻塞位置。

布局问题应优先检查组件是否加入容器、容器的布局管理器是否与预期一致，以及修改结构后是否调用了 `revalidate()`。`repaint()` 只触发重绘，不重新计算布局。

## 外观与字体

Swing 的外观由 `LookAndFeel` 控制。可以在启动时切换为系统外观：

```java
try {
    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
} catch (Exception ex) {
    System.err.println("外观加载失败，使用默认外观");
}
```

外观应在创建界面之前设置。界面已经创建时，需要调用 `SwingUtilities.updateComponentTreeUI(frame)` 重新应用。

全局字体可以在创建组件前通过 `UIManager` 设置：

```java
Font uiFont = new Font("Microsoft YaHei", Font.PLAIN, 14);
UIManager.put("Label.font", uiFont);
UIManager.put("Button.font", uiFont);
UIManager.put("TextField.font", uiFont);
UIManager.put("Table.font", uiFont);
```

`UIManager.put` 只影响之后创建的组件。跨平台程序应优先使用逻辑字体 `SansSerif`，由系统完成字形回退。

## 结语

Swing 的基础可以归纳为五条主线：

1. 窗口由 `JFrame` 承载，内容面板负责布局，关闭行为决定进程是否退出；
2. 菜单由菜单栏、菜单与菜单项组成，菜单项与按钮共享 `ActionEvent` 处理方式；
3. 容器负责组织界面，面板、滚动面板、分割面板与选项卡面板覆盖多数布局需求；
4. 布局管理器根据约束计算组件位置，嵌套组合比绝对定位更可靠；
5. `ActionEvent` 是命令类组件的统一事件，`Action` 可以把命令复用到按钮、菜单与工具栏。

掌握这五部分后，常用桌面界面的搭建与维护可以直接完成。更复杂的绘制、模型定制与外观扩展可以在需要时查阅文档，基础结构不会改变。
