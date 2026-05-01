# Generic Admin

基于 Next.js 16+ 的通用后台管理系统，支持插件化架构和六层整洁架构。核心系统提供用户认证、RBAC 权限控制、内容管理、媒体资源等基础能力，业务功能（微信集成、电商、分销推广等）通过插件按需启用。

## ✨ 功能特性

### 核心系统（始终启用）

- **用户认证**：登录 / 注册 / MFA（TOTP）/ Session 管理 / 登录保护
- **RBAC 权限控制**：角色 / 权限 / 访问控制矩阵
- **系统设置**：站点配置 / Feature Flags / 全局开关
- **媒体资源管理**：文件上传 / 多存储后端（本地 / 阿里云 OSS / 腾讯云 COS / AWS S3）
- **审计日志**：操作记录追踪 / IP 访问日志
- **内容管理**：博客文章 / 分类 / 标签 / 浏览量统计
- **公告系统**：公告发布与管理
- **协议管理**：用户协议 / 隐私政策维护
- **数据导出**：CSV 批量导出
- **API 文档**：OpenAPI 3.0 + Swagger UI / Scalar
- **Landing Page**：首页展示（Hero / 特性介绍 / 布局模板）

### 管理后台（admin）

20+ 管理页面，覆盖用户、内容、运营、安全等完整业务场景：

| 模块 | 页面 | 说明 |
|------|------|------|
| 仪表盘 | `/admin` | 数据概览与统计图表 |
| 用户管理 | `/admin/users` | 用户 CRUD / 角色分配 / 状态管理 |
| RBAC 权限 | `/admin/rbac` | 角色 / 权限 / 访问策略 |
| 博客管理 | `/admin/blog` | 文章 CRUD / 分类 / 标签（Tiptap 富文本编辑器） |
| 公告管理 | `/admin/announcements` | 公告发布 / 编辑 / 上下架 |
| Feature Flags | `/admin/feature-flags` | 功能开关管理 |
| 媒体资源 | `/admin/media` | 文件上传 / 图片处理 / 存储管理 |
| 系统配置 | `/admin/site-config` | 站点配置 / 全局参数 |
| 协议管理 | `/admin/agreements` | 用户协议 / 隐私政策 |
| MFA 设置 | `/admin/mfa-settings` | 多因素认证配置 |
| 审计日志 | `/admin/logs` | 操作记录 / 安全审计 |
| 个人设置 | `/admin/profile` | 管理员个人信息 / 密码修改 |
| 商品管理* | `/admin/products` | 商品 CRUD / SKU / 上下架 |
| 订单管理* | `/admin/orders` | 订单列表 / 状态流转 / 退款 |
| 分类管理* | `/admin/categories` | 商品分类树管理 |
| 优惠券* | `/admin/coupons` | 优惠券 CRUD / 兑换码 |
| 推广员管理* | `/admin/affiliate` | 推广员审核 / 佣金结算 |
| 小程序管理* | `/admin/miniprogram` | 微信小程序轮播图 / 配置 |

> *标注页面需启用对应插件后可用

### 用户端

- **文档管理** (`/user/documents`)：用户文件上传 / 版本管理

### 公开页面

- **Landing Page** (`/`)：首页展示（动画效果 + 响应式布局）
- **博客** (`/blog`)：文章列表 / 详情页 / 分类筛选
- **API 文档** (`/docs/swagger`)：Swagger UI 在线文档

### 插件（按需启用）

| 插件 | 环境变量 | 说明 |
|------|---------|------|
| **wechat** | `PLUGIN_WECHAT=true` | 微信生态集成（小程序登录 / 微信支付 / 轮播图） |
| **ecommerce** | `PLUGIN_ECOMMERCE=true` | 电商功能（商品 / 订单 / 分类 / 优惠券 / 支付） |
| **promotion** | `PLUGIN_PROMOTION=true` | 分销推广（推广员 / 佣金 / 结算 / 等级体系） |

## 🛠 技术栈

### 框架与运行时

- **Next.js 16+** (App Router) + **React 19** + **TypeScript 5.9**
- **Tailwind CSS v4** — 原子化样式引擎
- **shadcn/ui** (new-york 风格) + **Radix UI** — 组件库

### 数据层

- **Prisma ORM 7** — 支持 MySQL / PostgreSQL / SQLite，工厂模式多数据库切换
- **Supabase** — 可选数据库提供者（含向量扩展 pgvector 能力）
- **Prisma Schema 合并** — 分文件管理 + 按插件动态组装

### 认证与安全

- **JWT + Refresh Token** — 基于 `jose` 的 Database Persisted Sessions
- **MFA** — TOTP 双因素认证（otplib + QR Code）
- **bcrypt** — 密码哈希
- **Rate Limiting** — 动态配置限流（支持数据库 / 内存降级）
- **IP 白名单** — 访问控制

