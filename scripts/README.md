# Scripts 目录说明

当前 `scripts/` 按职责拆分为以下目录：

- `scripts/db/`: 数据库初始化、迁移、重置相关脚本
- `scripts/ops/`: 一次性运维脚本与排查工具
- `scripts/release/`: 版本同步脚本
- `scripts/security/`: 安全相关的辅助脚本
- `scripts/seed/`: Seed 系统

维护策略：

- 根目录只保留少量稳定入口，避免再次堆积“一次性脚本”
- `scripts/release-version-hook.py` 按当前 release-cli 配置保留在根目录
- `Makefile` 与 `package.json` 优先调用分层目录中的脚本
- 新增脚本请放入对应子目录，不再直接堆到 `scripts/` 根目录

## Flow 编排

`scripts/flow/` 用于承接 `Makefile` 的流程编排职责：

- `run.py`: 通用流程执行器
- `config.toml`: flow 默认配置
- `manifests/<action>.json`: 定义某个流程的步骤
- `steps/<action>/<step>.py`: 单个步骤的最小执行单元
- `hooks/<action>/<hook>.py`: 可选生命周期钩子

当前已经将 `dev`、`check`、`pack`、`pack-if-needed`、`dev-deploy`、`seed-remote`、`status`、`logs` 改造成 Python flow 模式。
内置步骤实现已经全部迁移为 Python，不再通过 shell 步骤脚本中转。

常见控制方式：

- `FLOW_FROM=pack-if-needed`: 从某一步开始执行
- `FLOW_TO=deploy`: 执行到某一步结束
- `FLOW_ONLY=deploy`: 只执行指定步骤，支持逗号分隔
- `FLOW_SKIP=check`: 跳过指定步骤，支持逗号分隔
- `FLOW_DRY_RUN=1`: 只打印步骤，不真正执行

扩展方式：

- 新增步骤文件，例如 `scripts/flow/steps/dev-deploy/backup-remote.py`
- 在 `scripts/flow/manifests/dev-deploy.json` 或 `dev-deploy.local.json` 中加入 `backup-remote`
- 之后继续通过 `make dev-deploy` 执行

配置方式：

- 默认配置写入 `scripts/flow/config.toml`
- 本地覆盖写入 `scripts/flow/config.local.toml`
- 临时覆盖直接用环境变量，例如 `DEPLOY_HOST=192.168.1.100 make dev-deploy`

新增步骤的最简模型：

- 新建步骤文件，例如 `scripts/flow/steps/dev-deploy/backup-remote.py`
- 在文件里直接写逻辑，或调用 `scripts/flow/lib/step_helpers.py`
- 在对应 manifest 的 `steps` 数组里加入步骤名 `backup-remote`

如果你需要控制“开始/结束/成功/失败”逻辑，直接用同名 hook 文件：

- `hooks/<action>/before-all.py`
- `hooks/<action>/after-all.py`
- `hooks/<action>/before-<step>.py`
- `hooks/<action>/after-<step>.py`
- `hooks/<action>/on-success.py`
- `hooks/<action>/on-failure.py`

说明：

- 当前内置 steps 已全部使用 `.py`
- 步骤文件本身就是步骤实现，不再需要单独注册步骤名
- hook 也完全通过文件名发现，不再需要在 manifest 里声明
- 配置优先级为：环境变量 > `config.local.toml` > `config.toml`
- TOML 读取与环境变量注入集中在 `run.py`
- manifest 会自动叠加同名 `*.local.json` 作为本地覆盖
