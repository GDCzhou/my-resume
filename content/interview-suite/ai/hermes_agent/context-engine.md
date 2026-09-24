# Hour 14（重写版）：三大系统的完整数据流

> 核心文件: `agent/system_prompt.py` + `agent/prompt_builder.py` + `agent/memory_manager.py` + `agent/curator.py` + `agent/skill_commands.py` + `agent/skill_bundles.py` + `tools/skill_usage.py`

---

# 第一部分：System Prompt 是怎么拼出来的

## 1.1 总装流程（完整数据流）

`agent/system_prompt.py::build_system_prompt_parts(agent)` 是唯一入口。它把 System Prompt 分成 **三层** (stable / context / volatile)，然后用 `\n\n` 拼接。

```
AIAgent.__init__()
  │
  └─► _build_system_prompt()
        │
        └─► system_prompt.build_system_prompt(agent)
              │
              ├─► build_system_prompt_parts(agent)  ← 核心组装函数
              │     │
              │     ├─ STABLE 层（每块用 \n\n 拼接）
              │     │   ├── ① SOUL.md 或 DEFAULT_AGENT_IDENTITY
              │     │   ├── ② HERMES_AGENT_HELP_GUIDANCE（"如何用 Hermes 自己"）
              │     │   ├── ③ TASK_COMPLETION_GUIDANCE（"别只写个 stub 就停"）
              │     │   ├── ④ PARALLEL_TOOL_CALL_GUIDANCE（"把独立调用放一起发"）
              │     │   ├── ⑤ 工具感知引导（按需注入）:
              │     │   │     ├── memory 工具存在? → MEMORY_GUIDANCE
              │     │   │     ├── session_search 存在? → SESSION_SEARCH_GUIDANCE
              │     │   │     ├── skill_manage 存在? → SKILLS_GUIDANCE
              │     │   │     └── kanban_show 存在? → KANBAN_GUIDANCE
              │     │   ├── ⑥ STEER_CHANNEL_NOTE（中轮转向标记信任说明）
              │     │   ├── ⑦ COMPUTER_USE_GUIDANCE（macOS 桌面控制，仅 computer_use 工具存在时）
              │     │   ├── ⑧ Nous Subscription block（仅订阅用户）
              │     │   ├── ⑨ TOOL_USE_ENFORCEMENT（仅对 GPT/Gemini/DeepSeek 等模型家族）
              │     │   │     ├── 触发模型家族? → GOOGLE_MODEL_OPERATIONAL_GUIDANCE
              │     │   │     └── 触发模型家族? → OPENAI_MODEL_EXECUTION_GUIDANCE
              │     │   ├── ⑩ Skills Index ──┐
              │     │   │                      │ build_skills_system_prompt()
              │     │   │                      │   ├── Layer 1: 进程内 LRU 缓存（最多 8 key）
              │     │   │                      │   ├── Layer 2: 磁盘快照 .skills_prompt_snapshot.json
              │     │   │                      │   │     └── manifest 验证: mtime_ns + size 逐文件比对
              │     │   │                      │   ├── 冷路径: 扫描所有 SKILL.md ⟶ 写快照
              │     │   │                      │   └── 条件过滤:
              │     │   │                      │         ├── platform 不匹配? → 跳过
              │     │   │                      │         ├── disabled 列表? → 跳过
              │     │   │                      │         ├── requires_tools 不满足? → 跳过
              │     │   │                      │         ├── fallback_for 主工具已存在? → 跳过
              │     │   │                      │         └── compact_categories? → 折叠为 [names only]
              │     │   │                      │
              │     │   │                      └── 渲染成:
              │     │   │                          ## Skills (mandatory)
              │     │   │                          Before replying, scan the skills below...
              │     │   │                          <available_skills>
              │     │   │                            category-name: category description
              │     │   │                              - skill-a: description
              │     │   │                              - skill-b: description
              │     │   │                          </available_skills>
              │     │   │
              │     │   ├── ⑪ Alibaba 模型名修正（仅 alibaba provider）
              │     │   ├── ⑫ build_environment_hints() ──┐
              │     │   │     ├── 本地后端: 报告 host OS + $HOME + cwd
              │     │   │     ├── 远程后端 (docker/ssh/modal): 抑制 host 信息
              │     │   │     │     └── 用 `uname -s && whoami && pwd` 探测后端环境
              │     │   │     ├── Windows Git Bash: 告知用 POSIX 语法，不是 PowerShell
              │     │   │     └── WSL: 告知 /mnt/c/ 是 C 盘
              │     │   │
              │     │   ├── ⑬ Coding posture block（仅编程 workspace）
              │     │   ├── ⑭ Python 工具链探针（仅本地后端）
              │     │   ├── ⑮ 活跃 Profile 提示
              │     │   └── ⑯ Platform hint（Telegram/Discord/CLI/WhatsApp...）
              │     │
              │     ├─ CONTEXT 层
              │     │   ├── ⑰ system_message（调用方传入的可选消息）
              │     │   └── ⑱ build_context_files_prompt() ──┐
              │     │          优先级查找（先匹配先赢，只加载一种）:
              │     │             ├── 1. .hermes.md / HERMES.md （逐级上查到 git root）
              │     │             ├── 2. AGENTS.md / agents.md  （仅 cwd）
              │     │             ├── 3. CLAUDE.md / claude.md  （仅 cwd）
              │     │             └── 4. .cursorrules / .cursor/rules/*.mdc  （仅 cwd）
              │     │          独立加载: SOUL.md（如果未在稳定层加载）
              │     │          ▲ 每个文件都过 _scan_context_content() 注入检测
              │     │          ▲ 超出 max_chars 时进行 head/tail 截断
              │     │
              │     └─ VOLATILE 层（变化频率最高，每次 session 重新构建）
              │           ├── ⑲ 内置 Memory Store block（~/.hermes/memories/ 中的记忆）
              │           ├── ⑳ USER.md profile（用户画像）
              │           ├── ㉑ 外部 Memory Provider system_prompt_block()
              │           └── ㉒ Timestamp + Session ID + Model + Provider
              │
              ├─► parts["stable"] + "\n\n" + parts["context"] + "\n\n" + parts["volatile"]
              │
              └─► 缓存到 agent._cached_system_prompt
                    ▲ 整个 session 保持不变（除非 context compression 触发 invalidate_system_prompt()）
                    ▲ 这是为了 Prompt Cache 命中率 — 缓存是神圣不可侵犯的
```

