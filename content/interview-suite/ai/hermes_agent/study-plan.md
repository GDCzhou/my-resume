# Hermes Agent 学习计划

---

## 速成路线（6 小时）

### Hour 1: Agent 核心 + 对话循环 ⭐ ✅

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `run_agent.py` | 5550 | AIAgent 类、run_conversation() |
| `agent/conversation_loop.py` | 4561 | 核心循环逻辑 |
| `hermes_state.py` | 5017 | SQLite 会话存储 |

**学习目标：**
- [x] 理解 AIAgent 如何处理用户消息
- [x] 理解消息格式（OpenAI format）
- [x] 理解 iteration/budget 机制
- [x] 理解工具调用的循环

**详细笔记：** `Hour1_学习笔记.md`

**核心概念：**

1. **对话循环** (conversation_loop.py)
   - 循环条件：`while (api_call_count < max_iterations and budget.remaining > 0)`
   - 每次循环：调用 LLM → 处理工具调用 → 返回结果
   - 工具调用会 `continue` 继续循环

2. **消息格式** (OpenAI compatible)
   ```python
   {"role": "system", "content": "..."}
   {"role": "user", "content": "..."}
   {"role": "assistant", "content": "...", "tool_calls": [...]}
   {"role": "tool", "tool_call_id": "...", "content": "..."}
   ```

3. **IterationBudget**：控制最大迭代次数（默认90），防止无限循环

---

### Hour 2: 工具调用流程 ⏳

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `model_tools.py` | ~2500 | 工具分发、handle_function_call() |
| `tools/registry.py` | ~500 | 工具注册表 |
| `toolsets.py` | ~300 | 工具集定义 |

**学习目标：**
- [ ] 理解工具如何注册
- [ ] 理解工具分发流程
- [ ] 理解工具参数验证

---

### Hour 3: Provider 适配层 ⏳

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `agent/providers/` | ~2000 | 各 provider 适配 |
| `agent/provider_router.py` | ~500 | 路由选择 |

**学习目标：**
- [ ] 理解多 provider 支持
- [ ] 理解 fallback 机制

---

### Hour 4: Gateway 消息网关 ⏳

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `gateway/run.py` | ~3000 | 消息网关主循环 |
| `gateway/platforms/base.py` | ~500 | 平台适配基类 |

**学习目标：**
- [ ] 理解多平台消息处理
- [ ] 理解 session 管理

---

### Hour 5: MCP 集成 ⏳

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `mcp/` | ~1000 | MCP 客户端/服务器 |
| `agent/mcp_tools.py` | ~300 | MCP 工具封装 |

**学习目标：**
- [ ] 理解 MCP 协议
- [ ] 理解 MCP 工具调用

---

### Hour 6: CLI + 交互界面 ⏳

**必读文件：**

| 文件 | 行数 | 重点 |
|------|------|------|
| `cli.py` | ~4000 | CLI 主程序 |
| `hermes_cli/` | ~2000 | CLI 子命令、配置 |

**学习目标：**
- [ ] 理解 CLI 架构
- [ ] 理解交互式输入处理

---

## 实践练习

### 练习 1: 运行 Agent
```bash
cd /Users/zhoumin/learn/agent/hermes-agent
source .venv/bin/activate
python -c "from run_agent import AIAgent; print('OK')"
```

### 练习 2: 查看工具列表
```python
from model_tools import get_tool_definitions
tools = get_tool_definitions()
print(f"共 {len(tools)} 个工具")
```

### 练习 3: 追踪工具调用
在 `conversation_loop.py` 中找到 `_execute_tool_calls()` 调用，理解工具分发。

---

## 学习笔记汇总

### 关键文件速查

| 功能 | 文件 | 行号 |
|------|------|------|
| Agent 入口 | `run_agent.py` | `AIAgent.run_conversation()` |
| 对话循环 | `agent/conversation_loop.py` | `run_conversation()` |
| 工具注册 | `tools/registry.py` | `registry.register()` |
| 工具分发 | `model_tools.py` | `handle_function_call()` |
| 会话存储 | `hermes_state.py` | `SessionDB` |
| Provider 路由 | `agent/provider_router.py` | `_route()` |
| 消息网关 | `gateway/run.py` | `GatewayRunner` |
