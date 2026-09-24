# QA：Java 集合与基础八股（结合项目）

> 用法：每题"项目侧（真实代码/场景）+ 八股侧（原理）"。面试官从项目切入基础问题时，两层回答。
> 关联项目：智慧健康云平台（订单/对账）、导检系统（并发存储）、认证重构（枚举/ThreadLocal）

---

## Q1 ⭐ HashMap 底层原理？为什么线程不安全？

**项目侧**（健康云大量用 HashMap 做内存聚合）：
```java
// 团检批量按成员分组
Map<String, List<OrderPeService>> listMap = collect.stream().collect(Collectors.groupingBy(OrderPeService::getMemberId));
// 按订单ID分组支付记录
Map<String, List<PayRecord>> mapOrder = payRecordList.stream().collect(Collectors.groupingBy(PayRecord::getOrderId));
```
并发场景（支付回调）绝不直接用 HashMap，用 ConcurrentHashMap。

**八股侧**：
```
数据结构：JDK8 = 数组 + 链表 + 红黑树
  ├─ 数组（Node[] table）：桶
  ├─ 链表：哈希冲突时挂链表
  └─ 红黑树：链表长度 > 8 且数组 ≥ 64 时树化（查询 O(n)→O(log n)）

put 流程：
  ① hash(key) 计算桶下标
  ② 桶空 → 直接放
  ③ 桶有元素 → 比较 key（equals）→ 相同覆盖，不同挂链表/树
  ④ 扩容：负载因子 0.75，容量翻倍，rehash

为什么线程不安全：
  ① 并发 put 可能丢数据（两个线程同时写一个桶）
  ② JDK7 并发扩容可能死循环（头插法，环形链表）——JDK8 改尾插修复
  ③ size++ 非原子
```

**面试金句**："项目里内存聚合用 HashMap，但并发共享存储用 ConcurrentHashMap——因为 HashMap 并发 put 会丢数据。"

---

## Q2 ⭐ HashMap 扩容机制？为什么负载因子 0.75？

**八股侧**：
```
扩容触发：size > capacity × 0.75（负载因子）
  capacity 默认 16，扩容翻倍到 32/64/...

为什么 0.75（时间和空间权衡）：
  0.75 时：桶利用率较高，冲突不太严重（泊松分布，链表<8 概率极小）
  调小（如 0.5）：更少冲突，但更浪费空间（提前扩容）
  调大（如 1.0）：更省空间，但冲突更多（链表变长）

JDK8 优化：扩容后链表保持原序（尾插法），解决 JDK7 的死循环
```

---

## Q3 ⭐ ArrayList 和 LinkedList 的区别？

**项目侧**（导检/健康云大量 List）：
```java
// 拆单子订单集合
List<OrderVo> children = new ArrayList<>();
// 服务单明细列表
List<OrderPeServiceDetail> orderPeServiceDetails = new ArrayList<>();
```

**八股侧**：
```
ArrayList：数组实现，随机访问快 O(1)，增删中间 O(n)（要移动）
LinkedList：双向链表，头尾增删快 O(1)，随机访问慢 O(n)（要遍历）

项目里为什么都用 ArrayList：
  ├─ 绝大多数是"追加 + 遍历"场景（add + for）→ ArrayList 最优
  └─ 很少"中间插入/删除"（业务是追加明细）

⚠️ 默认容量 10，扩容 1.5 倍（Arrays.copyOf 复制）
```

---

## Q4 ⭐ 为什么重写 equals 必须重写 hashCode？

**八股侧**：
```
HashSet/HashMap 的查找逻辑：
  ① 先算 hashCode → 定位桶
  ② 桶里有元素 → 再 equals 精确比较

如果只重写 equals 不重写 hashCode：
  ├─ 两个"逻辑相等"的对象 hashCode 不同
  ├─ HashMap 存进不同桶 → 永远查不到（get 返回 null）
  └─ 或者查到了但 equals 不相等 → 放重复元素

约定：equals 相等的两个对象，hashCode 必须相等

项目里：领域对象（Order/OrderVo）做 equals 时，注意 hashCode 一致性
  否则在 HashSet/Map 里按 key 查会出 bug
```

---

## Q5 ⭐ 泛型是什么？为什么项目里用？

**项目侧**（健康云/导检大量泛型）：
```java
// 通用返回
List<OrderVo> / R<String> / TableDataInfo / Page<Order>
// 通用分页工具
IPage<T> / ServiceImpl<OrderMapper, Order>
```

