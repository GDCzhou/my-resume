# Plugin 生命周期详解

> 什么时候注册，什么时候使用？

---

## 一、完整时间线

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Hermes 启动                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. model_tools.py 导入（模块级别）                                       │
│    → discover_plugins() 被调用                                          │
│    → 所有 plugin.yaml + __init__.py 被扫描                              │
│    → register(ctx) 执行，工具注册到全局 registry                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. 工具可被 Agent 使用                                                   │
│    → 工具出现在 get_tool_definitions()                                 │
│    → 随 API 请求发送给 LLM                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Agent 运行期间                                                       │
│    → pre_tool_call 钩子（工具执行前）                                   │
│    → 工具 handler 执行                                                  │
│    → post_tool_call 钩子（工具执行后）                                  │
│    → transform_tool_result 钩子（结果转换）                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. 会话结束时                                                           │
│    → on_session_end 钩子                                               │
│    → on_session_finalize 钩子                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、注册时机（启动时一次性）

### 注册入口

```python
# model_tools.py（模块导入时执行）
try:
    from hermes_cli.plugins import discover_plugins
    discover_plugins()  # ← 注册从这里开始
except Exception as e:
    logger.debug("Plugin discovery failed: %s", e)
```

### 首次发现（惰性单例）

```python
# hermes_cli/plugins.py
_plugin_manager: Optional[PluginManager] = None

def get_plugin_manager() -> PluginManager:
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager()
        discover_plugins()  # 首次调用时发现
    return _plugin_manager
```

### discover_plugins() 做了什么

```python
def discover_plugins(force: bool = False) -> None:
    manager = get_plugin_manager()
    
    # 扫描 4 个来源
    sources = [
        get_bundled_plugins_dir(),           # repo/plugins/
        Path.home() / ".hermes/plugins",     # ~/.hermes/plugins/
        ...
    ]
    
    for source_dir in sources:
        for plugin_dir in source_dir.iterdir():
            _load_one(plugin_dir)  # 加载每个插件
```

### 单个插件加载流程

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
    
    # 3. 调用 register(ctx) ← 工具在此注册
    ctx = PluginContext(manifest, manager)
    module.register(ctx)  # ← 一次性，工具进入全局 registry
```

**结论：注册是启动时一次性完成的，之后不再重复。**

---

## 三、使用时机（运行时按需）

### 工具使用（Agent 每轮对话可能触发）

```
LLM 返回 tool_calls
    ↓
registry.dispatch(tool_name, args)
    ↓
工具 handler 执行
    ↓
post_tool_call 钩子
```

### 钩子使用（运行时按需调用）

```python
# 工具执行前
invoke_hook("pre_tool_call", tool_name=..., tool_args=...)

# 工具执行后
invoke_hook("post_tool_call", tool_name=..., result=...)

# 转换工具结果
invoke_hook("transform_tool_result", tool_name=..., result=...)

# 会话生命周期
invoke_hook("on_session_start", session_id=...)
invoke_hook("on_session_end", session_id=...)
invoke_hook("on_session_finalize", session_id=...)
```

---

## 四、关键区别

| 阶段 | 操作 | 发生次数 |
|------|------|----------|
| 启动时 | `discover_plugins()` | 1 次（惰性单例） |
| 启动时 | `register(ctx)` | 每个插件 1 次 |
| 运行时 | `invoke_hook()` | 每次触发时 |
| 运行时 | 工具 handler | 每次调用时 |

---

## 五、代码位置

| 事件 | 文件:行号 |
|------|-----------|
| discover_plugins 触发 | `model_tools.py:198` |
| discover_plugins 定义 | `hermes_cli/plugins.py:1806` |
| register 调用 | `hermes_cli/plugins.py:1816` (加载循环内) |
| 工具分发 | `tools/registry.py:390` |
| invoke_hook 定义 | `hermes_cli/plugins.py:1658` |
| invoke_hook 调用点 | `model_tools.py:856, 1173` 等 |

---

## 六、图示总结

```
    ┌──────────────────────────────────────────────┐
    │              Hermes 进程启动                  │
    └──────────────────────────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────┐
    │  discover_plugins()                          │
    │  ┌────────────────────────────────────────┐  │
    │  │ for each plugin_dir:                   │  │
    │  │   → 解析 plugin.yaml                   │  │
    │  │   → 导入 __init__.py                   │  │
    │  │   → 调用 register(ctx)                 │  │
    │  │   → 工具注册到全局 registry             │  │
    │  └────────────────────────────────────────┘  │
    └──────────────────────────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────┐
    │  工具已注册，随时可被 Agent 调用               │
    └──────────────────────────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────┐
    │  Agent 运行中（多次）                         │
    │  ┌────────────────────────────────────────┐   │
    │  │ tool_call 触发 → invoke_hook()        │   │
    │  │ session 开始 → invoke_hook()          │   │
    │  │ session 结束 → invoke_hook()          │   │
    │  └────────────────────────────────────────┘   │
    └──────────────────────────────────────────────┘
```

---

## 七、回答核心问题

**Plugin 运行在什么时候？**
- **注册阶段**：启动时，模块导入 `model_tools.py` 后，`discover_plugins()` 被调用
- **使用阶段**：运行时，每次工具调用或生命周期事件触发钩子时

**什么时候注册？**
- 一次性，启动时完成
- `discover_plugins()` 是幂等的，重复调用无事发生

**什么时候使用？**
- 工具：每次 Agent 请求该工具时
- 钩子：每次对应事件触发时（`pre_tool_call`、`on_session_end` 等）