### 数据展示与交互

- **TanStack Query** — 服务端状态管理
- **TanStack Table** — 数据表格
- **Recharts** — 图表可视化
- **react-hook-form + Zod** — 表单验证
- **react-day-picker** — 日期选择器
- **react-markdown** — Markdown 渲染

### 内容与编辑

- **Tiptap** — 富文本编辑器（扩展：字数统计 / 颜色 / 图片 / 链接 / 下划线）
- **react-markdown** — Markdown 内容渲染
- **gray-matter** — Frontmatter 解析

### 动画与 UI 增强

- **GSAP** — 高性能动画引擎
- **Motion** — React 动画库
- **next-themes** — 主题切换（暗色 / 亮色）
- **sonner** — Toast 通知
- 内置动画组件：SplitText / GlitchText / DecryptedText / BlurText / PixelCard / AnimatedList / ScrollReveal / ClickSpark

### 基础设施

- **Pino** — 结构化日志 + 敏感字段脱敏 + 文件轮转
- **Zod** — Schema 验证（贯穿全栈）
- **@asteasolutions/zod-to-openapi** — API 契约自动生成
- **@t3-oss/env-nextjs** — 环境变量类型安全
- **csv-stringify** — 数据导出
- **date-fns** — 日期处理
- **dompurify + sanitize-html** — HTML 净化

### 文件存储

- 本地文件系统
- **阿里云 OSS** (ali-oss)
- **腾讯云 COS**
- **AWS S3** (@aws-sdk/client-s3)

### 测试与质量

- **Vitest** — 单元测试
- **@testing-library/react** — 组件测试
- **ESLint 9** — 代码规范
- **happy-dom / jsdom** — 测试环境

### 部署

- **Caddy** — 反向代理 + 自动 HTTPS
- **PM2** — 进程管理
- **GitHub Actions** — CI/CD 自动化（构建 / 部署 / 发布）
- **release-cli** — 语义化版本管理

## 🏗️ 架构设计

### 六层架构

本项目采用单向数据流的六层架构：

```
表现层(ui) → 接口层(api) → 契约层(schema) → 业务层(service) → 数据层(repo) → 基础设施层
```

| 层级 | 目录 | 职责 | 核心原则 |
|------|------|------|----------|
| 表现层 | `src/app/`, `components/` | 用户界面渲染和交互 | 默认使用服务端组件，严禁直接访问数据库 |
| 接口层 | `src/app/api/` | HTTP 请求/响应处理 | 统一错误处理、traceId 追踪 |
| 契约层 | `src/contracts/` | API 接口契约定义 | Schema First, Zod 校验 |
| 业务层 | `src/services/` | 纯业务逻辑实现 | 严禁直接导入数据库客户端 |
| 数据层 | `src/repositories/` | 数据访问接口与实现 | 工厂模式支持多数据库 |
| 基础设施层 | `src/lib/` | 第三方 SDK 和工具封装 | 统一配置、日志管理 |

### 插件架构

系统采用 **Core + Plugins** 架构，插件通过以下机制与核心系统集成：

1. **环境变量** (`PLUGIN_*`) 控制插件启用/禁用
2. **注册表** (`src/plugins/registry.ts`) 提供运行时状态查询
3. **路由守卫** (`pluginGuard`) 保护插件专属 API，未启用时返回 404
4. **Schema 合并** 动态注入插件数据模型到 Prisma Schema
5. **种子数据** 按插件状态选择性加载

详见 [插件开发指南](docs/plugin-development.md)。

## 📁 目录结构

