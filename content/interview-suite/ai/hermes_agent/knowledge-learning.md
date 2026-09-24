# Hour 10: 基于知识的渐进式学习

---

## 一、概述

Hermes Agent 的"自主强化学习"不是传统 RL（不调整模型权重），而是**基于知识的渐进式学习**：

- **本质**：后台异步分析对话，提取教训，更新文本知识库
- **存储形式**：Skill 文件（SKILL.md）+ Memory（用户画像）
- **学习时机**：对话结束后，后台线程运行

---

## 二、核心架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      完整学习流程                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 1. 触发阶段                                                         │
│                                                                      │
│    turn_finalizer.finalize_turn()                                    │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ 检查触发条件：                                               │  │
│    │   _should_review_memory = ?  (用户说"remember")              │  │
│    │   _should_review_skills = ?  (每 N 次工具调用后)            │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Fork 阶段                                                         │
│                                                                      │
│    agent._spawn_background_review()                                  │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ threading.Thread(target=_target, daemon=True)               │  │
│    │                                                              │  │
│    │ 1. 复制 agent 实例（共享 provider/credentials）              │  │
│    │ 2. 继承父 agent 的 _cached_system_prompt（复用前缀缓存）     │  │
│    │ 3. 限制工具白名单：只允许 memory + skills                     │  │
│    │ 4. 禁用压缩（避免竞争条件）                                  │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. 回顾阶段                                                         │
│                                                                      │
│    review_agent.run_conversation()                                   │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ 注入对话快照 + prompt：                                      │  │
│    │                                                              │  │
│    │ _MEMORY_REVIEW_PROMPT = "Review the conversation above..."   │  │
│    │ _SKILL_REVIEW_PROMPT = "Review the conversation above..."      │  │
│    │ _COMBINED_REVIEW_PROMPT = "Review both memory and skills..."  │  │
│    │                                                              │  │
│    │ LLM 分析对话，决定是否更新 memory 或 skill                    │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. 写入阶段                                                         │
│                                                                      │
│    review_agent 调用工具：                                           │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ skill_manage create "xxx-skill"  → 创建/更新 SKILL.md       │  │
│    │ memory add "用户喜欢中文回复"    → 记录到 memory store      │  │
│    │                                                              │  │
│    │ 写入时设置 write_origin = "background_review"              │  │
│    │ 标记为 agent_created（供 curator 识别）                     │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Curator 策展阶段（定期）                                         │
│                                                                      │
│    curator.maybe_run_curator()                                      │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ 1. 状态流转：active → stale → archived                     │  │
│    │ 2. 合并技能：相似 skill 合并                               │  │
│    │ 3. 归档清理：90 天不活跃的 skill                            │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. 应用阶段                                                         │
│                                                                      │
│    下次对话时：                                                     │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ build_skills_system_prompt() → 包含所有 skill               │  │
│    │ 读取 memory → 构建用户画像                                   │  │
│    │ Agent 自动应用更新后的知识                                   │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、触发条件

### 3.1 Memory Review 触发

两种方式触发：

**方式 A：显式触发**
```python
# agent/turn_context.py:236
def _build_turn_context(..., should_review_memory: bool = False):
    """用户提到"remember"时触发"""
    if "remember" in user_message.lower():
        should_review_memory = True
```

**方式 B：周期性触发（nudge_interval）**
```python
# agent/turn_context.py:231-235
# 每 N 轮用户对话后触发一次
if agent._memory_nudge_interval > 0
        and agent._turns_since_memory >= agent._memory_nudge_interval:
    should_review_memory = True
    agent._turns_since_memory = 0  # 重置计数器
```

### 3.2 Skill Review 触发

```python
# agent/turn_finalizer.py:376-381
# 每 N 次工具调用后触发一次（可配置）
if agent._skill_nudge_interval > 0:
    if agent._iters_since_skill >= agent._skill_nudge_interval:
        _should_review_skills = True
        agent._iters_since_skill = 0
```

### 3.3 默认值与配置项

| 参数 | 默认值 | 配置路径 | 说明 |
|------|--------|----------|------|
| `memory.nudge_interval` | 10 | `memory.nudge_interval` | 每 N 轮用户对话触发一次 memory review |
| `skills.creation_nudge_interval` | 10 | `skills.creation_nudge_interval` | 每 N 次工具调用触发一次 skill review |
| `memory.memory_char_limit` | 2200 | `memory.memory_char_limit` | 单条记忆的最大字符数 |
| `memory.user_char_limit` | 1375 | `memory.user_char_limit` | 用户画像的最大字符数 |

