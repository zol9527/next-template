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

发布时 `.release/_shared/hooks/hook-version.py` 会把 `release-cli` 解析出的版本同步到
对应发布单元的 `package.json`。微信小程序还会同步
`apps/miniprograms/wechat/src/manifest.json` 的 `versionName` 和 `versionCode`。
如果某个 workspace 需要定制发布检查或额外动作，直接改
`.release/_shared/hooks/hook-release.py`，在对应阶段中补逻辑即可。

## 迁移说明

- 原 `next-template` 已迁入 `apps/backend`，原后端内部的 `src/`、`prisma/`、`scripts/`、`deploy/` 等相对路径保持不变。
- 原小程序项目 `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme` 已迁入 `apps/miniprograms/wechat`。
- 小程序迁移只保留源码、配置、文档和脚本，不迁入 `.git`、`node_modules`、`dist` 等运行产物。
- 根目录 `package.json` 使用 Bun workspaces 统一管理依赖，后续可以继续新增 `apps/web`、`apps/desktop`、`apps/mobile`、`apps/miniprograms/douyin`、`apps/miniprograms/alipay` 或 `packages/*`。
