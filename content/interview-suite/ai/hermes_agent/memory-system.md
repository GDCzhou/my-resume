# Hour 11: 记忆体系

---

## 一、概述

Hermes 的记忆体系是一个**多层、可插拔**的系统：

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Hermes 记忆体系                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 1. 内置 Memory（Builtin）                                            │
│    ├── memory_tool.py  ← SQLite 本地存储                            │
│    └── agent/memory_provider.py  ← ABC 接口                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. 可插拔 Provider（Plugins）                                        │
│    ├── Honcho         ← 本地会话记忆                               │
│    ├── Hindsight      ← 跨会话总结                                 │
│    ├── Mem0           ← 云端记忆服务                               │
│    ├── Supermemory    ← Supermemory 集成                          │
│    └── RetainDB       ← 关系数据库存储                            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. 自动学习（Background Review）                                    │
│    └── 从对话中自动提取记忆                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、架构分层

### 2.1 三层结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Tool Layer（工具层）                            │
│                                                                      │
│    memory_tool  ← Agent 可调用的内存工具                            │
│    ├── memory add    添加记忆                                       │
│    ├── memory search 搜索记忆                                       │
│    ├── memory update 更新记忆                                       │
│    └── memory delete 删除记忆                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  Provider Layer（提供者层）                           │
│                                                                      │
│    MemoryProvider (ABC)  ← 统一接口                                 │
│    ├── system_prompt_block()  → 系统提示文本                       │
│    ├── prefetch()            → 召回相关上下文                      │
│    ├── sync_turn()           → 异步写入                           │
│    └── handle_tool_call()    → 处理工具调用                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   Storage Layer（存储层）                            │
│                                                                      │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│    │   SQLite     │  │   Honcho     │  │   Mem0 API   │          │
│    │  (内置)      │  │  (本地)      │  │   (云端)     │          │
│    └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 记忆流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      记忆生命周期                                     │
└─────────────────────────────────────────────────────────────────────┘

  用户输入
     ↓
  ┌───────────────────┐
  │  prefetch(query)  │  ← 每次 API 调用前召回相关上下文
  └───────────────────┘
     ↓
  注入到 system prompt
     ↓
  Agent 处理任务
     ↓
  ┌───────────────────┐
  │   sync_turn()     │  ← 对话结束后异步写入
  └───────────────────┘
     ↓
  ┌───────────────────┐
  │ Background Review  │  ← 自动提取新记忆
  └───────────────────┘
     ↓
  ┌───────────────────┐
  │  memory add       │  ← 写入记忆存储
  └───────────────────┘
```

---

## 三、内置 Memory（Builtin Memory）

### 3.1 存储位置

```
~/.hermes/memory/  ← HERMES_HOME 下的 memory 目录
```

### 3.2 数据结构

```sql
-- 记忆表（简化）
CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    content TEXT,           -- 记忆内容
    target TEXT,             -- "user" 或 "memory"
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    tags TEXT,              -- JSON 标签
);

CREATE TABLE memory_tags (
    id INTEGER PRIMARY KEY,
    memory_id INTEGER,
    tag TEXT,
);

CREATE VIRTUAL TABLE memories_fts USING fts5(content, content=memories);
```

### 3.3 工具接口

```python
# tools/memory_tool.py
def memory_tool(action: str, content: str = None, target: str = "memory", ...)
    → 添加/搜索/更新/删除记忆
```

### 3.4 记忆类型

| target | 用途 | 示例 |
|--------|------|------|
| `user` | 用户画像 | "用户喜欢中文回复" |
| `memory` | 通用记忆 | "项目用 pytest" |

---

## 四、MemoryProvider ABC

### 4.1 接口定义

```python
# agent/memory_provider.py
class MemoryProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """标识符，如 'builtin', 'honcho', 'hindsight'"""

    @abstractmethod
    def is_available(self) -> bool:
        """是否可用（检查配置、凭据）"""

    @abstractmethod
    def initialize(self, session_id: str, **kwargs) -> None:
        """初始化（创建资源、建立连接）"""

    def system_prompt_block(self) -> str:
        """系统提示文本块"""
        return ""

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """召回相关上下文（每次 API 调用前）"""
        return ""

    def queue_prefetch(self, query: str, *, session_id: str = "") -> None:
        """预取下次需要的上下文"""

    @abstractmethod
    def sync_turn(self, user_content: str, assistant_content: str, ...) -> None:
        """异步持久化对话"""

    @abstractmethod
    def get_tool_schemas(self) -> List[Dict]:
        """返回工具 schema"""

    def handle_tool_call(self, tool_name: str, args: Dict) -> str:
        """处理工具调用"""
        raise NotImplementedError

    def shutdown(self) -> None:
        """清理关闭"""
