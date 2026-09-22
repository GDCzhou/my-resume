---
profile: zhoumin
label: 全栈开发工程师（v1）
order: 5
position: 全栈开发工程师
years: 5年
# avatar: /avatra.jpg
---

## 掌握技能

**前端开发**：React、Vue 3、TypeScript、Vite、Tailwind CSS

**后端开发**：Java、Spring Boot、Spring Cloud、Python（FastAPI）、RESTful API

**数据库与缓存**：MySQL、Redis、MongoDB

**中间件**：RocketMQ、Seata、Sentinel、nacos、OpenFeign

**devOps**： GitLab CI/CD、Docker、Kubernetes、Nginx、Linux

**AI 开发工具**：Codex、Claude Code

**Agent 开发**：LangChain、mcp、function calling、hermes

## 工作经历
### 深圳第一健康医疗管理有限公司 **2024.09 – 07** | 全栈开发工程师
### 深圳市祥泷科技有限公司 **2022.01 – 2024.09** | 全栈开发工程师
### 环球数码科技有限公司 **2020.02 – 2022.01** | 前端开发工程师


## 项目经验

### 多模型 RAG + Tool-Calling Agent 知识库问答系统

**项目简介**：独立设计并开发多模型 RAG 知识库问答平台，支持多格式文档解析、智能分块、向量检索、Reranker 重排及来源引用；将传统 RAG 问答升级为 Tool-Calling Agent，支持根据问题自主调用工具完成计算。

**技术栈**：React、TypeScript、Vite、Tailwind CSS、Python、FastAPI、LangChain、FastChat、MySQL、FAISS、BGE、Reranker、Unstructured、Tesseract OCR、SSE

**核心职责**：
- 设计并实现文档解析 → 智能分块 → BGE 向量化 → FAISS 检索 → Reranker 重排 → LLM 生成的完整 RAG 链路。
- 将 RAG 问答升级为 **Tool-Calling Agent**，基于 LangChain AgentExecutor 集成 Calculator 工具，并通过迭代限制及解析异常处理提升 Agent 执行稳定性。
- 自研语义、表格、列表、代码四类文档切分器，结合 BGE Tokenizer 精确控制 Chunk 长度，降低模型输入截断问题。
- 针对图片、表格等非结构化内容引入多模态 LLM 生成检索摘要，增强图表信息的检索能力。
- 解决 FAISS 距离计算及并发访问问题，通过 L2 归一化 + Inner Product 实现余弦相似度，并设计 RLock + LRU 线程安全实例池，实现缓存失效自动重载。
- 独立开发 RAG 离线评测框架，实现检索器、生成器及评测指标插件化注册，支持 EM、F1、ROUGE、BLEU 等指标。
- 完成 React + TypeScript 前端开发，实现 SSE 流式对话、文件上传进度、来源文档预览及文本高亮，并通过 Playwright 实现 E2E 测试。



### 智慧健康云平台

**项目简介**：面向连锁体检中心的 B 端 + C 端一体化健康管理平台，覆盖商城下单、支付结算、预约管理、合同管理、报告管理及 OA 对接等核心业务。基于 Spring Cloud Alibaba 微服务架构拆分 17+ 个服务，支撑个人会员、企业团检及内部运营等业务场景。

**技术栈**：Java 8、Spring Boot、Spring Cloud Alibaba、Nacos、Spring Cloud Gateway、OpenFeign、MyBatis-Plus、MySQL、Redis、Redisson、RocketMQ、Seata、Sentinel、XXL-Job、SkyWalking、Kubernetes、GitLab CI/CD

**核心职责**：

