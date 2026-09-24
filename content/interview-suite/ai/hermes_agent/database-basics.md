# 数据库基础知识（为理解 Hermes SessionDB）

> 用于理解 Hermes 项目所需的最少数据库知识

---

## 一、核心概念

### 什么是数据库

数据库（Database）是**长期存储在计算机内的、有组织的数据集合**。

**类比：**
- Excel 表格 = 简单的数据库
- SQLite = 一个完整的数据库引擎（零配置、文件级存储）

### 关系型数据库

以**表（Table）**为单位存储数据，表与表之间可以通过**外键（Foreign Key）**关联。

```
┌─────────────┐       ┌─────────────┐
│  sessions   │       │  messages   │
├─────────────┤       ├─────────────┤
│ id (主键)   │──┐    │ id (主键)   │
│ source      │  │    │ session_id  │
│ model       │  └───►│ role        │
│ started_at  │       │ content     │
└─────────────┘       └─────────────┘
```

---

## 二、SQLite 简介

### 什么是 SQLite

SQLite 是一个**轻量级、零配置、文件级**的关系型数据库。

**特点：**
- 无需安装服务器
- 数据存储在一个 `.db` 文件中
- 适合嵌入式设备和轻量级应用

**Hermes 使用：**
```python
import sqlite3
conn = sqlite3.connect("/path/to/state.db")
```

### SQLite 文件结构

```
state.db          # 主数据库文件
state.db-wal      # WAL 模式日志（Write-Ahead Logging）
state.db-shm      # 共享内存（用于 WAL）
```

---

## 三、表（Table）

### 什么是表

表是数据库中**存储数据的结构**，类似 Excel 的工作表。

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER
);
```

### 表的组成

| 概念 | 说明 | 类比 Excel |
|------|------|-----------|
| 列（Column） | 字段 | 列（A, B, C） |
| 行（Row） | 一条记录 | 行（1, 2, 3） |
| 主键（Primary Key） | 唯一标识行 | 行号 |
| 外键（Foreign Key） | 关联其他表 | VLOOKUP |

### 数据类型

SQLite 支持 5 种基本类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| INTEGER | 整数 | 1, 2, 3 |
| REAL | 浮点数 | 3.14, 2.5 |
| TEXT | 文本字符串 | "hello" |
| BLOB | 二进制数据 | 文件、图片 |
| NULL | 空值 | NULL |

---

## 四、SQL 基础

### 增（INSERT）

```sql
-- 插入一行
INSERT INTO sessions (id, source, model) VALUES ('sess-001', 'cli', 'gpt-4');

-- 插入多行
INSERT INTO sessions (id, source) VALUES 
    ('sess-001', 'cli'),
    ('sess-002', 'telegram');
```

### 查（SELECT）

```sql
-- 查所有
SELECT * FROM sessions;

-- 查指定列
SELECT id, source, model FROM sessions;

-- 条件查询
SELECT * FROM messages WHERE session_id = 'sess-001';

-- 排序
SELECT * FROM sessions ORDER BY started_at DESC;
```

### 改（UPDATE）

```sql
UPDATE sessions SET model = 'gpt-4o' WHERE id = 'sess-001';
```

### 删（DELETE）

```sql
DELETE FROM messages WHERE session_id = 'sess-001';
```

---

## 五、索引（Index）

### 什么是索引

索引是**加速查询的数据结构**，类似书的目录。

```sql
-- 为 session_id 创建索引
CREATE INDEX idx_messages_session ON messages(session_id);
```

### 索引的作用

| 操作 | 无索引 | 有索引 |
|------|--------|--------|
| 查询 100 条记录 | 遍历全部 10000 条 | 直接定位 |
| 时间 | O(n) | O(log n) |

### 何时创建索引

- **频繁查询**的列（WHERE 条件）
- **排序**的列（ORDER BY）
- **外键**列（JOIN 条件）

### 注意事项

- 索引占用额外存储空间
- 插入/更新时需要维护索引
- 不要为所有列创建索引

---

## 六、主键与外键

### 主键（Primary Key）

**唯一标识**表中每一行的列。

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,  -- 主键：唯一且非空
    source TEXT NOT NULL
);
```

**规则：**
- 值唯一
- 不能为 NULL
- 每个表只能有一个主键

### 外键（Foreign Key）