## 1.2 为什么要有三层设计？

```
┌──────────────────────────────────────────────────────┐
│ STABLE 层                                             │
│ "换模型/换 session 也不变"                              │
│ → 100% prefix cache 命中（所有用户会话共享 warm cache）    │
├──────────────────────────────────────────────────────┤
│ CONTEXT 层                                            │
│ "同一个项目目录不变，切换 session 可能变"                  │
│ → 同一项目下缓存命中                                    │
├──────────────────────────────────────────────────────┤
│ VOLATILE 层                                           │
│ "每次 session 都可能不同"                               │
│ → 无法利用 prefix cache，因此放在最后                      │
│   （前面的 STABLE 部分仍然命中缓存）                       │
└──────────────────────────────────────────────────────┘
```

关键洞察：**Vendors（如 Anthropic）的 prompt cache 是从头开始匹配的**。把不变的放前面、经常变的放后面 = 最大化缓存命中。

## 1.3 System Prompt 中各「引导块」的触发条件

```
                    ┌─ memory 工具存在? ──────────── YES → 注入 MEMORY_GUIDANCE
                    ├─ session_search 存在? ──────── YES → 注入 SESSION_SEARCH_GUIDANCE
                    ├─ skill_manage 存在? ────────── YES → 注入 SKILLS_GUIDANCE
                    ├─ kanban_show 存在? ─────────── YES → 注入 KANBAN_GUIDANCE
valid_tool_names ───┤
  (工具列表)         ├─ 任意工具存在? ──────────────── YES → 注入 STEER_CHANNEL_NOTE
                    ├─ computer_use 存在? ────────── YES → 注入 COMPUTER_USE_GUIDANCE
                    ├─ 任意工具存在 + model 匹配? ─── YES → 注入 TOOL_USE_ENFORCEMENT
                    │                                          ├── model~="gemini|gemma"
                    │                                          │     → +GOOGLE_MODEL_OPERATIONAL_GUIDANCE
                    │                                          └── model~="gpt|codex|grok"
                    │                                                → +OPENAI_MODEL_EXECUTION_GUIDANCE
                    └─ skills_list|skill_view|skill_manage 存在?
                                                         YES → 调用 build_skills_system_prompt()
```

## 1.4 上下文文件的安全流水线

