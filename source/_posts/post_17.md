---
title: Java 面向对象
date: 2026-11-01 23:00:00
updated: 2026-11-01 23:00:00
categories:
  - 穷理
tags:
  - Java
  - 面向对象
description: 从类与对象、抽象、封装、继承到多态，系统讲解 Java 面向对象的语法、JVM 机制与设计取舍，并给出可运行的完整示例
cover: /img/blog17.webp
---

## 面向对象解决的问题

面向过程与面向对象的差别不在于语法，而在于分解问题的方式。面向过程以步骤为单位组织程序，先确定算法流程，再把数据作为参数在函数之间传递；面向对象以概念为单位组织程序，先识别问题域中的参与者，再为每个参与者定义状态、行为与职责边界。

以一个图书借阅系统为例。面向过程的写法会围绕借书这一流程展开：查询图书、判断库存、生成借阅记录、扣减库存、计算到期日。流程中的每一步都是一个函数，图书、读者、借阅记录则表现为若干张数据表或结构体，由函数依次读写。这种组织方式在流程稳定时足够清晰，一旦规则变化，例如增加预约、续借、逾期计费，流程函数就需要反复修改，数据的一致性也要由调用方手工维护。

面向对象的写法先识别三类参与者：图书持有库存与借阅状态，读者持有借阅额度与借阅记录，借阅记录持有起止时间与计费规则。借书这一动作由参与者之间的协作完成，而不是由一段集中的流程代码完成。规则变化时，修改落在承担该规则的类内部，调用方无需了解细节。这种分解方式的收益随系统规模增长而放大，因为变更被限制在较小的范围内。

Java 自 1995 年发布起就以面向对象为核心设计。除八种基本类型外，Java 中的数据都以对象形式存在，标准库、异常体系与内存模型都建立在对象模型之上。理解类、对象、封装、继承与多态，是阅读 Java 代码与使用 Java 类库的前提。

本文的组织顺序如下：先说明类与对象、类的结构、变量、构造方法与常用关键字，再讨论方法重载、可变参数、抽象、封装、继承与多态，随后分析各项机制的关系、常见误区与现代 Java 的补充，最后给出一个完整的订单计价示例。

## 类与对象

### 类是对问题域的建模

类是同一类事物共有属性与行为的抽象描述，对象是类在运行期的实例。类定义类型，对象持有状态。二者在语言层面分别对应类型与值，在建模层面分别对应共性与个体。

Java 的类定义由字段与方法组成。字段描述对象的状态，方法描述对象的行为：

```java
class Student {
    // 字段：对象的状态
    String name;
    int age;

    // 方法：对象的行为
    void study() {
        System.out.println(name + " 正在学习");
    }
}
```

这段代码定义了一个类型，但尚未创建任何对象。类在第一次被主动使用时才由 JVM 加载，加载过程包括验证、准备与解析，随后执行静态初始化。类的加载与对象的创建是两个不同阶段，前者每个类只发生一次，后者每次 `new` 都会发生。

### 类的结构

一个 Java 类由若干成员组成，成员可以按职责分为以下几类：

| 成员 | 作用 | 示例 |
| :--- | :--- | :--- |
| 字段 | 保存对象或类的状态 | `private String title;` |
| 方法 | 定义对象或类可执行的行为 | `public String getTitle() { ... }` |
| 构造方法 | 初始化新创建的对象 | `public Course(String title) { ... }` |
| 初始化块 | 在对象创建或类初始化时执行 | `static { ... }`、`{ ... }` |
| 嵌套类 | 定义在类内部的类型 | `static class Rule { ... }` |

一个包含全部成员的类如下：

```java
public class Course {
    private static int totalCount = 0;      // 类变量：所有对象共享
    private String title;                    // 实例变量：每个对象一份

    static {                                 // 静态初始化块：类初始化时执行一次
        System.out.println("Course 类初始化");
    }

    {                                        // 实例初始化块：每次创建对象时执行
        totalCount++;
    }

    public Course(String title) {            // 构造方法
        this.title = title;
    }

    public String getTitle() {               // 实例方法
        return title;
    }

    public static int getTotalCount() {      // 静态方法
        return totalCount;
    }

    static class Rule {                      // 静态嵌套类
        boolean isValid(String text) {
            return text != null && !text.isBlank();
        }
    }
}
```

类的成员可以分别使用四种访问修饰符。字段、方法、构造方法与嵌套类的可见性互相独立，外部只能访问允许访问的成员。顶层类本身只能是 `public` 或包私有，一个源文件中最多有一个 `public` 顶层类，且文件名必须与该类名一致。

### 变量与作用域

Java 中的变量按声明位置与生命周期分类，术语在使用中容易混淆：

- **成员变量**是类体中声明的字段的统称，包括实例变量与类变量；
- **实例变量**是非 `static` 字段，每个对象持有一份，随对象创建与回收；
- **类变量**是 `static` 字段，所有对象共享一份，随类初始化；
- **局部变量**是方法、构造方法、初始化块或 Lambda 内部声明的变量，随方法调用创建与销毁；
- **参数**是方法或构造方法签名中声明的变量，属于局部变量的一种。

| 变量种类 | 声明位置 | 是否共享 | 默认值 | 生命周期 |
| :--- | :--- | :--- | :--- | :--- |
| 实例变量 | 类体 | 每个对象一份 | 有 | 随对象 |
| 类变量 | 类体，带 `static` | 所有对象共享 | 有 | 随类 |
| 局部变量 | 方法或代码块 | 每次调用独立 | 无，必须先赋值 | 随方法调用 |
| 参数 | 方法签名 | 每次调用独立 | 无 | 随方法调用 |

实例变量与类变量有默认值：整数类型为 0，浮点类型为 0.0，`char` 为 `\u0000`，`boolean` 为 `false`，引用类型为 `null`。局部变量没有默认值，未赋值就使用会编译失败。