**建立两个表之间的关联**。

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),  -- 外键
    content TEXT
);
```

**效果：**
- `messages.session_id` 的值必须是 `sessions.id` 中存在的
- 防止孤立的脏数据

---

## 七、WAL 模式

### 什么是 WAL

**Write-Ahead Logging（预写日志）** 是一种数据库日志机制。

### 为什么需要 WAL

**传统模式的问题：**
```
写操作：锁定整个数据库 → 其他读操作阻塞
```

**WAL 模式：**
```
写操作：先写日志 → 允许读写并发
```

### WAL 的优势

| 特性 | 传统模式 | WAL 模式 |
|------|----------|----------|
| 读阻塞写 | 是 | 否 |
| 写阻塞读 | 是 | 否 |
| 并发性能 | 低 | 高 |
| 适合场景 | 单线程 | 多线程/多进程 |

### Hermes 的 WAL 配置

```python
conn.execute("PRAGMA journal_mode=WAL")
```

---

## 八、事务（Transaction）

### 什么是事务

事务是一组**原子性的数据库操作**，要么全部成功，要么全部失败。

### ACID 特性

| 特性 | 说明 |
|------|------|
| Atomic（原子性） | 全部成功或全部失败 |
| Consistency（一致性） | 事务前后数据一致 |
| Isolation（隔离性） | 并发操作互不干扰 |
| Durability（持久性） | 提交后数据永久保存 |

### 示例

```sql
BEGIN TRANSACTION;

INSERT INTO sessions (id, source) VALUES ('sess-001', 'cli');
INSERT INTO messages (session_id, role, content) VALUES ('sess-001', 'user', 'hello');

COMMIT;  -- 提交：全部保存
-- 或
ROLLBACK;  -- 回滚：全部取消
```

### Hermes 中的事务

```python
conn.execute("BEGIN IMMEDIATE")  # 开始事务
try:
    conn.execute("INSERT INTO sessions ...")
    conn.execute("INSERT INTO messages ...")
    conn.commit()  # 提交
except:
    conn.rollback()  # 回滚
```

---

## 九、FTS5 全文搜索

### 什么是 FTS5

**Full-Text Search version 5** 是 SQLite 的全文搜索扩展。

### 普通查询 vs 全文搜索

**普通查询：**
```sql
SELECT * FROM messages WHERE content LIKE '%hello%';
-- 问题：慢，需要遍历所有行
```

**FTS5 全文搜索：**
```sql
-- 创建 FTS 表
CREATE VIRTUAL TABLE messages_fts USING fts5(content);

-- 搜索
SELECT * FROM messages_fts WHERE content MATCH 'hello';
-- 优势：使用倒排索引，极快
```

### FTS5 原理（简述）

```
文档: "hello world"
        ↓
分词: ["hello", "world"]
        ↓
倒排索引: 
  "hello" → [文档1, 文档3]
  "world" → [文档1, 文档2]
        ↓
搜索 "hello" → 直接返回 [文档1, 文档3]
```

### Hermes 中的 FTS5

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content='messages',     -- 关联到 messages 表
    content_rowid='id',    -- 主键映射
    tokenize='porter unicode61'  -- 分词器
);
```

---

## 十、SQLite 在 Python 中的使用

### 基本操作

```python
import sqlite3

# 连接数据库
conn = sqlite3.connect("state.db")

# 执行 SQL
cursor = conn.execute("SELECT * FROM sessions")

# 获取结果
rows = cursor.fetchall()

# 关闭连接
conn.close()
```

### 参数化查询（防 SQL 注入）

```python
# ❌ 危险：直接拼接字符串
sql = f"SELECT * FROM messages WHERE session_id = '{sid}'"

# ✅ 安全：使用参数
cursor = conn.execute(
    "SELECT * FROM messages WHERE session_id = ?",
    (sid,)
)
```

### 事务处理

```python
try:
    conn.execute("BEGIN")
    conn.execute("INSERT INTO sessions ...")
    conn.execute("INSERT INTO messages ...")
    conn.commit()
except Exception as e:
    conn.rollback()
    raise e
```

---

## 十一、与 Hermes SessionDB 的对应关系

### sessions 表 → 会话元数据

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,           -- 会话 ID
    source TEXT NOT NULL,          -- 来源：cli/telegram/discord
    model TEXT,                    -- 使用的模型
    parent_session_id TEXT,        -- 父会话（压缩分裂用）
    started_at REAL,               -- 开始时间
    ended_at REAL,                 -- 结束时间
    end_reason TEXT,               -- 结束原因
    ...
);
```

### messages 表 → 消息历史

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,        -- 消息 ID
    session_id TEXT REFERENCES sessions(id),  -- 所属会话
    role TEXT NOT NULL,            -- 角色：user/assistant/tool
    content TEXT,                  -- 消息内容
    timestamp REAL,                -- 时间戳
    ...
);
```

### 为什么 Hermes 用 SQLite

| 原因 | 说明 |
|------|------|
| 零配置 | 无需安装数据库服务器 |
| 文件级 | 一个 `state.db` 文件管理所有数据 |
| WAL | 支持多进程并发读写 |
| FTS5 | 内置全文搜索 |
| 持久化 | 重启后数据不丢失 |

---

## 总结

理解 Hermes SessionDB 所需的数据库知识：

1. **表** = 存储数据的结构（类似 Excel）
2. **SQL** = 操作表的语言（增删改查）
3. **索引** = 加速查询的目录
4. **主键/外键** = 表间关联
5. **WAL** = 允许并发读写的日志机制
6. **事务** = 保证原子性的操作组
7. **FTS5** = SQLite 内置的全文搜索引擎
