# QA：Java 并发面试问答（从导检项目切入）

> 来源项目：体检中心智能导检系统（healthy-compass）
> 简历对应：`opencode_write_resume.md` → "并发正确性：自研调度引擎从根上消除竞态，避免分布式锁的复杂度"
> 用法：面试官从项目深挖 Java 并发时，用"项目里怎么做的 → 八股原理"两层回答。每题的"项目侧"是真实代码，"八股侧"是原理。
> 代码位置：`~/work/yunpingtai/healthy-v2/healthy/healthy-compass`

---

## 核心思路：compass 的并发策略 = "能避免锁就避免"

```
项目里的并发分层：
  核心状态变更（journey/node/dispatch）→ 单线程事件循环串行执行（不用锁）
  跨线程标志位                         → volatile（可见性）
  计数/编号                            → AtomicInteger（无锁自增）
  配置表/场景（读多写少）               → AtomicReference（无锁读，整体换引用）
  可选功能席位（SeatAppService）       → synchronized（可能被并发触发且不在事件循环上）
  并发容器                             → ConcurrentHashMap / CopyOnWriteArrayList
  线程池                               → newSingleThreadExecutor / newVirtualThreadPerTaskExecutor
  队列                                 → LinkedBlockingQueue / ArrayBlockingQueue
```

**面试主心骨**：`EventLoop` 单线程事件循环——用"串行"替代"锁"，这是项目并发设计的灵魂。

---

## Q1 ⭐ 项目怎么保证并发安全？为什么不用锁？

**项目侧**（事件循环）：
```
compass 所有状态变更（排队、派单、叫号）不直接并发执行
  → 投递到 EventLoop（单线程事件循环）串行执行
  → 单线程天然原子，无需 synchronized/ReentrantLock
  → 核心代码里同步锁 0 使用
```

**八股侧**：
```
并发安全的三种手段：
  ① 互斥（锁）：synchronized / ReentrantLock —— 阻塞、有竞争
  ② 原子（CAS）：Atomic 类 —— 无锁、忙等、适合简单操作
  ③ 串行（单线程）：把并发操作变成顺序执行 —— 从根上消除竞态

事件循环 = 第三种"串行"，本质是"用单线程换原子性"
  优点：不用管锁的粒度/死锁/重入，逻辑简单
  代价：单线程吞吐有上限（但导检是单写者模型，够用）
```

**面试金句**："我们主动放弃并行度换取天然原子，避免一开始就背锁复杂度——这是正确性优先的取舍。"

---

## Q2 ⭐ volatile 是什么？项目里用在哪？

**项目侧**：
```java
// SimulationDriver.java —— 仿真控制标志（仿真线程读，其他线程写）
private volatile boolean running;   // 仿真开关
private volatile double speed;      // 仿真速度

// DomainClock.java —— 时钟参数（多线程读）
private volatile double speedFactor;
```

**八股侧**：
```
volatile 保证：
  ① 可见性：一个线程修改，其他线程立即可见（不走 CPU 缓存，直接写主内存）
  ② 有序性：禁止指令重排序（内存屏障）

volatile 不保证：
  ③ 原子性：i++ 这种"读-改-写"复合操作不行（需要 AtomicInteger）

适用场景：多线程共享的"标志位/开关/配置参数"（读多写少）
  running/speed = 典型：一个线程改，所有线程要立刻知道
```

**对比**：`i++` 用 volatile 不行（读-改-写非原子），必须 `AtomicInteger`。项目里 `seq`（仿真编号）就是用 AtomicInteger。

---

## Q3 ⭐ AtomicInteger / AtomicReference 是什么？CAS 是什么？

**项目侧**：
```java
// SimulationDriver.java —— 并发自增编号
AtomicInteger seq = new AtomicInteger();  // 多个虚拟线程并发自增

// ConfigRegistry.java —— 无锁读配置表
AtomicReference<Map<String, NodeConfig>> ref = new AtomicReference<>(Map.of());
// 读线程 ref.get() 拿引用；写线程换一个不可变 Map（整体替换引用）
```

