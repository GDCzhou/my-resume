# Hour 6: 插件系统

---

## 一、概述

Hermes 插件系统允许扩展核心功能，通过**插件注册工具**和**生命周期钩子**与 Agent 交互。

**为什么用插件？**
- 核心工具集保持精简（终端、文件、搜索等基础能力）
- 第三方服务集成放在插件中（Spotify、Web API 等）
- 用户可以自定义扩展

---

## 二、插件来源

Hermes 从 4 个来源发现插件：

| 来源 | 路径 | 说明 |
|------|------|------|
| 打包插件 | `hermes-agent/plugins/<name>/` | 随 Agent 一起发布 |
| 用户插件 | `~/.hermes/plugins/<name>/` | 用户安装的插件 |
| 项目插件 | `./.hermes/plugins/<name>/` | 需要 `HERMES_ENABLE_PROJECT_PLUGINS` |
| Pip 插件 | 通过 entry-point 安装 | 包需暴露 `hermes_agent.plugins` |

**优先级：** 名称相同时，后者覆盖前者。

---

## 三、插件结构

每个插件目录必须包含：

### 1. plugin.yaml（清单文件）

```yaml
name: spotify
version: 1.0.0
description: "Native Spotify integration..."
author: NousResearch
kind: backend
provides_tools:
  - spotify_playback
  - spotify_devices
  - spotify_queue
  - spotify_search
  - spotify_playlists
  - spotify_albums
  - spotify_library
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| `name` | 插件唯一标识 |
| `version` | 版本号 |
| `description` | 描述 |
| `kind` | `backend` 表示后端服务集成 |
| `provides_tools` | 该插件提供的工具列表 |

### 2. __init__.py（注册函数）

```python
"""Spotify integration plugin — bundled, auto-loaded."""

from plugins.spotify.tools import (
    SPOTIFY_PLAYBACK_SCHEMA,
    _handle_spotify_playback,
    _check_spotify_available,
)

def register(ctx) -> None:
    """Register all Spotify tools. Called once by the plugin loader."""
    ctx.register_tool(
        name="spotify_playback",
        toolset="spotify",
        schema=SPOTIFY_PLAYBACK_SCHEMA,
        handler=_handle_spotify_playback,
        check_fn=_check_spotify_available,
        emoji="🎵",
    )
```

---

## 四、PluginContext

插件通过 `PluginContext` 与 Agent 交互：

### 注册工具

```python
ctx.register_tool(
    name="spotify_playback",      # 工具名
    toolset="spotify",            # 工具集
    schema=schema,                 # JSON Schema
    handler=handler,               # 处理函数
    check_fn=check_fn,             # 可用性检查
    requires_env=["SPOTIFY_TOKEN"], # 所需环境变量
    is_async=False,
    emoji="🎵",
    override=False,               # 是否覆盖同名工具
)
```

**内部实现：**
```python
def register_tool(self, name, toolset, schema, handler, ...):
    from tools.registry import registry
    registry.register(name=name, toolset=toolset, ...)  # 注册到全局 registry
    self._manager._plugin_tool_names.add(name)  # 标记为插件提供
```

### 注册生命周期钩子

```python
ctx.register_hook("on_session_start", my_callback)
ctx.register_hook("on_session_end", my_callback)
```

---

## 五、生命周期钩子

### 完整钩子列表

```python
VALID_HOOKS = {
    # 工具调用
    "pre_tool_call",       # 工具调用前
    "post_tool_call",      # 工具调用后
    
    # 终端输出
    "transform_terminal_output",  # 转换终端输出
    "transform_tool_result",      # 转换工具结果
    
    # LLM 输出
    "transform_llm_output",  # 转换 LLM 输出
    "pre_llm_call",         # LLM 调用前
    "post_llm_call",        # LLM 调用后
    
    # API 请求
    "pre_api_request",      # API 请求前
    "post_api_request",     # API 请求后
    "api_request_error",    # API 请求错误
    
    # 会话
    "on_session_start",     # 会话开始
    "on_session_end",       # 会话结束
    "on_session_finalize",  # 会话最终化
    "on_session_reset",     # 会话重置
    
    # 子代理
    "subagent_start",       # 子代理启动
    "subagent_stop",        # 子代理停止
    
    # 网关
    "pre_gateway_dispatch",  # 网关分发前
    
    # 审批
    "pre_approval_request",    # 审批请求前
    "post_approval_response",  # 审批响应后
}
```

### 使用示例

```python
def my_pre_tool_hook(tool_name, tool_args, **kwargs):
    """工具调用前检查"""
    if tool_name == "dangerous_operation":
        return {"blocked": True, "reason": "Not allowed"}
    return None  # 允许继续

