# 🌱 Seed System 使用指南

## 概述

Seed System 提供了一个统一、模块化的数据库种子管理方案。采用**自声明 + 自动发现 + 依赖图**架构：新增 seed 模块只需创建 1 个文件，无需修改其他配置。

## 目录结构

```
scripts/seed/
├── index.mjs              # 统一入口脚本（编排器）
├── config.mjs             # 执行模式配置（filter 函数）
├── lib/
│   ├── env.mjs            # 统一环境变量加载
│   ├── db.mjs             # 数据库连接封装
│   ├── logger.mjs         # 简单日志工具
│   ├── discovery.mjs      # 自动发现引擎（扫描模块目录）
│   ├── dependency-graph.mjs # 依赖图解析（Kahn 拓扑排序）
│   └── seed-context.mjs   # 上下文管理（状态追踪 + 结果传递）
└── modules/               # 按功能模块组织的 seed
    ├── core/              # 【核心】必须执行的 seed
    │   ├── roles.mjs
    │   ├── admin.mjs
    │   ├── permissions.mjs
    │   ├── promoter-levels.mjs
    │   ├── agreements.mjs
    │   ├── plugin-states.mjs
    │   └── mfa-settings.mjs
    └── optional/          # 【可选】根据场景选择
        ├── test-users.mjs
        ├── test-products.mjs
        ├── test-promoter-data.mjs
        ├── test-commission-data.mjs
        └── test-blog.mjs
```

## 执行模式

| 模式 | 说明 | 包含的模块 |
|------|------|-----------|
| `minimal` | 仅核心数据 | 7 个 core 模块 |
| `development` | 核心数据 + 基础测试数据 | core + test-users, test-products |
| `full` | 所有数据（包含全部测试数据） | 全部 12 个模块 |

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

# 列出所有可用模块
node scripts/seed/index.mjs --list

# 指定特定模块执行（依赖自动解析）
node scripts/seed/index.mjs --modules=test-commission-data --verbose

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

## 扩展指南

### 添加新的 Seed 模块（零配置）

只需在 `scripts/seed/modules/core/` 或 `modules/optional/` 下创建一个 `.mjs` 文件：

```javascript
// scripts/seed/modules/core/system-settings.mjs

// 1. 声明模块元信息（自动被发现）
export const meta = {
  id: 'system-settings',
  name: '系统设置',
  description: '初始化系统默认设置',
  type: 'core',               // 'core' 或 'optional'
  category: 'config',
  dependsOn: [],               // 声明依赖的模块 ID
  plugin: null,                // 依赖的插件名（null 表示无插件依赖）
}

// 2. 导出默认函数，签名为 (db, logger, ctx)
export default async function seedSystemSettings(db, logger, ctx) {
  logger.info('开始初始化系统设置...')

  // 如需获取依赖模块的结果：
  // const rolesMap = ctx.getResult('roles')

  // 你的 seed 逻辑

  logger.success('系统设置初始化完成')
  return { /* 返回值会通过 ctx.setResult 传递给依赖此模块的模块 */ }
}
```

**就这样！无需修改 config.mjs、index.mjs 或任何其他文件。** discovery 会自动发现新模块，dependency-graph 会根据 `dependsOn` 自动排序。

### ctx（SeedContext）API

| 方法 | 说明 |
|------|------|
| `ctx.db` | Prisma 数据库客户端 |
| `ctx.logger` | 日志记录器 |
| `ctx.options` | 运行选项（dryRun、verbose 等） |
| `ctx.getResult(id)` | 获取依赖模块的返回值（状态检查） |
| `ctx.setState(id, state)` | 设置模块状态 |
| `ctx.getState(id)` | 获取模块状态 |

### 依赖声明

通过 `meta.dependsOn` 数组声明依赖，引用的是其他模块的 `meta.id`：

```javascript
// admin 模块依赖 roles 模块的结果
export const meta = {
  id: 'admin',
  // ...
  dependsOn: ['roles'],
}

// 在函数中使用 ctx.getResult('roles') 获取结果
export default async function seedAdmin(db, logger, ctx) {
  const rolesMap = ctx.getResult('roles')
  // ...
}
```

依赖图会自动进行拓扑排序，确保 `roles` 在 `admin` 之前执行。

### 插件关联

通过 `meta.plugin` 声明模块依赖的插件，当插件未启用时自动跳过：

```javascript
export const meta = {
  id: 'test-products',
  // ...
  plugin: 'ecommerce',  // 当 PLUGIN_ECOMMERCE != true 时自动跳过
}
```

## 部署集成

### 自动执行 Seed

在当前部署流程中：

- 当你选择重置数据库（`_DB_RESET=y`）时，会执行 `node scripts/seed/index.mjs --mode=minimal`
- 当你不重置数据库（`_DB_RESET=n`）时，会执行 `./scripts/db/prisma/setup.sh --force` 同步 schema，不会自动执行 seed

## 故障排除

### 常见问题

1. **环境变量未加载**
   - 确保 `.env` 或 `.env.{NODE_ENV}` 文件存在
   - 检查环境变量名称是否正确

2. **数据库连接失败**
   - 检查 `DATABASE_URL` 是否正确
   - 确保数据库服务正在运行

3. **模块未找到**
   - 检查 `meta.id` 是否拼写正确
   - 确认文件在 `modules/core/` 或 `modules/optional/` 目录下

4. **循环依赖错误**
   - 检查 `dependsOn` 声明是否形成环：`A → B → C → A`
   - 错误信息会包含完整的循环路径

5. **缺失依赖错误**
   - 检查 `dependsOn` 引用的模块 ID 是否存在
   - 错误信息会列出所有可用模块

6. **依赖未执行错误**
   - 检查执行模式是否包含所需依赖（如 `--modules=admin` 需要 `roles`）
   - 使用 `--verbose` 查看自动解析的依赖

### 调试模式

使用 `--verbose` 参数查看详细日志：

```bash
node scripts/seed/index.mjs --mode=minimal --verbose
```

使用 `--dry-run` 参数进行试运行（不修改数据库）：

```bash
node scripts/seed/index.mjs --mode=minimal --dry-run
```

查看所有可用模块及其依赖：

```bash
node scripts/seed/index.mjs --list
```
