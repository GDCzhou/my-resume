# QA：Spring 与事务八股（结合项目）

> 用法：每题"项目侧（真实代码）+ 八股侧（原理）"。
> 关联项目：智慧健康云平台（下单事务/支付/幂等）、登录认证重构（IOC/AOP/DDD）、导检系统（Spring Boot 3.4）

---

## Q1 ⭐ Spring IoC 是什么？Bean 生命周期？

**项目侧**（整个项目都在用）：
```java
// 依赖注入
@Resource private IOrderService orderService;
@Autowired private RocketMQTemplate rocketMQTemplate;

// 手动从容器取 Bean
OrderServiceImpl bean = SpringUtil.getBean(OrderServiceImpl.class);
```

**八股侧**：
```
IoC（控制反转）：对象的创建和管理交给 Spring 容器
  ├─ 传统：自己 new
  ├─ IoC：容器创建，@Autowired 注入
  └─ DI（依赖注入）是 IoC 的实现方式

Bean 生命周期（完整）：
  ① 实例化（new）
  ② 属性注入（@Autowired/@Resource）
  ③ Aware 回调（BeanNameAware/ApplicationContextAware）
  ④ BeanPostProcessor.beforeInitialization
  ⑤ @PostConstruct / InitializingBean.afterPropertiesSet
  ⑥ BeanPostProcessor.afterInitialization
  ⑦ 使用中
  ⑧ @PreDestroy / DisposableBean.destroy

SpringUtil.getBean 的作用：
  手动从容器拿 Bean（代码中途需要时）
  关键：拿到的可能是【代理对象】（AOP 增强后）
```

---

## Q2 ⭐ Spring AOP 是什么？怎么实现？

**项目侧**（@Transactional 就是 AOP）：
```java
// 事务切面
@Transactional
public void addPersonalOrder(...) { ... }

// 操作日志切面（项目里 @Log）
@Log(title = "下单", businessType = BusinessType.INSERT)
```

**八股侧**：
```
AOP（面向切面编程）：把横切逻辑（事务/日志/权限）从业务代码抽出来

核心概念：
  ├─ 切面（Aspect）：横切逻辑（如事务管理器）
  ├─ 通知（Advice）：Before/After/AfterReturning/AfterThrowing/Around
  ├─ 切入点（Pointcut）：哪些方法要增强
  ├─ 连接点（JoinPoint）：具体方法
  └─ 织入（Weaving）：把通知织到目标方法

实现原理：动态代理
  ├─ 有接口 → JDK 动态代理（Proxy + InvocationHandler）
  ├─ 无接口 → CGLIB（子类覆盖）
  └─ Spring Boot 默认强制 CGLIB

项目里：
  @Transactional（事务切面）
  @Log（操作日志切面）
  ArchUnit（架构规则，不是 AOP 但类似横切治理）
```

---

## Q3 ⭐ @Transactional 原理？为什么自调用失效？

**项目侧**（经典坑，文档 §4.5 记录）：
```java
// 规避自调用：SpringUtil.getBean 拿代理再调
OrderServiceImpl bean = SpringUtil.getBean(OrderServiceImpl.class);
bean.insertPersonalOrder(orderObj);   // 走代理，事务生效

// 自调用（失效）：this.addOrderDetail() 直接进真身
this.addOrderDetail(order, userId, false);   // 注解失效
```

**八股侧**：
```
@Transactional 原理：
  ├─ AOP 动态代理包裹方法
  ├─ 方法前：开启事务（begin）
  ├─ 方法成功：提交（commit）
  └─ 方法异常：回滚（rollback）

为什么自调用失效：
  this.xxx() 直接调用本类方法，绕过代理
  → 代理的开事务逻辑没机会执行

项目里的两个解法：
  ① SpringUtil.getBean(Xxx.class).method() 拿代理
  ② 跨 Bean 注入（this.orderService.addOrderDetail，另一个 Bean 是代理）

@Transactional 默认只回滚 RuntimeException
  ├─ 默认不回滚 checked 异常
  └─ rollbackFor = Exception.class 让它都回滚
```

---

## Q4 ⭐ 事务传播（Propagation）有哪些？项目里用了哪些？

**项目侧**：
```java
// 默认 REQUIRED
@Transactional  // = REQUIRED
// 团检入口显式声明
@Transactional(rollbackFor = Exception.class)
```

**八股侧**：
```
传播级别（REQUIRED 默认）：
  ├─ REQUIRED：外层有事务就加入，没有就新建（默认）
  ├─ REQUIRES_NEW：永远新建，外层失败不影响它
  ├─ NESTED：嵌套（保存点，可部分回滚）
  ├─ SUPPORTS：有就加入，没有就裸执行
  ├─ MANDATORY：必须在外层事务内，没有就报错
  ├─ NOT_SUPPORTED：不支持事务，挂起外层
  └─ NEVER：不能有事务，有就报错

项目里：
  ├─ 下单：REQUIRED（明细+订单+日志同事务）
  ├─ 新版下单缺外层事务 → 明细/订单/服务单各开事务（§4.5 P1）
  ├─ 团检：rollbackFor = Exception.class
  └─ 认知：新版 addOrderDetail 因外层无事务 → REQUIRED 自己新建 TX
```

---

## Q5 ⭐ 什么是循环依赖？Spring 怎么解决？