**八股侧**：
```
CAS（Compare-And-Swap）：
  "比较并交换" —— 期望值 == 当前值？是则更新，否则重试
  硬件指令支持（如 x86 的 cmpxchg），无锁、无阻塞

AtomicInteger.incrementAndGet() 内部：
  while (true) {
      int cur = get();
      int next = cur + 1;
      if (compareAndSet(cur, next)) return next;   // CAS 成功才退出
  }

AtomicReference 的"无锁读"模式（RCU 思路）：
  写线程：new 一个不可变对象 → ref.set(新引用)（整体替换）
  读线程：ref.get() 永远拿到一个完整一致的快照（不会读到半更新的状态）
  优点：读无锁、无等待；写只需一次 CAS
```

**对比**：`synchronized` 是悲观锁（先锁再做），CAS 是乐观锁（先做再验证），AtomicReference 换引用是"不可变对象 + 整体替换"。

---

## Q4 ⭐ ConcurrentHashMap 和 HashMap/Hashtable 的区别？

**项目侧**：
```java
// JourneyStore.java —— 存所有体检者行程
ConcurrentMap<String, AgentJourney> map = new ConcurrentHashMap<>();

// NodeRuntimeStore.java —— 存所有房间运行态
ConcurrentMap<String, NodeRuntime> map = new ConcurrentHashMap<>();
```

**八股侧**：
```
HashMap：线程不安全（并发 put 可能丢数据/死循环）
Hashtable：线程安全但全表锁（synchronized 整个方法，并发低）
ConcurrentHashMap：线程安全 + 高并发
  JDK7：分段锁（Segment 数组，每段一把锁）
  JDK8：CAS + synchronized（只锁链表头/红黑树根，粒度更细）
  读：无锁（volatile 读）
  写：CAS 尝试，失败才锁桶头

项目里为什么用：行程/房间是多线程（事件循环 + 读线程）共享的，要安全读
  但写其实只在事件循环上 → 读多写少 → CHM 读无锁正好
```

---

## Q5 ⭐ CopyOnWriteArrayList 是什么？适用场景？

**项目侧**：
```java
// EventLoop.java —— 收尾钩子列表
CopyOnWriteArrayList<Runnable> taskTailHooks;

// SseEventBus.java —— SSE 订阅者列表
List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
```

**八股侧**：
```
CopyOnWriteArrayList（写时复制）：
  读：无锁（读旧数组）
  写：先复制整个数组 → 改副本 → 替换引用（volatile 数组引用）
  代价：写操作 O(n) 复制开销，适合"读多写极少"

适用：订阅者列表、缓存、配置监听器
  项目里：SSE 订阅者、事件循环钩子 —— 读频繁（每个任务都要遍历）、写极少（启动期注册）

不适用：写频繁的场景（每次写都复制整个数组，开销大）
```

---

## Q6 ⭐ BlockingQueue 是什么？项目里用在哪？

**项目侧**：
```java
// MqttScreenPushAdapter.java —— 屏推队列
LinkedBlockingQueue<>(1000)   // 容量1000，阻塞队列

// FactEventJdbcSubscriber.java —— 事实落库队列
ArrayBlockingQueue            // 数组实现的有界阻塞队列
```

**八股侧**：
```
BlockingQueue（阻塞队列）：
  生产者：put() 队满阻塞，offer() 队满返回 false
  消费者：take() 队空阻塞，poll(timeout) 等待超时

ArrayBlockingQueue vs LinkedBlockingQueue：
  ArrayBlockingQueue：有界（固定大小）、单锁（读写一把锁）、数组
  LinkedBlockingQueue：可有界可无界、双锁（读写分离）、链表

项目用途：
  MQTT 屏推：生产者（事件循环）→ 队列 → 消费者（MQTT 推送线程）
  → 解耦 + 削峰（事件循环不阻塞在推送慢的问题上）
```