ctx.register_hook("pre_tool_call", my_pre_tool_hook)
```

### pre_gateway_dispatch 特殊行为

```python
# 可以返回控制指令
{"action": "skip", "reason": "..."}   # 跳过消息
{"action": "rewrite", "text": "..."}  # 重写消息
{"action": "allow"} / None            # 正常分发
```

---

## 六、插件发现与加载

### 发现流程

```python
def discover_plugins(force: bool = False) -> None:
    """发现所有插件"""
    sources = [
        get_bundled_plugins_dir(),      # repo/plugins/
        Path.home() / ".hermes/plugins", # ~/.hermes/plugins/
        ...
    ]
    
    for source_dir in sources:
        if not source_dir.exists():
            continue
        for plugin_dir in source_dir.iterdir():
            if plugin_dir.is_dir():
                _load_one(plugin_dir)  # 加载单个插件
```

### 加载单个插件

```python
def _load_one(plugin_dir):
    # 1. 解析 plugin.yaml
    manifest = yaml.safe_load((plugin_dir / "plugin.yaml").read_text())
    
    # 2. 导入 __init__.py
    spec = importlib.util.spec_from_file_location(
        "__init__", plugin_dir / "__init__.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # 3. 调用 register(ctx)
    ctx = PluginContext(manifest, manager)
    module.register(ctx)
```

---

## 七、PluginLlm（插件使用 Agent 的 LLM）

插件可以通过 `ctx.llm` 访问 Agent 的 LLM：

```python
class PluginContext:
    @property
    def llm(self) -> Any:
        """返回 PluginLlm facade，让插件使用用户的模型和认证"""
        from agent.plugin_llm import PluginLlm
        plugin_id = self.manifest.key or self.manifest.name
        return PluginLlm(plugin_id=plugin_id)
```

**用途：** 插件需要 AI 能力时，不用自带 API key，直接用 Agent 的配置。

---

## 八、inject_message（插件向会话注入消息）

```python
def inject_message(self, content: str, role: str = "user") -> bool:
    """向活跃会话注入消息"""
    cli = self._manager._cli_ref
    
    if getattr(cli, "_agent_running", False):
        # Agent 正在运行 → 中断并注入消息
        cli._interrupt_queue.put(msg)
    else:
        # Agent 空闲 → 排队作为下次输入
        cli._pending_input.put(msg)
    
    return True
```

**用途：** 远程控制插件、消息桥接等。

---

## 九、现有插件示例

```
plugins/
├── spotify/              # Spotify 音乐集成
├── memory/               # 记忆后端
│   ├── mem0/
│   └── supermemory/
├── web/                  # Web 搜索
│   ├── tavily/
│   ├── brave_free/
│   ├── ddgs/
│   └── exa/
├── video_gen/            # 视频生成
│   ├── xai/
│   └── fal/
├── observability/         # 可观测性
│   ├── langfuse/
│   └── nemo_relay/
└── cron/                 # 定时任务
    └── chronos/
```

---

## 十、插件 vs 核心工具

| 特性 | 核心工具 (`tools/`) | 插件 (`plugins/`) |
|------|---------------------|------------------|
| 位置 | 代码库核心 | 可选安装 |
| 加载 | 始终加载 | 按需发现 |
| API 覆盖 | 每个请求都发送 | 按需加载 |
| 用途 | 基础能力 | 第三方集成 |
| 示例 | terminal, read_file | Spotify, Tavily |

**Footprint Ladder 原则：** 基础能力放核心，第三方服务放插件。

---

## 十一、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| 插件管理器 | `hermes_cli/plugins.py:290` (PluginContext) |
| 插件发现 | `hermes_cli/plugins.py:1806` (discover_plugins) |
| 工具注册 | `hermes_cli/plugins.py:320` (register_tool) |
| 钩子注册 | `hermes_cli/plugins.py:997` (register_hook) |
| 钩子调用 | `hermes_cli/plugins.py:1658` (invoke_hook) |
| VALID_HOOKS | `hermes_cli/plugins.py:128` |

---

## 总结

Hour 6 核心理解：
- 插件通过 `plugin.yaml` + `__init__.py` 的 `register(ctx)` 注册
- `PluginContext` 提供工具注册、钩子注册、LLM 访问、消息注入等能力
- 生命周期钩子覆盖 Agent 运行的各个环节
- 4 个来源：bundled、user、project、pip
- 核心工具保持精简，扩展放插件
