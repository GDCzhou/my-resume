# Hour 5: SessionDB 持久化

---

## 一、概述

SessionDB 是 Hermes 的 SQLite 持久化存储，负责保存会话元数据、完整消息历史和模型配置。

**核心特性：**
- WAL 模式：并发读 + 单写（gateway 多平台）
- FTS5 全文搜索：快速搜索所有会话消息
- 压缩触发会话分裂：通过 `parent_session_id` 链追踪
- 线程安全

---

## 二、数据库结构

### 主要表

#### sessions 表

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,           -- 'cli', 'telegram', 'discord' 等
    user_id TEXT,
    model TEXT,
    model_config TEXT,              -- JSON 配置
    system_prompt TEXT,
    parent_session_id TEXT,         -- 父会话 ID（用于压缩分裂）
    
    -- 时间
    started_at REAL NOT NULL,
    ended_at REAL,
    end_reason TEXT,                -- 'normal', 'compression', 'branched'
    
    -- 统计
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    
    -- 成本
    cwd TEXT,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    
    -- 其他
    title TEXT,
    api_call_count INTEGER DEFAULT 0,
    handoff_state TEXT,
    handoff_platform TEXT,
    handoff_error TEXT,
    rewind_count INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id)
);
```

#### messages 表

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,            -- 'system', 'user', 'assistant', 'tool'
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,               -- JSON
    tool_name TEXT,
    timestamp REAL NOT NULL,
    token_count INTEGER,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_content TEXT,
    reasoning_details TEXT,
    codex_reasoning_items TEXT,
    codex_message_items TEXT,
    platform_message_id TEXT,
    observed INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,       -- 软删除标记
    compacted INTEGER DEFAULT 0,    -- 已被压缩
    
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### 索引

```sql
CREATE INDEX idx_sessions_source ON sessions(source);
CREATE INDEX idx_sessions_source_id ON sessions(source, id);
CREATE INDEX idx_sessions_parent ON sessions(parent_session_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id, timestamp);
```

### FTS5 全文搜索

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content='messages',
    content_rowid='id',
    tokenize='porter unicode61'
);
```

### 其他表

```sql
-- Schema 版本追踪
CREATE TABLE schema_version (version INTEGER NOT NULL);

-- 状态元数据
CREATE TABLE state_meta (key TEXT PRIMARY KEY, value TEXT);

-- 压缩锁（防止并发压缩）
CREATE TABLE compression_locks (
    session_id TEXT PRIMARY KEY,
    holder TEXT NOT NULL,
    acquired_at REAL NOT NULL,
    expires_at REAL NOT NULL
);
```

---

## 三、SessionDB 类

### 初始化

```python
class SessionDB:
    """
    SQLite-backed session storage with FTS5 search.
    
    Thread-safe for the common gateway pattern
    (multiple reader threads, single writer via WAL mode).
    """
    
    _WRITE_MAX_RETRIES = 15
    _WRITE_RETRY_MIN_S = 0.020   # 20ms
    _WRITE_RETRY_MAX_S = 0.150   # 150ms
    _CHECKPOINT_EVERY_N_WRITES = 50
    
    def __init__(self, db_path: Path = None, read_only: bool = False):
        self.db_path = db_path or DEFAULT_DB_PATH
        self._conn = sqlite3.connect(...)
        apply_wal_with_fallback(self._conn, db_label="state.db")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()
```

### WAL 模式

**为什么用 WAL？**
- 读操作不阻塞写操作
- 写操作不阻塞读操作
- 适合 gateway 多平台场景

**写竞争处理：**
```python
# SQLite 默认超时 30s 会导致高并发时 TUI 卡顿
# Hermes 用应用层重试 + 随机 jitter 代替

_WRITE_MAX_RETRIES = 15
_WRITE_RETRY_MIN_S = 0.020   # 20ms
_WRITE_RETRY_MAX_S = 0.150   # 150ms

def _write_with_retry(conn, sql, params):
    for attempt in range(_WRITE_MAX_RETRIES):
        try:
            conn.execute(sql, params)
            return
        except sqlite3.OperationalError:
            time.sleep(random.uniform(0.02, 0.15))
    raise sqlite3.OperationalError("Write failed after retries")
```

---

## 四、核心操作

### 创建会话

```python
def create_session(self, session_id: str, source: str, **kwargs) -> str:
    """创建新会话"""
    ...
    # kwargs 可包含: model, model_config, system_prompt, parent_session_id, cwd
```