**八股侧**：
```
循环依赖：A 依赖 B，B 依赖 A（构造器/字段相互注入）

Spring 三级缓存解决：
  ├─ 一级缓存（singletonObjects）：完整 Bean
  ├─ 二级缓存（earlySingletonObjects）：早期 Bean（未完成属性注入）
  ├─ 三级缓存（singletonFactories）：工厂（生成代理用）

解决过程：
  ① 创建 A → 实例化 → 放入三级缓存（工厂）
  ② A 注入 B → 创建 B → 实例化 → 放三级缓存
  ③ B 注入 A → 从三级缓存拿到 A 的早期引用 → B 完成
  ④ B 完成 → A 拿到 B → A 完成

为什么构造器注入解决不了循环依赖：
  ├─ 字段注入：可以先实例化（空对象）再注入
  ├─ 构造器注入：必须先有参数才能实例化 → 死锁
  └─ 所以循环依赖推荐字段注入能解，构造器不行

项目里：Spring Boot 3.x 默认禁止循环依赖（启动报错）
  └─ 通过设计避免（不互相依赖，靠接口/事件解耦）
```

---

## Q6 ⭐ @Autowired 和 @Resource 的区别？

**八股侧**：
```
@Autowired（Spring 提供）：
  ├─ 按类型注入（byType）
  ├─ 多个同类型 → 按 @Qualifier 指定名字
  ├─ required 属性（找不到是否报错）
  └─ 字段/构造器/方法都能用

@Resource（JSR-250，Java 标准）：
  ├─ 先按名字（byName）→ 找不到再按类型（byType）
  ├─ name 属性指定名字
  └─ 字段/方法（构造器不行）

项目里两者都用：
  @Resource private IOrderService orderService;   // 按名字
  @Autowired private RocketMQTemplate ...;         // 按类型
```

---

## Q7 ⭐ Spring Boot 自动配置原理？

**八股侧**（结合项目）：
```
自动配置 = Spring Boot 的核心魔法

原理：
  ① @SpringBootApplication = @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan
  ② @EnableAutoConfiguration → 导入 AutoConfigurationImportSelector
  ③ 它读取 META-INF/spring/...AutoConfiguration.imports（spring.factories）
  ④ 按 @Conditional 条件判断是否装配（有类/有配置才装）

项目里：
  ├─ spring.threads.virtual.enabled=true → 自动配置 Tomcat 虚拟线程
  ├─ @ConditionalOnProperty("healthy.mq.pipeline") → 选 RocketMQ/Kafka 实现
  └─ MqService 接口两个实现（RocketMQ/Kafka），按配置切
```

---

## Q8 ⭐ Spring MVC 请求处理流程？

**八股侧**（结合项目）：
```
请求流程：
  ① 请求进来 → DispatcherServlet（前端控制器）
  ② HandlerMapping：找对应的 Controller 方法
  ③ HandlerAdapter：执行 Controller（+拦截器）
  ④ Controller 返回（数据/视图）
  ⑤ 返回前可走 @RestControllerAdvice（异常处理/响应包装）
  ⑥ 响应返回

项目里：
  ├─ 所有 Controller 都走这套流程
  ├─ @RestControllerAdvice 全局异常处理（业务异常转 HTTP 错误码）
  └─ 拦截器（LoginInterceptor 认证）
```

---

## Q9 ⭐ Bean 的作用域有哪些？项目里用了哪些？

**八股侧**（结合项目）：
```
作用域：
  ├─ singleton（默认）：整个容器一个实例
  ├─ prototype：每次获取新实例
  ├─ request：每个 HTTP 请求一个
  ├─ session：每个会话一个
  └─ application：ServletContext 一个

项目里：
  ├─ 绝大多数 singleton（Service/Mapper）
  ├─ ⚠️ singleton 里的状态要小心（多线程共享）
  │   └─ 项目里 Service 的字段都是注入的依赖（无状态），安全
  └─ 有状态数据（NodeRuntime/行程）不放 Bean，放专门 store（CHM）
```

---

## Q10 ⭐ 项目里怎么用 Spring 做架构治理？（DDD + Spring）

**项目侧**（导检/认证重构）：
```
端口-适配器：
  ├─ domain 层零框架依赖（0 个 Spring import）
  ├─ ports 定义接口（Spring 管实现）
  └─ adapter 实现端口（@Component 注入）

ArchUnit：把架构规则变测试
  ├─ domain 不得依赖 Spring
  ├─ 依赖方向朝内
  └─ 违反即构建失败
```

**八股侧**：
```
Spring 在 DDD 里的角色：
  ├─ IoC：领域服务/仓储实现由容器管理
  ├─ AOP：事务/审计切面在应用层
  └─ 约束：领域层不依赖 Spring（保持纯业务）

为什么领域层不依赖 Spring：
  ├─ 可单测（不启动 Spring）
  ├─ 可移植（不绑定框架）
  └─ 架构清晰（业务纯，技术外包）
```

---

## 一句话总结

> **Spring 八股全部有项目落点**：IoC（SpringUtil.getBean 手动取代理）、AOP（@Transactional 靠动态代理）、事务传播（REQUIRED 加入/新建）、自调用失效（§4.5 经典坑 + getBean 规避）、自动配置（虚拟线程/MQ 切换）、DDD 治理（domain 零框架依赖 + ArchUnit 锁死）。**讲项目里踩过的事务坑、用过的代理规避，比背 Spring 流程有说服力。**

---

*本文档结合项目真实代码与 Spring 原理编写。*