```
~/.hermes/SOUL.md
项目目录/.hermes.md
项目目录/AGENTS.md
  │
  ├─► 1. 发现（按优先级选择）
  │
  ├─► 2. _scan_context_content(content, filename)
  │       │
  │       ├─► tools/threat_patterns.py::scan_for_threats(content, scope="context")
  │       │     └── 检测: 经典注入 / promptware / C2 模式 / 角色劫持
  │       │     └── 注意: SSH 后门 / 持久化 / exfil-URL 检测只用于 "tools" scope
  │       │            （对于项目上下文文件太激进，会误伤安全研究/基础架构文档）
  │       │
  │       ├─► 无威胁 → 返回原内容
  │       └─► 有威胁 → 返回 "[BLOCKED: <filename> contained potential prompt injection...]"
  │
  └─► 3. _truncate_content() — head/tail 截断
          │
          ├─ len(content) <= max_chars? → 不截断
          └─ len(content) > max_chars?
                ├── 保留前 70% (CONTEXT_TRUNCATE_HEAD_RATIO)
                ├── 插入 "[...truncated...]" 标记（含 read_file 路径，模型可以主动加载完整内容）
                └── 保留后 20% (CONTEXT_TRUNCATE_TAIL_RATIO)
```

---

# 第二部分：MemoryManager — 跨会话记忆的完整生命周期

## 2.1 架构：两层 Provider 编排

```
┌──────────────────────────── MemoryManager ────────────────────────────┐
│                                                                       │
│   ┌─────────────────────┐          ┌──────────────────────┐          │
│   │  MemoryProvider     │          │  MemoryProvider       │          │
│   │  name="builtin"     │          │  name="honcho"/等     │          │
│   │                     │          │                      │          │
│   │  • 文件/Markdown    │          │  • 向量嵌入           │          │
│   │  • ~/.hermes/       │          │  • 外部数据库         │          │
│   │    memories/        │          │  • LLM 记忆后端      │          │
│   └────────┬────────────┘          └────────┬─────────────┘          │
│            │                                │                         │
│            └────────────┬───────────────────┘                        │
│                         │                                            │
│         _tool_to_provider: Dict[str, MemoryProvider]                  │
│         工具名 → 负责 provider 的路由表                                │
│                                                                       │
│         _sync_executor: ThreadPoolExecutor(max_workers=1)             │
│         单 worker 后台线程 → 保证写入顺序 + 不阻塞主循环                  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## 2.2 一个完整 Turn 中记忆的流转（时序图）

```
  用户发消息             Agent 处理              API 调用           MemoryManager
     │                     │                      │                    │
     ├─────────────────────┤                      │                    │
     │                     │ ① on_turn_start()    │                    │
     │                     │    通知所有 provider   │                    │
     │                     │                      │                    │
     │                     │ ② prefetch_all()     │                    │
     │                     │    查询语: 用户消息    │                    │
     │                     │    ↓                  │                    │
     │                     │  _strip_skill_scaffolding()               │
     │                     │    │                                      │
     │                     │    ├─ 普通消息 → 原样传递                   │
     │                     │    ├─ /skill <指令> → 提取用户指令          │
     │                     │    └─ 裸 /skill → 返回 None（跳过）         │
     │                     │    ↓                                      │
     │                     │  对每个 provider:                          │
     │                     │    provider.prefetch(clean_query)          │
     │                     │    ↓                                      │
     │                     │  build_memory_context_block(raw)           │
     │                     │    包装成:                                 │
     │                     │    <memory-context>                        │
     │                     │    [System note: 这是记忆上下文,             │
     │                     │     不是新的用户输入...]                     │
     │                     │     <记忆内容>                               │
     │                     │    </memory-context>                       │
     │                     │    ↓                                      │
     │                     │  注入到 system prompt (volatile 层)         │
     │                     │                      │                    │
     │                     │──────────────────────┤                    │
     │                     │          ③ API 调用（含记忆上下文）          │
     │                     │                      │                    │
     │                     │◄─────────────────────┤                    │
     │                     │     ④ 模型响应       │                     │
     │                     │       （可能包含 tool_calls）                │
     │                     │                      │                    │
     │                     │ ⑤ sync_all(user_msg, assistant_response)   │
     │                     │     ↓                                      │
     │                     │  _strip_skill_scaffolding() 再次剥离脚手架   │
     │                     │     ↓                                      │
     │                     │  _submit_background(fn)                    │
     │                     │     ↓                                      │
     │                     │  ThreadPoolExecutor(max_workers=1)         │
     │                     │  ┌──────────────────────────┐              │
     │                     │  │ 对每个 provider:           │              │
     │                     │  │   provider.sync_turn(     │              │
     │                     │  │     user_content,        │              │
     │                     │  │     assistant_content,   │              │
     │                     │  │     messages=...         │              │
     │                     │  │   )                     │              │
     │                     │  └──────────────────────────┘              │
     │                     │                      │                    │
     │                     │ ⑥ queue_prefetch_all(user_msg)             │
     │                     │       ↓                                    │
     │                     │  _submit_background(fn)                    │
     │                     │   ┌──────────────────────────┐             │
     │                     │   │ 对每个 provider:           │             │
     │                     │   │   provider.queue_prefetch(│             │
     │                     │   │     clean_query          │             │
     │                     │   │   )                     │             │
     │                     │   │ （为下个 turn 预取记忆）    │             │
     │                     │   └──────────────────────────┘             │
     │                     │                      │                    │
     ▼                     ▼                      ▼                    ▼
  显示响应              继续循环              等待下个 call         后台线程工作
