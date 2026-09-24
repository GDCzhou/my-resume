# Hermes Agent 学习笔记 - 总纲

---

## 概述

Hermes 是一个个人 AI Agent，运行在 CLI、消息网关、TUI 和桌面应用中。

**核心特性：**
- 跨会话学习（memory + skills）
- 子代理委托
- 定时任务
- 驱动真实终端和浏览器

---

## 章节索引

### Hour 1: Agent 核心与对话循环

📖 **[agent-core-loop.md](./agent-core-loop.md)**

主要内容：
- 核心文件结构和阅读路径
- while 循环机制
- LLM API 调用链
- 消息格式
- 会话状态管理

**核心概念：** Agent = while 循环 + LLM API 调用 + 工具执行

---

### Hour 2: 工具调用流程

📖 **[tool-calling.md](./tool-calling.md)**

主要内容：
- 工具执行全链路
- 并发 vs 顺序执行
- Agent 级工具
- Tool Search Bridge
- 中间件机制
- 拦截机制

**核心概念：** 工具通过 registry.dispatch() 执行，中间件用洋葱模型

---

### Hour 3: Provider 适配层

📖 **[provider-layer.md](./provider-layer.md)**

主要内容：
- Provider 类型与客户端映射
- Client 创建流程
- Keep-Alive 配置
- 错误分类与 Failover
- Fallback Chain
- API Mode

**核心概念：** 通过 Provider 适配层支持多种 LLM 后端，错误分类决定恢复策略

---

### Hour 4: 压缩机制

📖 **[compression.md](./compression.md)**

主要内容：
- 压缩触发条件
- 压缩流程详解
- ContextCompressor 算法
- 原地压缩 vs Session 旋转
- 压缩失败处理

**核心概念：** 用 LLM 摘要替代长对话历史，保护头尾消息

---

### Hour 5: SessionDB 持久化

📖 **[sessiondb.md](./sessiondb.md)**

主要内容：
- SQLite 数据库结构
- WAL 模式与并发控制
- 会话链与压缩分裂
- FTS5 全文搜索
- 读写锁与重试机制

**核心概念：** SQLite WAL 模式存储会话和消息，FTS5 支持全文搜索

---

### 附录：数据库基础知识

📖 **[database-basics.md](./database-basics.md)**

为理解 SessionDB 补充的数据库基础知识：
- SQLite 简介
- 表、列、行、主键、外键
- SQL 增删改查
- 索引
- WAL 模式
- 事务
- FTS5 全文搜索

---

### Hour 6: 插件系统

📖 **[plugin-system.md](./plugin-system.md)**

主要内容：
- 插件来源（bundled/user/project/pip）
- plugin.yaml + __init__.py 结构
- PluginContext 接口
- 生命周期钩子
- 插件发现与加载

**核心概念：** 插件通过 register(ctx) 注册工具和钩子，核心保持精简

---

### 附录：Plugin 生命周期

📖 **[plugin-lifecycle.md](./plugin-lifecycle.md)**

详解 Plugin 的注册和使用时机：
- 启动时 discover_plugins() 扫描所有插件
- register(ctx) 一次性注册工具到全局 registry
- 运行时 invoke_hook() 按需触发钩子
- 工具 handler 在每次调用时执行

---

## 快速导航

| 章节 | 文件 | 状态 |
|------|------|------|
| Hour 1: Agent 核心 | `agent-core-loop.md` | ✅ 完成 |
| Hour 2: 工具调用流程 | `tool-calling.md` | ✅ 完成 |
| Hour 3: Provider 适配层 | `provider-layer.md` | ✅ 完成 |
| Hour 4: 压缩机制 | `compression.md` | ✅ 完成 |
| Hour 5: SessionDB 持久化 | `sessiondb.md` | ✅ 完成 |
| Hour 6: 插件系统 | `plugin-system.md` | ✅ 完成 |
| Hour 7: Gateway 网关 | `gateway.md` | ✅ 完成 |
| Hour 8: Skill 加载机制 | `skill-system.md` | ✅ 完成 |
| Hour 9: MCP 集成 | `mcp-integration.md` | ✅ 完成 |
| Hour 10: 基于知识的渐进式学习 | `knowledge-learning.md` | ✅ 完成 |
| Hour 11: 记忆体系 | `memory-system.md` | ✅ 完成 |
| Hour 12: Prompt 缓存机制 | `prompt-caching.md` | ✅ 完成 |
| Hour 13: 多 Agent 架构 | `multi-agent.md` | ✅ 完成 |
| Hour 14: 上下文引擎+提示构建 | `context-engine.md` | ✅ 完成 |

---

## 关键文件速查

| 功能 | 文件:行号 |
|------|-----------|
| while 循环入口 | `conversation_loop.py:589` |
| API 调用 | `conversation_loop.py:1138` |
| 工具执行入口 | `run_agent.py:5170` |
| 工具注册 | `model_tools.py:876` |
| registry dispatch | `tools/registry.py:390` |
| 中间件 | `hermes_cli/middleware.py:173` |
| 压缩机制 | `conversation_compression.py:281` |
| ContextCompressor | `context_compressor.py:593` |
| SessionDB | `hermes_state.py:658` |
| 插件管理器 | `hermes_cli/plugins.py:290` |
| GatewayRunner | `gateway/run.py:2409` |
| Provider 客户端创建 | `agent_runtime_helpers.py:1357` |
| Fallback 机制 | `chat_completion_helpers.py:1074` |
| 错误分类 | `error_classifier.py:24` |
| Prompt 缓存 | `prompt_caching.py:1` |
| 系统提示恢复 | `conversation_loop.py:255` |
| 提示构建器 | `prompt_builder.py:1` |
| Skills 索引构建 | `prompt_builder.py:1244` |
| 上下文文件发现 | `prompt_builder.py:1751` |
| 环境提示构建 | `prompt_builder.py:874` |
| ContextEngine ABC | `context_engine.py:32` |
| MemoryManager | `memory_manager.py:313` |
| 记忆上下文围栏 | `memory_manager.py:296` |
| Skill 脚手架剥离 | `skill_commands.py:58` |
| Curator 自动 transition | `curator.py:276` |
| Curator LLM review | `curator.py:1757` |
| Skill Bundles 扫描 | `skill_bundles.py:168` |
| Bundle 调用消息构建 | `skill_bundles.py:253` |