---

## Q7 ⭐ ExecutorService / 线程池是什么？项目里怎么用的？

**项目侧**：
```java
// EventLoop.java —— 单线程执行器
Executors.newSingleThreadExecutor(r -> {
    Thread t = new Thread(r, "compass-event-loop");
    t.setDaemon(true);   // 守护线程：JVM 退出不阻塞
    return t;
});

// SimulationDriver.java —— 虚拟线程执行器
Executors.newVirtualThreadPerTaskExecutor();

// MqttScreenPushAdapter.java
ScheduledExecutorService connectRetry;   // 定时重连
```

**八股侧**：
```
线程池参数（ThreadPoolExecutor 构造器）：
  corePoolSize：核心线程数（常驻）
  maximumPoolSize：最大线程数
  keepAliveTime：非核心线程空闲存活时间
  workQueue：任务队列（先排队，队列满才加线程）
  拒绝策略：AbortPolicy(抛异常)/CallerRunsPolicy(调用者执行)/DiscardPolicy(丢弃)

执行流程：
  来任务 → 核心线程空闲？→ 给核心线程
        → 核心线程满了？→ 进队列
        → 队列满了？→ 加线程（到最大）
        → 最大也满？→ 拒绝策略

项目里：
  newSingleThreadExecutor = 1 核心线程，队列无限 → 严格串行（事件循环）
  newVirtualThreadPerTaskExecutor = 每任务一虚拟线程，无池化
  ScheduledExecutorService = 定时重连（MQTT）
```

---

## Q8 ⭐ 守护线程（daemon）是什么？项目里为什么设？

**项目侧**：
```java
Thread t = new Thread(r, "compass-event-loop");
t.setDaemon(true);   // ← 守护线程
```

**八股侧**：
```
守护线程（daemon）：
  特点：JVM 里所有非守护线程结束时，守护线程会被强制终止
  作用：后台服务线程（定时任务、监控、心跳），不阻塞 JVM 退出

项目里：事件循环/SSE 推送是后台服务
  → 设为 daemon：应用停止时，这些线程不拦 JVM 退出
  → 否则 JVM 会因为"还有非守护线程"而不退出（挂起）
```

---

## Q9 ⭐ ThreadLocal 是什么？项目里用了吗？

**项目侧**：
```java
// SimulationDriver.java —— 只有 ThreadLocalRandom（线程本地随机数）
ThreadLocalRandom.current().nextInt(10, 21);
```

**八股侧**：
```
ThreadLocal：每个线程一份独立的变量副本
  用途：线程上下文（用户信息、请求 ID）、线程安全（避免共享变量竞争）

ThreadLocalRandom vs Random：
  Random：多线程共享一个实例 → 原子性自旋（CAS）竞争激烈
  ThreadLocalRandom：每个线程一个随机数种子 → 无竞争，性能高

⚠️ 内存泄漏：ThreadLocal 的 key 是弱引用，value 是强引用
  → 线程池复用线程时，不 remove 会留 value → 泄漏
  → 用完必须 remove()

项目里：没用业务 ThreadLocal（不存用户上下文）
  因为事件循环是单线程，不需要"每线程一份"的隔离
  对比：登录认证项目用了 ThreadLocal 存当前用户（LoginInterceptor）
```

---

## Q10 ⭐ 虚拟线程和平台线程的区别？项目里怎么用的？

**项目侧**：
```java
// SimulationDriver.java —— 仿真用虚拟线程
Executors.newVirtualThreadPerTaskExecutor();

// Web 层 —— Spring Boot 配置
spring.threads.virtual.enabled=true
```

