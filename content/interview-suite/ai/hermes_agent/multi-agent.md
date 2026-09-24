# Hour 13: 多 Agent 架构

---

## 一、概述

Hermes 的多 Agent 体系基于**两层设计**：

| 层级 | 机制 | 生命周期 | 隔离级别 |
|------|------|----------|----------|
| delegate_task | 会话内子代理派发 | 父代理存活期间 | 同进程、不同 task_id |
| Kanban | 持久化工作队列 | 跨会话、跨进程 | 不同进程、不同 profile |

两者是**互补**关系：delegate_task 处理实时推理任务，Kanban 处理长运行异步任务。

---

## 二、delegate_task 子代理委托

### 2.1 三种调用模式

```
                     ┌──────────────────────────┐
                     │     Parent Agent (L0)     │
                     │ 完整工具集 + 完整上下文   │
                     └────┬──────────┬──────────┘
                          │          │
              ┌───────────┘          └───────────┐
              ↓                                  ↓
   ┌──────────────────────┐         ┌──────────────────────┐
   │  Child Agent (L1)    │         │  Child Agent (L1)    │
   │  "子代理 A"          │         │  "子代理 B"          │
   │                      │         │                      │
   │  - 独立 task_id      │         │  - 独立 task_id      │
   │  - 独立终端会话      │         │  - 独立终端会话      │
   │  - 受限工具集        │         │  - 受限工具集        │
   │  - 无父对话历史      │         │  - 无父对话历史      │
   │  - 只返回摘要        │         │  - 只返回摘要        │
   └──────────────────────┘         └──────────────────────┘
```

| 模式 | 行为 | 参数 |
|------|------|------|
| **单任务（同步）** | 父代理阻塞等待结果 | `goal` 参数 |
| **批量并行（同步）** | N 个子代理同时运行 | `tasks: [...]` 数组 |
| **后台异步** | 父代理不等待，结果以新消息注入 | 通过 `async_delegation.py` |

### 2.2 同步单任务流程

```
delegate_task(goal="审查 PR #123")
     ↓
_build_child_agent()          # 主线程构建
     ↓
_run_single_child()           # 线程池执行
     ↓
child.run_conversation()      # 子代理对话
     ↓
返回摘要（只返回最终结果，中间工具调用不进入父上下文）
```

### 2.3 并行批量流程

```
delegate_task(tasks=[
    {"goal": "审查代码 A"},
    {"goal": "审查代码 B"},
    {"goal": "审查代码 C"},
])
     ↓
ThreadPoolExecutor(max_workers=3)
     ├── Thread 1: _run_single_child(task "A")
     ├── Thread 2: _run_single_child(task "B")
     └── Thread 3: _run_single_child(task "C")
     ↓
收集所有结果 → 返回数组
```

### 2.4 后台异步流程

```
delegate_task(goal="长时间搜索", background=true)
     ↓
立即返回 handle: {"delegation_id": "deleg_xxx", "status": "dispatched"}
     ↓
子代理在 DaemonThreadPoolExecutor 中运行
     ↓
完成后 → completion_queue → 父代理收到新消息
```

---

## 三、Fork 机制：如何创建子代理

### 3.1 不是进程 Fork！

```python
# Hermes 的 Fork = copy.deepcopy(parent_agent) + 工具集裁剪
# NOT = os.fork() 或 multiprocessing.Process()

# tools/delegate_tool.py:972
def _build_child_agent():
    child = AIAgent(
        model=parent_agent.model,
        provider=parent_agent.provider,
        api_key=parent_agent.api_key,
        ...
    )
    
    # 继承缓存的系统提示
    child._cached_system_prompt = parent_agent._cached_system_prompt
    
    # 继承深度标记
    child._delegate_depth = parent_agent._delegate_depth + 1
    
    # 构建子代理专用系统提示
    child_prompt = _build_child_system_prompt(goal, context)
```

### 3.2 子代理被剥夺的工具