```yaml
# config.yaml 示例
memory:
  nudge_interval: 10        # 每 10 轮触发一次 memory review
  memory_char_limit: 2200   # 单条记忆最多 2200 字符
  user_char_limit: 1375     # 用户画像最多 1375 字符

skills:
  creation_nudge_interval: 10  # 每 10 次工具调用触发一次 skill review
```

### 3.4 触发条件检查点

```python
# agent/turn_finalizer.py:393
if final_response and not interrupted \
        and (_should_review_memory or _should_review_skills):
    agent._spawn_background_review(
        messages_snapshot=list(messages),
        review_memory=_should_review_memory,
        review_skills=_should_review_skills,
    )
```

---

## 四、触发后创建/修改的文件

### 4.1 文件操作汇总

| 操作 | 文件位置 | 说明 |
|------|----------|------|
| `memory add` | `~/.hermes/memory/` | SQLite 数据库存储 |
| `skill_manage create` | `~/.hermes/skills/<name>/SKILL.md` | 创建新技能 |
| `skill_manage patch` | `~/.hermes/skills/<name>/SKILL.md` | 更新现有技能 |
| `skill_manage write_file` | `~/.hermes/skills/<name>/references/*.md` | 添加支持文件 |
| `skill_manage write_file` | `~/.hermes/skills/<name>/templates/*.*` | 添加模板文件 |
| `skill_manage write_file` | `~/.hermes/skills/<name>/scripts/*.*` | 添加脚本文件 |

### 4.2 Memory 文件结构

```bash
~/.hermes/memory/
└── memories.db   # SQLite 数据库

# 表结构：
# memories: id, content, target, created_at, updated_at, tags
# memory_tags: id, memory_id, tag
# memories_fts: FTS5 虚拟表（全文搜索）
```

### 4.3 Skill 文件结构

```bash
~/.hermes/skills/<skill-name>/
├── SKILL.md              # 必选：技能主文件
├── references/           # 可选：支持文件（会话细节、知识库）
│   └── <topic>.md
├── templates/           # 可选：模板文件
│   └── <name>.<ext>
└── scripts/            # 可选：可运行脚本
    └── <name>.<ext>
```

### 4.4 SKILL.md 标准格式

```markdown
---
name: <skill-name>
description: <简短描述>
category: <分类>
---

# <Skill Name>

## 触发条件
When to use this skill.

## 执行步骤
1. Step 1
2. Step 2
3. Step 3

## 注意事项
- Pitfall 1
- Pitfall 2
```

### 4.5 写入时的特殊标记

```python
# tools/skill_provenance.py
# 背景 review 写入时，会标记来源

class SkillProvenance(NamedTuple):
    write_origin: str  # "foreground" | "background_review" | "curator" | "user"
    is_agent_created: bool  # background_review 时为 True

# skill_manage 工具处理时
if get_current_write_origin() == "background_review":
    mark_agent_created(skill_name)  # 标记为 agent 创建
```

### 4.6 写入流程

```
Background Review 触发
     ↓
LLM 分析对话内容
     ↓
决定要写入的内容：
┌─────────────────────────────────────────────────────────────────────┐
│ 1. memory add                                                       │
│    └── 写入 ~/.hermes/memory/memories.db                           │
│    └── target="user"（用户画像）或 target="memory"（通用记忆）     │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. skill_manage create "xxx-skill"                                 │
│    └── 创建 ~/.hermes/skills/xxx-skill/SKILL.md                    │
│    └── 写入 write_origin="background_review"                       │
│    └── 标记 is_agent_created=True                                  │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. skill_manage patch 更新现有 skill                               │
│    └── 修改 ~/.hermes/skills/<name>/SKILL.md                       │
│    └── 添加 references/templates/scripts 支持文件                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五、后台线程实现

### 5.1 线程创建

```python
# run_agent.py:1439-1461
def _spawn_background_review(
    self,
    messages_snapshot: List[Dict],
    review_memory: bool = False,
    review_skills: bool = False,
):
    from agent.background_review import spawn_background_review_thread
    target, _prompt = spawn_background_review_thread(
        self,                    # 父 agent
        messages_snapshot,       # 对话快照
        review_memory=review_memory,
        review_skills=review_skills,
    )
    t = threading.Thread(target=target, daemon=True, name="bg-review")
    t.start()