当参数或局部变量与字段同名时，局部变量优先，字段需要通过 `this` 访问：

```java
public class ShadowDemo {
    private String name = "字段";

    public void print(String name) {
        System.out.println(name);        // 参数
        System.out.println(this.name);   // 字段
    }
}
```

`static` 成员属于类，不属于某个对象。静态方法中没有 `this`，不能直接访问实例变量，只能通过对象引用访问。实例方法既可以访问实例成员，也可以访问静态成员。

### 对象的创建过程

`new Student()` 在 HotSpot 虚拟机上的执行过程可以拆成六步：

1. **类加载检查**：检查常量池中是否存在 `Student` 的符号引用，并确认该类已完成加载、链接与初始化；若没有，先触发类加载。
2. **分配内存**：在堆中分配对象所需空间。空间大小在类加载完成后已经确定。分配方式取决于堆是否规整：规整时使用指针碰撞，不规整时使用空闲列表。多线程环境下通过 TLAB 或 CAS 保证分配安全。
3. **内存清零**：将实例字段所在区域置零，使字段先取得类型默认值。数值型为 0，布尔型为 false，引用型为 null。这一步保证了对象的字段在构造器执行前也有确定值。
4. **设置对象头**：写入 Mark Word 与类型指针。Mark Word 保存哈希码、GC 分代年龄与锁状态，类型指针指向方法区中的类元数据。
5. **执行构造器**：调用 `<init>` 方法。执行次序为父类构造器、实例初始化块与字段显式初始化（按源码顺序）、构造器体。
6. **返回引用**：将对象引用交给调用方，通常存放在栈帧的局部变量表中。

第 5 步的次序是理解继承与构造器链的关键。父类构造器先于子类字段初始化执行，因此父类构造器中调用的可重写方法会访问到尚未初始化的子类字段。这一点在常见误区一节单独讨论。

### 构造方法

构造方法是与类同名、没有返回类型的方法，由 `new` 调用，用于把新对象从默认状态转换为合法状态。构造方法不是普通方法，不能声明返回值，也不能被继承或重写。

```java
public class Student {
    private final String id;
    private String name;
    private int age;

    public Student(String id) {
        this(id, "未命名", 0);           // 调用同类中的另一个构造方法
    }

    public Student(String id, String name, int age) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("学号不能为空");
        }
        this.id = id;
        this.name = name;
        this.age = age;
    }

    public Student(Student other) {      // 复制构造方法
        this(other.id, other.name, other.age);
    }
}
```

构造方法的重载规则与普通方法相同：参数列表不同即可。`this(...)` 调用同类中的另一个构造方法，`super(...)` 调用父类构造方法，二者都只能出现在构造方法体的第一条语句，因此不能同时使用。

如果一个类没有声明任何构造方法，编译器会提供一个与类同访问级别的无参构造方法。一旦声明了任意构造方法，编译器不再提供默认构造方法。子类构造方法若未显式调用父类构造方法，编译器会插入 `super()`，因此父类必须存在可访问的无参构造方法。

构造方法可以声明为 `private`，用于限制外部创建对象：

```java
public final class MathUtils {
    private MathUtils() {
    }

    public static int gcd(int a, int b) {
        while (b != 0) {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }
}
```

工具类不需要实例状态，把构造方法设为私有可以阻止实例化。单例模式与工厂方法也常使用私有构造方法控制对象的创建入口。

构造方法与普通方法的区别如下：

| 维度 | 构造方法 | 普通方法 |
| :--- | :--- | :--- |
| 名称 | 必须与类名相同 | 任意合法标识符 |
| 返回类型 | 无 | 必须声明，包括 `void` |
| 调用方式 | `new` 自动调用 | 通过对象或类显式调用 |
| 继承与重写 | 不继承、不重写 | 可以继承与重写 |
| 默认提供 | 无构造方法时提供无参构造方法 | 不适用 |

`void Student()` 是普通方法，不是构造方法。构造方法与类同名且没有返回类型，二者缺一不可。

### 构造器与初始化顺序

构造器负责把对象从默认状态转换为合法状态。下面的例子同时包含静态初始化块、实例初始化块、字段初始化与构造器，可用于观察完整的执行顺序：

```java
class Parent {
    static { System.out.println("Parent 静态块"); }
    { System.out.println("Parent 实例块"); }
    String name = initName();

    Parent() {
        System.out.println("Parent 构造器");
    }

    String initName() {
        System.out.println("Parent 字段初始化");
        return "parent";
    }
}

class Child extends Parent {
    static { System.out.println("Child 静态块"); }
    { System.out.println("Child 实例块"); }
    int age = initAge();

    Child() {
        super();
        System.out.println("Child 构造器");
    }

    int initAge() {
        System.out.println("Child 字段初始化");
        return 18;
    }
}

public class InitOrder {
    public static void main(String[] args) {
        System.out.println("第一次创建");
        new Child();
        System.out.println("第二次创建");
        new Child();
    }
}
```

运行输出：

```text
Parent 静态块
Child 静态块
第一次创建
Parent 实例块
Parent 字段初始化
Parent 构造器
Child 实例块
Child 字段初始化
Child 构造器
第二次创建
Parent 实例块
Parent 字段初始化
Parent 构造器
Child 实例块
Child 字段初始化
Child 构造器
```

静态块只在类初始化时执行一次，且父类先于子类。实例块与字段初始化在每次创建对象时执行，次序固定为父类在前、子类在后，同一类内部按源码顺序执行。构造器体最后执行。这一顺序由 JVM 规范约束，不依赖具体实现。

若子类构造器首行既没有调用 `super(...)`，也没有调用 `this(...)`，编译器会自动插入无参的 `super()`。若父类没有可访问的无参构造器，编译失败。`super(...)` 与 `this(...)` 都要求占据构造器体的第一条语句，因此不能同时出现。

