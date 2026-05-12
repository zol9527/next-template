# next-template-monorepo

这个仓库是通用全栈 monorepo 模板。根目录负责统一依赖、统一命令和跨端协作；具体应用代码放在 `apps/` 下。

## 目录结构

```text
apps/
  backend/                 Next.js 16+ 后端、管理后台、API、Prisma、部署脚本
  web/                     预留 Web 前端应用
  desktop/                 预留桌面端应用
  mobile/                  预留手机端应用
  miniprograms/
    wechat/                uni-app 微信小程序端
    douyin/                预留抖音小程序端
    alipay/                预留支付宝小程序端
packages/                  预留共享包目录，例如 sdk、types、config、ui
```

## 常用命令

```bash
make install
make dev-backend
make dev-wechat
make compile-wechat
make build-backend
```

也可以直接使用 Bun workspace：

```bash
bun run --filter @repo/backend dev
bun run --filter @repo/miniprogram-wechat compile:mp-weixin
```

## PM2 生产部署

项目使用 PM2 管理 Next.js 进程。配置文件位于 `apps/backend/ecosystem.config.cjs`。

PM2 只负责设置 `NODE_ENV` 并启动进程，Next.js 自动加载对应的 `.env` 文件：

| ENV 参数            | NODE_ENV      | 加载的 .env 文件（按优先级）                |
| ------------------- | ------------- | ------------------------------------------ |
| `production`        | `production`  | `.env.production.local` > `.env.production` > `.env` |
| `development`       | `development` | `.env.development.local` > `.env.development` > `.env` |

> **注意**: `make dev-backend`（本地开发）不需要 PM2，直接用 `next dev` 热重载。`make deploy ENV=development` 是用 PM2 托管 development 环境的 `next start`（构建后运行）。

### 前置条件

```bash
npm install -g pm2
```

### 快速部署

```bash
make deploy                      # 构建 + 启动（默认 production）
make deploy ENV=production       # 同上，显式指定
make deploy ENV=development      # 构建 + 启动 development 环境
```

### 常用运维命令

```bash
make pm2-status              # 查看进程状态
make pm2-logs                # 查看实时日志
make pm2-restart             # 硬重启（有短暂不可用）
make pm2-stop                # 停止进程
make pm2-start ENV=development  # 仅启动（不构建）
make pm2-delete              # 彻底删除进程
```

### 日志架构

| 系统       | 职责                         | 输出位置            |
| ---------- | ---------------------------- | ------------------- |
| **Pino**   | 结构化业务日志（traceId、请求上下文、敏感字段脱敏） | `logs/app.log`（按日期/大小滚动，自动保留 7 天） |
| **PM2**    | 进程管理（启动、重启、崩溃恢复） | 日志文件已关闭，Pino 通过 `LOG_TO_STDOUT` 输出到 stdout，`pm2 logs` 可查看 |

所有业务日志由 Pino 统一管理。日志相关配置写在 `.env` 文件中：

| 变量                        | 默认值         | 说明                     |
| --------------------------- | -------------- | ------------------------ |
| `LOG_TO_STDOUT`             | `true`         | 是否输出到 stdout（`pm2 logs` 可查看） |
| `LOG_LEVEL`                 | `info`(prod) / `debug`(dev) | 日志级别   |
| `LOG_DIR`                   | `./logs`       | 日志文件目录             |
| `LOG_RETENTION_DAYS`        | `7`            | 日志保留天数             |

### 服务器首次部署

```bash
make deploy ENV=production
pm2 save                      # 保存当前进程列表
pm2 startup                   # 生成开机自启脚本（按提示执行输出的命令）
```

## 发布管理

仓库使用 `release-cli` 管理发布。每个发布单元有独立配置、版本文件、
changelog 目录和 Git tag 前缀，避免 monorepo 内多个应用互相污染版本线。

```text
.release/
  backend.yml      backend/v0.1.0
  wechat.yml       wechat/v1.0.0
  monorepo.yml     monorepo/v0.1.0
  _shared/
    hooks/
      hook-version.py
      hook-release.py
  _state/
    backend.VERSION
    wechat.VERSION
    monorepo.VERSION
```

常用命令：

```bash
make release-backend TYPE=patch
make release-wechat TYPE=minor
make release-monorepo VERSION=0.2.0
make release-prepare RELEASE=backend
make release-commit RELEASE=backend
make release-pack RELEASE=wechat
```

`make release-*` 现在直接调用 `release-cli release` 内置流水线。默认阶段是
`preflight -> prepare -> commit -> pr`，可以用下面的变量做分段执行：

```bash
make release-backend RELEASE_TO_STEP=prepare
make release RELEASE=wechat RELEASE_ONLY=preflight,prepare
make release-commit RELEASE=backend RELEASE_TO_STEP=commit
```

发布提交标题由各发布单元配置里的 `release.commit_title` 控制，默认使用
`🚀 release: {tag}`。这里 `{tag}` 会带上各自的 `version.tag_prefix`，例如
`backend/v0.2.2`、`wechat/v1.0.1`。

发布时 `.release/_shared/hooks/hook-version.py` 会把 `release-cli` 解析出的版本同步到
对应发布单元的 `package.json`。微信小程序还会同步页面运行时读取的
`apps/miniprograms/wechat/src/config/version.ts`。
如果某个 workspace 需要定制发布检查或额外动作，直接改
`.release/_shared/hooks/hook-release.py`，在对应阶段中补逻辑即可。

## 迁移说明

- 原 `next-template` 已迁入 `apps/backend`，原后端内部的 `src/`、`prisma/`、`scripts/`、`deploy/` 等相对路径保持不变。
- 原小程序项目 `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme` 已迁入 `apps/miniprograms/wechat`。
- 小程序迁移只保留源码、配置、文档和脚本，不迁入 `.git`、`node_modules`、`dist` 等运行产物。
- 根目录 `package.json` 使用 Bun workspaces 统一管理依赖，后续可以继续新增 `apps/web`、`apps/desktop`、`apps/mobile`、`apps/miniprograms/douyin`、`apps/miniprograms/alipay` 或 `packages/*`。