```

### 5.2 Review Prompt 选择

```python
# agent/background_review.py:700-725
def spawn_background_review_thread(agent, messages_snapshot, ...):
    # 根据触发条件选择 prompt
    if review_memory and review_skills:
        prompt = _COMBINED_REVIEW_PROMPT  # 两者都要
    elif review_memory:
        prompt = _MEMORY_REVIEW_PROMPT    # 只要 memory
    else:
        prompt = _SKILL_REVIEW_PROMPT     # 只要 skill

    def _target():
        _run_review_in_thread(agent, messages_snapshot, prompt)

    return _target, prompt
```

### 5.3 Forked Agent 配置

```python
# agent/background_review.py:548-621
def _run_review_in_thread(agent, messages_snapshot, prompt):
    # 1. 复制父 agent
    review_agent = copy.deepcopy(agent)

    # 2. 复用父 agent 的缓存前缀（节省 26% 成本）
    review_agent._cached_system_prompt = agent._cached_system_prompt

    # 3. 禁用压缩（避免竞争条件）
    review_agent.compression_enabled = False

    # 4. 设置工具白名单（只允许 memory + skills）
    review_whitelist = {
        t["function"]["name"]
        for t in get_tool_definitions(enabled_toolsets=["memory", "skills"])
    }
    set_thread_tool_whitelist(review_whitelist, ...)

    try:
        # 5. 运行 review
        review_agent.run_conversation(
            user_message=prompt + "\n\nYou can only call memory and skill tools.",
            conversation_history=messages_snapshot,
        )
    finally:
        clear_thread_tool_whitelist()
```

---

## 六、Skill Provenance（来源追踪）

### 6.1 问题背景

如何区分：
- **用户创建的 skill**：`hermes skills create xxx`
- **Agent 自动创建的 skill**：background review 生成

### 6.2 解决方案：write_origin

```python
# tools/skill_provenance.py
class SkillProvenance(NamedTuple):
    write_origin: str  # "foreground" | "background_review" | "curator" | "user"
    is_agent_created: bool  # 只对 background_review 为 True

# 写入时设置 origin
def background_review_write_scope():
    token = set_current_write_origin("background_review")
    try:
        yield
    finally:
        reset_current_write_origin(token)

# 检查是否是 agent 创建的
def is_agent_created(skill_name: str) -> bool:
    return get_current_write_origin() == "background_review"
```

### 6.3 写入流程

```python
# skill_manage 工具处理时
if get_current_write_origin() == "background_review":
    mark_agent_created(skill_name)
```

---

## 七、Curator 策展机制

### 7.1 职责

| 职责 | 说明 |
|------|------|
| 状态流转 | active → stale → archived |
| 合并技能 | 相似 skill 合并为一个 umbrella |
| 归档清理 | 90 天不活跃的 skill 归档 |

### 7.2 触发条件

```python
# agent/curator.py:1898
def maybe_run_curator(
    agent,                       # 父 agent
    interval_hours=24*7,         # 默认 7 天
    min_idle_hours=2,            # 最小空闲时间
    consolidate=False,           # 默认关闭合并
):
    # 检查：
    # 1. 距离上次运行是否超过 interval_hours
    # 2. Agent 是否空闲
    # 3. Curator 状态是否 paused
```

### 7.3 自动状态流转

```python
# agent/curator.py:276
def apply_automatic_transitions(now=None):
    """基于活跃度自动流转 skill 状态"""
    # 读取所有 agent_created skills
    # 检查最后使用时间
    # active (最近 30 天使用) → stale (30-90 天) → archived (90+ 天)
```

### 7.4 严格不变式

```python
# agent/curator.py:15-19
Strict invariants:
  - Only touches agent-created skills  # 只处理 agent 创建的
  - Never auto-deletes — only archives  # 只归档不删除
  - Pinned skills bypass all auto-transitions  # pinned skill 跳过所有自动流转