> **理论补充：类的初始化时机。** 类加载与类初始化不是同一阶段。加载、验证、准备完成后，类不一定立即初始化；只有首次主动使用（创建实例、访问静态字段或静态方法、反射调用、初始化子类）才会触发初始化，从而执行静态初始化块与静态字段赋值。`Class.forName` 默认触发初始化，`ClassLoader.loadClass` 默认不触发。

## 常用关键字

Java 的面向对象能力由一组关键字表达。关键字的语义往往与编译期检查、运行期分派相关，仅记住语法形式不足以正确使用。

| 关键字 | 作用 |
| :--- | :--- |
| `this` | 引用当前对象 |
| `super` | 引用父类部分 |
| `static` | 声明类级别的成员 |
| `final` | 禁止修改、重写或继承 |
| `abstract` | 声明抽象类或抽象方法 |
| `extends` | 继承类或接口 |
| `implements` | 实现接口 |
| `interface` | 声明接口 |
| `instanceof` | 判断运行时类型 |
| `new` | 创建对象或数组 |
| `package` | 声明包 |
| `import` | 引入其他包中的类型 |

### this

`this` 指向当前对象，只能在实例方法与构造方法中使用。主要用途包括：

- 区分同名的字段与参数：`this.name = name;`
- 在构造方法中调用同类其他构造方法：`this(id, name, 0);`
- 把当前对象作为参数传递：`register(this);`
- 返回当前对象以支持链式调用：`return this;`

在内部类中，`this` 指向内部类实例，访问外部类实例需要使用 `Outer.this`。

### super

`super` 指向当前对象中的父类部分，它不是独立的父类对象。主要用途包括：

- 调用父类构造方法：`super(name);`
- 调用父类被重写的方法：`super.toString();`
- 访问父类字段：`super.count`。

`super` 不能在静态上下文中使用，也不能通过 `super.super` 跳过直接父类。父类构造方法的调用必须发生在子类构造方法的第一条语句。

### static

`static` 声明属于类而非某个对象的成员，可以修饰字段、方法、初始化块与嵌套类。静态成员在类初始化时准备，所有对象共享同一份静态字段。

静态方法没有 `this`，不能直接访问实例字段与实例方法，只能访问静态成员或通过对象引用访问实例成员。静态方法不参与运行期多态，子类定义同签名方法只构成隐藏，调用版本由引用类型决定。

`static final` 组合用于声明常量：

```java
public static final int MAX_RETRY = 3;
```

静态导入可以省略类名，但会降低代码的可读性，通常只用于常量与测试断言。

### final

`final` 的语义随修饰对象变化：

| 修饰对象 | 含义 |
| :--- | :--- |
| 变量 | 只能赋值一次 |
| 方法 | 不能被子类重写 |
| 类 | 不能被继承 |

`final` 变量必须在声明时或构造方法结束前完成赋值。`final` 修饰引用时，引用本身不能改变，但引用指向的对象内容仍可修改：

```java
final List<String> names = new ArrayList<>();
names.add("张三");        // 允许
// names = new ArrayList<>();   // 编译错误
```

因此，`final` 引用不等于不可变对象。不可变对象要求字段全部为 `final`、不提供修改方法，并对可变引用做防御性复制。

### abstract

`abstract` 用于声明抽象类或抽象方法。抽象类不能实例化，可以包含字段、构造方法、具体方法与抽象方法；抽象方法只有声明没有实现，子类必须实现，除非子类本身也是抽象类。

抽象方法不能是 `private`、`static` 或 `final`，因为这三种修饰与强制子类实现相矛盾。抽象类可以没有抽象方法，但此时使用抽象类通常是为了阻止实例化或表达未完成的类型。

### extends 与 implements

`extends` 用于类继承或接口继承。类只能单继承，接口可以多继承。`implements` 用于类实现接口，一个类可以实现多个接口。

```java
interface Readable {
    void read();
}

interface Writable {
    void write();
}

class FileHandle implements Readable, Writable {
    @Override
    public void read() {
    }

    @Override
    public void write() {
    }
}
```

实现接口的类必须实现全部抽象方法，否则该类必须声明为 `abstract`。

### instanceof

`instanceof` 判断对象是否为指定类型或其子类型。左操作数为 `null` 时返回 `false`，不会抛出异常。

JDK 16 起支持模式匹配，判断成功后直接绑定变量：

```java
if (shape instanceof Circle circle) {
    System.out.println(circle.radius());
}
```

模式匹配减少了强制转换与重复判断，但不改变多态的设计原则。类型分支应当仅在类型集合有限且行为无法由类型自身承担时使用。

### new

`new` 用于创建对象或数组。创建对象时，`new` 依次触发类初始化、内存分配、字段默认值填充、构造方法执行，最后返回引用。`new` 也可以创建匿名类实例：

```java
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("执行任务");
    }
};
```

### package 与 import

`package` 声明当前类型所属的包，包名与目录结构对应。包既是命名空间，也是访问控制的边界，包私有成员只能被同包类型访问。

`import` 引入其他包中的类型，可以引入单个类型或按需引入整个包。`java.lang` 包中的类型自动引入，不需要显式导入。静态导入用于引入静态成员，应谨慎使用。

## 方法重载

### 重载的规则

方法重载指同一个类中定义多个同名方法，参数列表不同。参数列表的差异可以体现为参数个数、参数类型或参数顺序。返回类型、访问修饰符与抛出异常不参与重载判断。

```java
public class Printer {
    public void print(int value) {
        System.out.println("整数: " + value);
    }

    public void print(String value) {
        System.out.println("字符串: " + value);
    }

    public void print(int value, int times) {
        for (int i = 0; i < times; i++) {
            System.out.println("整数: " + value);
        }
    }
}
```

