# Hour 12: Prompt 缓存机制

---

## 一、Prompt 缓存解决了什么问题？

### 1.1 核心痛点：每次请求都发送完整历史

```
┌─────────────────────────────────────────────────────────────────────┐
│ 问题：传统 API 调用方式                                             │
│                                                                      │
│ 第一轮请求：                                                         │
│ [System: 2000 tokens][User: 100][Assistant: 50][User: 100]       │
│                                                                       │
│ 第二轮请求：                                                         │
│ [System: 2000 tokens][User: 100][Assistant: 50][User: 100][User: 80]│
│                                                                       │
│ 第三轮请求：                                                         │
│ [System: 2000 tokens][User: 100][Assistant: 50][User: 100]         │
│ [User: 80][Assistant: 30][User: 90]                                 │
│                                                                       │
│ 问题：                                                              │
│ - System prompt (2000 tokens) 每轮都重复发送                        │
│ - 历史对话每轮都累积                                                │
│ - Token 成本 = 所有历史 × 轮次                                      │
│ - Context window 快速填满                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Prompt 缓存的解决方案

```
┌─────────────────────────────────────────────────────────────────────┐
│ 解决方案：Anthropic Prompt Caching                                   │
│                                                                      │
│ 首次请求：标记需要缓存的部分                                          │
│ [System: 2000 (cache_control=ephemeral)]                           │
│ [User: 100][Assistant: 50][User: 100]                              │
│                                                                       │
│ 第二轮请求：只发新消息，引用缓存                                      │
│ [User: 80]                                                          │
│ + <cached: System 2000 + History 250>                             │
│                                                                       │
│ Token 成本：新消息 80 + 缓存引用 0（几乎免费）                      │
│ 节省 ~75% 输入 token 成本                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 具体解决的问题

| 问题 | 没有缓存 | 有缓存 |
|------|----------|--------|
| **Token 成本** | 所有历史每轮都付钱 | 只有新消息付钱 |
| **Context 填充速度** | 快速填满 | 慢速填充 |
| **响应延迟** | 大请求 = 慢 | 小请求 = 快 |
| **长对话支持** | 有限（上下文耗尽） | 可持续（缓存复用） |

---

## 二、两层缓存架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Prompt 缓存分层                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: Hermes 内部缓存（_cached_system_prompt）                   │
│                                                                      │
│ 解决的问题：系统提示每次都要重新构建吗？                              │
│                                                                      │
│ 首次构建 → 存储在 SessionDB                                        │
│ 后续轮次 → 直接复用，不调用 LLM                                      │
│                                                                      │
│ 失效条件：Provider 切换（模型名/Provider 名变了）                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2: Anthropic API 缓存（cache_control 标记）                    │
│                                                                      │
│ 解决的问题：减少实际发送到 API 的 token 数量                         │
│                                                                      │
│ 4 个断点策略：                                                       │
│ - System prompt（总是缓存）                                          │
│ - 最后 3 条非系统消息                                               │
│                                                                      │
│ 失效条件：TTL 过期（默认 5m，可选 1h）                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、缓存的 Prompt 内容

