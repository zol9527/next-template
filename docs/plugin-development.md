# 插件开发指南

本文档说明如何为 Generic Admin 开发自定义插件。插件可以扩展后台管理系统的功能，包括数据模型、API 路由、业务逻辑和仪表盘组件。

## 目录

- [架构概览](#架构概览)
- [插件目录结构](#插件目录结构)
- [插件注册流程](#插件注册流程)
- [环境变量控制](#环境变量控制)
- [API 路由守卫](#api-路由守卫-pluginguard)
- [Dashboard Widget 注册](#dashboard-widget-注册)
- [Prisma Schema 扩展](#prisma-schema-扩展)
- [种子数据集成](#种子数据集成)
- [完整示例：创建通知插件](#完整示例创建通知插件)

---

## 架构概览

Generic Admin 采用 **Core + Plugins** 架构：

```
src/
├── app/            # 核心路由 + 插件路由共存
├── plugins/        # 插件目录
│   ├── registry.ts # 插件注册表（环境变量 → 启用状态）
│   ├── wechat/     # 官方插件：微信生态
│   ├── ecommerce/  # 官方插件：电商
│   └── promotion/  # 官方插件：分销推广
├── services/       # 核心业务逻辑 + 插件服务
├── repositories/   # 核心数据访问 + 插件仓库
└── contracts/      # 核心契约 + 插件契约
```

插件通过以下机制与核心系统集成：

1. **环境变量** (`PLUGIN_*`) 控制插件启用/禁用
2. **注册表** (`src/plugins/registry.ts`) 提供运行时状态查询
3. **路由守卫** (`pluginGuard`) 保护插件专属 API
4. **Schema 合并** 动态注入插件数据模型
5. **种子数据** 按插件状态选择性加载

---

## 插件目录结构

每个插件应遵循以下目录结构：

```
src/plugins/<plugin-name>/
├── index.ts              # 插件注册入口（必须）
├── contracts/            # DTO 和 Zod Schema
│   ├── product.dto.ts    # 数据传输对象
│   └── order.schema.ts   # 请求/响应验证
├── services/             # 业务逻辑
│   └── product.service.ts
└── repositories/         # 数据访问
    └── product.repository.ts
```

### index.ts 规范

插件入口文件导出一个包含 `name`、`version` 和 `init()` 方法的对象：

```typescript
// src/plugins/<plugin-name>/index.ts
import type { DashboardWidget } from '@/services/core/dashboard-widget.interface';

export const myPlugin = {
  name: 'my-plugin',     // 插件唯一标识（与环境变量后缀对应）
  version: '1.0.0',

  /**
   * 插件初始化入口
   * @param context - 注册回调
   * @param context.registerServices - 注册服务到全局服务表
   * @param context.registerDashboardWidgets - 注册仪表盘组件
   */
  init(context: {
    registerServices: (s: Record<string, unknown>) => void;
    registerDashboardWidgets: (w: DashboardWidget[]) => void;
  }) {
    // 注册插件服务和组件
  },
};
```

---

## 插件注册流程

### 1. 在 registry.ts 中添加环境变量映射

编辑 `src/plugins/registry.ts`：

```typescript
export function isPluginEnabled(pluginName: string): boolean {
  const envMap: Record<string, string> = {
    wechat: 'PLUGIN_WECHAT',
    ecommerce: 'PLUGIN_ECOMMERCE',
    promotion: 'PLUGIN_PROMOTION',
    // 添加新插件：
    'my-plugin': 'PLUGIN_MY_PLUGIN',
  };
  const envKey = envMap[pluginName];
  return envKey ? process.env[envKey] === 'true' : false;
}

export function getEnabledPlugins(): Record<string, boolean> {
  return {
    wechat: isPluginEnabled('wechat'),
    ecommerce: isPluginEnabled('ecommerce'),
    promotion: isPluginEnabled('promotion'),
    // 添加新插件：
    'my-plugin': isPluginEnabled('my-plugin'),
  };
}
```

### 2. 添加环境变量

在 `.env.example.local` 中添加：

```bash
# --- 插件开关 ---
PLUGIN_MY_PLUGIN=false
```

### 3. 在 .env 中启用插件

```bash
PLUGIN_MY_PLUGIN=true
```

---

## 环境变量控制

插件的启用/禁用完全由环境变量控制：

- 环境变量名格式：`PLUGIN_<UPPER_CASE_NAME>`
- 值为 `"true"` 时启用，其余值均视为禁用
- ⚠️ 此函数只能在 Server Components / Route Handlers / Server Actions 中使用
- Client Components 需要通过 Server Component 的 props 接收 `enabledPlugins` 对象

```typescript
// ✅ Server Component 中使用
import { isPluginEnabled, getEnabledPlugins } from '@/plugins/registry';

// 检查单个插件
if (isPluginEnabled('my-plugin')) {
  // 执行插件逻辑
}

// 获取所有插件状态（传递给 Client Component）
const enabledPlugins = getEnabledPlugins();
return <MyClientComponent enabledPlugins={enabledPlugins} />;
```

```typescript
// ✅ Client Component 中通过 props 接收
'use client';
interface Props {
  enabledPlugins: Record<string, boolean>;
}

export function MyClientComponent({ enabledPlugins }: Props) {
  if (enabledPlugins['my-plugin']) {
    return <PluginUI />;
  }
  return null;
}
```

---

## API 路由守卫 (pluginGuard)

插件专属的 API 路由应使用 `pluginGuard` 参数保护。当插件未启用时，请求会返回 404。

### 使用方法

```typescript
// src/app/api/v1/admin/my-resource/route.ts
import { withV1Route } from '@/app/api/v1/_shared/route-handler';

export const GET = withV1Route({
  pluginGuard: 'my-plugin',  // 插件未启用时返回 404
  requireAccess: { action: 'read', scope: 'my-resource' },
  handler: async (ctx) => {
    // 业务逻辑
    return createJsonApiResponse(ctx.req, { data: [] });
  },
});
```

### 工作原理

`withV1Route` 内部在认证之前执行插件守卫检查：

```typescript
// route-handler.ts 内部逻辑
if (params.pluginGuard) {
  const { isPluginEnabled } = await import('@/plugins/registry');
  if (!isPluginEnabled(params.pluginGuard)) {
    return createJsonApiResponse(req, fail('NOT_FOUND', '请求的资源不存在'), { status: 404 });
  }
}
```

---

## Dashboard Widget 注册

插件可以注册仪表盘组件来展示统计数据。

### DashboardWidget 接口

```typescript
// src/services/core/dashboard-widget.interface.ts
interface DashboardWidget {
  id: string;           // 唯一标识
  name: string;         // 显示名称
  fetchData(): Promise<Record<string, any>>;  // 获取数据的方法
}
```

### 注册方式

在插件的 `init()` 方法中注册：

```typescript
export const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  init(context) {
    context.registerDashboardWidgets([
      {
        id: 'my-plugin-orders-today',
        name: '今日订单',
        fetchData: async () => {
          // 调用服务层获取统计数据
          return { count: 42, amount: 9999 };
        },
      },
    ]);
  },
};
```

---

## Prisma Schema 扩展

插件可以定义自己的数据模型，并通过合并脚本动态注入到最终 schema 中。

### 1. 创建插件 Schema 文件

在 `prisma/schemas/` 目录下创建 `plugin-<name>.prisma`：

```prisma
// prisma/schemas/plugin-my-plugin.prisma
// 环境: PLUGIN_MY_PLUGIN=true 时由合并脚本追加

model Notification {
  id        String   @id @default(uuid())
  title     String
  content   String
  type      String   @default("info")
  userId    String   @map("user_id")
  readAt    DateTime? @map("read_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
```

### 2. 扩展现有模型（relation 注入）

如果需要向核心模型（如 `User`）添加 relation 字段，使用占位标记：

```prisma
// 在 plugin-<name>.prisma 中

// 声明要注入到 User 模型的字段
// {{PLUGIN_MODEL_INJECTIONS:User:my-plugin}}
notifications Notification[]
```

核心模型 `base.prisma` 中需要对应占位注释：

```prisma
// base.prisma 中的 User 模型
model User {
  id       String @id @default(uuid())
  // ...其他字段...

  // 插件 relation 占位（合并脚本会在此处注入插件字段）
  // {{PLUGIN_MODEL_INJECTIONS:User}}
}
```

### 3. 注册合并配置

编辑 `scripts/prisma/merge-schemas.ts` 中的 `PLUGINS` 数组：

```typescript
const PLUGINS = [
  // ...现有插件
  {
    name: "my-plugin",
    file: "plugin-my-plugin.prisma",
    envKey: "PLUGIN_MY_PLUGIN",
    envKeyAlt: null,
  },
] as const;
```

### 4. 重新生成 Prisma Client

```bash
# 合并 schema + 生成 Client
bun run prisma:generate
```

### 合并流程

```
base.prisma + plugin-*.prisma (仅启用的) → schema.prisma
```

合并脚本会：
1. 读取 `base.prisma` 作为基础
2. 根据环境变量追加启用的插件模型定义
3. 在 base 模型的占位标记处注入插件声明的 relation 字段
4. 输出到 `prisma/schema.prisma`

---

## 种子数据集成

插件可以注册自己的种子数据模块，仅在插件启用时执行。

### 1. 创建种子模块

在 `scripts/seed/modules/` 下创建种子文件：

```javascript
// scripts/seed/modules/optional/08-notifications.mjs

/**
 * Optional Seed Module: notifications
 * 创建通知测试数据
 */
export default async function seedNotifications(db, logger) {
  logger.info('开始创建通知测试数据...');

  // 创建通知...

  logger.success('通知测试数据创建完成');
}
```

### 2. 注册到配置

在 `scripts/seed/config.mjs` 中注册：

```javascript
export const OPTIONAL_MODULES = [
  // ...现有模块
  {
    id: 'test-notifications',
    name: '通知测试数据',
    file: '08-notifications.mjs',
    description: '创建通知测试数据',
    category: 'test-data',
    plugin: 'my-plugin',  // 关联的插件名
  },
];
```

### 3. 在执行模式中添加

根据需要将模块添加到 `development` 或 `full` 模式：

```javascript
export const EXECUTION_MODES = {
  // ...
  full: {
    modules: [
      // ...现有模块
      'test-notifications',
    ],
  },
};
```

---

## 完整示例：创建通知插件

以下是从零创建一个简单通知插件的完整步骤。

### Step 1: 创建插件目录和入口

```typescript
// src/plugins/notification/index.ts
import type { DashboardWidget } from '@/services/core/dashboard-widget.interface';

export const notificationPlugin = {
  name: 'notification',
  version: '1.0.0',
  init(context: {
    registerServices: (s: Record<string, unknown>) => void;
    registerDashboardWidgets: (w: DashboardWidget[]) => void;
  }) {
    context.registerDashboardWidgets([
      {
        id: 'notification-unread-count',
        name: '未读通知',
        fetchData: async () => ({ count: 0 }),
      },
    ]);
  },
};
```

### Step 2: 注册到 registry.ts

```typescript
// src/plugins/registry.ts — 添加到 envMap
notification: 'PLUGIN_NOTIFICATION',

// getEnabledPlugins 中添加
notification: isPluginEnabled('notification'),
```

### Step 3: 添加环境变量

```bash
# .env.example.local
PLUGIN_NOTIFICATION=false
```

### Step 4: 创建 Prisma Schema

```prisma
// prisma/schemas/plugin-notification.prisma
model Notification {
  id        String    @id @default(uuid())
  title     String
  content   String
  type      String    @default("info")
  userId    String    @map("user_id")
  readAt    DateTime? @map("read_at")
  createdAt DateTime  @default(now()) @map("created_at")

  // {{PLUGIN_MODEL_INJECTIONS:User:notification}}
  // user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
```

### Step 5: 注册合并配置

```typescript
// scripts/prisma/merge-schemas.ts — 添加到 PLUGINS
{
  name: "notification",
  file: "plugin-notification.prisma",
  envKey: "PLUGIN_NOTIFICATION",
  envKeyAlt: null,
},
```

### Step 6: 创建 API 路由

```typescript
// src/app/api/v1/admin/notifications/route.ts
import { withV1Route } from '@/app/api/v1/_shared/route-handler';
import { createJsonApiResponse } from '@/lib/http/response';

export const GET = withV1Route({
  pluginGuard: 'notification',
  requireAccess: { action: 'read', scope: 'notifications' },
  handler: async (ctx) => {
    // 查询通知列表...
    return createJsonApiResponse(ctx.req, { data: [] });
  },
});
```

### Step 7: 重新生成 Prisma Client

```bash
PLUGIN_NOTIFICATION=true bun run prisma:generate
```

### Step 8: 验证

1. 设置 `PLUGIN_NOTIFICATION=true`
2. 运行 `bun run prisma:generate`（确认 schema 合并正确）
3. 启动开发服务器 `bun run dev`
4. 访问插件 API 确认守卫生效
5. 设置 `PLUGIN_NOTIFICATION=false`，确认 API 返回 404

---

## 注意事项

1. **Schema 循环依赖**: 如果两个插件之间存在 Prisma relation 循环引用，需要将它们合并在同一个 `plugin-*.prisma` 文件中（参见 `plugin-commerce.prisma` 的电商 + 分销合并）
2. **环境变量大小写**: 环境变量名全大写，插件名使用 kebab-case
3. **Server-only**: `isPluginEnabled` 和 `getEnabledPlugins` 只能在服务端使用，不能在 Client Component 中直接调用
4. **Schema 合并顺序**: 合并脚本按 `PLUGINS` 数组顺序执行，确保有依赖关系的插件按正确顺序排列
5. **种子数据安全**: 生产环境只允许执行 `--mode=minimal`，optional 模块会被安全拦截