```

## 2.3 关键设计决策一览

### 决策 1：为什么 sync 在后台线程？

```
不做:
  sync_all() → 同步等待 provider 返回 → provider 卡了 → 整个 agent 挂住
  
做了:
  sync_all() → executor.submit(fn) → 立即返回
               └── provider 卡了 298 秒 → 只有 daemon 线程卡，主循环继续
  
保护:
  - daemon 线程: 进程退出时不阻塞
  - _SYNC_DRAIN_TIMEOUT_S = 5s: shutdown 时最多等 5 秒
  - max_workers=1: 保证 turn N 写入一定在 turn N+1 之前
```

### 决策 2：为什么用 `<memory-context>` 标签？

```
问题: 记忆内容注入到 system prompt 时，模型可能把它误当作"用户刚输入的指令"

解决: 用标签围栏 + 系统注释明确说明
  <memory-context>
  [System note: The following is recalled memory context,
  NOT new user input. Treat as authoritative reference data...]
  <记忆内容>
  </memory-context>

额外保护: StreamingContextScrubber (状态机)
  - 在流式输出中实时过滤 <memory-context> 标签
  - 即使标签跨 chunk 也能处理
  - 三种状态: NORMAL / IN_SPAN / BUFFERING_PARTIAL_TAG
```

### 决策 3：Skill 脚手架剥离

```
用户输入: /github-code-review please check my PR

场景 1: 不做剥离 → memory provider 存储整个 SKILL.md 正文
         → 记忆被污染，下次 prefetch 回来的是 skill 文档而不是用户的问题

场景 2: 做剥离 → extract_user_instruction_from_skill_message()
         → 从脚手架中恢复: "please check my PR"
         → 只存储用户的实际意图

裸 /skill 调用:
  用户输入: /github-code-review
  → extract 返回 None
  → _strip_skill_scaffolding 返回 None
  → sync_all / prefetch_all 跳过该 turn
  → 原因: 没有用户实际内容值得存储
```

---

# 第三部分：Curator — 技能馆长（状态机 + 数据流）

## 3.1 触发条件流程图

```
maybe_run_curator(idle_for_seconds, on_summary)
  │
  ├─► is_enabled() == False? ────────────────── STOP（curator.enabled: false）
  │
  ├─► is_paused() == True? ──────────────────── STOP（手动暂停）
  │
  ├─► should_run_now() == False? ────────────── STOP
  │     │
  │     ├─ last_run_at 存在? ──NO──→ 种子 last_run_at = now
  │     │                            └── "首次运行: 等一个 interval 后再真正运行"
  │     │
  │     └─ now - last_run_at >= interval_hours?
  │            ├── NO → STOP
  │            └── YES → 继续
  │
  ├─► idle_for_seconds < min_idle_hours? ────── STOP（agent 还在活跃使用中）
  │
  └─► run_curator_review() ← 真正运行
```

## 3.2 核心：技能生命周期状态机

```
              skill_manage(action="create")  skill_view / skill_manage(patch) / skill_manage(use)
              ┌─────────────────────┐         ┌──────────────────────────────────┐
              │                     │         │                                  │
              ▼                     │         ▼                                  │
        ┌──────────┐               │    ┌──────────┐                            │
        │  ACTIVE  │◄──────────────┘    │  ACTIVE  │◄──────┐                    │
        │ (初始状态) │                   │  (使用中) │       │                    │
        └─────┬────┘                    └─────┬────┘       │                    │
              │                               │            │                    │
              │ 30天无活动                     │            │ 重新有活动           │
              │ (stale_after_days)            │            │ (reactivated)       │
              │                               │            │                    │
              ▼                               ▼            │                    │
        ┌──────────┐                    ┌──────────┐       │                    │
        │  STALE   │───────────────────►│  STALE   │───────┘                    │
        │ (变陈旧)  │   90天仍无活动      │ (标记中)  │                            │
        └─────┬────┘                    └─────┬────┘                            │
              │                               │                                  │
              │ 90天无活动                     │ curator LLM 审查决定                │
              │ (archive_after_days)          │ 或自动 transition                │
              │                               │                                  │
              ▼                               ▼                                  │
        ┌──────────┐                    ┌──────────┐                            │
        │ ARCHIVED │                    │ ARCHIVED │                            │
        │(不可自动恢复)                 │ (内容吸收进伞技能  │                    │
        └──────────┘                     │ 或真正过时)       │                    │
                                         └──────────┘       │                    │
              ▲                                              │                    │
              │                                              │                    │
              └────── hermes curator restore <name> ─────────┘                    │
                     (手动恢复)                                                     │
