---
title: 大数据入门：Hadoop MapReduce 与 Spark Shell
date: 2026-11-22 23:00:00
updated: 2026-11-22 23:00:00
categories:
  - 履践
tags:
  - 大数据
  - Hadoop
  - MapReduce
  - Spark
description: 从大数据基本概念、Hadoop 与 Spark 的结构原理，到伪分布式部署、MapReduce 词频统计与 Spark Shell 数据分析
cover: /img/blog20.webp
---

## 大数据的基本概念

### 数据规模与单机瓶颈

当数据量超出单机的存储与计算能力时，系统需要把数据分散到多台机器上，并把计算任务移动到数据所在的节点。大数据技术解决三个核心问题：如何可靠地存储海量数据，如何并行地处理这些数据，以及如何在节点故障时继续运行。

单机方案遇到的第一道限制是存储。磁盘容量可以扩展，但单块磁盘的读写带宽与故障率无法随容量线性改善。第二道限制是计算。CPU 核心数量有限，内存容量限制了单次可处理的数据规模。第三道限制是容错。数据量越大，硬件故障越频繁，依靠单机备份无法满足可用性要求。

分布式系统通过分片、副本与并行计算应对这些问题。数据被切分为多个块，分布到不同节点；每个块保存多个副本，节点故障时可以从副本恢复；计算任务被拆分为多个子任务，在各节点并行执行，最后汇总结果。

### 数据特征

大数据领域常用四个维度描述数据特征：

| 维度 | 含义 | 影响 |
| :--- | :--- | :--- |
| 数据量大 | 单机难以存储与处理 | 需要分布式存储与并行计算 |
| 产生速度快 | 数据持续到达，实时性要求提高 | 需要流式处理与消息队列 |
| 类型多样 | 结构化、半结构化、非结构化并存 | 需要 schema-on-read 与多模型存储 |
| 价值密度低 | 有效信息占比低 | 需要全量处理与高效过滤 |

数据按结构可以分为三类：

- **结构化数据**：具有固定字段与类型，通常存放在关系数据库中，例如订单表、用户表；
- **半结构化数据**：带有标签或层次结构，但字段不固定，例如 JSON、XML、日志；
- **非结构化数据**：没有固定结构，例如图片、音频、视频、自由文本。

### 批处理与流处理

大数据处理分为批处理与流处理两种基本模式：

| 维度 | 批处理 | 流处理 |
| :--- | :--- | :--- |
| 输入 | 有界数据集 | 无界数据流 |
| 延迟 | 分钟到小时 | 毫秒到秒 |
| 吞吐 | 高 | 中到高 |
| 典型引擎 | MapReduce、Spark | Flink、Kafka Streams |
| 典型场景 | 离线报表、历史分析 | 实时监控、风控、报警 |

批处理一次处理固定范围的数据，适合对历史全量数据做复杂计算。流处理持续处理不断到达的数据，适合对延迟敏感的场景。很多平台同时使用两种模式：流处理负责实时指标，批处理负责全量校对与历史回算。

### OLTP 与 OLAP

| 维度 | OLTP | OLAP |
| :--- | :--- | :--- |
| 主要操作 | 增删改查单条或少量记录 | 聚合、分组、多维分析 |
| 数据规模 | 当前业务数据 | 历史全量数据 |
| 响应要求 | 毫秒级 | 秒级到分钟级 |
| 典型系统 | MySQL、PostgreSQL | Hive、Spark SQL、ClickHouse |
| 数据模型 | 规范化、减少冗余 | 宽表、星型模型、列式存储 |

OLTP 系统承担业务交易，强调事务与并发；OLAP 系统承担分析查询，强调吞吐与扫描效率。把分析查询直接压在业务库上会影响交易性能，因此需要把数据同步到分析系统。

### 数据仓库、数据湖与湖仓一体

- **数据仓库**：存储经过清洗、转换、建模的结构化数据，schema 在写入前确定，适合稳定报表与指标分析。
- **数据湖**：以原始格式存储海量数据，schema 在读取时确定，适合保存原始日志、图片与非结构化数据。
- **湖仓一体**：在数据湖上增加表格式、事务与元数据管理，使数据湖具备数据仓库的表管理与查询能力。

三者不是互相替代的关系。数据仓库适合高质量指标，数据湖适合原始数据沉淀，湖仓一体试图在同一套存储上同时支持两类需求。

### 分布式系统基础

分布式存储与计算依赖几个基本机制：

- **分片**：把数据划分为多个分区，分布到不同节点，突破单机容量与带宽限制；
- **副本**：为每个分片保存多个副本，节点故障时从副本恢复；
- **一致性**：多个副本之间保持一致，写入成功后读取到最新值；
- **容错**：节点失效时自动重新分配任务或重建副本；
- **调度**：把计算任务分配到数据所在节点，减少网络传输。

CAP 理论指出，分布式系统在网络分区发生时，无法同时保证强一致性与可用性，只能在二者之间取舍。不同系统根据业务需求选择偏向：HDFS 偏向一致性与分区容忍，部分 NoSQL 系统偏向可用性与最终一致。

### 大数据平台分层

典型的大数据平台按职责分为以下层次：

```text
数据采集：Flume、Kafka、Sqoop、DataX
数据存储：HDFS、HBase、对象存储、Hive 数仓
资源管理：YARN、Kubernetes
计算引擎：MapReduce、Spark、Flink
查询分析：Hive、Spark SQL、Presto/Trino
调度治理：Airflow、DolphinScheduler、Atlas
```

采集层负责把数据从业务库、日志与设备汇入平台；存储层负责持久化；资源管理层负责分配 CPU 与内存；计算引擎负责执行任务；查询层提供 SQL 或交互式分析；调度与治理层负责任务编排、元数据与权限。

## 大数据技术栈

Hadoop 是最早形成完整体系的大数据平台，核心组件包括：