```

### 4.2 可选 Hooks

```python
# 每次 turn 开始时调用
def on_turn_start(self, turn_number: int, message: str, **kwargs) -> None:
    """用于计数、定期维护"""

# 会话结束时调用
def on_session_end(self, messages: List[Dict]) -> None:
    """用于提取总结"""

# 会话切换时调用（/resume, /new, 压缩后）
def on_session_switch(self, new_session_id: str, **kwargs) -> None:
    """更新缓存的 session 状态"""

# 压缩前调用
def on_pre_compress(self, messages: List[Dict]) -> str:
    """提取关键信息"""
```

---

## 五、可插拔 Provider

### 5.1 Provider 列表

| Provider | 存储方式 | 特点 |
|----------|----------|------|
| **Honcho** | 本地 | 专注会话记忆 |
| **Hindsight** | 本地 | 跨会话总结 |
| **Mem0** | 云端 API | 云端记忆服务 |
| **Supermemory** | 云端 API | Supermemory 集成 |
| **RetainDB** | PostgreSQL | 关系数据库 |
| **Holographic** | 本地 | 全息记忆 |
| **ByteRover** | 私有 | ByteRover 集成 |

### 5.2 配置方式

```yaml
# config.yaml
memory:
  provider: honcho  # 选择 provider
  # 或使用云端
  # provider: mem0
  # mem0:
  #   api_key: ${MEM0_API_KEY}
```

### 5.3 注册机制

```python
# plugins/memory/__init__.py
# 扫描 plugins/memory/*/ 目录
# 查找继承 MemoryProvider 的类
# 实例化并注册
```

---

## 六、自动记忆提取

### 6.1 Background Review

```python
# agent/background_review.py
_MEMORY_REVIEW_PROMPT = """
Review the conversation above and consider saving to memory if appropriate.

Focus on:
1. Has the user revealed things about themselves — their persona, desires,
   preferences, or personal details worth remembering?
2. Has the user expressed expectations about how you should behave?

If something stands out, save it using the memory tool.
"""
```

### 6.2 触发条件

```python
# agent/turn_context.py:236
if "remember" in user_message.lower():
    should_review_memory = True
```

### 6.3 记忆类型区分

```python
# memory_tool.py 中 target 参数
target="user"   # 用户画像（谁）
target="memory" # 通用记忆（什么）
```

---

## 七、记忆注入时机

### 7.1 prefetch() — 每次 API 调用前

```python
# agent/memory_provider.py
def prefetch(self, query: str, *, session_id: str = "") -> str:
    """召回相关上下文"""
    # 1. 搜索相关记忆
    # 2. 返回格式化文本
    return f"相关记忆：\n- 用户喜欢中文回复\n- 项目用 pytest"
```

### 7.2 system_prompt_block() — 系统提示

```python
# agent/memory_provider.py
def system_prompt_block(self) -> str:
    """返回静态系统提示"""
    return """
## Memory Provider
You have persistent memory. Use the memory tool to recall and store facts.
"""
```

### 7.3 注入位置

```
System Prompt 结构：
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Base instructions                                               │
│ 2. Skills (from ~/.hermes/skills/)                                │
│ 3. Memory Provider system_prompt_block()                           │
│ 4. prefetch() 召回的上下文                                        │
│ 5. Conversation history                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 八、SessionDB 与 Memory 的关系

### 8.1 SessionDB（会话持久化）

```python
# hermes_state.py
# SQLite 会话数据库
# 存储：会话历史、消息、FTS5 搜索
```

