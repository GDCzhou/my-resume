# Hour 9: MCP 集成

---

## 一、MCP 概述

**MCP (Model Context Protocol)** 是一种开放协议，允许 AI 客户端连接外部 MCP 服务器并调用它们的工具。

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP 架构                                       │
└─────────────────────────────────────────────────────────────────────┘

Hermes Agent (MCP Client)          MCP Server
┌─────────────────────┐           ┌─────────────────────┐
│  discover_mcp_tools │ ────────→ │  list_tools()       │
│  register_mcp_tools│ ←───────  │  tool handlers      │
│  call_mcp_tool()   │ ────────→ │                     │
└─────────────────────┘           └─────────────────────┘
         ↓
    ┌─────────────────────┐
    │ Tool Registry       │
    │ mcp_github_list_issues │
    │ mcp_filesystem_read  │
    └─────────────────────┘
         ↓
    Agent 可调用
```

---

## 二、配置方式

### config.yaml 配置

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxxx"
    timeout: 120

  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    timeout: 30

  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer sk-xxxx"
    timeout: 180
```

### 配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `command` | string | 可执行命令（stdio 传输） |
| `args` | list | 命令参数 |
| `env` | dict | 环境变量（只传递必要的） |
| `url` | string | 服务器 URL（HTTP 传输） |
| `headers` | dict | HTTP 请求头 |
| `timeout` | int | 每次工具调用超时（秒） |
| `connect_timeout` | int | 连接超时（秒） |
| `transport` | string | 传输类型（`http`/`sse`） |
| `tools.include` | list | 白名单：只注册这些工具 |
| `tools.exclude` | list | 黑名单：排除这些工具 |
| `sampling` | dict | 服务器发起的 LLM 请求 |

---

## 三、启动流程

### 1. discover_mcp_tools() 入口

```python
# tools/mcp_tool.py:4126
def discover_mcp_tools() -> List[str]:
    """入口函数"""
    
    # 1. 读取配置
    servers = _load_mcp_config()
    
    # 2. 过滤新服务器
    new_server_names = [name for name in servers if name not in _servers]
    
    # 3. 注册服务器
    tool_names = register_mcp_servers(servers)
    
    return tool_names
```

### 2. 配置读取

```python
# tools/mcp_tool.py:3047
def _load_mcp_config() -> Dict[str, dict]:
    """从 config.yaml 读取 mcp_servers 配置"""
    config = load_config()
    servers = config.get("mcp_servers", {})
    
    # 支持 ${ENV_VAR} 插值
    interpolated = _interpolate_env_vars(cfg)
    return safe_servers
```

### 3. 并行连接服务器

```python
# tools/mcp_tool.py:4068
async def _discover_all():
    # 并行连接所有服务器！
    results = await asyncio.gather(
        *(_discover_one(name, cfg) for name, cfg in new_servers.items()),
        return_exceptions=True,
    )
```

---

## 四、工具注册流程

```
discover_mcp_tools()
    ↓
_load_mcp_config() → 读取配置
    ↓
register_mcp_servers()
    ↓
_ensure_mcp_loop() → 启动后台事件循环（daemon thread）
    ↓
_discover_and_register_server(name, config)
    ↓
1. _connect_server() → 建立 MCP 连接
2. server.list_tools() → 获取工具列表
3. _register_server_tools() → 注册到 registry
```

### 工具命名

MCP 工具注册时添加前缀 `mcp_{server}_`：

```
server: github, tool: list_issues → mcp_github_list_issues
server: filesystem, tool: read_file → mcp_filesystem_read_file
```

---

## 五、工具调用流程

```
Agent 调用 mcp_github_list_issues(...)
    ↓
registry.dispatch("mcp_github_list_issues", args)
    ↓
_mcp_tool_handler(server_name, tool_name, args)
    ↓
_mcp_loop.run_coroutine_threadsafe(
    server.session.call_tool(tool_name, args)
)
    ↓
返回 JSON 结果
```

---

## 六、两种传输类型

### 1. Stdio 传输（本地进程）

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    env: {}  # 只传递必要的环境变量
```

Hermes 会：
- 启动子进程
- 通过 stdin/stdout 通信
- stderr 重定向到 `~/.hermes/logs/mcp-stderr.log`

### 2. HTTP 传输（远程服务器）

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer sk-xxxx"
```

### 3. SSE 传输

```yaml
mcp_servers:
  searxng:
    url: "http://localhost:8000/sse"
    transport: sse
```

---

## 七、安全机制

### 环境变量过滤

**stdio 服务器不会继承你的完整环境变量！** 只有安全的基础变量被传递：