| 组件 | 作用 |
| :--- | :--- |
| HDFS | 分布式文件系统，负责数据存储与副本管理 |
| YARN | 集群资源管理与任务调度 |
| MapReduce | 批处理计算框架，提供 map 与 reduce 两阶段编程模型 |
| Hive | 基于 SQL 的数据仓库工具，把 SQL 转换为分布式任务 |
| HBase | 建立在 HDFS 之上的列式数据库，支持随机读写 |
| Spark | 基于内存的分布式计算引擎，支持批处理、流处理、SQL 与机器学习 |
| Flink | 流式优先的分布式计算引擎，支持事件时间与状态管理 |
| Kafka | 分布式消息队列，用于数据采集与流式管道 |
| ZooKeeper | 分布式协调服务，用于选主、配置管理与分布式锁 |
| Sqoop、Flume | 关系数据库导入导出与日志采集工具 |

HDFS 与 YARN 构成基础设施，MapReduce、Spark 与 Flink 是运行在其上的计算框架。Spark 可以读取 HDFS 数据，也可以运行在 YARN 上，与 MapReduce 共享存储与资源管理。Hive 提供 SQL 层，底层可以调用 MapReduce、Tez 或 Spark 执行。

计算引擎的定位差异如下：

| 引擎 | 处理模式 | 延迟 | 典型场景 |
| :--- | :--- | :--- | :--- |
| MapReduce | 批处理 | 高 | 超大规模离线批处理 |
| Spark | 批处理为主，支持微批流处理 | 中 | 迭代计算、交互式分析、机器学习 |
| Flink | 原生流处理，支持批处理 | 低 | 实时风控、实时指标、事件驱动应用 |

## Hadoop 的结构与原理

### HDFS

HDFS 采用主从架构，由 NameNode、DataNode 与 SecondaryNameNode 组成：

```text
客户端
  |
  v
NameNode（元数据：目录树、文件与块的映射、副本位置）
  |
  +--> DataNode 1（块 1、块 2）
  +--> DataNode 2（块 1 副本、块 3）
  +--> DataNode 3（块 2 副本、块 3 副本）
```

- **NameNode**：管理文件系统命名空间与块映射，元数据常驻内存，并持久化为 fsimage 与 edit log；
- **DataNode**：存储实际数据块，定期向 NameNode 发送心跳与块报告；
- **SecondaryNameNode**：定期合并 fsimage 与 edit log，降低 NameNode 重启时的恢复时间。它不是 NameNode 的热备节点。

文件按固定大小的块存储，Hadoop 3 默认块大小为 128 MB。每个块保存多个副本，默认副本数为 3。副本分布在不同机架，兼顾可靠性与带宽。

写入流程如下：

```text
客户端请求创建文件
  -> NameNode 检查权限与目录
  -> NameNode 返回可用的 DataNode 列表
  -> 客户端把数据切分为块，写入第一个 DataNode
  -> 第一个 DataNode 把块复制给第二个，第二个复制给第三个
  -> 各 DataNode 返回确认
  -> 客户端继续写下一块
```

读取时，客户端向 NameNode 请求块位置，再直接连接最近的 DataNode 读取数据。NameNode 只参与元数据查询，不承担数据传输。

HDFS 适合一次写入、多次读取的场景，不适合频繁随机修改。文件写入后只能追加或删除，不能原地修改指定位置的内容。大量小文件会增加 NameNode 的元数据负担，通常通过合并、归档或列式存储格式缓解。

### YARN

YARN 把资源管理与任务调度从 MapReduce 中分离出来，使多种计算框架可以共享同一个集群。核心组件如下：

| 组件 | 作用 |
| :--- | :--- |
| ResourceManager | 全局资源管理，负责调度与分配 |
| NodeManager | 单节点资源管理，启动与监控容器 |
| ApplicationMaster | 每个应用的任务管理器，向 ResourceManager 申请资源 |
| Container | 资源分配单位，包含 CPU、内存等 |

作业提交过程如下：

1. 客户端向 ResourceManager 提交应用；
2. ResourceManager 在某个 NodeManager 上启动 ApplicationMaster；
3. ApplicationMaster 向 ResourceManager 申请 Container；
4. ResourceManager 分配资源，ApplicationMaster 在对应节点启动任务；
5. 任务向 ApplicationMaster 汇报进度；
6. 应用完成后，ApplicationMaster 注销并释放资源。

YARN 的调度器包括 FIFO、Capacity 与 Fair。FIFO 实现简单，适合单队列；Capacity 把资源划分为多个队列，适合多团队共享；Fair 尽量让各队列公平获得资源。生产集群通常使用 Capacity 或 Fair 调度器，并配置队列配额与优先级。
## MapReduce 的结构与原理

### 编程模型

MapReduce 把计算抽象为两个阶段：

- **Map 阶段**：读取输入记录，把每条记录转换为若干键值对；
- **Reduce 阶段**：把相同键的值聚集在一起，计算并输出结果。

用类型签名表示：

```text
map:    (K1, V1) -> list(K2, V2)
reduce: (K2, list(V2)) -> list(K3, V3)
```

框架负责输入切分、任务调度、数据传输、排序、容错与输出，开发者只需实现 map 与 reduce 函数。这一分工使程序员不必处理分布式系统的细节，但也限制了表达能力：所有计算都必须表示为两阶段的键值聚合。

### 执行流程

一个 MapReduce 作业的执行过程如下：

```text
HDFS 输入文件
   |
   v
InputFormat 切分为 InputSplit
   |
   v
RecordReader 逐条读取记录
   |
   v
Mapper 输出 (K2, V2)
   |
   v
环形缓冲区：分区、排序、合并
   |
   v
溢写到本地磁盘，多个溢写文件归并
   |
   v
Reducer 拉取对应分区的数据
   |
   v
归并排序后按 Key 分组
   |
   v
Reducer 输出 (K3, V3)
   |
   v
OutputFormat 写入 HDFS
```

输入切分的大小通常与 HDFS 块大小一致，一个切分对应一个 Map 任务。Map 任务的输出先写入内存中的环形缓冲区，缓冲区达到阈值后按分区排序并溢写到磁盘。溢写前可以执行 Combiner，在本地预先聚合，减少传输量。

Reducer 通过 Shuffle 拉取属于自己的分区数据，经过归并排序后把相同键的值组织为迭代器，交给 reduce 方法处理。Shuffle 是 MapReduce 中开销最大的阶段，涉及大量磁盘读写与网络传输。