```python
# tools/delegate_tool.py:45-53
DELEGATE_BLOCKED_TOOLS = frozenset([
    "delegate_task",   # 禁止递归委托
    "clarify",         # 禁止与用户交互
    "memory",          # 禁止写入共享记忆
    "send_message",    # 禁止跨平台副作用
    "execute_code",    # 子代理应逐步推理
])
```

### 3.3 凭据传递

```
Parent Agent
    ├── api_key ────────────→ Child Agent (默认继承)
    ├── base_url ───────────→ Child Agent
    ├── model ──────────────→ Child Agent
    ├── provider ───────────→ Child Agent
    └── _cached_system_prompt → Child Agent (复用缓存)
    
delegation.provider / delegation.model 配置可覆盖
```

---

## 四、角色模型

### 4.1 Leaf（叶子节点，默认）

```python
role = "leaf"
# 特点：
# - 不能调用 delegate_task（工具被 BLOCK）
# - 不能使用 clarify、memory、send_message
# - 可以使用的工具：terminal、file、web、browser、search 等
```

### 4.2 Orchestrator（编排器）

```python
role = "orchestrator"
# 特点：
# - 保留 delegate_task（可以再派生子代理）
# - 深度限制：max_spawn_depth=1（默认最多 2 层）
# - 需要显式启用：orchestrator_enabled=true
# - 仍不能使用 clarify、memory、send_message

# tools/delegate_tool.py:1069-1070
if effective_role == "orchestrator" and "delegation" not in child_toolsets:
    child_toolsets.append("delegation")  # 恢复委托能力
```

### 4.3 深度控制

```
max_spawn_depth = 1（默认）
    Parent (depth 0)
        └── Child (depth 1) ← 不可再派发子代理

max_spawn_depth = 2
    Parent (depth 0)
        └── Orchestrator (depth 1)
                └── Grandchild (depth 2) ← 叶子节点
```

```python
# tools/delegate_tool.py:1012-1015
child_depth = getattr(parent_agent, "_delegate_depth", 0) + 1
max_spawn = _get_max_spawn_depth()
orchestrator_ok = _get_orchestrator_enabled() and child_depth < max_spawn
```

---

## 五、并发与隔离

### 5.1 并发实现

| 维度 | 实现 |
|------|------|
| **并发方式** | Python `ThreadPoolExecutor` 线程池 |
| **不是** | 不是 asyncio、不是 multiprocessing、不是 os.fork() |
| **单批次上限** | `max_concurrent_children=3`（默认） |
| **异步上限** | `max_async_children=3`（默认） |

### 5.2 隔离机制

| 隔离维度 | 实现 |
|----------|------|
| **终端** | 独立 `task_id` → 独立终端会话（不同 cwd） |
| **上下文** | 父代理只看到调用和摘要，看不到中间工具调用 |
| **文件缓存** | `file_state` 按 task_id 隔离，子代理互不干扰 |
| **记忆** | memory 工具被 BLOCK，子代理不能写入 |
| **凭据** | 从凭据池租赁独立 API 密钥 |

### 5.3 心跳机制

```
子代理运行时 → _heartbeat_loop 线程定期
    └── touch(parent_agent._touch_activity)
        └── 防止网关空闲超时
    
僵死检测：
    - 心跳监控 (iteration, current_tool) 是否推进
    - 工具执行中：更高容忍度（_HEARTBEAT_STALE_CYCLES_IN_TOOL）
    - 空闲状态：低容忍度（_HEARTBEAT_STALE_CYCLES_IDLE）
    - 僵死后停止心跳 → 网关超时自动清理
```

---

## 六、Kanban 多代理工作队列