### 3.1 System Prompt 三层结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                  System Prompt 三层结构                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: Stable（稳定层）— 整个会话不变                              │
│                                                                      │
│ 1. SOUL.md 内容（或 DEFAULT_AGENT_IDENTITY）                        │
│    └── Agent 身份定义                                               │
│                                                                      │
│ 2. HERMES_AGENT_HELP_GUIDANCE                                       │
│    └── 如何使用 Hermes Agent 的指导                                  │
│                                                                      │
│ 3. TASK_COMPLETION_GUIDANCE                                          │
│    └── 通用任务完成指导（不要编造、不停stub）                        │
│                                                                      │
│ 4. PARALLEL_TOOL_CALL_GUIDANCE                                       │
│    └── 教模型并行调用独立工具                                        │
│                                                                      │
│ 5. 工具特定指导                                                      │
│    - MEMORY_GUIDANCE（如果启用了 memory 工具）                       │
│    - SESSION_SEARCH_GUIDANCE（如果启用了 session_search）            │
│    - SKILLS_GUIDANCE（如果启用了 skill_manage）                     │
│    - KANBAN_GUIDANCE（如果启用了 kanban）                           │
│                                                                      │
│ 6. TOOL_USE_ENFORCEMENT_GUIDANCE                                    │
│    └── 告诉模型调用工具而不是描述意图                                │
│                                                                      │
│ 7. 模型特定指导                                                      │
│    - GOOGLE_MODEL_OPERATIONAL_GUIDANCE（gemini/gemma）              │
│    - OPENAI_MODEL_EXECUTION_GUIDANCE（gpt/codex/grok）             │
│                                                                      │
│ 8. Skills 索引                                                       │
│    └── 可用技能列表（compact 模式下隐藏非编码类）                    │
│                                                                      │
│ 9. Environment Hints                                                 │
│    └── WSL/Termux 等环境提示                                        │
│                                                                      │
│ 10. Coding Context Blocks                                            │
│     └── 当前项目上下文（git/workspace snapshot）                     │
│                                                                      │
│ 11. Platform Hints                                                    │
│     └── CLI/Telegram/Discord 等平台特定提示                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2: Context（上下文层）— 可能跨会话变化                         │
│                                                                      │
│ 1. system_message（调用者传入的系统消息）                            │
│                                                                      │
│ 2. Context Files（工作目录下的配置文件）                             │
│    - AGENTS.md                                                      │
│    - .cursorrules                                                   │
│    - CLAUDE.md                                                      │
│    └── 其他项目配置文件                                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Layer 3: Volatile（易变层）— 每会话/每轮变化                        │
│                                                                      │
│ 1. Memory Block（记忆快照）                                          │
│    └── from agent._memory_store.format_for_system_prompt("memory")   │
│                                                                      │
│ 2. USER Profile Block（用户画像）                                    │
│    └── from agent._memory_store.format_for_system_prompt("user")    │
│                                                                      │
│ 3. External Memory Provider Block                                    │
│    └── from agent._memory_manager.build_system_prompt()              │
│                                                                      │
│ 4. Timestamp + Identity Line                                         │
│    └── "Conversation started: Tuesday, June 23, 2026"               │
│    └── "Session ID: xxx"                                            │
│    └── "Model: MiniMax-M2.2"                                        │
│    └── "Provider: minimax-cn"                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 拼接顺序

```python
# agent/system_prompt.py:484
joined = "\n\n".join(p for p in (
    parts["stable"],    # 稳定层
    parts["context"],   # 上下文层
    parts["volatile"],  # 易变层
) if p)
```

### 3.3 实际例子

一个典型会话的 `_cached_system_prompt` 大概长这样：

```
You are Hermes, a personal AI assistant...
[HERMES_AGENT_HELP_GUIDANCE 内容]
[TASK_COMPLETION_GUIDANCE 内容]
[PARALLEL_TOOL_CALL_GUIDANCE 内容]
[MEMORY_GUIDANCE 内容]
[TOOL_USE_ENFORCEMENT_GUIDANCE 内容]
...

Available Skills:
- skill-name: description
- another-skill: description
...

Active Hermes profile: default.
...

[system_message 如果有]
[AGENTS.md 内容]
[.cursorrules 内容]

[Memory Block]
[USER Profile Block]

Conversation started: Tuesday, June 23, 2026
Model: MiniMax-M2.2
Provider: minimax-cn
```

### 3.4 关键特性

| 特性 | 说明 |
|------|------|
| **稳定** | Stable 层一次构建，整个会话不变 |
| **懒变** | Volatile 层在压缩等事件后重建 |
| **缓存复用** | `_cached_system_prompt` 存在 → 不重新构建 → 节省 LLM 调用 |
| **SessionDB 持久化** | 存储在 SessionDB，支持会话恢复后复用 Anthropic 缓存 |

---

## 四、Anthropic API 缓存实现

### 4.1 断点策略

```python
# agent/prompt_caching.py
def apply_anthropic_cache_control(api_messages, cache_ttl="5m"):
    """
    4 个 cache_control 断点策略：system + 最后 3 条非系统消息
    所有断点使用相同 TTL
    """
    # 1. System prompt 必定缓存
    if messages[0].get("role") == "system":
        _apply_cache_marker(messages[0], marker)
    
    # 2. 最后 3 条非系统消息也缓存
    remaining = 4 - breakpoints_used
    non_sys = [i for i in range(len(messages)) if messages[i].get("role") != "system"]
    for idx in non_sys[-remaining:]:
        _apply_cache_marker(messages[idx], marker)
```

### 4.2 缓存标记格式

```python
# 发送时
{
    "role": "system",
    "content": [
        {
            "type": "text",
            "text": "You are a helpful assistant...",
            "cache_control": {"type": "ephemeral", "ttl": "5m"}
        }
    ]
}
```

### 4.3 实际效果