### 分区与排序

分区决定 Map 输出交给哪个 Reducer。默认分区器对键的哈希值取模：

```java
partition = (key.hashCode() & Integer.MAX_VALUE) % numPartitions
```

同一键必然进入同一分区，因此相同键的所有值会由同一个 Reducer 处理。Reducer 数量由 `job.setNumReduceTasks(n)` 指定，默认为 1。设置为 0 时没有 Reduce 阶段，Map 输出直接写入 HDFS。

每个分区内部按键排序。默认使用键的自然顺序，也可以通过 `job.setSortComparatorClass` 指定比较器。排序保证了 Reduce 阶段可以用流式方式处理相同键的值，不需要把整个分组载入内存。

### Combiner

Combiner 在 Map 端对输出做局部聚合，其输入输出类型与 Reducer 一致。以词频统计为例，Map 端先把自己的局部计数合并，再发送给 Reducer，可以显著减少网络传输。

Combiner 不是必需的，框架不保证它被执行，也不保证执行次数。因此 Combiner 必须满足结合律与交换律，且不能改变最终结果。求和、求最大值可以使用 Combiner；求平均值不能直接复用 Reducer，因为对局部平均值再求平均会得到错误结果。

## 其它常用工具的结构与原理

### Hive

Hive 建立在 Hadoop 之上，提供类 SQL 的查询语言 HQL，把 SQL 转换为分布式任务。它由以下部分组成：

```text
客户端（CLI、JDBC、Beeline）
  |
  v
Hive Driver：解析、语义分析、逻辑计划、优化、物理计划
  |
  +--> Metastore（元数据：库、表、分区、列、存储位置）
  +--> 执行引擎（MapReduce、Tez、Spark）
  |
  v
HDFS 上的数据文件
```

Metastore 通常保存在关系数据库中，默认使用 Derby，生产环境多使用 MySQL 或 PostgreSQL。Hive 表的数据存放在 HDFS 目录中，表定义与分区信息保存在 Metastore。

Hive 的核心概念包括：

- **分区**：按字段值把数据划分为不同目录，例如按日期分区，查询时可以裁剪无关目录；
- **分桶**：按哈希把数据分散到固定数量的文件中，便于抽样与连接；
- **schema-on-read**：写入时不强制校验 schema，读取时按表定义解析数据；
- **外部表**：表定义与数据分离，删除表不会删除数据文件。

Hive 适合离线批处理与数据仓库场景，不适合低延迟的在线查询与事务处理。它的执行延迟来自查询编译与分布式任务调度，即使数据量很小也可能需要数十秒。

### HBase

HBase 是建立在 HDFS 之上的列式数据库，支持按行键随机读写。它的核心组件包括：

| 组件 | 作用 |
| :--- | :--- |
| HMaster | 管理 Region 分配、负载均衡与元数据 |
| RegionServer | 管理多个 Region，处理读写请求 |
| Region | 表按行键范围切分后的分片 |
| ZooKeeper | 维护集群状态、选主与元数据 |
| HDFS | 持久化 HFile 与日志 |

HBase 的数据模型如下：

- 表按行键排序，行键是唯一的；
- 列按列族组织，列族在创建表时定义；
- 每个单元格可以保存多个版本，按时间戳区分；
- 行键设计直接影响读写分布，热点行键会造成 Region 负载不均。

写入时，数据先写入 HLog（预写日志）与 MemStore，MemStore 达到阈值后刷写为 HFile；读取时合并 MemStore 与 HFile 的结果。HFile 采用 LSM 树结构，适合顺序写入与批量读取。

HBase 适合需要按行键快速查询、随机写入与海量稀疏数据的场景，例如用户画像、时序数据与消息索引。它不适合复杂连接与全表扫描，这类任务应交给 Hive 或 Spark SQL。

### Flink

Flink 是流式优先的分布式计算引擎，把流处理作为基本模型，批处理视为有界流的特例。运行时由 JobManager 与 TaskManager 组成：

- **JobManager**：负责作业调度、检查点协调与故障恢复；
- **TaskManager**：负责执行任务，提供任务槽位与内存管理。

Flink 的核心能力包括：

- **事件时间**：按数据自身携带的时间戳处理，能够应对乱序与延迟数据；
- **水位线**：用水位线表示事件时间的进展，触发窗口计算；
- **窗口**：支持滚动窗口、滑动窗口、会话窗口；
- **状态管理**：算子可以维护键控状态与算子状态，状态后端支持内存与 RocksDB；
- **检查点与保存点**：定期生成一致性快照，故障时从检查点恢复；
- **精确一次语义**：配合可重放的数据源与事务性输出，实现端到端的精确一次处理。

Flink 适合实时风控、实时指标、事件驱动应用与流批一体场景。它的状态管理与事件时间处理比微批方案更自然，但运维复杂度也更高。

### Kafka

Kafka 是分布式消息队列，常用于数据采集与流式管道。核心概念如下：

| 概念 | 含义 |
| :--- | :--- |
| Topic | 消息的逻辑分类 |
| Partition | Topic 的分片，分区内有序 |
| Replica | 分区的副本，保证可靠性 |
| Producer | 写入消息的客户端 |
| Consumer | 读取消息的客户端 |
| Consumer Group | 消费者组，组内分区互斥消费 |
| Offset | 消费者在分区中的位置 |

Kafka 只保证分区内的消息顺序，不保证 Topic 全局有序。分区数决定并行度，副本数决定可靠性。生产者可以通过 `acks` 参数控制写入确认级别，消费者通过提交 offset 记录消费进度。

Kafka 的定位是数据传输与缓冲，不承担复杂计算。它把数据生产与消费解耦，使实时管道可以独立扩展。

### NoSQL

NoSQL 是一类不依赖固定关系模型的数据库，按数据模型分为四类：

| 类型 | 数据模型 | 代表系统 | 典型场景 |
| :--- | :--- | :--- | :--- |
| 键值 | Key-Value | Redis、RocksDB | 缓存、会话、计数器 |
| 文档 | JSON 文档 | MongoDB、CouchDB | 内容管理、用户画像 |
| 列族 | 行键与列族 | HBase、Cassandra | 海量稀疏数据、时序数据 |
| 图 | 节点与边 | Neo4j、JanusGraph | 社交关系、知识图谱 |

