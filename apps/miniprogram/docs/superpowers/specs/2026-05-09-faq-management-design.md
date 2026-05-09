# 常见问题后台管理 — 设计文档

> 日期: 2026-05-09
> 状态: 已批准

## 背景

小程序"我的"页面 → "帮助与反馈" → "常见问题"目前硬编码了 4 条 FAQ，没有后台管理界面。需要在后台管理系统中新增一个"常见问题管理"页面，让管理员可以增删改查 FAQ 条目，同时小程序端从 API 动态获取 FAQ 数据。

## 需求确认

- **管理方式**: 列表式管理（独立 FAQ 列表页面，支持增删改查、排序）
- **数据存储**: 新建专用 `MiniProgramFaq` 数据表
- **字段范围**: 增强版 — 标题 + 内容 + 排序 + 启停用开关

## 涉及项目

| 项目 | 路径 | 职责 |
|------|------|------|
| 后台管理 (Next.js) | `/Users/loyd/dev/project/nextjs/next-template` | FAQ 管理页面 + API |
| 小程序 (uni-app) | `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme` | FAQ 展示页改造 |

---

## 1. 数据库设计

新增 `MiniProgramFaq` 表：

```prisma
model MiniProgramFaq {
  id        String   @id @default(uuid())
  question  String                    // 问题标题
  answer    String   @db.Text         // 问题答案（支持多段落）
  sort      Int      @default(0)      // 排序权重，值越小越靠前
  enabled   Boolean  @default(true)   // 是否启用
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 2. 后台管理页面 (Next.js)

### 2.1 路由与导航

- **页面路由**: `/admin/miniprogram/faq`
- **侧边栏**: 在 `miniprogram-sub-sidebar.tsx` 的 `miniprogramNavItems` 中新增 "常见问题管理" 条目
- **权限**: 在 `scope-tree.ts` 中新增 `miniprogram.faq` 权限节点

### 2.2 文件结构

```
src/app/admin/miniprogram/faq/page.tsx                    # 页面组件（Server Component）
src/components/business/admin/miniprogram/faq-list.tsx     # 列表组件（Client Component）
src/contracts/dtos/admin/miniprogram-faq.dto.ts            # Zod DTO 定义
src/app/api/v1/admin/miniprogram/faq/route.ts              # 管理端 API（CRUD）
src/app/api/v1/public/faq/route.ts                         # 公开 API（小程序调用）
```

### 2.3 页面功能

FAQ 列表组件功能：
- 表格/卡片列表展示：问题、状态（启用/禁用）、排序值、创建时间
- 新增 FAQ 条目（弹窗表单）
- 编辑 FAQ 条目（弹窗表单）
- 删除 FAQ 条目（确认弹窗）
- 上移/下移调整排序
- 启用/禁用开关切换
- 使用 React Query 做数据获取和缓存

### 2.4 API 设计

**管理端 API** — `/api/v1/admin/miniprogram/faq`:

| 方法   | 路径                    | 说明           |
|--------|-------------------------|----------------|
| GET    | /api/v1/admin/miniprogram/faq | 获取所有 FAQ（按 sort 排序） |
| POST   | /api/v1/admin/miniprogram/faq | 新增 FAQ 条目 |
| PUT    | /api/v1/admin/miniprogram/faq?id=xxx | 更新指定 FAQ 条目 |
| DELETE | /api/v1/admin/miniprogram/faq?id=xxx | 删除指定 FAQ 条目 |

**公开 API** — `/api/v1/public/faq`:

| 方法 | 路径                  | 说明                           |
|------|-----------------------|--------------------------------|
| GET  | /api/v1/public/faq    | 获取所有启用的 FAQ（按 sort 排序），无需认证 |

### 2.5 DTO 定义

```typescript
// 创建/更新 FAQ
const faqItemSchema = z.object({
  question: z.string().min(1, '问题标题不能为空').max(200),
  answer: z.string().min(1, '问题答案不能为空'),
  sort: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
});

// API 响应
const faqResponseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sort: z.number(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

---

## 3. 小程序端改造

### 3.1 修改文件

- `src/subpackages/about/help-feedback/index.vue`

### 3.2 改造内容

- 将硬编码的 `faqList` 数组改为从公开 API 动态获取
- 添加 loading 状态和空状态处理
- 保留现有的展开/收起动画交互
- 使用现有的 API 请求工具（`src/services/api/`）

---

## 4. 实现顺序

1. **后台数据库** — 新增 Prisma model + 迁移
2. **后台 DTO** — Zod schema 定义
3. **后台管理 API** — CRUD 接口
4. **后台管理页面** — FAQ 列表组件 + 页面
5. **公开 API** — 小程序调用接口
6. **小程序端** — FAQ 页面改造为 API 驱动
7. **侧边栏 + 权限** — 导航和权限配置

---

## 边界与约束

- FAQ 条目数量预计 10-30 条，不会超过 100 条
- FAQ 答案为纯文本（多段落），暂不需要富文本/图片支持
- 管理端需要登录认证，公开 API 无需认证
- 排序通过手动调整，不支持拖拽排序（MVP 阶段）