```

## 3.3 Curator 运行过程的完整数据流

```
run_curator_review()
  │
  ├─► PHASE 0: 预运行快照（best-effort）
  │     curator_backup.snapshot_skills(reason="pre-curator-run")
  │
  ├─► PHASE 1: apply_automatic_transitions(now)  ← 纯确定性，不调 LLM
  │     │
  │     │  遍历 agent_created_report() 中的每个技能:
  │     │  ┌─────────────────────────────────────────────────────────┐
  │     │  │ pinned=True? ────YES──→ 跳过（pinned 技能跳过一切）        │
  │     │  │ 是首次被 curator 看见? ──YES──→ seed_record_if_missing() │
  │     │  │                               └── 锚定 created_at=now   │
  │     │  │                               └── 跳过本次判断            │
  │     │  │                                                        │
  │     │  │ anchor = max(last_activity_at, created_at)              │
  │     │  │                                                        │
  │     │  │ anchor <= archive_cutoff? ──YES──→ archive_skill()      │
  │     │  │   (默认 90 天)                      ├─► 目录移到 .archive/ │
  │     │  │                                     ├─► builtin 则加入    │
  │     │  │                                     │   .curator_suppressed│
  │     │  │                                     └─► set_state(ARCHIVED)│
  │     │  │                                                        │
  │     │  │ anchor <= stale_cutoff? ──YES──→ set_state(STALE)       │
  │     │  │   (默认 30 天)                                           │
  │     │  │                                                        │
  │     │  │ anchor > stale_cutoff + 当前是 STALE? ──YES──→          │
  │     │  │   set_state(ACTIVE)  [重新激活]                          │
  │     │  └─────────────────────────────────────────────────────────┘
  │     │
  │     │  返回 counts: {marked_stale, archived, reactivated, checked}
  │
  ├─► PHASE 2: 持久化中间状态
  │     state["last_run_at"] = now
  │     state["run_count"] += 1
  │     state["last_run_summary"] = "auto: N marked stale, M archived"
  │     save_state(state)
  │
  ├─► PHASE 3: LLM 审查（可选，由 consolidate 开关控制）
  │     │
  │     ├─► consolidate == False? ──YES──→ 跳过 LLM 阶段，直接写报告
  │     │     └── 原因: 默认 OFF，避免无谓的 aux-model 费用
  │     │
  │     └─► consolidate == True? ──YES──→
  │           │
  │           ├─► 生成候选技能列表 _render_candidate_list()
  │           │     每个候选: name, state, pinned, use_count, view_count, 
  │           │               patch_count, last_activity_at
  │           │
  │           ├─► 构造 Auditing Prompt (CURATOR_REVIEW_PROMPT)
  │           │     ├── 目标: 把零散技能合并为"伞技能"(umbrella)
  │           │     ├── 方法: 集群化 → 合并到已有伞 / 创建新伞 / 降级为参考资料
  │           │     └── 要求: 输出结构化 YAML + 至少 10 个 archive
  │           │
  │           ├─► _resolve_review_runtime(cfg)
  │           │     ├── 1. auxiliary.curator.{provider,model}（规范路径）
  │           │     ├── 2. curator.auxiliary.{provider,model}（旧格式回退）
  │           │     └── 3. 主聊天模型（最终回退）
  │           │
  │           ├─► AIAgent(provider=..., model=..., platform="curator", ...)
  │           │     ├── max_iterations=9999（大规模整理需要很多轮）
  │           │     ├── skip_context_files=True（不需要项目上下文文件）
  │           │     ├── skip_memory=True（不需要用户记忆）
  │           │     ├── _memory_nudge_interval=0（禁止递归 nudge）
  │           │     └── _skill_nudge_interval=0（禁止技能提醒）
  │           │
  │           └─► review_agent.run_conversation(user_message=prompt)
  │                  ↓
  │              收集结果:
  │                ├── final: 最终响应全文
  │                ├── summary: final[:240] 摘要
  │                ├── model, provider: 实际运行模型
  │                ├── tool_calls: [{name, arguments}, ...]
  │                └── error: 错误信息（如有）
  │
  ├─► PHASE 4: 分类已删除技能（consolidated vs pruned）
  │     │
  │     │  分类权威信号优先级（先匹配先赢）:
  │     │  ┌──────────────────────────────────────────────────────┐
  │     │  │ 1. absorbed_into 声明（在 skill_manage(delete) 时）  │
  │     │  │    ├── into != "" 且目标存在 → CONSOLIDATED           │
  │     │  │    └── into == "" → PRUNED                          │
  │     │  │                                                     │
  │     │  │ 2. 结构化 YAML 块（模型最终响应中的 ```yaml 部分）     │
  │     │  │                                                     │
  │     │  │ 3. 工具调用启发式分析                                │
  │     │  │    （在 skill_manage 的 file_path/content 参数中     │
  │     │  │     搜索被删除技能名的引用）                          │
  │     │  │                                                     │
  │     │  │ 4. 无证据回退 → PRUNED                              │
  │     │  └──────────────────────────────────────────────────────┘
  │     │
  │     │  同时: _rewrite_cron_refs(consolidated, pruned)
  │     │     └── 自动更新引用已合并/删除技能的 cron jobs
  │
  └─► PHASE 5: 写报告
        │
        └─► ~/.hermes/logs/curator/{YYYYMMDD-HHMMSS}/
              ├── run.json     ← 机读完整记录
              ├── REPORT.md    ← 人类可读报告
              └── cron_rewrites.json ← cron 重写记录（仅当有变更时）
```