```

---

## 七、Skill Review Prompt 详解

### 7.1 核心指导原则

```python
# agent/background_review.py:45-147
_SKILL_REVIEW_PROMPT = """
Review the conversation above and update the skill library. Be ACTIVE —
most sessions produce at least one skill update, even if small.
"""
```

### 7.2 信号识别（任一触发即行动）

| 信号类型 | 示例 | 行动 |
|----------|------|------|
| 用户纠正风格 | "stop doing X", "don't format like this" | 更新相关 skill |
| 用户纠正流程 | 纠正了工作步骤顺序 | 在 skill 中添加步骤 |
| 新技术出现 | 发现新的调试方法 | 捕获到 references/ |
| Skill 过时 | 加载的 skill 缺少步骤 | 立即打补丁 |

### 7.3 更新优先级

```
1️⃣ UPDATE A CURRENTLY-LOADED SKILL
   └── 如果 skill 已在上下文中被加载，优先更新它

2️⃣ UPDATE AN EXISTING UMBRELLA
   └── 如果没有加载的 skill，但有现存的类级 skill，补丁它

3️⃣ ADD A SUPPORT FILE under an existing umbrella
   └── references/<topic>.md      ← 会话细节、知识库
   └── templates/<name>.<ext>      ← 模板文件
   └── scripts/<name>.<ext>        ← 可运行脚本

4️⃣ CREATE A NEW CLASS-LEVEL UMBRELLA
   └── 只有当没有任何现有 skill 覆盖时才创建
   └── 名称必须是类级别，不是会话特定
```

### 7.4 不捕获的内容

```
❌ 环境依赖失败：missing binaries, command not found
❌ 负面工具断言："browser tools do not work"
❌ 临时会话错误：session 结束时已解决的错误
❌ 一次性任务："summarize today's market"
```

---

## 八、新增/修改的文件

### 8.1 核心文件

| 文件 | 作用 | 创建/修改 |
|------|------|----------|
| `agent/background_review.py` | 后台 review 核心逻辑 | 新增 |
| `agent/curator.py` | 策展人机制 | 新增 |
| `tools/skill_provenance.py` | Skill 来源追踪 | 新增 |
| `agent/turn_finalizer.py` | 触发条件检查 + spawn | 修改（新增代码） |
| `agent/turn_context.py` | should_review_memory 标记 | 修改（新增代码） |

### 8.2 相关文件

| 文件 | 作用 |
|------|------|
| `tools/skill_tool.py` | Skill 管理工具（skill_manage） |
| `tools/memory_tool.py` | Memory 工具 |
| `agent/skills_guard.py` | 保护机制检查 |
| `run_agent.py` | _spawn_background_review 入口 |

### 8.3 存储位置

```
~/.hermes/
├── skills/
│   ├── .curator_state          ← Curator 状态
│   ├── SKILL.md               ← Skill 定义
│   ├── references/            ← 支持文件：会话细节、知识库
│   ├── templates/             ← 支持文件：模板
│   └── scripts/              ← 支持文件：可运行脚本
└── memory/
    └── (memory provider 存储)
```

---

## 九、关键机制图解

### 9.1 线程隔离

```
┌─────────────────────────────────────────────────────────────────────┐
│ 主线程（处理用户请求）                                               │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ agent = AIAgent(...)                                            │ │
│ │ result = agent.run_conversation(user_message, messages)          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                           ↓                                          │
│              finalize_turn() → _spawn_background_review()           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ bg-review 线程（后台运行，daemon）                                   │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ review_agent = copy.deepcopy(agent)                             │ │
│ │ review_agent.run_conversation(prompt, messages_snapshot)        │ │
│ │   → skill_manage create/patch                                   │ │
│ │   → memory add                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 工具白名单

```
┌─────────────────────────────────────────────────────────────────────┐
│ 正常 Agent 工具集                                                    │
│                                                                      │
│ terminal, read_file, patch, web_search, browser_navigate, ...       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Background Review 工具集（白名单）                                    │
│                                                                      │
│ memory, skill_manage  ← 只允许这两个工具集                            │
│ (其他工具运行时被 deny)                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 成本优化

```python
# agent/background_review.py:568
# 复用父 agent 的缓存前缀，节省约 26% 成本
review_agent._cached_system_prompt = agent._cached_system_prompt
```

---

## 十、配置选项

### 10.1 Skill Review 频率

```yaml
# config.yaml
skills:
  # 每 N 次工具调用后触发一次 skill review
  nudge_interval: 10  # 默认