- **多渠道支付结算**：设计并实现混合支付结算逻辑，支持储值卡、微信、现金、定金等多种支付方式组合，完成金额分摊、折扣计算及尾差处理，并支持加项、减项、换项等订单变更后的金额重算。
- **大批量业务异步化**：针对企业团检千人级订单，引入 RocketMQ 将合同审批、订单及服务单创建改造为异步链路，通过批量写入、分段事务及延时消息实现削峰，降低同步链路耗时并解耦 OA 系统。
- **并发与分布式事务**：针对预约号源、支付回调等并发场景使用 Redisson 分布式锁保证资源占用一致性；针对跨服务换套餐场景使用 Seata AT 模式保证订单、服务单及项目明细的数据一致性。
- **微服务安全治理**：基于 Gateway + JWT + Redis 实现统一身份认证，通过 `@InnerAuth`、AOP 及 Feign 拦截器实现内部接口访问控制和用户上下文透传，减少业务服务重复鉴权逻辑。
- **外部系统集成**：负责 OA 等外部系统接口对接，引入 Sentinel 降级及调用日志机制，降低第三方系统异常对核心业务链路的影响。
- **工程化建设**：接入 SkyWalking 全链路追踪、XXL-Job 定时任务及 GitLab CI/CD，实现服务监控、任务调度和自动化部署。

**项目亮点**：

- **复杂支付结算**：通过统一结算逻辑处理多支付方式组合、折扣及金额尾差，保证订单金额与支付明细的一致性。
- **千人大单异步化**：通过 RocketMQ + 批量写入 + 分段事务 + 延时消息，将大批量同步业务拆分为异步处理链路，实现削峰和系统解耦。
- **分布式一致性**：使用 Redisson 解决高并发资源竞争，使用 Seata AT 解决跨服务业务操作的一致性问题。
- **微服务治理**：通过 Gateway、Nacos、OpenFeign、Sentinel 等构建服务治理体系，并统一处理认证、内部调用和异常降级。

### 智能导检与排队叫号系统

**项目简介**

面向体检中心到院现场场景的智能导检与排队叫号系统，根据受检者待检项目、检区、科室及房间状态动态匹配检查路径，实时处理排队、叫号、过号、冻结、重排等业务状态，并通过 WebSocket 向大屏及移动端实时推送排队进度，替代人工喊号与纸质指引，提升现场导检和排队管理效率。

**技术栈**

Java 8、Spring Boot 2.7、Spring Cloud Alibaba（Nacos / Sentinel）、MyBatis-Plus、MySQL、Redis、RocketMQ、WebSocket

**核心职责**

- **导检匹配引擎（0→1）**：从 0 到 1 设计并实现「检区 → 科室 → 房间 → 检查项目」四层匹配模型，综合受检者待检项目、房间可检项目、前置条件、优先级与实时等待时长计算推荐检查节点，并覆盖 VIP 预留、延时队列、独立队列等现场规则。

- **排队状态管理**：定义排队、叫号、过号、冻结、重排、取消等状态流转规则，把现场大量人工判断沉淀为可复用的状态机，保证不同业务场景下排队状态与号位一致。

- **并发与异步处理**：排队信息经 RocketMQ 异步落库，把写库与导检主链路解耦，降低同步链路压力；热点队列以 Redis 分布式锁串行化匹配与延时队列调度，避免多人同时进场时重复匹配、号位错乱。

- **实时叫号推送**：基于 WebSocket 建立服务端与大屏、移动端的长连接，10 秒定时增量推送队列与叫号状态，屏端与移动端无需轮询即可看到最新排队进度。

- **配置域建设**：检区、科室、房间、检查项目、优先级、前置条件、房间距离与医生排班统一配置化建模，现场导检规则调整不发版，支撑不同分院的差异化策略。

- **业务规则封装**：将复杂的体检现场规则模块化封装，降低业务规则与流程代码之间的耦合，便于后续扩展不同类型的体检场景。

**项目亮点**

- **0→1 核心系统建设**：独立完成导检匹配及排队叫号核心业务的设计与开发，交付 20 个控制器 / 163 个接口的服务能力。

- **四层导检匹配模型**：把「检区 → 科室 → 房间 → 检查项目 + 前置条件 + 优先级」抽象为可维护的匹配模型，按现场资源状态动态决策，替代人工喊号与纸质指引。

- **MQ + WebSocket 实时架构**：RocketMQ 负责异步落库与模块解耦，WebSocket 负责实时状态推送，形成「异步处理 + 实时交互」的现场协作链路。

- **复杂排队状态机**：覆盖排队、叫号、过号、冻结、重排、取消等多种状态，通过明确的状态流转规则保证高峰期现场排队的一致性与可追溯。
