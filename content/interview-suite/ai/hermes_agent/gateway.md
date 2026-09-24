# Hour 7: Gateway 网关

---

## 一、概述

Gateway 是 Hermes 的**消息网关**，负责连接各种消息平台（Telegram、Discord、Slack 等）与 Agent。

**核心职责：**
- 管理多个平台适配器（Adapter）
- 路由消息到正确的会话
- 处理命令（/new、/reset 等）
- 协调 Agent 与平台之间的通信

---

## 二、架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        GatewayRunner                            │
│                     （gateway/run.py）                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Telegram    │  │ Discord     │  │ Slack       │  ...       │
│  │ Adapter     │  │ Adapter     │  │ Adapter     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Session Store（会话管理）                    │   │
│  │              session.py                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                     │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AIAgent（Agent 核心）                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、核心组件

### GatewayRunner

主控制器，管理整个网关生命周期：

```python
class GatewayRunner(
    GatewayAuthorizationMixin,
    GatewayKanbanWatchersMixin,
    GatewaySlashCommandsMixin
):
    def __init__(self, config: Optional[GatewayConfig] = None):
        self.adapters: Dict[Platform, BasePlatformAdapter] = {}
        self.session_store: SessionStore = ...
        self.delivery_router: DeliveryRouter = ...
        self._running_agents: Dict[str, AIAgent] = {}  # 运行中的 Agent
        self._queued_events: Dict[str, List[MessageEvent]] = {}  # 事件队列
```

### BasePlatformAdapter

平台适配器基类，每个平台实现自己的适配器：

```python
class BasePlatformAdapter:
    def __init__(self, config: PlatformConfig, platform: Platform):
        self.config = config
        self.platform = platform
    
    async def connect() -> bool:      # 连接平台
    async def disconnect() -> None:   # 断开连接
    async def send() -> SendResult:   # 发送消息
    async def send_image() -> SendResult:  # 发送图片
    async def send_typing():          # 发送typing状态
```

### MessageEvent

标准化消息格式，所有适配器都转换为这个格式：

```python
class MessageEvent:
    text: str                      # 消息内容
    message_type: MessageType      # TEXT/IMAGE/VOICE 等
    source: SessionSource          # 来源信息
    media_urls: List[str]          # 媒体 URL
    reply_to_message_id: str       # 回复的消息 ID
    internal: bool                 # 是否内部事件
    timestamp: datetime            # 时间戳
```

---

## 四、支持的平台

```
gateway/platforms/
├── telegram.py         # Telegram
├── discord.py          # Discord
├── slack.py            # Slack
├── whatsapp_cloud.py   # WhatsApp (Meta Cloud API)
├── signal.py           # Signal
├── weixin.py           # 微信
├── feishu.py           # 飞书
├── dingtalk.py         # 钉钉
├── qqbot/              # QQ 机器人
├── webhook.py          # Webhook
├── api_server.py      # REST API
└── ...
```

---

## 五、消息流程

### 接收消息

```
平台 Webhook → Adapter.on_message() → MessageEvent → GatewayRunner._handle_message()
```

### 发送消息

```
Agent 回复 → delivery_router.route() → Adapter.send() → 平台
```

### 命令处理

```
MessageEvent (text="/new") → get_command() → _handle_slash_command() → 执行命令
```

---

## 六、会话管理

### SessionSource

标识消息来源：

```python
@dataclass
class SessionSource:
    platform: Platform           # telegram/discord/slack
    chat_id: str                # 聊天室 ID
    user_id: str                # 用户 ID
    thread_id: Optional[str]    # 线程 ID（支持的话）
```

### SessionStore

管理会话存储和重置策略：

```python
class SessionStore:
    def get_or_create_session(
        self,
        source: SessionSource,
        system_prompt: Optional[str] = None,
    ) -> SessionEntry
    
    def should_reset_session(
        self,
        source: SessionSource,
        last_activity: datetime,
    ) -> bool
```

---

## 七、slash 命令

Gateway 支持与 CLI 相同的 slash 命令（通过 `GatewaySlashCommandsMixin`）：

| 命令 | 说明 |
|------|------|
| `/new` | 开始新会话 |
| `/reset` | 重置当前会话 |
| `/stop` | 停止运行中的 Agent |
| `/help` | 显示帮助 |
| `/status` | 显示状态 |

**注册方式：**
```python
# gateway/slash_commands.py
class GatewaySlashCommandsMixin:
    async def _handle_slash_command(self, event: MessageEvent) -> Optional[str]:
        cmd = event.get_command()
        if cmd == "new":
            return await self._handle_new_command(event)
        elif cmd == "reset":
            return await self._handle_reset_command(event)
        ...
```

---

## 八、启动流程

```python
async def start_gateway(config: Optional[GatewayConfig] = None) -> bool:
    # 1. 加载配置
    config = config or load_gateway_config()
    
    # 2. 创建 GatewayRunner
    runner = GatewayRunner(config)
    
    # 3. 启动所有平台适配器
    for platform, adapter in runner.adapters.items():
        await adapter.connect()
    
    # 4. 进入事件循环
    await runner._run_forever()
```

---

## 九、添加新平台

### 方式一：插件（推荐，第三方）

```
~/.hermes/plugins/<name>/
├── plugin.yaml
├── adapter.py
└── __init__.py
```

### 方式二：内置（核心贡献者）

```
gateway/platforms/<name>.py
```

### 必须实现的方法

| 方法 | 说明 |
|------|------|
| `connect()` | 连接平台 |
| `disconnect()` | 断开连接 |
| `send()` | 发送文本消息 |
| `send_image()` | 发送图片 |
| `send_typing()` | 发送 typing 状态 |

---

## 十、Gateway vs CLI

| 维度 | Gateway | CLI |
|------|---------|-----|
| 运行模式 | 长期运行守护进程 | 交互式终端 |
| 消息来源 | 平台 Webhook/轮询 | 用户键盘输入 |
| 会话管理 | 多用户、多会话 | 单会话 |
| 命令处理 | 通过消息（/new 等） | 直接输入 |

---

## 十一、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| GatewayRunner | `gateway/run.py:2409` |
| start_gateway | `gateway/run.py:17048` |
| BasePlatformAdapter | `gateway/platforms/base.py:1` |
| MessageEvent | `gateway/platforms/base.py:1423` |
| SessionStore | `gateway/session.py:247` |
| SessionSource | `gateway/session.py:70` |
| Slash Commands | `gateway/slash_commands.py:1` |
| 添加平台文档 | `gateway/platforms/ADDING_A_PLATFORM.md` |

---

## 总结

Hour 7 核心理解：
- Gateway 是消息平台与 Agent 之间的桥梁
- 每个平台有自己的 Adapter，统一转换为 MessageEvent
- GatewayRunner 管理所有 Adapter 和会话
- 支持与 CLI 相同的 slash 命令
- 可通过插件或内置方式添加新平台