```
┌─────────────────────────────────────────────────────────────────────┐
│ 请求示例（10 轮对话后）                                              │
│                                                                      │
│ 发送到 API 的消息：                                                  │
│ [System: 2000 tokens (cache_control)]   ← 缓存命中                  │
│ [User: 80]                               ← 新消息                    │
│ [Assistant: 30]                          ← 新消息                    │
│ [Tool: result]                           ← 新消息（最后 3 条之一）   │
│                                                                      │
│ 实际发送 token ≈ 2100（vs 原本 4000+）                              │
│ 节省 ≈ 50% token                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五、Hermes 内部缓存实现

### 5.1 系统提示缓存

```python
# agent/conversation_loop.py:255-333
def _restore_or_build_system_prompt(agent, system_message, conversation_history):
    # 1. 从 SessionDB 尝试恢复
    stored_prompt = agent._session_db.get_system_prompt(agent.session_id)
    
    if stored_prompt and _stored_prompt_matches_runtime(agent, stored_prompt):
        # 继续会话 → 复用存储的提示
        # 同时复用了 Anthropic 缓存
        agent._cached_system_prompt = stored_prompt
        return
    
    # 2. 新会话 → 重新构建系统提示
    agent._cached_system_prompt = agent._build_system_prompt(system_message)
    
    # 3. 保存到 SessionDB
    if agent._session_db:
        agent._session_db.update_system_prompt(agent.session_id, agent._cached_system_prompt)
```

### 5.2 Provider 切换时的处理

```python
# agent/chat_completion_helpers.py:1045-1071
def rewrite_prompt_model_identity(agent, model: str, provider: str) -> None:
    """
    Provider 切换时，更新 _cached_system_prompt 中的身份行
    Model: xxx → Model: yyy
    Provider: xxx → Provider: yyy
    
    不持久化到 SessionDB：存储的保持主 Provider 标签
    这样切换回主 Provider 时，提示又是 byte-identical 的
    """
    sp = getattr(agent, "_cached_system_prompt", None)
    for label, value in (("Model", model), ("Provider", provider)):
        # 只改最后出现的身份行
        matches = list(re.finditer(rf"(?m)^{label}: .*$", sp))
        if matches:
            last = matches[-1]
            sp = f"{sp[:last.start()]}{label}: {value}{sp[last.end():]}"
    agent._cached_system_prompt = sp
```

---

## 六、缓存失效条件

| 条件 | 影响 | 处理方式 |
|------|------|----------|
| Provider 切换 | `_cached_system_prompt` 需要重建 | `rewrite_prompt_model_identity()` 原地修改身份行 |
| 会话压缩 | 系统提示可能需要重建 | 压缩后重新构建 |
| 长时间空闲（>5m） | Anthropic 缓存 TTL 过期 | `cache_ttl` 控制（默认 5m，可选 1h） |
| 会话断开 | 缓存失效 | 重新建立会话时重新构建 |

---

## 七、配置选项

```yaml
# config.yaml
prompt_caching:
  cache_ttl: "5m"  # 缓存有效期：5m（默认）或 1h
                   # 5m: 更安全，缓存不会占用太久
                   # 1h: 更省钱，但缓存占用上下文窗口更久
```

---

## 八、关键文件速查

| 文件 | 行号 | 作用 |
|------|------|------|
| `agent/prompt_caching.py` | 1-79 | Anthropic cache_control 断点策略 |
| `agent/system_prompt.py` | 113 | `build_system_prompt_parts` 构建三层 |
| `agent/system_prompt.py` | 468 | `build_system_prompt` 拼接三层 |
| `agent/conversation_loop.py` | 255 | `_restore_or_build_system_prompt` 恢复/构建 |
| `agent/chat_completion_helpers.py` | 1045 | `rewrite_prompt_model_identity` 身份行更新 |

---

## 九、与上下文压缩的关系

```
┌─────────────────────────────────────────────────────────────────────┐
│ Prompt 缓存 vs 上下文压缩                                           │
│                                                                      │
│ Prompt 缓存：                                                        │
│ - 不减少消息数量                                                     │
│ - 减少发送到 API 的 token（通过引用缓存）                            │
│ - 保留完整历史在 SessionDB                                          │
│                                                                      │
│ 上下文压缩：                                                         │
│ - 真正减少消息数量                                                   │
│ - 用 LLM 摘要替代 10+ 条消息                                         │
│ - 释放上下文窗口空间                                                 │
│                                                                      │
│ 两者互补：                                                          │
│ - Prompt 缓存处理 token 成本                                         │
│ - 上下文压缩处理 context window 限制                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 十、总结

**Prompt 缓存解决的核心问题：**

1. **Token 成本高**：重复发送系统提示（2000+ tokens）× 每轮
2. **Context window 压力大**：历史累积快速填满上下文
3. **响应延迟**：大请求处理更慢

**实现方式：**

1. Hermes 内部缓存 `_cached_system_prompt` → 避免重复构建
2. Anthropic API 缓存 `cache_control` → 减少发送 token
3. SessionDB 持久化 → 支持会话恢复和缓存复用