```
✅ 传递：PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
❌ 不传：API keys, tokens, secrets
```

用户必须在 `env` 中显式指定需要传递的变量：

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      # 只有这个 token 被传递
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxxx"
```

### 凭据清理

错误消息中的凭据模式会被自动清理：
- `ghp_...` GitHub tokens
- `sk-...` OpenAI keys
- `Bearer ...` tokens
- `token=`, `key=`, `API_KEY=`, `password=`, `secret=`

---

## 八、后台架构

```
┌──────────────────────────────────────────────────────────────┐
│                      主线程                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ discover_mcp_tools()                                 │ │
│  │   └─ _ensure_mcp_loop()                              │ │
│  │         └─ 启动 daemon thread (_mcp_thread)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 工具调用                                               │ │
│  │   └─ run_coroutine_threadsafe(call_tool)             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           ↕ 通信
┌──────────────────────────────────────────────────────────────┐
│              _mcp_thread (daemon)                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  _mcp_loop (asyncio event loop)                        │ │
│  │    ├─ asyncio.Task: github server                       │ │
│  │    ├─ asyncio.Task: filesystem server                  │ │
│  │    └─ asyncio.Task: remote_api server                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**特点：**
- 每个 MCP 服务器是独立的 asyncio Task
- 连接保持长连接
- 断线自动重试（指数退避，最多 5 次）
- 关闭时优雅清理

---

## 九、Sampling（服务器发起 LLM 请求）

MCP 服务器可以主动请求 LLM 补全：

```yaml
mcp_servers:
  my_server:
    command: "npx"
    args: ["-y", "my-mcp-server"]
    sampling:
      enabled: true           # 默认开启
      model: "gemini-3-flash" # 模型覆盖
      max_tokens_cap: 4096    # 最大 token
      timeout: 30             # LLM 调用超时
      max_rpm: 10             # 每分钟最大请求
      max_tool_rounds: 5      # 工具循环限制
```

---

## 十、与 Skill 的区别

| 特性 | Skill | MCP |
|------|-------|-----|
| 本质 | 文本指令（SKILL.md） | 工具 API |
| 调用方式 | 注入到上下文 | 像内置工具一样调用 |
| 触发 | slash 命令 或 skill_view | LLM 自动判断或直接调用 |
| 用途 | 指导 LLM 行为 | 扩展 LLM 能力 |
| 配置 | ~/.hermes/skills/ | config.yaml mcp_servers |

---

## 十一、关键文件

| 功能 | 文件:行号 |
|------|-----------|
| 主模块 | `tools/mcp_tool.py:1` |
| discover_mcp_tools | `tools/mcp_tool.py:4126` |
| register_mcp_servers | `tools/mcp_tool.py:4019` |
| 配置读取 | `tools/mcp_tool.py:3047` |
| 工具注册 | `tools/mcp_tool.py:3878` |
| 连接服务器 | `tools/mcp_tool.py:3090` |

---

## 十二、流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP 启动流程                                   │
└─────────────────────────────────────────────────────────────────────┘

1. 读取配置
┌─────────────────────────────────────────────────────────────────────┐
│  _load_mcp_config()                                                 │
│  └── 从 config.yaml 读取 mcp_servers                                │
│  └── 支持 ${ENV_VAR} 插值                                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
2. 启动事件循环
┌─────────────────────────────────────────────────────────────────────┐
│  _ensure_mcp_loop()                                                │
│  └── 启动 daemon thread                                            │
│  └── 创建 asyncio event loop                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
3. 并行连接
┌─────────────────────────────────────────────────────────────────────┐
│  asyncio.gather(*[_discover_one(...) for server in servers])       │
│  └── 并行连接所有服务器                                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
4. 注册工具
┌─────────────────────────────────────────────────────────────────────┐
│  _register_server_tools()                                          │
│  └── server.list_tools() → 获取工具列表                             │
│  └── registry.register(name="mcp_server_tool", ...)                │
│  └── 命名前缀：mcp_{server}_{tool}                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
5. 可用
┌─────────────────────────────────────────────────────────────────────┐
│  Agent 可调用 mcp_github_list_issues 等工具                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 总结

| 阶段 | 关键操作 |
|------|----------|
| 配置 | `config.yaml` 的 `mcp_servers` |
| 启动 | `discover_mcp_tools()` 读取配置、连接服务器 |
| 注册 | `mcp_{server}_{tool}` 命名，注入 tool registry |
| 调用 | 像内置工具一样通过 registry 调用 |
| 安全 | 环境变量过滤、凭据清理 |
| 架构 | daemon thread + asyncio event loop |