```
.
├── docs/                              # 项目文档
│   ├── architecture/                  # 架构设计文档
│   ├── changes/                       # 版本变更日志
│   ├── deploy/                        # 部署指南
│   ├── guides/                        # 功能集成指南
│   ├── plans/                         # 设计方案记录
│   ├── promotion/                     # 推广系统文档
│   └── RELEASE_GUIDE.md              # 发布系统指南
├── prisma/
│   ├── schema.prisma                  # 合并后的最终 schema（自动生成，勿手动编辑）
│   └── schemas/                       # schema 源文件
│       ├── base.prisma                # 核心 schema（User, Role, Session...）
│       ├── plugin-wechat.prisma       # 微信插件模型
│       └── plugin-commerce.prisma     # 电商 + 分销插件模型
├── scripts/
│   ├── prisma/merge-schemas.ts        # Prisma schema 合并脚本
│   ├── seed/                          # 种子数据系统
│   ├── release/                       # 发布自动化脚本
│   ├── security/                      # 安全工具脚本
│   └── flow/                          # 部署流程编排
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # 认证页面（登录）
│   │   ├── (landing)/                 # 公开页面（首页 + 博客）
│   │   ├── admin/                     # 管理后台（20+ 管理页面）
│   │   ├── user/                      # 用户端（文档管理）
│   │   ├── docs/                      # API 文档页面（Swagger UI）
│   │   ├── api/v1/                    # RESTful API 路由
│   │   │   ├── admin/                 # 管理端 API
│   │   │   ├── public/                # 公开端 API
│   │   │   ├── user/                  # 用户端 API
│   │   │   ├── auth/                  # 认证 API
│   │   │   └── _shared/              # 共享路由基础设施（route-handler, auth）
│   │   ├── globals.css                # 全局样式
│   │   └── layout.tsx                 # 根布局
│   ├── components/                    # UI 组件
│   │   ├── ui/                        # shadcn/ui 基础组件
│   │   ├── base/                      # 基础封装组件
│   │   ├── business/                  # 业务组件（admin / landing / blog / user）
│   │   ├── layout/                    # 布局组件
│   │   ├── docs/                      # 文档组件
│   │   ├── context/                   # React Context
│   │   ├── providers/                 # 全局 Provider
│   │   └── *.tsx                      # 动画组件（SplitText, PixelCard 等）
│   ├── config/                        # 配置（环境变量、权限矩阵）
│   ├── contracts/                     # 接口契约层（DTO、API 响应格式）
│   ├── lib/                           # 基础设施（prisma、logger、http、storage、auth）
│   ├── plugins/                       # 插件目录（核心扩展点）
│   │   ├── registry.ts                # 插件注册表（isPluginEnabled / getEnabledPlugins）
│   │   ├── wechat/                    # 微信插件
│   │   ├── ecommerce/                 # 电商插件
│   │   └── promotion/                 # 分销推广插件
│   ├── repositories/                  # 数据访问层（工厂模式，支持多数据库）
│   ├── services/                      # 业务逻辑层
│   │   ├── core/                      # 核心服务（auth, user, mfa, media, log...）
│   │   └── content/                   # 内容服务（blog）
│   ├── middleware/                     # 中间件
│   └── types/                         # TypeScript 类型定义
├── deploy/                            # 部署配置（Caddyfile 等）
├── supabase/                          # Supabase 迁移与配置
├── test/                              # 测试文件
├── public/                            # 静态资源
└── exports/                           # 导出工具
```

## 🚀 快速开始

### 环境要求

- **Node.js** 20+
- **Bun**（推荐）或 npm
- **MySQL / MariaDB**（本地开发默认）
- **Prisma** 7+

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

# MFA
MFA_SECRET_ENCRYPTION_KEY=<openssl rand -base64 32>

# 初始管理员
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=<强密码>

# 插件开关（默认全部禁用）
PLUGIN_WECHAT=false
PLUGIN_ECOMMERCE=false
PLUGIN_PROMOTION=false
```

启用插件后需要重新运行 `bun run prisma:generate` 以合并插件 schema。

### 常用命令

```bash
# 开发
bun run dev                    # 启动开发服务器

# 数据库
bun run prisma:generate        # 合并 schema + 生成 Prisma Client
bun run prisma:merge           # 仅合并 schema

# 种子数据
bun run seed:minimal           # 核心数据（角色 + 管理员 + 权限）
bun run seed:development       # 核心数据 + 测试数据
bun run seed:full              # 全部数据（含推广员和佣金）
bun run seed:help              # 查看帮助

# 测试与质量
bun run test                   # 运行测试
bun run lint                   # 代码规范检查
bun run build                  # 生产构建

# 发布
make release                   # 准备发布（默认 patch）
make release TYPE=minor        # 准备 minor 版本发布
make release VERSION=1.2.3     # 指定明确版本号
make release-sync              # 同步版本记录到数据库
```

也可使用 Makefile：

```bash
make help          # 查看所有可用命令
make dev           # 启动开发
make setup-db      # 数据库初始化
make seed-minimal  # 核心种子数据
make pack          # 生产构建打包
```

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

| 文档 | 说明 |
|------|------|
| [架构设计](docs/architecture/README.md) | 六层架构设计与分层职责 |
| [插件开发指南](docs/plugin-development.md) | 如何创建自定义插件 |
| [部署指南](docs/deploy/README.md) | 服务器部署（Caddy + PM2 + CI/CD） |
| [发布系统指南](docs/RELEASE_GUIDE.md) | 版本发布流程与自动化 |
| [订单系统](docs/architecture/order-system.md) | 订单生命周期与状态流转 |
| [种子数据系统](scripts/seed/README.md) | 数据库种子管理 |
| [Scripts 目录说明](scripts/README.md) | 脚本工具链 |

## 📄 License

Private