## 3.4 三种合并策略

```
技能集群: hermes-config-tools, hermes-config-providers, hermes-config-models
────────────────────────────────────────────────────────────────────────

策略 A: MERGE INTO EXISTING UMBRELLA（合并到已有伞技能）
  hermes-config-tools 已足够宽 → 把它当伞
    └── 将 hermes-config-providers 的独特内容作为新 subsection 追加到 SKILL.md
    └── archive hermes-config-providers, hermes-config-models

策略 B: CREATE NEW UMBRELLA（创建新伞技能）
  没有谁天然是伞 → 创建 ~/.hermes/skills/hermes-configuration/SKILL.md
    └── 综合三个技能的内容
    └── archive 三个原始技能

策略 C: DEMOTE TO SUPPORT FILES（降级为子文件）
  某些技能有宝贵的session细节但太窄 → 变成伞技能的子文件
    └── references/endpoint-list.md  ← API 端点列表
    └── templates/config.stub.yaml  ← 配置模板
    └── scripts/validate-config.sh  ← 验证脚本
    └── archive 原始技能目录
```

## 3.5 Curator 的文件布局

```
~/.hermes/skills/
├── .usage.json              ← 所有技能的使用遥测（sidecar）
├── .curator_state           ← curator 的运行状态（last_run_at, paused, ...）
├── .curator_suppressed      ← 被 prune 的 builtin 技能名（一行一个）
├── .archive/                ← 归档的技能
│   ├── old-skill-a/
│   └── old-skill-b-20260623120000/  ← 同名的加时间戳
├── .bundled_manifest        ← bundled 技能清单（格式: name:hash）
├── .hub/lock.json           ← hub 安装的技能清单
└── ... 技能目录 ...

~/.hermes/logs/curator/
└── {YYYYMMDD-HHMMSS}/       ← 每次 curator 运行的完整报告
    ├── run.json
    ├── REPORT.md
    └── cron_rewrites.json
```

---

# 第四部分：技能加载管线 — 从 /skill-name 到模型上下文

## 4.1 技能发现（启动时扫描）

```
scan_skill_commands()  ← 启动时调用
  │
  ├─► 扫描目录（按优先级）:
  │     ├── ~/.hermes/skills/ （本地目录，优先）
  │     └── skills.external_dirs[] （外部只读目录）
  │
  ├─► 对每个 SKILL.md:
  │     ├── 解析 frontmatter (YAML 元数据)
  │     │     ├── name, description
  │     │     ├── platforms (如: ["macos", "linux"])
  │     │     └── conditions: {requires_tools: [...], fallback_for: [...]}
  │     │
  │     ├── 过滤流水线:
  │     │     ├── 路径包含 .git/.github/.hub/.archive? → 跳过
  │     │     ├── platforms 不匹配当前 OS? → 跳过
  │     │     ├── 运行时环境不匹配? (kanban/docker/s6 专属技能) → 跳过
  │     │     ├── 在 disabled 列表中? → 跳过
  │     │     └── 与已扫描技能重名? → 跳过（先到先得，本地优先）
  │     │
  │     └── 规范化名称:
  │           "GitHub Code Review" → "/github-code-review"
  │           "OpenAI + Claude"   → "/openai--claude" (非字母数字被移除)
  │
  └─► 注册到全局: _skill_commands{"/github-code-review": {...}}
```

## 4.2 技能调用管线（运行时）

