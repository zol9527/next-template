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

也可以直接使用 npm workspace：

```bash
npm run dev -w @repo/backend
npm run compile:mp-weixin -w @repo/miniprogram-wechat
```

## 迁移说明

- 原 `next-template` 已迁入 `apps/backend`，原后端内部的 `src/`、`prisma/`、`scripts/`、`deploy/` 等相对路径保持不变。
- 原小程序项目 `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme` 已迁入 `apps/miniprograms/wechat`。
- 小程序迁移只保留源码、配置、文档和脚本，不迁入 `.git`、`node_modules`、`dist` 等运行产物。
- 根目录 `package.json` 使用 npm workspaces 统一管理依赖，后续可以继续新增 `apps/web`、`apps/desktop`、`apps/mobile`、`apps/miniprograms/douyin`、`apps/miniprograms/alipay` 或 `packages/*`。