仅返回类型不同的两个方法不构成重载，编译器会报错。构造方法同样可以重载。

### 重载解析

重载方法在编译期确定调用版本，依据是参数的静态类型。编译器按以下顺序选择：

1. 不进行装箱、拆箱与可变参数匹配，寻找参数类型可直接兼容的方法；
2. 允许装箱、拆箱，再次寻找；
3. 允许可变参数，最后寻找。

同一阶段存在多个候选时，选择最具体的方法。若无法确定唯一的最具体方法，编译失败。

```java
static void show(int value) { System.out.println("int"); }
static void show(long value) { System.out.println("long"); }

show(1);          // 输出 int，int 比 long 更具体
```

常见歧义包括：

```java
static void f(int a, long b) { }
static void f(long a, int b) { }

f(1, 1);          // 编译错误：两个版本同样适用
```

`null` 作为实参时也可能产生歧义：

```java
static void g(String value) { }
static void g(Integer value) { }

g(null);          // 编译错误：无法确定目标类型
```

重载与重写的区别在多态一节给出，二者的绑定时期与多态含义完全不同。

## 可变参数

可变参数允许方法接受任意数量的同类型实参。声明方式是在参数类型后加三个点：

```java
public static int sum(int... values) {
    int total = 0;
    for (int value : values) {
        total += value;
    }
    return total;
}
```

调用形式：

```java
sum();            // 等价于 sum(new int[0])
sum(1);           // 等价于 sum(new int[]{1})
sum(1, 2, 3);     // 等价于 sum(new int[]{1, 2, 3})
```

可变参数在编译后就是数组。方法内部可以按下标访问，也可以使用增强 `for` 循环。直接传入数组同样合法：

```java
int[] data = {1, 2, 3};
sum(data);
```

可变参数的使用规则如下：

- 一个方法最多只能有一个可变参数；
- 可变参数必须是参数列表的最后一个；
- 可变参数可以接受零个实参；
- 可变参数与固定参数可以组合，例如 `log(String format, Object... args)`。

```java
public static void log(String format, Object... args) {
    System.out.printf(format + "%n", args);
}
```

可变参数与重载同时使用时容易产生歧义。固定参数版本优先于可变参数版本：

```java
static void h(int a) { }
static void h(int... a) { }

h(1);             // 调用 h(int)，固定参数优先
```

向可变参数传入 `null` 时，编译器可能把它解释为 `null` 数组，而不是包含一个 `null` 元素的数组。方法内部遍历该参数会抛出 `NullPointerException`。需要传入单个 `null` 元素时，应显式构造数组。

泛型可变参数可能产生堆污染警告，可以使用 `@SafeVarargs` 标注只读使用参数的方法。

## 抽象：接口与抽象类

### 抽象的含义

抽象是在建模时忽略与当前问题无关的细节，只保留决定行为的特征。抽象不是笼统化，而是有依据的取舍：同一组对象在某个维度上具有相同的行为约束，就把这一约束提取为类型，把差异留给具体实现。

Java 提供两级抽象设施。抽象类表达部分实现、部分待定的概念，允许包含字段、构造器、具体方法与抽象方法；接口表达能力契约，规定实现类必须提供的行为，JDK 8 之后还可以携带默认方法与静态方法。二者都不能直接实例化，都必须由具体类补全语义。

```java
abstract class Shape {
    protected final String name;

    protected Shape(String name) {
        this.name = name;
    }

    abstract double area();          // 抽象方法：由子类给出面积公式

    void describe() {                // 具体方法：共享的输出逻辑
        System.out.printf("%s 的面积是 %.2f%n", name, area());
    }
}

class Circle extends Shape {
    private final double radius;

    Circle(double radius) {
        super("圆");
        this.radius = radius;
    }

    @Override
    double area() {
        return Math.PI * radius * radius;
    }
}

interface Drawable {
    void draw();                     // 能力契约

    default void clear() {           // JDK 8 起的默认方法
        System.out.println("清除绘制内容");
    }
}
```

`Shape` 规定了所有图形必须具备面积计算能力，并复用了描述逻辑；`Circle` 只需给出面积公式。`Drawable` 则规定实现类具备绘制能力，与继承层次无关。一个类可以同时继承一个抽象类并实现多个接口，这是 Java 在单继承约束下保留组合表达能力的方式。

### 接口的声明与实现

接口用 `interface` 声明，定义一组能力契约。接口中的抽象方法隐式为 `public abstract`，字段隐式为 `public static final`。接口不能声明实例字段与构造方法，因此不持有对象状态。

```java
public interface Payable {
    double RATE = 0.13;              // public static final

    double amount();                 // public abstract

    default double tax() {           // JDK 8 起的默认方法
        return amount() * RATE;
    }

    static Payable fixed(double value) {   // JDK 8 起的静态方法
        return () -> value;
    }
}

class Order implements Payable {
    private final double total;

    public Order(double total) {
        this.total = total;
    }

    @Override
    public double amount() {
        return total;
    }
}
```

实现类用 `implements` 声明接口，必须实现全部抽象方法，否则必须声明为 `abstract`。一个类可以实现多个接口，接口之间用逗号分隔。接口也可以继承多个接口：

```java
interface Readable {
    void read();
}

interface Writable {
    void write();
}

interface ReadWrite extends Readable, Writable {
}
```

接口中的默认方法提供可选实现，实现类可以直接继承或重写。静态方法属于接口本身，通过接口名调用。JDK 9 起接口可以定义私有方法，用于复用默认方法中的公共逻辑。

只有一个抽象方法的接口称为函数式接口，可以使用 Lambda 表达式实现：

```java
@FunctionalInterface
interface Validator {
    boolean test(String value);
}

Validator notEmpty = value -> value != null && !value.isEmpty();
```