NoSQL 通常通过牺牲强一致性或复杂事务来换取水平扩展与灵活 schema。多数系统遵循 BASE 原则：基本可用、软状态、最终一致。选择 NoSQL 时应先明确查询模式与一致性要求，而不是把它当作关系数据库的通用替代。

### 工具选型

| 需求 | 推荐工具 |
| :--- | :--- |
| 海量文件存储 | HDFS、对象存储 |
| 离线批处理 | MapReduce、Spark |
| 交互式 SQL 分析 | Spark SQL、Presto/Trino、ClickHouse |
| 数据仓库建模 | Hive、Spark SQL |
| 实时流处理 | Flink、Kafka Streams |
| 消息缓冲与采集 | Kafka |
| 随机读写与点查 | HBase、Redis |
| 文档型业务数据 | MongoDB |
| 图关系分析 | Neo4j |

工具之间通常组合使用。例如日志经 Flume 或 Kafka 进入 HDFS，离线任务用 Spark 清洗并写入 Hive 表，实时指标由 Flink 计算后写入 Redis 或 ClickHouse，查询层通过 Presto 或 Spark SQL 统一访问。
## 环境准备

### 版本与规划

本文使用以下版本组合：

| 组件 | 版本 | 说明 |
| :--- | :--- | :--- |
| JDK | 11 | Hadoop 3.3 与 Spark 3.5 均支持 |
| Hadoop | 3.3.x | 伪分布式部署 |
| Spark | 3.5.x | 以 local 模式运行，附带 Spark SQL |
| 操作系统 | Linux | 示例命令以 bash 为准 |

伪分布式模式在同一台机器上启动 NameNode、DataNode、ResourceManager 与 NodeManager。它保留了分布式的进程结构与配置方式，适合学习和功能验证，不具备真正的容错能力。

完全分布式部署至少需要三台机器：一台运行 NameNode 与 ResourceManager，两台或更多运行 DataNode 与 NodeManager。生产环境还会为 NameNode 配置高可用，使用 JournalNode 与 ZooKeeper 实现主备切换。

### 前置配置

确认 Java 可用，并设置 `JAVA_HOME`：

```bash
java -version
echo $JAVA_HOME
```

配置本机 SSH 免密登录。Hadoop 的启动脚本通过 SSH 启动远程进程，即使目标就是本机，也需要免密：

```bash
ssh-keygen -t rsa -P "" -f ~/.ssh/id_rsa
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
ssh localhost
```

设置 Hadoop 环境变量，写入 `~/.bashrc`：

```bash
export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

在 `$HADOOP_HOME/etc/hadoop/hadoop-env.sh` 中显式指定 Java 路径：

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### 配置文件

Hadoop 的配置集中在 `$HADOOP_HOME/etc/hadoop/` 目录。伪分布式模式需要修改四个文件。

`core-site.xml` 指定默认文件系统与临时目录：

```xml
<configuration>
  <property>
    <name>fs.defaultFS</name>
    <value>hdfs://localhost:9000</value>
  </property>
  <property>
    <name>hadoop.tmp.dir</name>
    <value>/opt/hadoop/tmp</value>
  </property>
</configuration>
```

`hdfs-site.xml` 指定副本数与数据目录：

```xml
<configuration>
  <property>
    <name>dfs.replication</name>
    <value>1</value>
  </property>
  <property>
    <name>dfs.namenode.name.dir</name>
    <value>file:///opt/hadoop/data/name</value>
  </property>
  <property>
    <name>dfs.datanode.data.dir</name>
    <value>file:///opt/hadoop/data/data</value>
  </property>