```

### 10.2 Curator 配置

```yaml
# config.yaml
curator:
  enabled: true
  interval_hours: 168  # 7 天
  min_idle_hours: 2
  stale_after_days: 30
  archive_after_days: 90
  consolidate: false  # 默认关闭
```

### 10.3 通知模式

```python
# summarize_background_review_actions() 的 notification_mode 参数
"off"     # 完全不通知
"on"      # 通用通知（默认）
"verbose" # 详细通知（包含内容预览）
```

---

## 十一、完整流程时序图

```
用户 → Agent → finalize_turn() → [触发?] ─┐
                                           ↓
                                    ┌───────────────┐
                                    │ spawn thread  │
                                    └───────────────┘
                                           ↓
                              ┌────────────────────────┐
                              │ bg-review thread       │
                              │  1. copy.deepcopy     │
                              │  2. set whitelist     │
                              │  3. run_conversation  │
                              │     └→ skill_manage   │
                              │     └→ memory add     │
                              └────────────────────────┘
                                           ↓
                                    ┌───────────────┐
                                    │ write to disk │
                                    │ (skills/)     │
                                    └───────────────┘

 Curator 定时检查 ──→ 状态流转/合并/归档
```

---

## 十二、与其他系统的关系

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Hermes Agent 核心                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│  Memory 系统         │         │  Skill 系统          │
│  ├── memory_tool   │         │  ├── skill_tool      │
│  ├── providers/    │         │  ├── background_rev  │ ← 新增
│  └── (用户画像)    │         │  └── curator.py     │ ← 新增
└─────────────────────┘         └─────────────────────┘
          ↑                               ↑
          │                               │
    ┌─────┴───────────────────────────────┴─────┐
    │         background_review.py              │ ← 新增
    │  ├── spawn_background_review_thread       │
    │  ├── _run_review_in_thread              │
    │  └── summarize_background_review_actions  │
    └─────────────────────────────────────────┘
                      ↑
            ┌─────────┴─────────┐
            │ turn_finalizer.py │ ← 修改（触发点）
            │ turn_context.py   │ ← 修改（should_review）
            └───────────────────┘
```

---

## 十三、关键文件行号

| 功能 | 文件:行号 |
|------|-----------|
| 后台 review 核心 | `agent/background_review.py:1` |
| Memory prompt | `agent/background_review.py:34` |
| Skill prompt | `agent/background_review.py:45` |
| Combined prompt | `agent/background_review.py:150` |
| spawn thread | `agent/background_review.py:700` |
| run in thread | `agent/background_review.py:520` |
| Curator 核心 | `agent/curator.py:1` |
| Curator 触发 | `agent/curator.py:1898` |
| 自动状态流转 | `agent/curator.py:276` |
| Provenance 追踪 | `tools/skill_provenance.py:1` |
| 触发检查 | `agent/turn_finalizer.py:393` |
| skill nudge | `agent/turn_finalizer.py:376` |
| memory 标记 | `agent/turn_context.py:236` |
| spawn 入口 | `run_agent.py:1439` |

---

## 十四、总结

### 学习循环的本质

```
┌─────────────────────────────────────────────────────────────────────┐
│                     基于知识的渐进式学习                              │
└─────────────────────────────────────────────────────────────────────┘

  对话结束
     ↓
  分析对话（LLM 后台线程）
     ↓
  提取信号（用户纠正 / 新技术 / Skill 过时）
     ↓
  更新知识库（SKILL.md / references/ / Memory）
     ↓
  下次对话自动应用

  ┌─────────────────────────────────────────────────────────────────┐
  │ 注意：这是一种"文本知识更新"，不是"模型权重更新"                  │
  │       类似于人类学习后记笔记，下次翻阅                               │
  └─────────────────────────────────────────────────────────────────┘
```

### 关键创新点

1. **后台 Fork 模式**：不影响主对话，不竞争模型资源
2. **工具白名单**：只允许 memory/skill 操作，保证安全
3. **来源追踪**：区分用户创建和 agent 创建的 skill
4. **策展机制**：自动清理和合并，防止 skill 库膨胀
5. **成本优化**：复用父 agent 的前缀缓存，节省 26% 成本
