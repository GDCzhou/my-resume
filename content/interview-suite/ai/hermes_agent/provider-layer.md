# Hour 3: Provider 适配层

---

## 一、概述

Hermes 支持多种 LLM Provider，通过统一的客户端接口调用不同的后端服务。

---

## 二、支持的 Provider 类型

### Provider vs 客户端映射

| Provider | 客户端 | 文件位置 |
|----------|--------|----------|
| `copilot-acp` | `CopilotACPClient` | `agent/copilot_acp_client.py` |
| `google-gemini-cli` | `GeminiCloudCodeClient` | `agent/gemini_cloudcode_adapter.py` |
| `gemini` | `GeminiNativeClient` | `agent/gemini_native_adapter.py` |
| 其他 (默认) | `OpenAI` 兼容客户端 | `openai.OpenAI` |

### 客户端选择逻辑

```python
# agent_runtime_helpers.py:1357
def create_openai_client(agent, client_kwargs, *, reason, shared):
    
    # 1. Copilot ACP
    if agent.provider == "copilot-acp":
        return CopilotACPClient(**client_kwargs)
    
    # 2. Gemini Cloud Code
    if agent.provider == "google-gemini-cli":
        return GeminiCloudCodeClient(**safe_kwargs)
    
    # 3. Gemini Native
    if agent.provider == "gemini":
        return GeminiNativeClient(**safe_kwargs)
    
    # 4. 默认: OpenAI 兼容客户端
    return OpenAI(**client_kwargs)
```

---

## 三、Client 创建流程

```
用户配置 (model, provider, api_key, base_url)
    │
    ▼
AIAgent.__init__()
    │
    ▼
agent_init.init_agent()
    │
    ▼
创建 agent.client
    │
    ▼
API 调用时
    │
    ▼
interruptible_api_call()
    │
    ▼
_create_request_openai_client()
    │
    ▼
create_openai_client()
    │
    ▼
返回对应 Provider 的客户端
    │
    ▼
client.chat.completions.create()
```

---

## 四、多 Provider 支持的关键

### 1. 统一接口

所有客户端都实现 `chat.completions.create()` 接口：
```python
client.chat.completions.create(model=..., messages=..., tools=...)
```

### 2. Provider 检测

根据 `agent.provider` 选择客户端类型。

### 3. 参数过滤

不同 Provider 接受的参数不同，需要过滤：
```python
# Gemini 不接受 OpenAI 特有参数
safe_kwargs = {
    k: v for k, v in client_kwargs.items()
    if k in {"api_key", "base_url", "default_headers", "timeout"}
}
```

### 4. Keep-Alive 配置

注入 TCP keepalive 避免死连接：
```python
if "http_client" not in client_kwargs:
    keepalive_http = agent._build_keepalive_http_client(base_url)
    if keepalive_http is not None:
        client_kwargs["http_client"] = keepalive_http
```

---

## 五、错误分类与 Failover

### 错误分类 (error_classifier.py)

```python
class FailoverReason(enum.Enum):
    # 认证问题
    auth = "auth"                    # 401/403 — 刷新/轮换
    auth_permanent = "auth_permanent"  # 认证失败后 — 中止
    
    # 计费/配额
    billing = "billing"              # 402 — 立即轮换
    rate_limit = "rate_limit"        # 429 — 退避后轮换
    
    # 服务器问题
    overloaded = "overloaded"        # 503/529 — 退避
    server_error = "server_error"    # 500/502 — 重试
    
    # 传输问题
    timeout = "timeout"              # 超时 — 重建客户端
    
    # 上下文问题
    context_overflow = "context_overflow"  # 上下文太大 — 压缩
    payload_too_large = "payload_too_large"  # 413 — 压缩
    
    # 其他
    model_not_found = "model_not_found"    # 404 — 切换模型
    unknown = "unknown"                      # 未知 — 退避重试
```

### Fallback 机制

当主 Provider 失败时，自动切换到备用 Provider：

```python
# chat_completion_helpers.py:1074
def try_activate_fallback(agent, reason):
    """切换到 fallback chain 中的下一个模型/Provider"""
    
    if agent._fallback_index >= len(agent._fallback_chain):
        return False  # 没有更多 fallback
    
    fb = agent._fallback_chain[agent._fallback_index]
    agent._fallback_index += 1
    
    # 跳过和当前相同的 (provider, model) 组合
    # 避免循环失败
    
    # 使用 resolve_provider_client 构建客户端
    fb_client, _resolved_fb_model = resolve_provider_client(...)
    
    # 更新 agent 属性
    agent.model = fb_model
    agent.provider = fb_provider
    agent.base_url = fb_base_url
    agent.api_mode = fb_api_mode
    
    return True
```

### Fallback Chain 配置

在 `config.yaml` 中配置：
```yaml
providers:
  primary:
    provider: openai
    model: gpt-4
  fallback:
    - provider: anthropic
      model: claude-3
    - provider: openrouter
      model: google/gemini-pro
```

---

## 六、API Mode

不同 Provider 使用不同的 API 模式：

```python
fb_api_mode = "chat_completions"      # OpenAI 标准
fb_api_mode = "codex_responses"       # Codex Responses API
fb_api_mode = "anthropic_messages"    # Anthropic Messages API
fb_api_mode = "bedrock_converse"      # AWS Bedrock
```

判断逻辑：
```python
if fb_provider == "openai-codex":
    fb_api_mode = "codex_responses"
elif fb_provider == "anthropic":
    fb_api_mode = "anthropic_messages"
elif fb_provider == "bedrock":
    fb_api_mode = "bedrock_converse"
else:
    fb_api_mode = "chat_completions"
```

---

## 七、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| create_openai_client | `agent_runtime_helpers.py:1357` |
| try_activate_fallback | `chat_completion_helpers.py:1074` |
| 错误分类 | `error_classifier.py:24` |
| FalloverReason 枚举 | `error_classifier.py:24` |

---

## 总结

Hour 3 核心理解：
- Hermes 通过 Provider 适配层支持多种 LLM 后端
- 每个 Provider 有专门的客户端实现
- 统一的 `chat.completions.create()` 接口
- 错误分类决定恢复策略（重试/切换/压缩）
- Fallback chain 提供高可用性
