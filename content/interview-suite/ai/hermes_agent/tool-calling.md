# Hour 2: 工具调用流程

---

## 一、工具执行全链路

```
LLM 返回 tool_calls
    │
    ▼
conversation_loop.py:4045
agent._execute_tool_calls()
    │
    ▼
run_agent.py:5170
def _execute_tool_calls()
    │
    ├── 判断并发/顺序
    │   ├── 否 → execute_tool_calls_sequential()
    │   └── 是 → execute_tool_calls_concurrent()
    │
    ▼
tool_executor.py:243 或 770
execute_tool_calls_*()
    │
    ├── 1. 检查中断
    ├── 2. 解析 JSON 参数
    ├── 3. Tool Search 展开
    ├── 4. 应用中间件
    └── 5. agent._invoke_tool()
            │
            ▼
        agent_runtime_helpers.py:1718
        invoke_tool()
            │
            ├── Agent 级工具 (inline)
            │   ├── "todo" → todo_tool
            │   ├── "memory" → memory_tool
            │   ├── "session_search" → session_search_tool
            │   ├── "read_terminal" → read_terminal_tool
            │   └── "delegate_task" → _dispatch_delegate_task
            │
            └── 其他工具
                │
                ▼
            model_tools.py:876
            handle_function_call()
                │
                ├── Tool Search bridge 展开
                ├── apply_tool_request_middleware
                ├── pre_tool_call hook
                ├── ACP edit approval 检查
                └── registry.dispatch()
                        │
                        ▼
                    tools/registry.py:390
                    dispatch(name, args)
                        │
                        └── entry.handler(args)
```

---

## 二、并发 vs 顺序执行

### 执行模式判断

| 模式 | 函数 | 条件 |
|------|------|------|
| 顺序 | `execute_tool_calls_sequential()` | 单个工具 或 交互式工具 |
| 并发 | `execute_tool_calls_concurrent()` | 多个独立工具（最大 8 线程） |

### 并发执行流程 (execute_tool_calls_concurrent)

```
多个工具调用
    │
    ▼
ThreadPoolExecutor(max_workers=8)
    │
    ├── Thread 1: tool_call[0]
    ├── Thread 2: tool_call[1]
    ├── Thread 3: tool_call[2]
    └── ...
    │
    ▼
等待所有线程完成
    │
    ▼
收集结果，按 original_index 排序
```

---

## 三、Agent 级工具

这些工具在 `invoke_tool()` 中直接处理，不走 registry：

| 工具名 | 处理函数 | 特殊行为 |
|--------|----------|----------|
| `todo` | `todo_tool` | 会话级 todo 列表 |
| `memory` | `memory_tool` | 记忆管理 |
| `session_search` | `session_search_tool` | 搜索历史 |
| `read_terminal` | `read_terminal_tool` | 读取终端输出 |
| `delegate_task` | `_dispatch_delegate_task` | 子代理 |

---

## 四、Tool Search Bridge

Tool Search 是一种工具发现机制：

| 工具 | 功能 |
|------|------|
| `tool_search` | 搜索可用工具 |
| `tool_describe` | 获取工具描述 |
| `tool_call` | 通过名称调用工具（自动展开） |

**展开流程：**
```
模型调用 "tool_call"
    │
    ▼
resolve_underlying_call() → 解析工具名和参数
    │
    ▼
检查工具是否在会话的 toolset 范围内
    │
    ▼
递归调用 handle_function_call(underlying_name, args)
```

---

## 五、中间件机制

Hermes 使用**洋葱模型**中间件：

```
请求
  ↓
Middleware A (预处理)
  ↓
Middleware B (预处理)
  ↓
Middleware C (预处理)
  ↓
Terminal Call (实际调用)
  ↓
Middleware C (后处理)
  ↓
Middleware B (后处理)
  ↓
Middleware A (后处理)
  ↓
响应
```

### 中间件类型

| 类型 | 触发时机 | 用途 |
|------|----------|------|
| `llm_execution` | LLM API 调用前/后 | 请求/响应转换 |
| `tool_request` | 工具执行前 | 转换参数、可拦截 |
| `tool_execution` | 工具执行后 | 转换结果 |

### 关键特性

- 每个中间件必须调用 `next_call()` 才能让请求继续传递
- 中间件可以**短路**：不调用 `next_call()` 直接返回
- 错误处理：如果中间件抛出异常，会调用 `next_call()` 作为 fallback

### 中间件注册

```python
# hermes_cli/plugins.py
get_plugin_manager()._middleware.get(LLM_EXECUTION_MIDDLEWARE, [])
```

---

## 六、拦截机制

工具执行前可能被拦截：

| 拦截源 | 检查位置 | 处理 |
|--------|----------|------|
| 插件 hook | `pre_tool_call` | 返回错误消息 |
| Toolset 范围 | `invoke_tool` | 拒绝执行 |
| ACP edit approval | `handle_function_call` | 拒绝文件修改 |
| 用户中断 | `execute_tool_calls_*` | 跳过剩余工具 |

---

## 七、registry.dispatch()

**最终执行点：**

```python
# tools/registry.py:390
def dispatch(self, name: str, args: dict, **kwargs) -> str:
    entry = self.get_entry(name)
    if not entry:
        return json.dumps({"error": f"Unknown tool: {name}"})
    
    try:
        if entry.is_async:
            return _run_async(entry.handler(args, **kwargs))
        return entry.handler(args, **kwargs)  # ← 实际调用工具函数
    except Exception as e:
        return json.dumps({"error": f"Tool execution failed: {e}"})
```

**一句话：registry 存储了每个工具的 handler 函数，dispatch() 直接调用它。**

---

## 八、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| 工具执行入口 | `run_agent.py:5170` |
| 并发执行 | `tool_executor.py:770` |
| 顺序执行 | `tool_executor.py:243` |
| invoke_tool | `agent_runtime_helpers.py:1718` |
| handle_function_call | `model_tools.py:876` |
| registry dispatch | `tools/registry.py:390` |

---

## 总结

Hour 2 核心理解：
- 工具执行分并发和顺序两种模式
- Agent 级工具 (todo, memory, session_search) 有特殊处理
- Tool Search 是一种工具发现 bridge
- 中间件用洋葱模型
- 每个工具调用都经过多层中间件和拦截检查
- 最终通过 `registry.dispatch()` 执行
