# Generic Admin

基于 Next.js 的通用后台管理系统，支持插件化架构。核心系统提供用户认证、RBAC 权限控制、系统设置等基础能力，业务功能（微信集成、电商、分销推广等）通过插件按需启用。

## 🛠 技术栈

- **框架**: Next.js 16+ (App Router) + TypeScript
- **UI**: shadcn/ui + Radix UI + Tailwind CSS v4
- **认证**: JWT + Refresh Token（基于 `jose` 的 Database Persisted Sessions）
- **数据库**: Prisma ORM（支持 MySQL / PostgreSQL / SQLite）+ 可选 Supabase
- **日志**: Pino（结构化日志 + 敏感字段脱敏）
- **API 文档**: OpenAPI (Swagger) + Scalar
- **工具链**: Zod + @asteasolutions/zod-to-openapi + TanStack Query + @t3-oss/env-nextjs
- **测试**: Vitest
- **代码规范**: ESLint 9
- **CI/CD**: GitHub Actions

## 📁 目录结构

```
.
├── docs/                          # 项目开发文档
├── prisma/
│   ├── schema.prisma              # 合并后的最终 schema（自动生成，勿手动编辑）
│   └── schemas/                   # schema 源文件
│       ├── base.prisma            # 核心 schema（User, Role, Session...）
│       ├── plugin-wechat.prisma   # 微信插件模型
│       └── plugin-commerce.prisma # 电商 + 分销插件模型
├── scripts/
│   ├── prisma/merge-schemas.ts    # Prisma schema 合并脚本
│   └── seed/                      # 种子数据系统
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/              # 公开页面路由
│   │   ├── (protected)/           # 需要鉴权的页面路由
│   │   └── api/v1/                # API 路由
│   │       └── _shared/           # 共享路由基础设施（route-handler, auth）
│   ├── components/                # UI 组件
│   │   ├── ui/                    # shadcn/ui 基础组件
│   │   ├── business/              # 业务组件
│   │   └── layout/                # 布局组件
│   ├── config/                    # 配置（环境变量、权限矩阵）
│   ├── contracts/                 # 接口契约层（DTO、API 响应格式）
│   ├── lib/                       # 基础设施（prisma、logger、http 工具）
│   ├── plugins/                   # 插件目录（核心扩展点）
│   │   ├── registry.ts            # 插件注册表（isPluginEnabled / getEnabledPlugins）
│   │   ├── wechat/                # 微信插件
│   │   ├── ecommerce/             # 电商插件
│   │   └── promotion/             # 分销推广插件
│   ├── repositories/              # 数据访问层（工厂模式，支持多数据库）
│   ├── services/                  # 业务逻辑层
│   ├── middleware/                 # 中间件
│   └── types/                     # TypeScript 类型定义
└── public/                        # 静态资源
```

## 🏗 插件架构

系统采用 **Core + Plugins** 架构：

### 核心系统（始终启用）

- 用户认证（登录 / 注册 / MFA / Session 管理）
- RBAC 权限控制（角色 / 权限 / 访问控制）
- 系统设置（站点配置 / 功能开关）
- 媒体资源管理（文件上传 / 存储）
- 审计日志

### 插件（按需启用）

| 插件 | 环境变量 | 说明 |
|------|---------|------|
| **wechat** | `PLUGIN_WECHAT=true` | 微信生态集成（小程序登录 / 支付 / 轮播图） |
| **ecommerce** | `PLUGIN_ECOMMERCE=true` | 电商功能（商品 / 订单 / 分类 / 优惠券） |
| **promotion** | `PLUGIN_PROMOTION=true` | 分销推广（推广员 / 佣金 / 结算） |

### 插件影响范围

1. **Prisma Schema**: 通过合并脚本动态注入插件模型和 relation 字段
2. **API 路由**: 使用 `pluginGuard` 参数保护，插件禁用时返回 404
3. **种子数据**: 可选模块仅在对应插件启用时才执行
4. **前端**: Server Component 通过 `getEnabledPlugins()` 传递插件状态

## 🚀 快速开始

### 环境要求

- Node.js 20+
- Bun（推荐）或 npm
- MySQL / MariaDB（本地开发默认）

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd generic-admin

# 安装依赖
bun install

# 复制环境变量模板
cp .env.example.local .env.development
# 编辑 .env.development 填入实际配置

# 生成 Prisma Client（会先合并 schema）
bun run prisma:generate

# 同步数据库 schema
./scripts/db/prisma/setup.sh --force

# 初始化种子数据（仅核心数据）
bun run seed:minimal

# 启动开发服务器
bun run dev
```

### 环境变量

核心环境变量（参见 `.env.example.local`）：

```bash
# 数据库
DATABASE_PROVIDER=prisma
DATABASE_URL=mysql://root:password@127.0.0.1:3306/generic_admin

# 认证
AUTH_JWT_ACCESS_SECRET=<32+ 字符随机字符串>
AUTH_REFRESH_TOKEN_PEPPER=<32+ 字符随机字符串>

# 初始管理员
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=<强密码>

# 插件开关（默认全部禁用）
PLUGIN_WECHAT=false
PLUGIN_ECOMMERCE=false
PLUGIN_PROMOTION=false
```

启用插件后需要重新运行 `bun run prisma:generate` 以合并插件 schema。

### Prisma Schema 合并

项目使用分文件 Schema 管理，通过合并脚本按插件启用状态动态组装：

```bash
# 手动触发合并（prisma:generate 会自动先执行此步骤）
bun run prisma:merge
```

流程：`prisma/schemas/base.prisma` + 启用的 `plugin-*.prisma` → `prisma/schema.prisma`

## 🌱 种子数据

```bash
# 仅核心数据（角色 + 管理员 + 权限 + 协议 + MFA 设置）
bun run seed:minimal

# 核心数据 + 测试用户和产品
bun run seed:development

# 全部数据（含推广员和佣金测试数据）
bun run seed:full

# 指定模块
bun run seed:minimal -- --modules=roles,admin

# 查看帮助
bun run seed:help
```

详见 [scripts/seed/README.md](scripts/seed/README.md)。

## 📖 文档

- [插件开发指南](docs/plugin-development.md) — 如何创建自定义插件
- [种子数据系统](scripts/seed/README.md) — 数据库种子管理
- [Scripts 目录说明](scripts/README.md) — 脚本工具链

## 📄 License

Private