**八股侧**：
```
平台线程：OS 线程，1MB 栈，OS 调度，创建贵
虚拟线程：JVM 线程，几 KB 栈，JVM 调度，创建便宜

虚拟线程核心机制：阻塞时自动让出底层平台线程
  → 大量 IO 等待的任务，用少量平台线程就能承载海量虚拟线程

适用：IO 密集（等待多、计算少）—— Web 请求、远程调用、仿真 sleep
不适用：CPU 密集（计算型）—— 不省计算，调度开销反而增加

项目用法：
  仿真 agent（大量 sleep）→ 虚拟线程（每 agent 一个）
  Web 请求（查 HIS/远程）→ 虚拟线程（Spring 自动配置）
  状态变更 → 单线程事件循环（平台线程，串行）
```

---

## Q11 ⭐ 线程池的拒绝策略怎么选？项目里怎么做的？

**八股侧**：
```
4 种拒绝策略：
  AbortPolicy：抛 RejectedExecutionException（默认，任务丢失但能感知）
  CallerRunsPolicy：调用者线程自己执行（不丢任务，但可能阻塞调用者）
  DiscardPolicy：静默丢弃（最危险，任务无声消失）
  DiscardOldestPolicy：丢弃队列最老的，重试新的

项目里：
  事件循环 newSingleThreadExecutor → 默认 AbortPolicy（抛异常暴露问题）
  MQTT 推送队列容量 1000 → 队满的行为由 LinkedBlockingQueue 阻塞控制
```

---

## Q12 项目里"读多写少"和"写多读少"分别怎么处理？

**项目侧**：
```
读多写少：
  配置表（ConfigRegistry）→ AtomicReference 无锁读（整体换引用）
  SSE 订阅者（SseEventBus）→ CopyOnWriteArrayList（写时复制）
  行程/房间存储 → ConcurrentHashMap（读无锁）

写多读少 / 必须串行：
  状态变更（journey/node）→ 单线程事件循环（串行执行）
```

**八股侧**：
```
读多写少 → 无锁读方案：
  AtomicReference（换引用）/ CopyOnWriteArrayList（写时复制）/ CHM（读无锁）

写多 → 串行化：
  单线程事件循环（天然原子）或 分段锁/细粒度锁

选择逻辑：看"读写比例 + 一致性要求"
  读多写少且能容忍最终一致 → 无锁读
  必须强一致 → 锁 或 串行
```

---

## 面试演练模板（面试官深挖时）

```
面试官："你这个项目并发怎么保证安全的？"
  答："所有状态变更走单线程事件循环，串行执行，天然原子，不用锁。"

面试官："那为什么不用锁？锁有什么问题？"
  答："锁有竞争、死锁、粒度问题，还要考虑重入。事件循环用单线程换原子性，
       逻辑简单。代价是单线程吞吐上限，但我们是单写者模型，够用。"

面试官："你用了哪些并发工具？"
  答："volatile 管标志位可见性，AtomicInteger 管并发计数，AtomicReference 做
       无锁读配置（RCU 思路），ConcurrentHashMap 存共享状态，CopyOnWriteArrayList
       管订阅者列表，BlockingQueue 做生产者消费者解耦。"

面试官："虚拟线程呢？"
  答："仿真和 Web 层用虚拟线程扛高并发，但状态变更不靠虚拟线程——投递到
       事件循环串行，虚拟线程解决并发量，事件循环解决正确性。"
```

---

## 一句话总结

> **compass 的并发设计 = "事件循环串行 + 并发工具辅助"**：核心状态变更用单线程事件循环（不用锁，天然原子）；跨线程标志用 volatile；计数用 AtomicInteger；配置表用 AtomicReference 无锁读（RCU）；共享存储用 ConcurrentHashMap；订阅者用 CopyOnWriteArrayList；生产消费用 BlockingQueue 解耦；虚拟线程只做入口扛并发。**能避免锁就避免，用串行和原子替代互斥**——这是项目并发设计的核心哲学，也是面试时最值钱的一句话。

---

*本文档结合 healthy-compass 真实代码与 Java 并发原理编写，可直接用于面试深挖。*