`@FunctionalInterface` 注解让编译器检查接口是否恰好只有一个抽象方法。`Runnable`、`Comparator`、`Function` 都是标准库中的函数式接口。

接口不包含实例状态，因此不能表达对象之间的共享字段与初始化逻辑。需要共享状态或骨架实现时，应使用抽象类。接口的优势在于类型可以同时具备多种能力，并且实现类不必处于同一继承层次。

### 抽象类与接口的取舍

二者在语法上高度相似，选择依据是语义关系而非便利程度：

| 维度 | 抽象类 | 接口 |
| :--- | :--- | :--- |
| 表达的关系 | is-a，类型层次中的共性 | can-do，可附加的能力 |
| 继承数量 | 一个类只能继承一个 | 一个类可以实现多个 |
| 字段 | 可包含实例字段与静态字段 | 字段隐式为 `public static final` |
| 构造器 | 有，可约束子类初始化 | 无 |
| 方法 | 抽象方法与具体方法均可 | 抽象方法、默认方法、静态方法、私有方法 |
| 适用场景 | 多个子类共享状态与骨架实现 | 跨类型的能力约定与解耦 |

判断标准可以归纳为一句：如果子类与父类之间存在严格的 is-a 关系，并且需要共享状态或骨架实现，使用抽象类；如果只是要求某类具备某项能力，或者需要让互不相关的类接受同一套调用约定，使用接口。

### 接口默认方法的冲突

JDK 8 引入默认方法后，接口维度出现了多继承中的歧义。当一个类实现的多个接口含有签名相同的默认方法时，编译器无法自动选择，必须由该类显式指定：

```java
interface A {
    default void hello() { System.out.println("A"); }
}

interface B {
    default void hello() { System.out.println("B"); }
}

class C implements A, B {
    @Override
    public void hello() {
        A.super.hello();       // 显式选择 A 的版本
    }
}
```

这一规则可以概括为：类中的方法优先于接口默认方法，子接口的默认方法优先于父接口，冲突无法消解时必须显式指定。类继承维度不存在菱形问题，接口维度则把冲突显式化并要求手工处理。

## 封装

### 封装包含聚合与信息隐藏

封装包含两个不可分割的方面。其一是聚合，把状态与操作状态的方法放在同一个结构体内；其二是信息隐藏，隐藏内部实现，只通过受控接口与外部交互。只把字段和方法写进同一个类，而不限制外部访问，不构成完整意义上的封装。

信息隐藏的目的不是保密，而是建立稳定的边界。调用方只依赖公共方法的签名与语义，实现方可以在不破坏调用的前提下替换数据结构、增加缓存或改变算法。边界越清晰，局部修改的影响范围越小。

### 访问控制

Java 用四个访问级别控制可见性：

| 修饰符 | 同类 | 同包 | 子类（不同包） | 任意类 |
| :--- | :-: | :-: | :-: | :-: |
| `private` | 是 | 否 | 否 | 否 |
| 默认（包私有） | 是 | 是 | 否 | 否 |
| `protected` | 是 | 是 | 是 | 否 |
| `public` | 是 | 是 | 是 | 是 |

`protected` 在跨包继承时有一条限制：子类只能通过自身类型或自身子类型的引用访问继承来的 `protected` 成员，不能通过父类类型的引用访问。这一规则保证了受保护成员的访问范围不会因为向上转型而扩大。

### 受控访问与不变式

封装的典型写法是把字段声明为 `private`，通过 `public` 方法读写，并在写入路径上校验。下面的 `Account` 保证余额不会为负：

```java
public class Account {
    private final String id;
    private long balance;

    public Account(String id, long initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("初始余额不能为负");
        }
        this.id = id;
        this.balance = initialBalance;
    }

    public void deposit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("存款金额必须为正");
        }
        balance += amount;
    }

    public void withdraw(long amount) {
        if (amount <= 0 || amount > balance) {
            throw new IllegalArgumentException("取款金额非法");
        }
        balance -= amount;
    }

    public long getBalance() {
        return balance;
    }
}
```

余额只能通过 `deposit` 与 `withdraw` 改变，两个入口都做了校验，因此 `balance` 在所有方法执行期间都满足非负约束。这类必须始终成立的条件称为不变式。把不变式收敛到少数入口，后续方法就可以在状态合法的前提下编写，防御性检查不必散布到每个调用点。

### 不可变对象

如果一个对象在构造完成后状态不再变化，就称为不可变对象。实现方式是把所有字段声明为 `private final`，在构造器中完成校验与赋值，不提供修改方法，对可变引用类型的字段做防御性复制。

不可变对象天然线程安全，可以被自由共享，也适合作为值对象使用。`String`、`Integer`、`LocalDate` 都是不可变类。与之相对，`Date`、`ArrayList` 是可变的，把它们作为字段暴露出去会破坏封装：

```java
public final class Period {
    private final Date start;
    private final Date end;

    public Period(Date start, Date end) {
        this.start = new Date(start.getTime());   // 防御性复制
        this.end = new Date(end.getTime());
        if (this.start.after(this.end)) {
            throw new IllegalArgumentException("开始时间晚于结束时间");
        }
    }

    public Date getStart() {
        return new Date(start.getTime());         // 返回副本
    }
}
```

如果构造器直接保存外部传入的 `Date` 引用，调用方可以在构造后修改它，从而绕过校验；如果 getter 直接返回内部引用，调用方同样可以修改内部状态。防御性复制切断了这两条路径。

### 封装的工程收益

封装带来的收益可以归为三点。第一，正确性：状态变更集中在受校验的入口，不变式容易维持。第二，可替换性：调用方依赖接口而非实现，内部结构可以独立演化。第三，可维护性：修改范围被限制在类内部，符合高内聚、低耦合的设计要求。

