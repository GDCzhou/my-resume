# Hour 1: Agent 核心与对话循环

---

## 一、阅读路径

### 核心文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `run_agent.py` | 5550 | AIAgent 类的定义，入口转发 |
| `agent/conversation_loop.py` | 4561 | **真正核心逻辑** |
| `model_tools.py` | ~1100 | 工具注册和调用 |
| `tools/registry.py` | ~500 | 工具执行器 |

### 转发模式

`run_agent.py` 中的 `AIAgent` 是一个**转发器**：

```python
# run_agent.py:429
class AIAgent:
    def __init__(self, ...):
        from agent import agent_init
        agent_init.init_agent(self, ...)  # 转发

    def run_conversation(self, ...):
        from agent.conversation_loop import run_conversation
        return run_conversation(self, ...)  # 转发
```

---

## 二、核心循环

### while 循环入口（第 589 行）

```python
while (api_call_count < agent.max_iterations and agent.iteration_budget.remaining > 0) or agent._budget_grace_call:
```

**循环条件解析：**

| 条件 | 含义 |
|------|------|
| `api_call_count < agent.max_iterations` | 未超过最大迭代次数（默认90） |
| `agent.iteration_budget.remaining > 0` | 预算还有剩余 |
| `agent._budget_grace_call` | 宽限调用（预算耗尽后最后一次机会） |

### while 循环内部流程

```
循环开始 (第 589 行)
    │
    ▼
┌─────────────────────────────┐
│ 1. new_turn()             │
│    重置检查点去重计数器     │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ 2. 检查中断请求             │
│    _interrupt_requested?    │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ 3. api_call_count++        │
│    消耗迭代预算             │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ 4. 宽限调用处理             │
│    _budget_grace_call      │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ 5. step_callback           │
│    通知网关钩子             │
└─────────────────────────────┘
    │
    ▼
    ... (准备消息、调用 API、处理响应)
```

---

## 三、LLM API 调用链

```
conversation_loop.py:589  while 循环
    │
    ▼
conversation_loop.py:1138  _perform_api_call()
    │
    ▼
hermes_cli/middleware.py   run_llm_execution_middleware()
    │
    ▼
agent/chat_completion_helpers.py:125  interruptible_api_call()
    │
    ▼
agent/chat_completion_helpers.py:239  client.chat.completions.create()
         ↑ 实际调用
```

---

## 四、消息格式

Hermes 使用 OpenAI 格式：

```python
{"role": "system", "content": "..."}
{"role": "user", "content": "..."}
{"role": "assistant", "content": "...", "tool_calls": [...]}
{"role": "tool", "tool_call_id": "...", "content": "..."}
```

**reasoning 内容**存储在 `assistant_msg["reasoning"]` 中。

---

## 五、会话状态管理

### SessionDB (hermes_state.py)

- SQLite 存储（FTS5 全文搜索）
- 每个会话独立数据库文件
- 支持消息历史和搜索

### 状态清理

循环结束后清理：
- 消息历史写入 SessionDB
- 检查点计数器重置

---

## 六、循环结束条件

| 条件 | 结果 |
|------|------|
| `assistant_message.tool_calls` 存在 | 执行工具，继续循环 |
| 无 tool_calls | 返回文本响应，退出循环 |
| 达到 max_iterations | 退出循环 |
| 预算耗尽 | 退出循环 |
| `_interrupt_requested` | 退出循环 |

---

## 七、验证代码

```python
# 验证工具数量
from model_tools import get_tool_definitions
tools = get_tool_definitions()
print(f"Total tools: {len(tools)}")

# 验证工具注册表
from tools.registry import registry
print(f"Registry dispatch works: {registry.get_entry('terminal') is not None}")

# 验证 handle_function_call
from model_tools import handle_function_call
result = handle_function_call("noop", {"message": "test"})
print(f"Noop tool result: {result}")
```

---

## 八、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| while 循环入口 | `conversation_loop.py:589` |
| API 调用 | `conversation_loop.py:1138` |
| 工具执行入口 | `run_agent.py:5170` |
| 工具注册 | `model_tools.py:876` |
| registry dispatch | `tools/registry.py:390` |

---

## 总结

Hour 1 核心理解：
- Agent = **while 循环** + **LLM API 调用** + **工具执行**
- `run_conversation()` 是入口
- 循环条件：`api_call_count < max_iterations` AND `iteration_budget.remaining > 0`
- 循环结束：`break` → 文本响应，或达到最大迭代