</configuration>
```

`mapred-site.xml` 指定 MapReduce 运行在 YARN 上：

```xml
<configuration>
  <property>
    <name>mapreduce.framework.name</name>
    <value>yarn</value>
  </property>
  <property>
    <name>mapreduce.application.classpath</name>
    <value>$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/*,$HADOOP_MAPRED_HOME/share/hadoop/mapreduce/lib/*</value>
  </property>
</configuration>
```

`yarn-site.xml` 指定 Shuffle 服务与环境变量白名单：

```xml
<configuration>
  <property>
    <name>yarn.nodemanager.aux-services</name>
    <value>mapreduce_shuffle</value>
  </property>
  <property>
    <name>yarn.nodemanager.env-whitelist</name>
    <value>JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_HOME,PATH,LANG,TZ,HADOOP_MAPRED_HOME</value>
  </property>
</configuration>
```

### 格式化与启动

首次启动前需要格式化 NameNode。格式化只执行一次，重复执行会清除 HDFS 中的元数据：

```bash
hdfs namenode -format
```

启动 HDFS 与 YARN：

```bash
start-dfs.sh
start-yarn.sh
```

检查进程：

```bash
jps
```

正常输出包含以下进程：

```text
NameNode
DataNode
SecondaryNameNode
ResourceManager
NodeManager
Jps
```

Web 界面地址如下：

| 服务 | 地址 |
| :--- | :--- |
| HDFS | `http://localhost:9870` |
| YARN | `http://localhost:8088` |

停止集群：

```bash
stop-yarn.sh
stop-dfs.sh
```

## HDFS 基础操作

HDFS 的命令行接口以 `hdfs dfs` 开头，常用操作与本地文件系统类似，但路径默认指向 HDFS：

```bash
hdfs dfs -mkdir -p /user/$USER/input
hdfs dfs -put words.txt /user/$USER/input/
hdfs dfs -ls /user/$USER/input
hdfs dfs -cat /user/$USER/input/words.txt
hdfs dfs -get /user/$USER/input/words.txt ./words.copy
hdfs dfs -rm -r /user/$USER/input
```

查看集群状态与文件系统使用情况：

```bash
hdfs dfsadmin -report
hdfs dfs -df -h /
hdfs dfs -du -h /user/$USER
```

HDFS 按块存储文件，默认块大小为 128 MB。小于块大小的文件仍然占用一个块，但只消耗实际字节数。NameNode 在内存中保存每个文件、每个块与副本的元数据，因此大量小文件会显著增加 NameNode 的内存压力。小文件问题通常通过合并、归档或使用支持小文件的存储格式缓解。

HDFS 适合一次写入、多次读取的场景，不适合频繁随机修改。文件写入后只能追加或删除，不能原地修改指定位置的内容。需要随机读写的场景应使用 HBase 等系统。
## MapReduce 实战：词频统计

### 输入数据

在本地创建 `words.txt`：

```text
hello hadoop hello
hello spark
hadoop spark
hello world
```

上传到 HDFS：

```bash
hdfs dfs -mkdir -p /user/$USER/input
hdfs dfs -put words.txt /user/$USER/input/
```

### 程序实现

```java
import java.io.IOException;
import java.util.StringTokenizer;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.Reducer;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class WordCount {

    public static class TokenizerMapper
            extends Mapper<Object, Text, Text, IntWritable> {

        private static final IntWritable ONE = new IntWritable(1);
        private final Text word = new Text();

        @Override
        public void map(Object key, Text value, Context context)
                throws IOException, InterruptedException {
            StringTokenizer tokenizer = new StringTokenizer(value.toString());
            while (tokenizer.hasMoreTokens()) {
                word.set(tokenizer.nextToken());
                context.write(word, ONE);
            }
        }
    }

    public static class IntSumReducer
            extends Reducer<Text, IntWritable, Text, IntWritable> {

        private final IntWritable result = new IntWritable();

        @Override
        public void reduce(Text key, Iterable<IntWritable> values, Context context)
                throws IOException, InterruptedException {
            int sum = 0;
            for (IntWritable value : values) {
                sum += value.get();
            }
            result.set(sum);
            context.write(key, result);
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            System.err.println("用法: WordCount <输入路径> <输出路径>");
            System.exit(2);
        }

        Configuration conf = new Configuration();
        Job job = Job.getInstance(conf, "word count");
        job.setJarByClass(WordCount.class);
        job.setMapperClass(TokenizerMapper.class);
        job.setCombinerClass(IntSumReducer.class);
        job.setReducerClass(IntSumReducer.class);
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(IntWritable.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        System.exit(job.waitForCompletion(true) ? 0 : 1);
    }
}
```

`Mapper` 的四个类型参数依次为输入键、输入值、输出键、输出值。输入键在文本输入格式下是行偏移量，代码中不需要使用，因此声明为 `Object`。

`Text` 与 `IntWritable` 是 Hadoop 提供的序列化类型。Hadoop 不使用 Java 原生序列化传输键值，因为原生序列化体积大、开销高。自定义类型需要实现 `Writable` 或 `WritableComparable`。

### 编译与运行

把 Hadoop 的依赖加入类路径：

```bash
hadoop classpath
```

编译、打包并提交作业：

```bash
mkdir -p classes
javac -classpath "$(hadoop classpath)" -d classes WordCount.java
jar -cvf wordcount.jar -C classes/ .
hadoop jar wordcount.jar WordCount /user/$USER/input /user/$USER/output
```

输出目录必须不存在。若上一次运行留下了结果，先删除：

```bash
hdfs dfs -rm -r /user/$USER/output
```

查看结果：

```bash
hdfs dfs -cat /user/$USER/output/part-r-00000
```

输出按键的字典序排列：

```text
hadoop  2
hello   4
spark   2
world   1
```

### 运行过程观察

作业运行期间会输出进度信息，包括 Map 与 Reduce 的完成比例。任务结束后，YARN 的 ResourceManager 页面可以查看作业历史、容器分配与日志。

MapReduce 计数器记录各阶段的处理数量，常用计数器如下：

| 计数器 | 含义 |
| :--- | :--- |
| `Map input records` | Map 读取的输入记录数 |
| `Map output records` | Map 输出的键值对数 |
| `Combine input records` | Combiner 接收的记录数 |
| `Combine output records` | Combiner 输出的记录数 |
| `Reduce input records` | Reducer 接收的记录数 |
| `Reduce input groups` | Reducer 处理的键分组数 |
| `Reduce output records` | 最终输出记录数 |

计数值取决于输入切分数量与数据分布。同一份小文件可能只产生一个 Map 任务，此时 Combiner 的处理次数与多切分场景不同。计数器适合观察数据规模与倾斜情况，不应作为固定常量写进断言。

### 自定义分区器

默认分区器按哈希取模。需要把特定键放入指定分区时，可以实现 `Partitioner`：

```java
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Partitioner;

public class InitialPartitioner extends Partitioner<Text, IntWritable> {
    @Override
    public int getPartition(Text key, IntWritable value, int numPartitions) {
        if (numPartitions <= 0) {
            return 0;
        }
        char initial = Character.toLowerCase(key.toString().charAt(0));
        return Math.abs(initial) % numPartitions;
    }
}
```

在驱动类中注册分区器并设置 Reducer 数量：

```java
job.setPartitionerClass(InitialPartitioner.class);
job.setNumReduceTasks(2);
```

输出目录会生成 `part-r-00000` 与 `part-r-00001` 两个文件。分区器必须保证同一个键始终映射到同一个分区，否则聚合结果会被拆分到多个 Reducer，产生错误输出。

### MapReduce 的局限

MapReduce 的模型简单，但存在以下限制：

- 每个作业都要把中间结果写入磁盘，迭代算法的延迟高；
- 只支持 Map 与 Reduce 两阶段，复杂计算需要串联多个作业；
- 不适合交互式查询与低延迟场景；
- Shuffle 阶段对网络与磁盘压力较大；
- 开发效率低于声明式框架。

这些限制促成了 Spark 的广泛应用。Spark 使用内存缓存与 DAG 调度，把多个转换合并为一个作业，减少了中间结果的落盘次数。

## Spark 的结构与原理

### 运行时结构

Spark 采用 Driver 与 Executor 分离的结构：

- **Driver**：解析程序，构建 DAG，划分阶段，调度任务，收集结果；
- **Executor**：在工作节点上运行任务，缓存数据，向 Driver 汇报状态；
- **Cluster Manager**：负责资源分配，可以是 Standalone、YARN 或 Kubernetes。

在 local 模式下，Driver 与 Executor 运行在同一个 JVM 中，用线程模拟分布式执行。local 模式适合开发与调试，不具备分布式容错能力。

### RDD

RDD（Resilient Distributed Dataset）是 Spark 的核心数据抽象，具有三个特征：

- **不可变**：RDD 一旦创建就不能修改，转换操作会生成新的 RDD；
- **分区**：数据按分区分布在多个节点上，分区是并行计算的基本单位；
- **血缘**：RDD 记录自己由哪些父 RDD 经过哪些转换得到，分区丢失时可以重新计算。

不可变与血缘共同构成了容错机制。某个分区计算失败时，Spark 不需要复制整个数据集，只需按照血缘重新计算该分区。

### 惰性求值与 DAG

Spark 的转换操作是惰性的。`map`、`filter`、`reduceByKey` 只记录计算关系，不立即执行；只有遇到行动操作时才触发作业。

作业触发后，Spark 根据 RDD 的血缘构建 DAG，并按照 Shuffle 边界划分为多个阶段。每个阶段包含一组可以流水线执行的任务，任务数量等于分区数量。这种组织方式避免了 MapReduce 每个步骤都落盘的开销。

### Spark SQL

Spark SQL 在 RDD 之上提供带 schema 的数据集抽象。DataFrame 可以视为 `Dataset[Row]`，保存列名与类型，Spark 可以据此做列裁剪、谓词下推与执行计划优化。

Spark SQL 的优化器 Catalyst 把 SQL 或 DataFrame 操作转换为逻辑计划，经过规则优化与代价优化后生成物理计划；Tungsten 负责内存管理与代码生成。与直接编写 RDD 相比，DataFrame 通常能获得更好的执行效率。

### 与 MapReduce 的对比

| 维度 | MapReduce | Spark |
| :--- | :--- | :--- |
| 执行模型 | 两阶段，作业间落盘 | DAG，多阶段流水线 |
| 中间结果 | 写入磁盘 | 可缓存到内存 |
| 延迟 | 高 | 中到低 |
| 迭代计算 | 需要串联多个作业 | 内存缓存，适合迭代 |
| 编程接口 | Map 与 Reduce | RDD、DataFrame、SQL |
| 容错 | 任务重试与数据副本 | 血缘重算与检查点 |

Spark 并不完全取代 MapReduce。超大规模、一次性的批处理任务仍然可以使用 MapReduce；需要迭代、交互式分析或机器学习的场景更适合 Spark。
## Spark Shell 实战

### 启动 Spark Shell

```bash
spark-shell --master local[*]
```

`local[*]` 表示使用所有可用核心。启动后进入 Scala 交互环境，`sc` 是 `SparkContext` 实例，`spark` 是 `SparkSession` 实例：

```scala
sc.version
sc.defaultParallelism
spark.version
```

Spark 运行期间会在 4040 端口提供 Web UI，可以查看作业、阶段、任务与存储状态。

### 词频统计

沿用前面的 `words.txt`：

```scala
val lines = sc.textFile("hdfs://localhost:9000/user/root/input/words.txt")
val counts = lines
  .flatMap(_.split("\\s+"))
  .filter(_.nonEmpty)
  .map(word => (word, 1))
  .reduceByKey(_ + _)
counts.sortByKey().collect().foreach(println)
```

输出：

```text
(hadoop,2)
(hello,4)
(spark,2)
(world,1)
```

把结果写回 HDFS：

```scala
counts.saveAsTextFile("hdfs://localhost:9000/user/root/output-spark")
```

`saveAsTextFile` 写入的是一个目录，目录中包含 `part-00000` 等分区文件。目标目录必须不存在，重复运行前需要更换路径或先删除。

### 常用转换与行动

| 操作 | 类型 | 作用 |
| :--- | :--- | :--- |
| `map` | 转换 | 对每个元素应用函数 |
| `flatMap` | 转换 | 对每个元素返回一个序列，再展平 |
| `filter` | 转换 | 保留满足条件的元素 |
| `mapValues` | 转换 | 只对键值对的 value 应用函数 |
| `reduceByKey` | 转换 | 按 key 聚合，Map 端先做局部合并 |
| `groupByKey` | 转换 | 按 key 分组，把所有 value 拉到一个分区 |
| `sortBy` | 转换 | 按指定函数排序 |
| `join` | 转换 | 按 key 连接两个 RDD |
| `union` | 转换 | 合并两个 RDD 的元素 |
| `distinct` | 转换 | 去重 |
| `repartition` | 转换 | 重新分区，触发 Shuffle |
| `coalesce` | 转换 | 减少分区，尽量避免 Shuffle |
| `collect` | 行动 | 把全部结果拉回 Driver |
| `count` | 行动 | 返回元素数量 |
| `first` | 行动 | 返回第一个元素 |
| `take` | 行动 | 返回前 n 个元素 |
| `reduce` | 行动 | 对全部元素做聚合 |
| `foreach` | 行动 | 对每个元素执行操作 |
| `saveAsTextFile` | 行动 | 写入文件系统 |

`collect` 会把全部数据拉到 Driver 内存，只适用于结果较小的场景。大结果应使用 `take` 抽样或直接写入分布式存储。

`groupByKey` 与 `reduceByKey` 的差异在于 Shuffle 的数据量。`groupByKey` 把同一 key 的全部 value 原样传输，容易造成内存溢出；`reduceByKey` 在 Map 端先做局部聚合，传输量更小。聚合类计算应优先使用 `reduceByKey` 或 `aggregateByKey`。

### 访问日志分析

准备 `access.log`：

```text
10.0.0.1 - - [01/Oct/2026:10:00:00 +0800] "GET /index.html HTTP/1.1" 200 512
10.0.0.2 - - [01/Oct/2026:10:00:01 +0800] "GET /api/orders HTTP/1.1" 200 1024
10.0.0.1 - - [01/Oct/2026:10:00:02 +0800] "POST /api/orders HTTP/1.1" 201 768
10.0.0.3 - - [01/Oct/2026:10:00:03 +0800] "GET /missing HTTP/1.1" 404 128
10.0.0.2 - - [01/Oct/2026:10:00:04 +0800] "GET /api/orders HTTP/1.1" 500 256
10.0.0.1 - - [01/Oct/2026:10:00:05 +0800] "GET /api/orders HTTP/1.1" 200 900
```

上传到 HDFS：

```bash
hdfs dfs -put access.log /user/$USER/input/
```

统计访问次数最多的 IP：

```scala
val logs = sc.textFile("hdfs://localhost:9000/user/root/input/access.log")
val ipCounts = logs
  .map(_.split(" ")(0))
  .map(ip => (ip, 1))
  .reduceByKey(_ + _)
ipCounts.sortBy(pair => pair._2, ascending = false).collect().foreach(println)
```

输出：

```text
(10.0.0.1,3)
(10.0.0.2,2)
(10.0.0.3,1)
```

统计 HTTP 状态码分布：

```scala
val statusCounts = logs
  .map(line => (line.split(" ")(8), 1))
  .reduceByKey(_ + _)
statusCounts.sortByKey().collect().foreach(println)
```

输出：

```text
(200,3)
(201,1)
(404,1)
(500,1)
```

上述解析假定日志按空格分隔且字段位置固定。真实日志中的 URL 可能包含空格，User-Agent 也可能包含空格，直接按空格切分会错位。生产环境应使用正则表达式或专门的日志解析库，并对无法解析的行做计数与隔离。

### 持久化与分区

RDD 默认不保存中间结果，每次行动操作都会从头计算。需要重复使用时，可以调用 `cache` 或 `persist`：

```scala
val cached = logs.cache()
cached.count()
cached.filter(_.contains("500")).count()
```

`cache` 等价于 `persist(StorageLevel.MEMORY_ONLY)`。内存不足时，部分分区会被丢弃并按血缘重新计算。缓存在第一次行动操作时生效，不再使用的 RDD 应调用 `unpersist` 释放。

分区数量决定并行度。读取文件时可以指定最小分区数：

```scala
val rdd = sc.textFile("hdfs://localhost:9000/user/root/input/access.log", 4)
rdd.getNumPartitions
```

调整分区：

```scala
val more = rdd.repartition(8)
val fewer = rdd.coalesce(2)
```

`repartition` 会触发 Shuffle，可以增加或减少分区；`coalesce` 默认只减少分区，避免 Shuffle。分区过多会增加任务调度开销，分区过少会降低并行度。通常让分区数达到总核心数的 2 到 4 倍。

### 共享变量

广播变量把只读的小数据集分发到每个 Executor，避免每个任务重复传输：

```scala
val blocked = sc.broadcast(Set("10.0.0.3"))
val allowed = logs.filter(line => !blocked.value.contains(line.split(" ")(0)))
allowed.count()
```

累加器用于在任务中累加统计值，只能在行动操作中可靠使用：

```scala
val badLines = sc.longAccumulator("badLines")
logs.foreach { line =>
  if (line.split(" ").length < 10) {
    badLines.add(1)
  }
}
println(badLines.value)
```

累加器在任务重试时可能重复累加，因此适合监控与调试，不适合需要精确一次语义的业务计数。

## Spark SQL 综合实战

### 读取 CSV 与注册视图

创建 `orders.csv`：

```text
order_id,user_id,category,amount,dt
1001,u01,图书,89.00,2026-10-01
1002,u02,电子,499.00,2026-10-01
1003,u01,图书,45.50,2026-10-02
1004,u03,服饰,199.00,2026-10-02
1005,u02,电子,1299.00,2026-10-03
1006,u04,图书,32.00,2026-10-03
1007,u01,服饰,259.00,2026-10-04
1008,u03,电子,899.00,2026-10-04
1009,u02,图书,68.00,2026-10-05
1010,u04,服饰,159.00,2026-10-05
```

上传并在 Spark Shell 中读取：

```bash
hdfs dfs -put orders.csv /user/$USER/input/
```

```scala
val orders = spark.read
  .option("header", "true")
  .option("inferSchema", "true")
  .csv("hdfs://localhost:9000/user/root/input/orders.csv")
orders.createOrReplaceTempView("orders")
```

`inferSchema` 会扫描一遍数据推断类型。生产环境通常显式指定 schema，避免推断带来的额外扫描与类型偏差。

### 品类销售额

```scala
spark.sql("""
  SELECT category, ROUND(SUM(amount), 2) AS gmv, COUNT(*) AS orders
  FROM orders
  GROUP BY category
  ORDER BY gmv DESC
""").show()
```

结果：

| category | gmv | orders |
| :--- | ---: | ---: |
| 电子 | 2697.00 | 3 |
| 服饰 | 617.00 | 3 |
| 图书 | 234.50 | 4 |

### 每日销售额

```scala
spark.sql("""
  SELECT dt, ROUND(SUM(amount), 2) AS gmv
  FROM orders
  GROUP BY dt
  ORDER BY dt
""").show()
```

结果：

| dt | gmv |
| :--- | ---: |
| 2026-10-01 | 588.00 |
| 2026-10-02 | 244.50 |
| 2026-10-03 | 1331.00 |
| 2026-10-04 | 1158.00 |
| 2026-10-05 | 227.00 |

### 用户消费排行与窗口函数

```scala
spark.sql("""
  SELECT user_id, ROUND(SUM(amount), 2) AS amount
  FROM orders
  GROUP BY user_id
  ORDER BY amount DESC
  LIMIT 3
""").show()
```

结果：

| user_id | amount |
| :--- | ---: |
| u02 | 1866.00 |
| u03 | 1098.00 |
| u01 | 393.50 |

窗口函数可以在不折叠行的前提下做组内排名：

```scala
spark.sql("""
  SELECT category, order_id, amount
  FROM (
    SELECT category, order_id, amount,
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY amount DESC) AS rn
    FROM orders
  ) ranked
  WHERE rn = 1
  ORDER BY category
""").show()
```

结果：

| category | order_id | amount |
| :--- | ---: | ---: |
| 电子 | 1005 | 1299.00 |
| 服饰 | 1007 | 259.00 |
| 图书 | 1001 | 89.00 |

### 结果写入 HDFS

```scala
val gmvByCategory = spark.sql("""
  SELECT category, ROUND(SUM(amount), 2) AS gmv
  FROM orders
  GROUP BY category
""")

gmvByCategory.write
  .mode("overwrite")
  .parquet("hdfs://localhost:9000/user/root/output/gmv_by_category")
```

Parquet 是列式存储格式，支持压缩与列裁剪，适合分析型查询。读取结果：

```scala
spark.read.parquet("hdfs://localhost:9000/user/root/output/gmv_by_category").show()
```

## 技术选型与性能要点

### 批处理与流处理的选型

离线报表、历史回算与全量清洗优先使用批处理。实时监控、风控与报警优先使用流处理。需要同时满足两类需求时，可以采用 Lambda 架构：批处理层保存全量结果，速度层处理实时增量，查询层合并两者。也可以采用 Kappa 架构，以流处理为唯一计算路径，通过重放历史数据完成回算。

### 存储格式

分析型数据优先使用 Parquet 或 ORC，并配合压缩。列式格式支持列裁剪与谓词下推，扫描效率高于 CSV 与 JSON。CSV 与 JSON 便于交换，但解析开销大。

小文件会加重 NameNode 负担并降低任务效率。写入前应控制文件数量，必要时使用合并任务或表格式的自动合并功能。

### Shuffle 与分区

Shuffle 是分布式计算的主要瓶颈。减少 Shuffle 的手段包括：

- 用 `reduceByKey` 代替 `groupByKey`，在 Map 端预聚合；
- 用 `coalesce` 减少分区，避免不必要的网络传输；
- 对小表使用广播连接，避免大表 Shuffle；
- 合理设置 `spark.sql.shuffle.partitions`，默认值为 200。

分区数量应根据数据规模与核心数调整。分区过多会产生大量小任务，分区过少会导致单个任务处理的数据量过大。

### 数据倾斜

数据倾斜表现为少数任务耗时远高于其他任务，通常由热点键引起。识别方法是观察 Spark UI 中任务耗时的分布，最大值与中位数差距越大，倾斜越严重。

处理手段包括：

- 对热点键加随机前缀，打散到多个分区后再做二次聚合；
- 对热点键单独处理，其余数据走正常流程；
- 启用自适应查询执行（AQE），由 Spark 自动合并小分区并处理倾斜连接；
- 使用广播连接消除大表连接中的 Shuffle。

Spark 3.2 起 AQE 默认开启，相关配置包括：

```scala
spark.conf.get("spark.sql.adaptive.enabled")
spark.conf.get("spark.sql.adaptive.coalescePartitions.enabled")
spark.conf.get("spark.sql.adaptive.skewJoin.enabled")
```

### 资源分配

提交到 YARN 时指定 Executor 资源：

```bash
spark-shell --master yarn \
  --executor-memory 4g \
  --executor-cores 2 \
  --num-executors 4
```

资源分配需要与集群容量匹配。Executor 内存过大可能导致单节点资源碎片，内存过小会频繁溢写与垃圾回收。Executor 核数过多会降低每个任务可用的内存，通常每个 Executor 分配 2 到 5 个核。

Kryo 序列化通常比 Java 原生序列化更快、更紧凑：

```text
spark.serializer=org.apache.spark.serializer.KryoSerializer
```

该配置需要在 SparkContext 启动前生效，应写入 `spark-defaults.conf` 或通过 `--conf` 传入。

## 常见错误

| 现象 | 常见原因 | 处理 |
| :--- | :--- | :--- |
| `Connection refused` | HDFS 或 YARN 未启动，或 `fs.defaultFS` 地址错误 | 用 `jps` 检查进程，核对端口与配置文件 |
| `FileAlreadyExistsException` | 输出目录已存在 | 删除旧目录或更换输出路径 |
| `No Route to Host` | 主机名解析失败或防火墙拦截 | 检查 `/etc/hosts` 与端口连通性 |
| `ClassNotFoundException` | jar 未包含目标类，或主类名错误 | 用 `jar tf` 检查内容，核对类名 |
| `JAVA_HOME is not set` | `hadoop-env.sh` 未配置 Java 路径 | 显式设置 `JAVA_HOME` |
| `winutils.exe` 缺失 | Windows 环境缺少 Hadoop 本地库 | 使用 Linux 环境，或配置 winutils |
| `OutOfMemoryError` | Executor 或 Driver 内存不足 | 调整内存参数，避免 `collect` 全量数据 |
| `NoSuchMethodError` | Spark 与 Scala 版本不匹配 | 使用与 Spark 对应的 Scala 版本重新编译 |
| `Permission denied` | HDFS 用户权限不足 | 使用对应用户，或调整目录权限 |
| `Container killed by YARN` | 容器内存超限 | 调整 Executor 内存与开销比例 |

## 结语

大数据平台的基础是分布式存储与并行计算。HDFS 通过块、副本与主从元数据管理提供可靠存储；YARN 把资源管理从计算框架中分离，使 MapReduce、Spark 与 Flink 可以共享集群；MapReduce 用简单的两阶段模型解决了大规模数据的并行聚合问题。

Spark 在 MapReduce 的基础上引入内存缓存与 DAG 调度，把多个转换合并为一个作业，显著降低了迭代计算与交互式分析的延迟。Spark Shell 提供了低成本的探索环境，RDD 适合细粒度控制，DataFrame 与 Spark SQL 适合结构化数据分析。

Hive、HBase、Flink、Kafka 与各类 NoSQL 系统分别解决 SQL 数仓、随机读写、实时流处理、消息传输与多模型存储问题。实际的数据平台通常组合多种工具：采集层使用 Kafka 与 Flume，存储层使用 HDFS 与对象存储，计算层根据延迟要求选择 MapReduce、Spark 或 Flink，查询层使用 Hive、Spark SQL 或 Presto。

理解各组件的职责边界与数据流，比记住具体命令更重要。命令会随版本变化，分片、副本、Shuffle、状态与检查点这些机制则保持稳定。