需要强调的是，getter 与 setter 本身不构成封装。为每个字段机械地生成一对读写方法，只是把 `public` 字段换成了 `public` 方法，外部仍然可以任意修改状态。封装的关键在于控制谁能改变什么，以及改变时必须满足什么条件。
## 继承

### 泛化与 is-a 关系

继承描述两个类之间的泛化与特化关系：子类自动获得父类的字段与方法，并可扩展新成员或改写已有方法。语义上，继承对应 is-a 关系，即子类是父类的一种特例。`Dog` 继承 `Animal` 成立，是因为狗是一种动物；`Car` 继承 `Engine` 不成立，因为汽车不是一种发动机，只是装配了一台发动机。

Java 的继承语法由 `extends` 声明，子类通过 `super` 访问父类的构造器与被覆盖的方法：

```java
class Animal {
    protected String name;

    Animal(String name) {
        this.name = name;
    }

    void eat() {
        System.out.println(name + " 正在进食");
    }
}

class Dog extends Animal {
    Dog(String name) {
        super(name);
    }

    @Override
    void eat() {
        super.eat();                       // 复用父类实现
        System.out.println(name + " 正在咀嚼");
    }

    void bark() {
        System.out.println(name + " 正在叫");
    }
}
```

### 单继承与接口多实现

Java 的类继承是单继承：一个类至多有一个直接父类，但可以同时实现多个接口。这一设计规避了多继承在类层次上产生的菱形歧义，同时用接口保留多能力组合。

多继承的歧义在于同一成员沿多条路径被重复继承，状态与实现的来源无法唯一确定。接口不含实例字段，默认方法冲突又必须显式消解，因此接口维度不会产生状态歧义。

### 构造器链

子类对象的构造从父类开始。子类构造器首行如果没有显式调用 `super(...)` 或 `this(...)`，编译器会插入无参的 `super()`：

```java
class Base {
    Base() {
        System.out.println("Base()");
    }

    Base(String msg) {
        System.out.println("Base(" + msg + ")");
    }
}

class Derived extends Base {
    Derived() {
        super("带参");          // 必须显式调用，因为父类没有无参构造器时
        System.out.println("Derived()");
    }
}
```

如果父类只定义了带参构造器，子类构造器不显式调用 `super(...)` 就会编译失败，因为编译器插入的 `super()` 找不到匹配的方法。构造器链保证了父类字段先于子类字段完成初始化，也保证了父类的不变式在子类构造器执行前已经建立。

### 方法重写的规约

方法重写必须满足以下约束：

- 方法名与参数列表完全一致；
- 返回类型相同，或者是父类返回类型的子类型（协变返回）；
- 访问权限不能收窄，可以放宽；
- 声明抛出的受检异常不能比父类更宽泛，可以更少或更具体；
- 父类方法不能是 `final`、`private` 或 `static`。

`@Override` 注解不是语法必需，但应当始终添加。它的作用是让编译器校验方法签名确实构成重写。缺少该注解时，参数列表写错会静默地变成一个重载方法，调用方仍然能编译通过，行为却与预期不符。

> **理论补充：协变返回与桥接方法。** 子类重写方法返回父类返回类型的子类型时，编译器会在子类中生成一个桥接方法，其签名与父类一致，内部调用真正的子类实现。桥接方法对源码不可见，但会出现在字节码与反射结果中。这也是泛型擦除后多态仍能正确分派的原因之一。

### 三类特殊方法的覆盖语义

`final`、`private`、`static` 方法看起来都不能被重写，原因却各不相同：

| 修饰符 | 子类能否定义同签名方法 | 语义 | 调用版本的决定依据 |
| :--- | :--- | :--- | :--- |
| `final` | 不能，编译错误 | 禁止覆盖 | 无需讨论 |
| `private` | 能，但与父类方法无关 | 父类方法对子类不可见，不构成重写 | 引用声明类型 |
| `static` | 能 | 方法隐藏，不构成重写 | 引用声明类型 |

`static` 方法不参与动态分派，调用版本在编译期由引用类型决定。下面这段代码输出的是父类版本：

```java
class P {
    static void hello() { System.out.println("P"); }
}

class Q extends P {
    static void hello() { System.out.println("Q"); }
}

public class StaticDispatch {
    public static void main(String[] args) {
        P p = new Q();
        p.hello();          // 输出 P
    }
}
```

### 继承的代价与组合

继承建立了强耦合：子类依赖父类的实现细节，父类的修改会沿继承层次传播。如果一个类只是为了复用几个方法而继承另一个类，语义上并不成立，得到的只是耦合。

组合是更稳妥的复用方式：把被复用的对象作为字段持有，通过委托调用其方法。下面的两种写法功能相似，耦合程度不同：

```java
// 继承：Car 不是 Engine，关系不成立
class Car extends Engine {
    void start() { ignite(); }
}

// 组合：Car 持有一个 Engine
class Car {
    private final Engine engine = new Engine();

    void start() {
        engine.ignite();
    }
}
```

组合可以在运行期替换被委托的对象，也可以只暴露需要的方法，不会继承无关的接口。设计时的一般原则是优先使用组合，只有在 is-a 关系成立且确实需要多态替换时才使用继承。

## 多态

### 运行期多态的条件

多态指同一调用在不同实际类型上产生不同行为。Java 的运行期多态需要同时满足三个条件：

1. 存在继承或接口实现关系；
2. 子类重写了父类或接口中的方法；
3. 通过父类或接口类型的引用调用该方法，实际对象是子类实例。

```java
class Cat extends Animal {
    Cat(String name) {
        super(name);
    }

    @Override
    void eat() {
        System.out.println(name + " 安静地进食");
    }
}

public class PolymorphismDemo {
    public static void main(String[] args) {
        Animal[] animals = { new Dog("阿黄"), new Cat("咪咪") };
        for (Animal animal : animals) {
            animal.eat();
        }
    }
}
```

运行输出：

