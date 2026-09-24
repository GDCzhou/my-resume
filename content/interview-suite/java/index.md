---
title: "Java 面试场景题宝典"
description: "Java 后端高频项目场景面试题：并发、MySQL、Redis、JVM、Spring、分布式、消息队列、设计模式等 98 题"
---

# Java 面试场景题宝典

> 来源：B站《(2026版) 面试逃不掉的Java项目场景题合集》（共 98 集），每集整理为一篇笔记。

> 来源：B站《(2026版) 面试逃不掉的Java项目场景题合集》[BV1jZcMzzEaq](https://www.bilibili.com/video/BV1jZcMzzEaq)（共 98 集）
> 说明：每集一个笔记文件（P01~P98）。笔记以视频主题（即面试题）为核心整理答案要点，并对已完成语音转写的视频做了内容校验；技术要点均为标准面试答案，含必要的代码示例。
> 注意：P77、P78 与 P75、P76 是同一主题的重复投稿，笔记已做合并说明。

## 一、线上故障排查（P01-P04）

- [P01 百万数据导出 Excel，解决 OOM](/java/P01)
- [P02 线上 OOM 怎么定位和解决](/java/P02)
- [P03 线上突发 CPU 飙高怎么定位和解决](/java/P03)
- [P04 线上发生死锁定位&避免](/java/P04)

## 二、高并发与项目场景设计（P05-P11、P53-P59、P61）

- [P05 秒杀系统如何设计](/java/P05)
- [P06 订单超时自动取消是怎么实现的？](/java/P06)
- [P07 如何防止重复下单](/java/P07)
- [P08 怎么防止刷单？](/java/P08)
- [P09 分布式集群架构下怎么保证并发安全](/java/P09)
- [P10 让你设计一个扫码登录怎么实现？](/java/P10)
- [P11 如何设计分布式日志存储架构](/java/P11)
- [P53 项目场景：高并发库存扣减 & 防超卖设计](/java/P53)
- [P54 项目场景面试-直播间高并发打赏系统设计](/java/P54)
- [P55 项目场景面试-评论盖楼系统架构设计与性能优化](/java/P55)
- [P57 项目场景面试：多租户 SaaS 系统怎么设计](/java/P57)
- [P58 项目场景面试：敏感词过滤怎么设计](/java/P58)
- [P59 项目场景面试：优惠券规则引擎与组合优惠设计](/java/P59)
- [P61 项目场景：电商订单拆单与合单业务设计](/java/P61)

## 三、Redis 专题（P12-P15、P50-P52）

- [P12 使用 Redis 出现缓存击穿、雪崩、穿透怎么解决](/java/P12)
- [P13 如何使用 Redis 记录上亿用户连续登录天数](/java/P13)
- [P14 给你一个亿 Redis keys 统计双方的共同好友](/java/P14)
- [P15 Redis 如何实现上亿用户实时积分排行榜](/java/P15)
- [P50 面试重灾区：Redis 事务与原子性的大坑](/java/P50)
- [P51 Redis 明明配置了 LRU 为啥还会 OOM](/java/P51)
- [P52 Redis Cluster 为什么是 16384](/java/P52)

## 四、海量数据处理与性能优化（P16-P19、P71）

- [P16 内存 200M 读取 1G 文件并统计重复内容](/java/P16)
- [P17 查询 200 条数据耗时 200ms，怎么在 500ms 内查询 1000 条数据](/java/P17)
- [P18 SpringBoot 如果有百万数据插入怎么优化](/java/P18)
- [P19 SpringBoot 可以同时处理多少请求](/java/P19)
- [P71 MyBatis 查 100 万页还在用 Limit Offset？回去等通知吧](/java/P71)

## 五、Java 并发与 JVM（P20、P38、P45-P49、P60、P62、P65）

- [P20 volatile 有哪些引用场景](/java/P20)
- [P38 synchronized 怎么提升性能](/java/P38)
- [P45 面试重灾区：JVM 三色标记与 GC 核心架构](/java/P45)
- [P46 面试重灾区：JVM 常量池与 intern() 的谎言](/java/P46)
- [P47 面试重灾区：逃逸分析与栈上分配 - java 对象一定是在堆上分配的吗？](/java/P47)
- [P48 一台服务器最多能建立多少个 TCP 连接](/java/P48)
- [P49 面试重灾区：JVM 跨代引用与卡表](/java/P49)
- [P60 面试重灾区：GC 耗时 10 毫秒为什么系统却卡顿 10 秒](/java/P60)
- [P62 99% 开发者都踩过的 List 坑](/java/P62)
- [P65 99%+ 开发者踩坑！BigDecimal 的 4 个致命陷阱（金融必看）](/java/P65)

## 六、MySQL 专题（P21-P33、P85-P86）

- [P21 SQL 的执行过程](/java/P21)
- [P22 单表最多数据量需要分表](/java/P22)
- [P23 B 树和 B+ 树的区别](/java/P23)
- [P24 Mysql 引擎层 BufferPool 工作过程原理](/java/P24)
- [P25 Mysql 怎么做到 Redolog 崩溃恢复的？](/java/P25)
- [P26 binlog 刷盘机制](/java/P26)
- [P27 binlog 和 redolog 缺一不可？](/java/P27)
- [P28 聚集索引和非聚集索引](/java/P28)
- [P29 count(星)、count(1)、count(字段) 谁更快？有什么区别](/java/P29)
- [P30 前模糊索引失效](/java/P30)
- [P31 分库分表 id 冲突解决方案](/java/P31)
- [P32 深分页为什么慢，怎么优化？](/java/P32)
- [P33 MySQL 的隔离级别实现原理 MVCC](/java/P33)
- [P85 分库分表还在拍脑袋定数量？小心系统直接崩！](/java/P85)
- [P86 ShardingSphere 支持哪些分片算法？](/java/P86)

## 七、Spring / SpringBoot / 持久层（P41-P43、P63-P70）

- [P41 有没有出现 Spring 正常 SpringBoot 报错的情况？](/java/P41)
- [P42 怎么记录 MyBatis 的 SQL 耗时时间](/java/P42)
- [P43 如何对 SpringBoot 配置文件敏感信息加密](/java/P43)
- [P63 Spring 面试必背：自动装配（名称+类型）+注入方式+歧义解决全解析](/java/P63)
- [P64 别再误解了，Spring 的单例是容器视角，不是 JVM 视角](/java/P64)
- [P66 三分钟搞懂 SpringBoot 配置：@Value 配置类 Environment 怎么选](/java/P66)
- [P67 面试必背！BeanFactory vs ApplicationContext 核心区别](/java/P67)
- [P68 SpringBoot 2.0 为啥弃用 JDK 代理？CGLIB 才是 AOP 的神](/java/P68)
- [P69 为什么用 JPA 半年后哭着换 MyBatis？](/java/P69)
- [P70 为什么大厂弃用 MyBatis 二级缓存？](/java/P70)

## 八、安全与加密（P34、P40、P56、P72）

- [P34 用户忘记密码，系统为什么不直接提供密码，而是要修改密码](/java/P34)
- [P40 如何防止 SpringBoot 反编译](/java/P40)
- [P56 项目场景面试：用户登录 Token 存储的安全漏洞](/java/P56)
- [P72 什么是 DDoS 攻击？又该如何防御 DDoS 攻击？](/java/P72)

## 九、分布式与微服务（P44、P73-P84、P89-P90）

- [P44 分布式 ID 面试必问五大坑](/java/P44)
- [P73 HTTP 与 RPC 的区别](/java/P73)
- [P74 什么是跨域以及如何解决？](/java/P74)
- [P75 什么是 WebSocket？Nginx 如何支持 WebSocket 协议？](/java/P75)
- [P76 什么是零拷贝？零拷贝如何减少 CPU 拷贝与上下文切换？](/java/P76)
- [P77 什么是 WebSocket？Nginx 如何支持 WebSocket 协议？（与 P75 重复）](/java/P77)
- [P78 什么是零拷贝？零拷贝如何减少 CPU 拷贝与上下文切换？（与 P76 重复）](/java/P78)
- [P79 HTTP 长连接与短连接！Nginx 如何管理这些连接？](/java/P79)
- [P80 Dubbo 负载均衡策略是什么？不同场景该用哪一种？](/java/P80)
- [P81 Dubbo 中的异步调用是如何实现的？它有什么优势和注意事项？](/java/P81)
- [P82 强一致还是保生存？Base 理论又是什么？](/java/P82)
- [P83 什么是分布式事务，常见的实现方案又有哪些](/java/P83)
- [P84 分布式锁：Redis 还是 Zookeeper？](/java/P84)
- [P89 SpringCloud 核心组件及其作用](/java/P89)
- [P90 Dubbo 的整体架构设计及分层](/java/P90)

## 十、消息队列（P35、P91-P98）

- [P35 怎么用 Java 实现一个简单的消息队列](/java/P35)
- [P91 简述 RabbitMQ 的架构设计](/java/P91)
- [P92 RabbitMQ 如何确保消息发送？消息接收？](/java/P92)
- [P93 RabbitMQ 事务消息](/java/P93)
- [P94 RabbitMQ 死信队列、延时队列](/java/P94)
- [P95 简述 Kafka 架构设计](/java/P95)
- [P96 Kafka 消息丢失的场景及解决方案](/java/P96)
- [P97 Kafka 是 pull？push？优劣势分析](/java/P97)
- [P98 Kafka 中 zk 的作用](/java/P98)

## 十一、设计模式（P39、P87-P88）

- [P39 开发中有没有用设计模式，怎么用的](/java/P39)
- [P87 什么是设计模式？为什么资深架构师都离不开它？](/java/P87)
- [P88 面试必问：外观和组合模式到底怎么选？](/java/P88)

## 十二、工程实践与工具（P36-P37）

- [P36 Git 怎么修复线上突发 bug](/java/P36)
- [P37 RestTemplate 如何优化连接池](/java/P37)