```
用户输入: /github-code-review please check my PR #42
  │
  ├─► resolve_skill_command_key("github-code-review")
  │     └── 返回 "/github-code-review" (在 _skill_commands 中查找)
  │
  ├─► build_skill_invocation_message("/github-code-review", 
  │                                    user_instruction="please check my PR #42")
  │     │
  │     ├─► _load_skill_payload(skill_dir)
  │     │     ├── skill_view(name) → 读取 SKILL.md 全文 + frontmatter + linked_files
  │     │     └── 返回 (loaded_skill, skill_dir, skill_name)
  │     │
  │     ├─► bump_use(skill_name)  ← 记录使用（给 curator 用）
  │     │
  │     └─► _build_skill_message(loaded_skill, skill_dir, activation_note, user_instruction)
  │           │
  │           ├─► 1. 模板替换 (skills.template_vars: true)
  │           │     {{HERMES_HOME}} → /Users/zhoumin/.hermes
  │           │     {{session_id}} → 当前 session ID
  │           │
  │           ├─► 2. 内联 Shell 展开 (skills.inline_shell: false 默认关闭)
  │           │     $(uname -s) → Darwin (如果开启)
  │           │
  │           ├─► 3. 组装消息块:
  │           │     [IMPORTANT: The user has invoked the "GitHub Code Review" skill,
  │           │      indicating they want you to follow its instructions. 
  │           │      The full skill content is loaded below.]
  │           │     
  │           │     <完整 SKILL.md 内容>
  │           │     
  │           │     [Skill directory: /Users/zhoumin/.hermes/skills/github-code-review]
  │           │     Resolve any relative paths...
  │           │     
  │           │     [Skill config (from ~/.hermes/config.yaml):
  │           │       github_token = ghp_xxx]
  │           │     
  │           │     [This skill has supporting files:]
  │           │     - scripts/check-pr.sh → ~/.hermes/skills/github-code-review/scripts/check-pr.sh
  │           │     
  │           │     The user has provided the following instruction alongside 
  │           │     the skill invocation: please check my PR #42
  │           │     
  │           │     [Runtime note: ...]
  │           │
  │           └─► 返回 formatted_message
  │
  └─► 作为 user message 送入 Agent 对话循环
```

## 4.3 Skill Bundle（技能包）的加载

```
用户: /backend-dev optimize the query
  │
  ├─► resolve_bundle_command_key("backend-dev") → "/backend-dev"
  │     └── 先在 bundles 中查，找到就停（bundles 赢 skills）
  │
  ├─► build_bundle_invocation_message("/backend-dev", 
  │                                      user_instruction="optimize the query")
  │     │
  │     ├─► 解析 ~/.hermes/skill-bundles/backend-dev.yaml:
  │     │     name: backend-dev
  │     │     skills: [github-code-review, test-driven-development, github-pr-workflow]
  │     │     instruction: "Focus on backend patterns."
  │     │
  │     ├─► 对每个 skill:
  │     │     ├── _load_skill_payload(skill_id)
  │     │     ├── bump_use(skill_name)
  │     │     └── _build_skill_message(加载的技能)
  │     │         （但 activation_note 改为 "[Loaded as part of the "backend-dev" skill bundle.]"）
  │     │
  │     └─► 组合:
  │           [IMPORTANT: The user has invoked the "backend-dev" skill bundle,
  │            loading 3 skills together. Treat every skill below as active guidance
  │            for this turn.]
  │           
  │           Bundle: backend-dev
  │           Skills loaded: GitHub Code Review, Test Driven Development, ...
  │           Bundle instruction: Focus on backend patterns.
  │           User instruction: optimize the query
  │           
  │           [Loaded as part of the "backend-dev" skill bundle.]
  │           <github-code-review 的完整 SKILL.md>
  │           
  │           [Loaded as part of the "backend-dev" skill bundle.]
  │           <test-driven-development 的完整 SKILL.md>
  │           
  │           [Loaded as part of the "backend-dev" skill bundle.]
  │           <github-pr-workflow 的完整 SKILL.md>
```

---