**八股侧**：
```
泛型：编译期类型检查，运行时擦除
  ├─ List<String> 编译期保证只放 String
  ├─ 运行时擦除为 List（Type Erasure）
  └─ 泛型不能是基本类型（List<int> 不行，用 List<Integer>）

泛型的好处：
  ① 编译期类型安全（放错类型编译不过）
  ② 消除强转（不用 Object + 手动 cast）
  ③ 通用代码（一个 ServiceImpl<T> 服务所有 Mapper）

项目里：MyBatis-Plus 的 ServiceImpl<M,T> 就是泛型的典型
  → 一个基类服务所有实体的 CRUD
```

---

## Q6 ⭐ 反射是什么？Spring 怎么用反射？

**项目侧**（Spring/MyBatis 底层都是反射）：
```java
// MyBatis 的 @Excel 注解（反射读取字段上的注解）
@Excel(name = "订单ID")
private String id;

// Spring 的 @Autowired / @Resource（反射注入字段）
```

**八股侧**：
```
反射：运行时获取类信息并操作
  ├─ 获取 Class：Class.forName() / obj.getClass() / 类名.class
  ├─ 获取字段/方法/构造器：getDeclaredField() 等
  └─ 调用：method.invoke(obj) / field.set(obj, value)

Spring 里反射无处不在：
  ├─ IOC：扫描 @Component → 反射实例化 → 反射注入依赖
  ├─ AOP：动态代理（JDK 代理 / CGLIB）
  ├─ MyBatis：反射读取实体字段映射 SQL
  └─ @Excel：反射读注解生成表头

反射的代价：性能比直接调用慢（可缓存 Method 优化）
```

---

## Q7 ⭐ 动态代理是什么？JDK 代理 vs CGLIB？

**项目侧**（Spring AOP / @Transactional 的实现基础）：
```java
// 下单事务：@Transactional 就是靠动态代理实现的
// SpringUtil.getBean(OrderServiceImpl.class) 拿的是代理对象
```

**八股侧**：
```
动态代理：运行时生成代理类，拦截方法调用
  ├─ JDK 动态代理：基于接口（Proxy + InvocationHandler）
  │   └─ 要求目标类实现接口
  ├─ CGLIB：基于继承（子类覆盖方法）
  │   └─ 目标类不用接口，但不能是 final

Spring 选型：
  有接口 → JDK 代理（默认）
  没接口 → CGLIB
  Spring Boot 默认 proxyTargetClass=true → 强制 CGLIB

为什么 @Transactional 要代理：
  ├─ 代理在方法前后开事务/提交/回滚
  ├─ 自调用（this.xxx()）绕过代理 → 事务失效 ← 经典坑
  └─ 项目里用 SpringUtil.getBean 拿代理规避
```

---

## Q8 ⭐ 异常体系？checked vs unchecked？

**项目侧**（健康云自定义异常）：
```java
// 业务异常（unchecked，运行时抛出）
throw new OrderException("取消失败，当前订单状态不支持取消订单");
throw new OrderPayException("支付失败");
throw new ServiceOrderException("换项项目不能为空");
```

**八股侧**：
```
异常体系：
  Throwable
   ├─ Error（JVM 级，OOM/StackOverflow，不 catch）
   └─ Exception
        ├─ checked（编译期必须处理）：IOException、SQLException
        └─ unchecked（RuntimeException，运行期）：NPE、IllegalArgumentException

项目里的业务异常为什么都是 RuntimeException（unchecked）：
  ├─ 业务校验失败是"可预期但非编译期"的
  ├─ 不用强制 try-catch（侵入业务代码）
  └─ 由全局异常处理器统一捕获转 HTTP 错误码

最佳实践：
  ├─ 业务异常自定义（OrderException），带业务语义
  ├─ 全局 @RestControllerAdvice 统一处理
  └─ 不要 catch 后吞异常（空 catch 是反模式）
```

---

## Q9 ⭐ 深拷贝 vs 浅拷贝？项目里怎么用的？

**项目侧**（健康云到处是 BeanUtils 拷贝）：
```java
// 订单对象拷贝（浅拷贝）
BeanUtils.copyBeanProp(orderObj, order);
// 换项项目拷贝
BeanUtils.copyBeanProp(project, serviceDetailProject);
```

