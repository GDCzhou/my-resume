---
title: "Hermes Agent 源码学习"
description: "Hermes Agent 源码深度剖析：对话循环、工具调用、Provider适配、压缩机制、持久化、插件系统、Gateway、Skill、MCP、记忆体系、多Agent架构"
---

# Hermes Agent 源码学习

> Hermes 是一个个人 AI Agent，运行在 CLI、消息网关、TUI 和桌面应用中。本专题通过逐模块剖析源码，深入理解 Agent 的完整实现。

## 核心特性

- **跨会话学习**（memory + skills）
- **子代理委托**
- **定时任务**
- **驱动真实终端和浏览器**

## 章节列表

### 核心架构

- [Agent 核心与对话循环](/ai/hermes_agent/agent-core-loop) — while 循环机制、LLM API 调用链、消息格式、会话状态管理
- [工具调用流程](/ai/hermes_agent/tool-calling) — 工具执行全链路、并发 vs 顺序执行、中间件洋葱模型
- [Provider 适配层](/ai/hermes_agent/provider-layer) — 多 LLM 后端支持、错误分类与 Failover、Fallback Chain

### 上下文与持久化

- [压缩机制](/ai/hermes_agent/compression) — 触发条件、ContextCompressor 算法、原地压缩 vs Session 旋转
- [SessionDB 持久化](/ai/hermes_agent/sessiondb) — SQLite WAL 模式、FTS5 全文搜索、会话链与压缩分裂
- [Prompt 缓存机制](/ai/hermes_agent/prompt-caching) — Prompt Caching 原理与实现

### 扩展系统

- [插件系统](/ai/hermes_agent/plugin-system) — 插件来源、plugin.yaml 结构、生命周期钩子
- [Gateway 网关](/ai/hermes_agent/gateway) — 多平台消息处理、Session 管理
- [Skill 加载机制](/ai/hermes_agent/skill-system) — Skill 发现、注册、调用
- [MCP 集成](/ai/hermes_agent/mcp-integration) — MCP 协议、工具封装

### 进阶主题

- [基于知识的渐进式学习](/ai/hermes_agent/knowledge-learning) — 知识积累与跨会话学习
- [记忆体系](/ai/hermes_agent/memory-system) — MemoryManager、记忆上下文围栏
- [多 Agent 架构](/ai/hermes_agent/multi-agent) — 子代理委托、多 Agent 协作
- [上下文引擎与提示构建器](/ai/hermes_agent/context-engine) — ContextEngine ABC、Prompt Builder

### 附录

- [Plugin 生命周期](/ai/hermes_agent/plugin-lifecycle) — 插件注册与使用的完整时序
- [数据库基础知识](/ai/hermes_agent/database-basics) — SQLite / WAL / FTS5 补充基础
