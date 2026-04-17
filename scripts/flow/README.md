# Flow

`Makefile` 只保留入口，流程编排统一收敛到 `scripts/flow/run.py`。

## 结构

- `run.py`：读取 manifest、读取 TOML、注入环境变量、执行 step 和 hook
- `config.toml`：默认配置
- `config.local.toml`：本地覆盖，不提交
- `manifests/<action>.json`：定义流程顺序
- `manifests/<action>.local.json`：本地覆盖流程顺序
- `steps/<action>/<step>.py`：步骤实现
- `hooks/<action>/*.py`：生命周期 hook
- `lib/step_helpers.py`：步骤可复用能力

## 规则

- manifest 只定义顺序，不定义实现
- step 名就是文件名
- hook 完全靠文件名发现
- 配置优先级：环境变量 > `config.local.toml` > `config.toml`
- `run.py` 负责把最终配置注入环境变量，step 不解析 TOML

## Manifest

```json
{
  "name": "开发环境部署",
  "steps": ["check", "pack-if-needed", "deploy"]
}
```

如果需要本地调整顺序，新增 `manifests/dev-deploy.local.json` 即可覆盖同名字段。

## Hook 命名

- `before-all.py`
- `after-all.py`
- `before-step.py`
- `after-step.py`
- `before-<step>.py`
- `after-<step>.py`
- `on-success.py`
- `on-failure.py`

步骤名带连字符时直接按文件名匹配，例如 `check-status` 对应：

- `before-check-status.py`
- `after-check-status.py`

## 执行语义

1. `before-all`
2. 对每个 step 执行：`before-step` -> `before-<step>` -> `step` -> `after-<step>` -> `after-step`
3. `after-all`
4. 成功执行 `on-success`
5. 失败执行 `on-failure`

失败时会立即中断主流程，但仍会执行 `after-all`，然后进入 `on-failure`。

## 配置注入

`run.py` 启动时会：

1. 读取 `config.toml`
2. 叠加 `config.local.toml`
3. 保留已有环境变量覆盖值
4. 把结果注入到 step 和 hook 进程环境

当前主要注入：

- `DEPLOY_USER`
- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_NODE_VERSION`
- `DEPLOY_REMOTE_DIR`
- `PM2_APP_NAME`
- `REMOTE_TMP_ZIP`
- `ENV_DEPS`
- `DEPLOY_PREPARE_DIR`
- `DEPLOY_ZIP`
- `PRISMA_SETUP_SCRIPT`
- `REPACK`
- `SEED_MODE`
- `DB_RESET`
- `DB_FORCE_KEEP`

因此 step 只需要读环境变量，不需要自己处理 TOML。

## 新增步骤

例如给 `dev-deploy` 增加 `backup-remote`：

1. 新建 `steps/dev-deploy/backup-remote.py`
2. 在文件中直接写逻辑，或调用 `lib/step_helpers.py`
3. 在 `manifests/dev-deploy.json` 的 `steps` 中加入 `backup-remote`

示例：

```python
#!/usr/bin/env python3

from scripts.flow.lib.step_helpers import require_deploy_config, run_remote_script


def main() -> None:
    config = require_deploy_config()
    run_remote_script(
        config,
        """
        set -euo pipefail
        mkdir -p "$HOME/backups"
        cp -r "$APP_CWD/.env" "$HOME/backups/.env.$(date +%Y%m%d%H%M%S)"
        """,
    )


if __name__ == "__main__":
    main()
```

对应 manifest：

```json
{
  "name": "开发环境部署",
  "steps": ["check", "pack-if-needed", "backup-remote", "deploy"]
}
```

## 新增 Hook

如果只想在某一步前后插入逻辑，不需要改 manifest，直接增加 hook 文件：

- `hooks/dev-deploy/before-backup-remote.py`
- `hooks/dev-deploy/after-deploy.py`
- `hooks/dev-deploy/on-failure.py`

## 跨项目复用

这套结构迁移到其他语言时，建议保留这 4 个抽象：

- `Flow`：流程定义，至少包含 `name` 和 `steps`
- `Step`：按名字定位到一个可执行实现
- `Hook`：按生命周期和文件名定位到一个可执行实现
- `Runner`：读取配置、装配环境、执行顺序、处理中断

优先保留的是协议和语义，不是具体语言实现。