# 第五部分：全局关系总图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            run_agent.py (AIAgent)                            │
│                                                                              │
│  _build_system_prompt() ──────────────────────────────────────────────────┐  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  system_prompt.build_system_prompt()              │  │  │
│  │  │                                                                  │  │  │
│  │  │  STABLE:                                                         │  │  │
│  │  │    context_engine.py ─── 提供 context_length （动态截断上限）      │  │  │
│  │  │    prompt_builder.py ─── ① SOUL ② 引导块 ③ skills index         │  │  │
│  │  │                         ④ 环境提示 ⑤ 平台提示 ⑥ 订阅块           │  │  │
│  │  │                                                                  │  │  │
│  │  │  CONTEXT:                                                        │  │  │
│  │  │    prompt_builder.py ─── ⑦ 项目上下文文件（.hermes.md 等）        │  │  │
│  │  │                                                                  │  │  │
│  │  │  VOLATILE:                                                       │  │  │
│  │  │    memory_manager.py ─── ⑧ 记忆上下文 <memory-context>           │  │  │
│  │  │    prompt_builder.py ─── ⑨ 时间戳 + session/model 信息           │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                         │  │
│  │  缓存到 agent._cached_system_prompt                                      │  │
│  │  仅在 context compression 后通过 invalidate_system_prompt() 重建         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Turn 循环 ────────────────────────────────────────────────────────────┐  │
│  │                                                                         │  │
│  │  on_turn_start(user_message)                                            │  │
│  │    └── memory_manager.on_turn_start()  ← 通知所有 provider              │  │
│  │                                                                         │  │
│  │  prefetch_all(user_message)  ← 检索相关记忆                             │  │
│  │    └── skill_commands.extract_user_instruction_from_skill_message()     │  │
│  │        (剥离 /skill 脚手架，恢复用户实际指令)                              │  │
│  │                                                                         │  │
│  │  注入记忆到 volitale system prompt                                      │  │
│  │                                                                         │  │
│  │  ┌── 对话循环 ──────────────────────────────────────────────┐          │  │
│  │  │  LLM API 调用 → 工具执行 → LLM API 调用 → ...           │          │  │
│  │  │  │                                                       │          │  │
│  │  │  ├─ 工具可以是 skill_manage ──► skill_usage.bump_patch() │          │  │
│  │  │  ├─ 工具可以是 skill_view  ──► skill_usage.bump_view()  │          │  │
│  │  │  └─ 工具可以是 memory 工具   ──► memory_manager          │          │  │
│  │  │        .handle_tool_call() ──► provider.handle_tool_call()│         │  │
│  │  │                                    └── memory_manager    │          │  │
│  │  │                                        .on_memory_write()│          │  │
│  │  │                                        (通知外部 provider)│         │  │
│  │  └──────────────────────────────────────────────────────────┘          │  │
│  │                                                                         │  │
│  │  sync_all(user_msg, assistant_response)                                 │  │
│  │    └── _submit_background(fn)  ← 后台线程，不阻塞主循环                  │  │
│  │                                                                         │  │
│  │  queue_prefetch_all(user_msg)  ← 排队预取下一个 turn                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ 会话结束 ─────────────────────────────────────────────────────────────┐  │
│  │  on_session_end()                                                       │  │
│  │    └── memory_manager.on_session_end()                                  │  │
│  │                                                                         │  │
│  │  shutdown_all()                                                         │  │
│  │    ├── _drain_sync_executor()  ← 排空后台队列（最多等 5 秒）            │  │
│  │    └── 每个 provider.shutdown()                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ 空闲时 ───────────────────────────────────────────────────────────────┐  │
│  │  maybe_run_curator(idle_for_seconds, on_summary)                        │  │
│  │    │                                                                    │  │
│  │    ├── should_run_now() → YES                                          │  │
│  │    │   1. apply_automatic_transitions() ← 纯确定性                      │  │
│  │    │   2. 可选: spawn AIAgent 做 LLM umbrella-building                 │  │
│  │    │   3. 分类 → 写报告 → 更新 cron job 引用                            │  │
│  │    │                                                                    │  │
│  │    └── curator 调用的 AIAgent 中:                                       │  │
│  │         ├── skip_context_files=True                                     │  │
│  │         ├── skip_memory=True                                            │  │
│  │         └── 使用 auxiliary.curator.{provider,model} 模型                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 第六部分：关键设计原则回顾

| 原则 | 体现位置 | 为什么 |
|------|---------|--------|
| **Prompt Cache 神圣不可侵犯** | `system_prompt.py` — stable/context/volatile 三层 | 不变内容放前面 → prefix cache 命中 → 省 API 费用 |
| **核心窄腰，能力在边缘** | `ContextEngine`(ABC)、`MemoryProvider`(ABC) | 新策略/新 provider 通过接口接入，不动核心 |
| **异步优于同步** | `MemoryManager._sync_executor`、`curator` daemon 线程 | 慢 provider 不卡 agent 主循环 |
| **安全是多层防御** | 注入扫描 → 标签围栏 → 流式清洗 → 标记认证 | 每层防一种攻击向量 |
| **技能 = 可执行知识** | 模板替换 + shell 展开 + config 注入 + 支持文件 | 不只是文档，是可运行的 |
| **Agent 自学习 = Curator** | `curator.py` 的后台 LLM 进程 | Agent 不仅创建技能，还定期由另一个 LLM 整理合并 |
| **最佳努力，失败不阻塞** | 所有 provider 调用都 try/except | 一个组件坏了不影响整体 |
