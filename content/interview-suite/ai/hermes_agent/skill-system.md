# Hour 8: Skill 加载机制

---

## 一、概述

Skill（技能）是 Hermes 的**可扩展知识单元**，以 `SKILL.md` 文件为核心，支持渐进式披露：

```
skills/
├── my-skill/
│   ├── SKILL.md           # 主指令（必需）
│   ├── references/        # 参考文档
│   ├── templates/         # 模板
│   └── scripts/           # 脚本
└── category/
    └── another-skill/
        └── SKILL.md
```

---

## 二、SKILL.md 格式

```markdown
---
name: skill-name              # 技能名称（必需，≤64字符）
description: Brief description # 描述（必需，≤1024字符）
version: 1.0.0              # 版本（可选）
platforms: [macos, linux]   # 限制平台（可选）
prerequisites:              # 前置要求（可选）
  env_vars: [API_KEY]
  commands: [curl, jq]
---
# Skill Title

Full instructions here...
```

---

## 三、Skill 存储位置

| 来源 | 路径 |
|------|------|
| 用户技能 | `~/.hermes/skills/` |
| 捆绑技能 | `hermes-agent/skills/` |
| 外部技能 | `skills.external_dirs` 配置 |
| 可选技能 | `hermes-agent/optional-skills/` |

---

## 四、加载流程

### 1. 扫描阶段（scan_skill_commands）

```
启动时 /reload-skills 命令
    ↓
scan_skill_commands()
    ↓
遍历 ~/.hermes/skills/ 和外部目录
    ↓
查找所有 SKILL.md 文件
    ↓
解析 frontmatter（YAML 头）
    ↓
过滤：平台兼容性、环境匹配、用户禁用列表
    ↓
构建命令映射："/skill-name" → {name, description, path, dir}
```

**关键代码位置：** `agent/skill_commands.py:348`

```python
def scan_skill_commands():
    _skill_commands = {}
    
    # 扫描所有 skills 目录
    for scan_dir in dirs_to_scan:
        for skill_md in iter_skill_index_files(scan_dir, "SKILL.md"):
            content = skill_md.read_text(encoding='utf-8')
            frontmatter, body = _parse_frontmatter(content)
            
            # 平台兼容性检查
            if not skill_matches_platform(frontmatter):
                continue
            
            # 用户禁用检查
            if name in disabled:
                continue
            
            # 构建命令映射
            cmd_name = name.lower().replace(' ', '-').replace('_', '-')
            _skill_commands[f"/{cmd_name}"] = {
                "name": name,
                "description": description,
                "skill_md_path": str(skill_md),
                "skill_dir": str(skill_md.parent),
            }
```

### 2. 注册为 Slash 命令

扫描结果注入到 **slash command registry**：

```python
# agent/skill_commands.py
def get_skill_commands() -> Dict[str, Dict[str, Any]]:
    """惰性扫描 + 缓存"""
    if not _skill_commands or _skill_commands_platform != _resolve_platform():
        scan_skill_commands()
    return _skill_commands
```

### 3. 懒加载内容

```
用户输入 "/axolotl"
    ↓
skill_view("axolotl")
    ↓
读取 axolotl/SKILL.md 文件
    ↓
解析 frontmatter + body
    ↓
返回完整内容给 Agent
```

---

## 五、Skill 与 Agent 的交互

### 调用方式

| 方式 | 说明 |
|------|------|
| `/skill-name` | 用户输入 slash 命令 |
| `skills_list` 工具 | 列出所有可用 skill |
| `skill_view` 工具 | 查看具体 skill 内容 |
| Cron 任务附加 | 定时任务加载 skill |

### 消息注入流程

```python
# 用户输入 "/axolotl some-args"
    ↓
build_skill_invocation_message(
    skill_name="axolotl",
    user_args="some-args",
    skill_body="..."  # 从 SKILL.md 读取
)
    ↓
# 生成结构化消息
"[IMPORTANT: The user has invoked the axolotl skill.]
[The full skill content is loaded below.]
...
User instruction: some-args"
    ↓
发送给 LLM
```