### 8.2 区别

| | SessionDB | Memory |
|--|-----------|--------|
| 用途 | 会话历史持久化 | 跨会话知识 |
| 内容 | 完整对话记录 | 提取的事实 |
| 生命周期 | 当前会话 | 永久 |
| 访问 | 搜索对话 | 召回上下文 |

### 8.2 协作

```
用户: "记得项目用 pytest"
     ↓
1. memory add → Memory 存储
2. SessionDB 记录这条消息
     ↓
下次对话:
prefetch("pytest") → "项目用 pytest"
```

---

## 九、关键文件

| 文件 | 作用 |
|------|------|
| `tools/memory_tool.py` | 内置 memory 工具 |
| `agent/memory_provider.py` | Provider ABC 接口 |
| `agent/memory_manager.py` | Provider 管理器 |
| `plugins/memory/*/` | 各 Provider 实现 |
| `agent/background_review.py` | 自动记忆提取 |
| `hermes_state.py` | SessionDB 会话存储 |

---

## 十、流程图

### 10.1 读取记忆

```
┌─────────────────────────────────────────────────────────────────────┐
│                      记忆读取流程                                    │
└─────────────────────────────────────────────────────────────────────┘

Agent 处理用户消息
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 1. prefetch(query)                                                │
│    └── Provider 搜索相关记忆                                        │
│    └── 返回格式化上下文                                             │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. 注入 system prompt                                              │
│    └── Memory block + prefetch 结果                                │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Agent 决策                                                      │
│    └── 可以调用 memory tool 进一步搜索/更新                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 写入记忆

```
┌─────────────────────────────────────────────────────────────────────┐
│                      记忆写入流程                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 触发点 1: Agent 调用 memory tool                                   │
│    └── memory add/update/delete                                    │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 触发点 2: Background Review                                        │
│    └── 分析对话 → 提取信号 → memory add                            │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 触发点 3: sync_turn()                                             │
│    └── Provider 异步持久化                                          │
└─────────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 存储到 Provider                                                    │
│    └── SQLite / Honcho / Mem0 / ...                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 十一、配置选项

### 11.1 内置 Memory 配置

```yaml
# config.yaml
memory:
  # 内置 SQLite，不需要额外配置
  memory_char_limit: 2200   # 单条记忆最大字符数
  user_char_limit: 1375    # 用户画像最大字符数
  nudge_interval: 10       # 每 N 轮触发一次 memory review
```

### 11.2 Honcho Provider

```yaml
memory:
  provider: honcho
  honcho:
    # Honcho 配置
    pass
```

### 11.3 Mem0 Provider

```yaml
memory:
  provider: mem0
  mem0:
    api_key: ${MEM0_API_KEY}
    model: "旗舰模型"  # 可选
```

---

## 十二、总结

### 记忆体系核心概念

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Hermes 记忆体系                                 │
└─────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   SQLite    │     │   Honcho    │     │   Mem0     │
  │  (内置)     │     │  (本地)     │     │  (云端)    │
  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ↓
                    ┌─────────────────┐
                    │ MemoryProvider  │
                    │    (统一接口)   │
                    └────────┬────────┘
                             ↓
         ┌─────────────────────────────────────┐
         │         Agent 感知不到差异          │
         └─────────────────────────────────────┘
                             ↓
                    ┌─────────────────┐
                    │   prefetch()    │ ← 每次 API 调用前召回
                    │   sync_turn()   │ ← 对话结束后写入
                    │   memory tool   │ ← Agent 显式调用
                    └─────────────────┘

  + Background Review → 自动从对话中提取记忆
```

### 记忆类型

| 类型 | target | 用途 | 示例 |
|------|--------|------|------|
| 用户画像 | `user` | 谁 | "用户喜欢中文" |
| 通用记忆 | `memory` | 什么 | "项目用 pytest" |

### Provider 选择

| 场景 | 推荐 Provider |
|------|--------------|
| 本地优先 | Honcho / Hindsight |
| 云端同步 | Mem0 / Supermemory |
| 企业数据库 | RetainDB (PostgreSQL) |
| 默认 | 内置 SQLite |