**八股侧**：
```
浅拷贝：拷贝对象本身，但内部引用（List/嵌套对象）共享
深拷贝：对象 + 内部所有引用都复制（完全独立）

BeanUtils.copyProperties = 浅拷贝
  ├─ 基本类型/包装类型：值复制（独立）
  ├─ List/嵌套对象：引用复制（共享！改一边另一边也变）

⚠️ 项目里的坑：
  copyBeanProp(orderObj, order) 后，orderObj.getOrderPeDetailList()
  和 order 的 List 是同一个引用
  → 修改 orderObj 的 List 会影响 order —— 需要注意
```

---

## Q10 ⭐ String 不可变？StringBuilder vs StringBuffer？

**项目侧**（拼接场景）：
```java
// 拼订单日志/描述（单线程）
String msg = "会员：" + memberName + "下单";   // 少量拼接 OK
// 大量拼接（如拼 Excel 数据）→ StringBuilder
```

**八股侧**：
```
String 不可变（final char[]）：
  ├─ 线程安全（不可变天然安全）
  ├─ 常量池复用（"abc" 字面量共享）
  └─ 拼接用 + 会创建新对象（大量拼接性能差）

StringBuilder vs StringBuffer：
  StringBuilder：非线程安全，快（单线程推荐）
  StringBuffer：synchronized，慢（线程安全）

项目里：单线程拼接用 StringBuilder（或少量用 +）
  大量拼接（循环几万次）绝不用 +（每次 new 一个 String）
```

---

## Q11 ⭐ == 和 equals 的区别？Integer 缓存？

**八股侧**：
```
== 比较引用地址（基本类型比较值）
equals 比较内容（Object 默认也是 ==，要重写）

Integer 缓存（-128~127）：
  Integer a = 100, b = 100; a == b → true（缓存命中）
  Integer a = 200, b = 200; a == b → false（new 两个对象）

项目里的坑：金额/数量用 Integer 比较小心
  ├─ 用 equals 或 intValue() 比较，不用 ==
  ├─ 金额用 BigDecimal（不用 double/float，精度问题）
  └─ 项目里尾差处理就是 BigDecimal 精度控制
```

---

## Q12 ⭐ BigDecimal 是什么？为什么金额必须用它？

**项目侧**（健康云金额计算核心）：
```java
// 尾差补偿：累计最后一个套餐之前的价格总和【防止尾差】
BigDecimal fLastTotalAmount = BigDecimal.ZERO;
BigDecimal fComboPayAmount = fOrderPayAmount.multiply(ratio)
    .setScale(SIX_NUM, RoundingMode.HALF_UP);
```

**八股侧**：
```
为什么不用 double/float：
  └─ 0.1 + 0.2 = 0.30000000000000004（二进制无法精确表示十进制小数）

BigDecimal：用 BigInteger（任意精度整数）+ scale 表示
  ├─ add/subtract/multiply/divide
  ├─ setScale(scale, RoundingMode) 控制精度和舍入
  └─ 比较用 compareTo（equals 会连 scale 一起比，1.0 ≠ 1.00）

项目里的应用：
  ├─ 金额全部 BigDecimal，六位精度 + HALF_UP
  ├─ 尾差：Σ分项 ≠ 订单应付时补偿
  ├─ 用 compareTo 比较金额（不能用 equals）
  └─ 这是"账实零差错"的基础
```

---

## 面试演练（从项目切入）

```
面试官："你们金额怎么算的？"
  → "全部 BigDecimal，六位精度 HALF_UP，尾差让普通项目承担，保证 Σ分项=应付。"

面试官："为什么不用 double？"
  → "0.1+0.2=0.30000000000000004，二进制无法精确表示，钱会差。BigDecimal 用整数+精度精确。"

面试官："你们为什么用 ArrayList 不用 LinkedList？"
  → "业务是追加+遍历场景，ArrayList 随机访问 O(1)，LinkedList 适合头尾增删。"
```

---

## 一句话总结

> **集合与基础八股，全部能在项目里找到落点**：HashMap 并发不安全→支付回调用 CHM；动态代理→@Transactional 的实现基础；异常体系→OrderException 业务异常；BeanUtils 浅拷贝→拷贝后 List 共享引用；BigDecimal→账实零差错的精度基础。**回答时先讲项目怎么用的，再补八股原理，比纯背八股有说服力。**

---

*本文档结合项目真实代码与 Java 基础原理编写。*