---

## 六、过滤器机制

### 1. 平台过滤器

```python
# SKILL.md 中 platforms: [macos, linux]
skill_matches_platform(frontmatter)  # 检查当前 OS
```

### 2. 环境过滤器

```python
# 检查 kanban/docker/s6 等运行时环境
skill_matches_environment(frontmatter)
```

### 3. 用户禁用列表

```python
# config.yaml 中 skills.disabled: [some-skill]
_get_disabled_skill_names()  # 用户禁用的 skill 列表
```

---

## 七、Skill 执行工具

### skills_list

```python
def skills_list(category: str = None) -> str:
    """列出所有 skill（只含元数据，节省 token）"""
    # 返回：name, description, category
```

### skill_view

```python
def skill_view(name: str, file_path: str = None) -> str:
    """查看 skill 内容或引用文件"""
    # file_path 为空 → 返回 SKILL.md
    # file_path="references/api.md" → 返回引用文件
```

---

## 八、Curator（技能策展人）

Curator 是后台任务，定期维护 agent 创建的 skills：

```python
# agent/curator.py
class Curator:
    # 自动状态转换：active → stale → archived
    # 绝不自动删除，只归档
    # 固定 skill 跳过所有自动转换
    
    def maybe_run_curator():
        """空闲时触发"""
        
    def apply_automatic_transitions():
        """基于不活跃时间的状态转换"""
```

**状态流转：**
```
active (新建)
    ↓ 30天无使用
stale (陈旧)
    ↓ 90天无使用
archived (归档，可恢复)
```

---

## 九、reload-skills 命令

```bash
hermes reload-skills
```

**作用：**
1. 重新扫描 `~/.hermes/skills/` 和外部目录
2. 更新 slash 命令映射
3. 返回增删改的 diff

**注意：** 不会重置 system prompt 缓存，保持 prefix caching。

---

## 十、关键文件位置

| 功能 | 文件:行号 |
|------|-----------|
| scan_skill_commands | `agent/skill_commands.py:348` |
| get_skill_commands | `agent/skill_commands.py:418` |
| SKILL.md 解析 | `tools/skills_tool.py:1` |
| skills_list | `tools/skills_tool.py:420` |
| skill_view | `tools/skills_tool.py:530` |
| Curator 策展 | `agent/curator.py:1` |
| 过滤器函数 | `tools/skills_tool.py:200-300` |

---

## 十一、流程图

```
┌─────────────────────────────────────────────────────────────┐
│                        Skill 加载流程                        │
└─────────────────────────────────────────────────────────────┘

1. 扫描阶段（启动时 / reload）
┌─────────────────────────────────────────────────────────────┐
│  scan_skill_commands()                                      │
│  ├── 遍历 ~/.hermes/skills/                                │
│  ├── 遍历 external_dirs                                     │
│  ├── 查找 SKILL.md                                         │
│  ├── 解析 frontmatter                                      │
│  ├── 平台/环境/禁用过滤                                     │
│  └── 构建 /command-name → info 映射                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
2. 注册阶段
┌─────────────────────────────────────────────────────────────┐
│  slash command registry                                     │
│  └── "/axolotl" → {name, description, path, dir}           │
└─────────────────────────────────────────────────────────────┘
                          ↓
3. 调用阶段（用户输入 /axolotl）
┌─────────────────────────────────────────────────────────────┐
│  skill_view("axolotl")                                      │
│  └── 读取 axolotl/SKILL.md                                  │
│      └── 解析 frontmatter + body                           │
│          └── 构建结构化消息注入 LLM                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 总结

| 阶段 | 触发时机 | 关键操作 |
|------|----------|----------|
| 扫描 | 启动 /reload | 遍历目录，解析 YAML 头，过滤 |
| 注册 | 扫描后 | 注入 slash command registry |
| 加载 | 用户调用 | 读取文件，解析内容，注入消息 |
| 策展 | 定时/空闲 | 状态流转管理（active→stale→archived） |