```text
阿黄 正在进食
阿黄 正在咀嚼
咪咪 安静地进食
```

循环中只有一处 `animal.eat()`，执行的方法版本由对象的实际类型决定。新增 `Animal` 的子类不需要修改这段循环，扩展点与修改点因此分离。

### 动态分派与虚方法表

运行期多态依赖动态分派。HotSpot 为每个类维护一张虚方法表，表中记录该类及其继承体系中各虚方法的实际入口地址。子类重写某方法时，表中对应条目被替换为子类实现的地址。执行 `invokevirtual` 指令时，JVM 根据接收对象的实际类型查找方法表，定位最终执行的方法。

接口调用使用 `invokeinterface` 指令，实现上依赖接口方法表。不同虚拟机的具体结构可能不同，JVM 规范只要求行为一致，不规定表的具体形式。

并非所有调用都走动态分派：

| 指令 | 用途 | 是否动态分派 |
| :--- | :--- | :--- |
| `invokevirtual` | 普通实例方法 | 是 |
| `invokeinterface` | 接口方法 | 是 |
| `invokespecial` | 构造器、`private` 方法、`super` 调用 | 否 |
| `invokestatic` | 静态方法 | 否 |
| `invokedynamic` | Lambda 与动态语言支持 | 由引导方法决定 |

### 字段隐藏

字段不参与动态分派。字段访问在编译期根据引用类型确定，父子类中的同名字段构成隐藏关系，而不是覆盖：

```java
class Parent {
    String tag = "parent";
}

class Child extends Parent {
    String tag = "child";
}

public class FieldHiding {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.tag);      // 输出 parent
    }
}
```

这一行为常被概括为编译期依据引用类型、运行期依据对象类型。该结论只对实例方法成立。字段、静态方法与 `private` 方法都按引用类型静态绑定，理解这一点可以避免大量看似反常的输出。

### 重载与重写

重载与重写都表现为同名方法，机制完全不同：

| 维度 | 重载 | 重写 |
| :--- | :--- | :--- |
| 发生位置 | 同一个类内，或父子类之间 | 子类与父类之间 |
| 参数列表 | 必须不同 | 必须相同 |
| 返回类型 | 无约束 | 相同或协变 |
| 访问权限 | 无约束 | 不能收窄 |
| 绑定时期 | 编译期 | 运行期 |
| 多态类型 | 编译期多态 | 运行期多态 |

重载的选择在编译期完成，依据是参数的静态类型。下面的调用会选择 `f(Object)`，即使实际参数是 `String`：

```java
static void f(Object o) { System.out.println("Object"); }
static void f(String s) { System.out.println("String"); }

Object arg = "hello";
f(arg);          // 输出 Object
```

### 用多态消除类型分支

当行为随类型变化时，集中式的类型判断会把所有变化点固化在同一处：

```java
void feed(Animal animal) {
    if (animal instanceof Dog) {
        // 犬类喂养逻辑
    } else if (animal instanceof Cat) {
        // 猫类喂养逻辑
    }
}
```

每新增一个子类，这段代码都要修改。把差异下放到子类的重写方法之后，调用方只依赖 `Animal` 的接口，新增类型不需要修改既有代码：

```java
abstract class Animal {
    abstract void feed();
}

class Dog extends Animal {
    @Override
    void feed() { /* 犬类喂养逻辑 */ }
}

class Cat extends Animal {
    @Override
    void feed() { /* 猫类喂养逻辑 */ }
}
```

这一改写对应开闭原则：对扩展开放，对修改封闭。策略模式、模板方法模式、工厂方法模式都建立在这一机制之上，Java 集合框架、JDBC 与 Spring 容器也大量依赖多态完成实现替换。

多态并不排斥类型判断。当分支涉及类型本身无法承担的外部逻辑，或者类型集合有限且封闭时，`instanceof` 与模式匹配仍然合适。判断标准是变化点应当由谁承担，而不是一律禁止条件语句。
## 三大特性的关系

封装、继承与多态不是三组彼此独立的语法，而是一套层层递进的结构：

```text
抽象：确定系统中有哪些概念、各自承担什么职责
  |
封装：把概念落实为自包含、可自我保护的对象
  |
继承：在对象之间建立泛化与特化关系，形成类型层次
  |
多态：通过统一接口调用不同实现，隔离变化
```

抽象确定模型，封装划定边界，继承组织层次，多态承担变化。没有封装，继承会把内部状态暴露给子类，类型层次难以维护；没有继承或接口，多态缺少统一的调用约定；没有多态，继承只剩下代码复制，扩展仍然要修改调用方。

这套结构在更大尺度上表现为设计原则与设计模式。单一职责、开闭原则、里氏替换、接口隔离与依赖倒置都指向同一个目标：把变化限制在局部，把依赖指向抽象。

## 常见误区

### 把 public 字段当作封装

把字段声明为 `public` 并直接读写，只完成了聚合，没有完成信息隐藏。机械生成 getter 与 setter 也不能解决问题，因为外部仍然可以任意修改状态。封装的判断标准是状态变更是否经过校验、不变式是否被维持。

### 认为字段参与多态

字段访问由引用类型静态决定，父子类同名字段构成隐藏。只有实例方法参与动态分派。

### 认为 private 或 static 方法可以被重写

`private` 方法对子类不可见，子类定义同签名方法只是新方法；`static` 方法属于隐藏，调用版本由引用类型决定。两者都不产生多态效果。

### 在构造器中调用可重写方法

父类构造器执行时，子类字段尚未初始化。若父类构造器调用了被子类重写的方法，方法会读到子类字段的默认值：

```java
class Base {
    Base() {
        print();
    }

    void print() {
        System.out.println("Base.print");
    }
}

class Derived extends Base {
    private int value = 42;

    @Override
    void print() {
        System.out.println("value = " + value);   // 此时 value 仍为 0
    }
}

new Derived();      // 输出 value = 0
```