### 结束会话

```python
def end_session(self, session_id: str, end_reason: str) -> None:
    """
    end_reason 可选值:
    - 'normal'     # 正常结束
    - 'compression' # 压缩分裂
    - 'branched'   # 分支
    - 'api_error'  # API 错误
    """
```

### 添加消息

```python
def add_message(
    self,
    session_id: str,
    role: str,
    content: str = None,
    tool_call_id: str = None,
    tool_calls: list = None,
    tool_name: str = None,
    **kwargs
) -> int:
    """添加消息到会话，返回消息 ID"""
```

### FTS5 搜索

```python
def search_sessions(self, query: str, limit: int = 20, **kwargs) -> list:
    """FTS5 全文搜索会话"""
    # 使用 Porter stemming + Unicode61 tokenizer
    # 支持 AND/OR/NOT 布尔搜索
```

### 列出会话

```python
def list_sessions_rich(
    self,
    source: str = None,
    include_archived: bool = False,
    limit: int = 50,
    **kwargs
) -> list:
    """列出可显示的会话（根会话 + branch 子会话）"""
```

---

## 五、会话链与压缩

### 压缩分裂

当对话被压缩时，旧的 session 结束，新的 session 通过 `parent_session_id` 链接：

```
sessions 表:
┌─────────────────────────────────────────────────────────┐
│ id           │ parent_session_id │ end_reason           │
├─────────────────────────────────────────────────────────┤
│ session-001  │ NULL              │ compression         │
│ session-002  │ session-001       │ NULL (当前)         │
└─────────────────────────────────────────────────────────┘

messages 表:
- session-001: 原始长消息（compact 标记）
- session-002: 压缩后的摘要消息
```

### 会话可见性

**列表中显示的会话：**
- 根会话（`parent_session_id IS NULL`）
- Branch 子会话（`end_reason = 'branched'`）

**隐藏的会话：**
- 压缩产生的子会话
- 子代理运行（subagent runs）

```python
_LISTABLE_CHILD_SQL = """
    (s.parent_session_id IS NULL 
     OR json_extract(s.model_config, '$._branched_from') IS NOT NULL
     OR EXISTS (SELECT 1 FROM sessions p 
                WHERE p.id = s.parent_session_id 
                AND p.end_reason = 'branched'))
"""
```

### 删除规则

| 类型 | 删除行为 |
|------|----------|
| 普通子会话 | 级联删除消息 |
| Branch 子会话 | 保留 |
| 压缩子会话 | 保留 |
| 子代理运行 | 级联删除 |

---

## 六、读写锁与并发

### 读操作

```python
# 读操作直接执行，不加锁
# WAL 模式保证读写不互斥

def search_sessions(self, query: str, limit: int = 20):
    cursor = self._conn.execute(sql, params)
    return cursor.fetchall()
```

### 写操作

```python
# 写操作带应用层重试
def _write_with_retry(self, sql: str, params: tuple):
    for attempt in range(self._WRITE_MAX_RETRIES):
        try:
            with self._lock:
                self._conn.execute(sql, params)
            return
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                time.sleep(random.uniform(0.02, 0.15))
            else:
                raise
    raise sqlite3.OperationalError("Write failed after 15 retries")
```

### Passively 检查点

```python
# 每 50 次写操作执行一次被动检查点
self._write_count += 1
if self._write_count % self._CHECKPOINT_EVERY_N_WRITES == 0:
    self._conn.execute("PRAGMA wal_checkpoint(PASSIVE)")
```

---

## 七、配置路径

```python
# hermes_constants.py
def get_hermes_home() -> Path:
    """获取 HERMES_HOME 路径（profile-aware）"""
    return Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))

DEFAULT_DB_PATH = get_hermes_home() / "state.db"
```

---

## 八、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| SessionDB 类 | `hermes_state.py:658` |
| sessions 表 | `hermes_state.py:514` |
| messages 表 | `hermes_state.py:551` |
| FTS5 搜索 | `hermes_state.py:3825` |
| 压缩锁 | `hermes_state.py:578` |
| WAL 检查点 | `hermes_state.py:679` |

---

## 总结

Hour 5 核心理解：
- SessionDB 是 SQLite 持久化存储，支持 WAL 模式并发读写
- sessions 表存会话元数据，messages 表存消息历史
- FTS5 全文搜索支持快速搜索所有会话
- 压缩分裂通过 `parent_session_id` 链追踪历史
- 写操作有应用层重试机制避免高并发卡顿