### 6.1 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│ Kanban Board（SQLite 持久化）                                       │
│                                                                      │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                           │
│  │ Backlog │ → │  Ready  │ → │ Doing   │ → Complete                  │
│  └─────────┘   └─────────┘   └────┬────┘                           │
│                                    │                                │
│                           Dispatcher 分配                           │
│                                    │                                │
│                     ┌──────────────┼──────────────┐                │
│                     ↓              ↓              ↓                │
│               Worker A       Worker B       Worker C               │
│               (Profile)      (Profile)      (Profile)               │
│                                                                      │
│ 每个 Worker:                                                        │
│ - 独立 Hermes profile                                               │
│ - 自主 claim → process → complete 流程                            │
│ - 通过 kanban_show/kanban_complete/kanban_comment 工具交互         │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Kanban vs delegate_task

| 特性 | delegate_task | Kanban |
|------|---------------|--------|
| **生命周期** | 会话内、父代理存活期间 | 持久化、跨会话/跨进程 |
| **发现方式** | 父代理直接派发 | Dispatcher 轮询分配 |
| **隔离级别** | 同进程、不同 task_id | 不同进程、不同 profile |
| **适用场景** | 实时推理：代码审查、搜索 | 长运行：定时任务、CI/CD |
| **任务持久** | 否（会话结束丢弃） | 是（SQLite 存储） |

### 6.3 Kanban 工作流程

```
1. init        → 创建 Board
2. create      → 添加任务（Backlog → Ready）
3. Dispatcher  → 轮询 Ready 任务
4. assign      → 分配给空闲 Worker
5. Worker      → claim → process → complete
6. 失败处理    → 超过 failure_limit 后 auto-block
7. archive     → 完成任务归档
```

---

## 七、配置项总览

```yaml
# config.yaml
delegation:
  max_concurrent_children: 3      # 单批次最大并行子代理数
  max_async_children: 3           # 后台异步子代理最大数
  max_spawn_depth: 1              # 代理树最大深度（0=仅父，1=2层）
  orchestrator_enabled: true      # 是否允许编排器角色
  child_timeout_seconds: null     # 子代理超时（null=不限制）
  subagent_auto_approve: false    # 是否自动批准子代理危险命令
  max_iterations: 50              # 子代理最大工具调用迭代数
  provider: ""                    # 子代强制使用特定 provider
  model: ""                       # 子代强制使用特定 model
  inherit_mcp_toolsets: true      # 子代理是否继承 MCP 工具集
```

---

## 八、关键文件速查

| 文件 | 作用 |
|------|------|
| `tools/delegate_tool.py` | 子代理核心实现（~3151 行） |
| `tools/delegate_tool.py:45-53` | BLOCKED_TOOLS 定义 |
| `tools/delegate_tool.py:972` | `_build_child_agent` 子代理构建 |
| `tools/delegate_tool.py:1453` | `_run_single_child` 子代理执行 |
| `tools/async_delegation.py` | 后台异步委托（~556 行） |
| `tools/kanban_tools.py` | Kanban 工具集 |
| `hermes_cli/kanban.py` | Kanban CLI 命令 |

---

## 九、设计思想总结

```
┌─────────────────────────────────────────────────────────────────────┐
│ Hermes 多 Agent 设计原则                                            │
│                                                                      │
│ 1. 不是 OS Fork，而是 deepcopy + restrict                          │
│    - 节省进程开销                                                   │
│    - 复用父代理缓存（Anthropic 前缀缓存）                          │
│                                                                      │
│ 2. 工具集剪裁 = 安全边界                                            │
│    - BLOCKED_TOOLS 是硬边界                                        │
│    - role 决定是否恢复 delegate_task                                │
│                                                                      │
│ 3. 上下文隔离 = 成本控制                                            │
│    - 父代理只看到最终摘要                                          │
│    - 中间工具调用不进入父上下文                                    │
│                                                                      │
│ 4. delegate_task vs Kanban 职责分离                                │
│    - delegate_task: 实时推理，同步/异步                            │
│    - Kanban: 长运行任务，持久化工作队列                            │
└─────────────────────────────────────────────────────────────────────┘
```
