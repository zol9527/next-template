# 🌱 Seed System 使用指南

## 概述

新的 Seed System 提供了一个统一、模块化的数据库种子管理方案，替代了之前分散的 18 个独立脚本。

## 目录结构

```
scripts/seed/
├── index.mjs              # 统一入口脚本
├── config.mjs             # 种子配置（定义类别）
├── lib/
│   ├── env.mjs            # 统一环境变量加载
│   ├── db.mjs             # 数据库连接封装
│   └── logger.mjs         # 简单日志工具
└── modules/               # 按功能模块组织的 seed
    ├── core/              # 【核心】必须执行的 seed
    │   ├── 01-roles.mjs
    │   ├── 02-admin.mjs
  │   ├── 03-permissions.mjs
  │   └── 04-promoter-levels.mjs
    └── optional/          # 【可选】根据场景选择
        ├── 02-test-users.mjs
        ├── 03-test-products.mjs
        ├── 04-test-promoter-data.mjs
    └── 05-test-commission-data.mjs
```

## 执行模式

| 模式 | 说明 | 包含的模块 |
|------|------|-----------|
| `minimal` | 仅核心数据（roles + admin + permissions + promoter-levels）| roles, admin, permissions, promoter-levels |
| `development` | 核心数据 + 基础测试数据 | + test-users, test-products |
| `full` | 所有数据（包含全部测试数据）| + test-promoter-data, test-commission-data |

## 使用方式

### 1. 使用 npm 脚本（推荐）

```bash
# 执行 minimal seed（生产环境部署）
npm run seed:minimal

# 执行 development seed（本地开发）
npm run seed:development

# 执行 full seed（完整测试环境）
npm run seed:full

# 查看帮助
npm run seed:help
```

### 2. 直接使用 node 运行

```bash
# 执行 minimal 模式
node scripts/seed/index.mjs --mode=minimal

# 执行 development 模式
node scripts/seed/index.mjs --mode=development

# 执行 full 模式
node scripts/seed/index.mjs --mode=full

# 指定特定模块执行
node scripts/seed/index.mjs --modules=roles,admin,permissions

# 试运行模式（不实际修改数据库）
node scripts/seed/index.mjs --mode=minimal --dry-run

# 详细输出
node scripts/seed/index.mjs --mode=minimal --verbose
```

### 3. 使用 Makefile

```bash
# 本地执行 minimal seed
make seed-minimal

# 本地执行 development seed
make seed-development

# 本地执行 full seed
make seed-full

# 在远程服务器执行 seed（部署后自动执行）
make seed-remote

# 使用自定义 mode
make seed-remote SEED_MODE=development
```

## 部署集成

### 自动执行 Seed

在当前部署流程中：

- 当你选择重置数据库（`_DB_RESET=y`）时，会执行 `node scripts/seed/index.mjs --mode=minimal`
- 当你不重置数据库（`_DB_RESET=n`）时，会执行 `./scripts/db/prisma/setup.sh --force` 同步 schema，不会自动执行 seed

## 迁移指南

### 旧脚本 vs 新系统

| 旧脚本 | 新命令 |
|--------|--------|
| `npm run seed:prisma:all` | `npm run seed:full` |
| `npm run seed:prisma:admin` | 使用 `--modules=admin` 或包含在 minimal 中 |
| `npm run seed:prisma:permissions` | 使用 `--modules=permissions` 或包含在 minimal 中 |
| `npm run seed:prisma:test-products` | 使用 `npm run seed:development` 或 `--modules=test-products` |

## 扩展指南

### 添加新的 Seed 模块

1. 在 `scripts/seed/modules/` 下创建新的 `.mjs` 文件
2. 导出默认函数：`export default async function seedModule(db, logger) { ... }`
3. 在 `scripts/seed/config.mjs` 中注册模块

### 示例：添加新的 Core 模块

```javascript
// scripts/seed/modules/core/04-system-settings.mjs
export default async function seedSystemSettings(db, logger) {
  logger.info('开始初始化系统设置...')

  // 你的 seed 逻辑

  logger.success('系统设置初始化完成')
}
```

然后在 `config.mjs` 中注册：

```javascript
export const CORE_MODULES = [
  // ... 现有模块
  {
    id: 'system-settings',
    name: '系统设置',
    file: '04-system-settings.mjs',
    description: '初始化系统默认设置',
  },
]
```

## 故障排除

### 常见问题

1. **环境变量未加载**
  - 确保 `.env` 或 `.env.{NODE_ENV}` 文件存在
   - 检查环境变量名称是否正确

2. **数据库连接失败**
   - 检查 `DATABASE_URL` 是否正确
   - 确保数据库服务正在运行

3. **模块未找到**
   - 检查模块 ID 是否拼写正确
   - 确认模块已在 `config.mjs` 中注册

### 调试模式

使用 `--verbose` 参数查看详细日志：

```bash
node scripts/seed/index.mjs --mode=minimal --verbose
```

使用 `--dry-run` 参数进行试运行（不修改数据库）：

```bash
node scripts/seed/index.mjs --mode=minimal --dry-run
```