构造器只应调用本类中不可重写的方法，或者只完成字段赋值。需要子类参与初始化时，应把扩展点放到构造完成后的显式方法中。

### 为复用而继承

仅仅因为想使用父类的方法而建立继承关系，会引入不必要的耦合。复用应当优先使用组合，继承只用于表达真实的 is-a 关系并支持多态替换。

## 现代 Java 的补充

Java 近年的演进在既有体系上补充了更精确的表达手段：

- **接口默认方法与私有方法**：JDK 8 允许接口提供默认实现，JDK 9 允许接口定义私有方法以复用内部逻辑。接口从纯契约变为可携带默认实现的能力集合，同时带来了默认方法冲突的显式消解规则。
- **`record`（JDK 16）**：用一行声明生成不可变数据载体，自动提供私有 `final` 字段、访问器、`equals`、`hashCode` 与 `toString`。它把封装与不可变性语法化，适合表达值对象。
- **`sealed`（JDK 17）**：限定类或接口的许可子类型，使继承层次封闭可控。配合模式匹配，可以在类型集合有限时写出穷尽的类型分支。
- **模式匹配的 `instanceof`（JDK 16）**：在类型判断成功时直接绑定变量，减少显式强制转换。

```java
sealed interface Shape permits Circle, Rectangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

class Areas {
    static double area(Shape shape) {
        return switch (shape) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Rectangle r -> r.width() * r.height();
        };
    }
}
```

这段代码需要 JDK 21 及以上版本编译。`sealed` 自 JDK 17 起可用，模式匹配的 `switch` 自 JDK 21 起定稿。`sealed` 把子类型限制在已知集合内，编译器因此可以校验分支是否穷尽。它不取代多态，而是在类型集合封闭时提供另一种表达方式。

## 完整示例：订单计价

下面的程序把抽象类、接口、封装与多态组合在一个可运行的示例中。商品以分为单位存储金额，避免浮点误差；税率由各商品类型给出；购物车只依赖抽象类型。

```java
import java.util.ArrayList;
import java.util.List;

interface Taxable {
    double taxRate();
}

abstract class Product implements Taxable {
    private final String name;
    private final long unitPrice;     // 单位：分
    private final int quantity;

    protected Product(String name, long unitPrice, int quantity) {
        if (unitPrice < 0 || quantity <= 0) {
            throw new IllegalArgumentException("价格或数量非法");
        }
        this.name = name;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
    }

    long subtotal() {
        return unitPrice * quantity;
    }

    @Override
    public double taxRate() {
        return 0.13;
    }

    abstract String category();

    String getName() {
        return name;
    }

    int getQuantity() {
        return quantity;
    }
}

class Book extends Product {
    Book(String name, long unitPrice, int quantity) {
        super(name, unitPrice, quantity);
    }

    @Override
    public double taxRate() {
        return 0.09;
    }

    @Override
    String category() {
        return "图书";
    }
}

class Electronics extends Product {
    Electronics(String name, long unitPrice, int quantity) {
        super(name, unitPrice, quantity);
    }

    @Override
    String category() {
        return "电子设备";
    }
}

class Cart {
    private final List<Product> items = new ArrayList<>();

    void add(Product product) {
        items.add(product);
    }

    long totalWithoutTax() {
        long sum = 0;
        for (Product item : items) {
            sum += item.subtotal();
        }
        return sum;
    }

    long totalTax() {
        long sum = 0;
        for (Product item : items) {
            sum += Math.round(item.subtotal() * item.taxRate());
        }
        return sum;
    }

    void printReceipt() {
        for (Product item : items) {
            System.out.printf("%s %s：%d 件，小计 %.2f 元%n",
                    item.category(), item.getName(), item.getQuantity(),
                    item.subtotal() / 100.0);
        }
        long net = totalWithoutTax();
        long tax = totalTax();
        System.out.printf("未税合计 %.2f 元，税额 %.2f 元，应付 %.2f 元%n",
                net / 100.0, tax / 100.0, (net + tax) / 100.0);
    }
}

public class OrderDemo {
    public static void main(String[] args) {
        Cart cart = new Cart();
        cart.add(new Book("Java 编程思想", 8900, 2));
        cart.add(new Electronics("机械键盘", 49900, 1));
        cart.printReceipt();
    }
}
```

运行输出：

```text
图书 Java 编程思想：2 件，小计 178.00 元
电子设备 机械键盘：1 件，小计 499.00 元
未税合计 677.00 元，税额 80.89 元，应付 757.89 元
```

这段程序体现了四项机制的分工。`Product` 是不变式的维护者，构造器拒绝非法价格与数量；`Taxable` 是能力契约，购物车不需要知道具体商品类型；`Book` 重写税率，构成运行期多态；`Cart` 只依赖 `Product` 与 `Taxable`，新增商品类型不需要修改计价逻辑。

若要增加折扣规则，可以再定义一个 `Discount` 接口并由具体策略实现，而不是在 `Cart` 中增加类型判断。这与多态一节的结论一致：变化应当由承担它的类型来实现，调用方只依赖抽象。

## 结语

封装、继承与多态分别解决三个问题：状态如何被安全地修改，共性如何被组织，变化如何被隔离。三者以抽象为前提，构成一套完整的建模与实现方法。

掌握这套方法需要同时理解语法与机制。语法决定了代码能否编译，机制决定了运行时的行为。对象创建与构造器链的次序、重写的约束、字段与静态方法的静态绑定、虚方法表的分派过程，都是阅读与调试 Java 程序时必须掌握的基础。

在设计层面，判断标准比记忆规则更重要：继承是否表达了真实的 is-a 关系，封装是否真正维持了不变式，多态是否把变化放到了正确的类型中。回答清楚这三个问题，代码结构通常就是合理的。