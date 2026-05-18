# 商品创建页面整改 — 参考文章编辑器风格

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将商品创建/编辑从 Dialog 弹窗模式改为独立页面布局，参考文章编辑器的全页面 + 左右分栏风格。

**Architecture:** 参照 `article-editor/` 的组件架构，创建 `product-editor/` 组件族。页面组件持有表单状态与业务逻辑，编辑器组件负责纯 UI 渲染。新增 `/admin/products/create` 和 `/admin/products/[id]/edit` 两个路由页面，替换原有的 Dialog 弹窗模式。

**Tech Stack:** Next.js App Router, React, TanStack Query, Tailwind CSS, shadcn/ui

---

## 参考模式对照

| 概念 | 文章编辑器（参考） | 商品编辑器（目标） |
|------|-------------------|-------------------|
| 创建页面 | `/admin/blog/write/page.tsx` | `/admin/products/create/page.tsx` |
| 编辑页面 | `/admin/blog/[id]/edit/page.tsx` | `/admin/products/[id]/edit/page.tsx` |
| 编辑器包裹 | `article-editor/index.tsx` | `product-editor/index.tsx` |
| 左侧主区域 | `editor-main.tsx` (标题+摘要+富文本) | `product-editor-main.tsx` (名称+摘要+描述) |
| 右侧设置面板 | `editor-settings-panel.tsx` (封面+分类+标签+SEO) | `product-editor-settings-panel.tsx` (封面+类型+类目+定价+库存+媒体+标签+服务保障) |
| 表单状态 | `FormState` + `onFormChange` 回调 | `ProductFormState` + `onFormChange` 回调 |

## 文件结构

### 新建文件
| 文件路径 | 职责 |
|---------|------|
| `apps/backend/src/components/business/admin/product/product-editor/index.tsx` | 编辑器包裹组件，左右分栏 |
| `apps/backend/src/components/business/admin/product/product-editor/product-editor-main.tsx` | 左侧主编辑区 (名称、摘要、详细描述) |
| `apps/backend/src/components/business/admin/product/product-editor/product-editor-settings-panel.tsx` | 右侧设置面板 (所有配置项) |
| `apps/backend/src/components/business/admin/product/product-editor/types.ts` | 共享类型定义 (ProductFormState, initialProductFormState) |
| `apps/backend/src/app/admin/products/create/page.tsx` | 创建商品独立页面 |
| `apps/backend/src/app/admin/products/[id]/edit/page.tsx` | 编辑商品独立页面 |

### 修改文件
| 文件路径 | 变更内容 |
|---------|---------|
| `apps/backend/src/app/admin/products/admin-products-client.tsx` | "添加商品"按钮改为 `router.push('/admin/products/create')`；列表项操作改为 `router.push('/admin/products/[id]/edit')`；移除 AdminProductForm Dialog 引用 |

### 可选清理 (后续任务)
| 文件路径 | 变更内容 |
|---------|---------|
| `apps/backend/src/components/business/admin/product/admin-product-form.tsx` | 确认新页面正常后可删除或标记为 deprecated |

---

## Task 1: 创建共享类型定义

**Files:**
- Create: `apps/backend/src/components/business/admin/product/product-editor/types.ts`

- [ ] **Step 1: 创建类型文件**

创建 `types.ts`，定义 `ProductFormState` 类型（包含商品编辑器所有字段）和 `initialProductFormState` 初始值常量。

字段列表（从现有 admin-product-form.tsx 的 useState 中提取）:
```typescript
export type ProductFormState = {
  name: string
  summary: string
  description: string
  kind: AdminProductKind
  priceAmount: string
  originalPriceAmount: string
  stockQuantity: number | null
  isFeatured: boolean
  tags: string[]
  serviceGuarantees: string[]
  categoryIds: string[]
  coverAssetId: string
  coverUrl: string
  mediaAssetIds: string[]
  newMediaAssetIds: string[]
  newMediaUrlList: string[]
  deletedApiMediaIndices: Set<number>
  productStatus: string | null
}

export const initialProductFormState: ProductFormState = {
  name: '',
  summary: '',
  description: '',
  kind: 'course',
  priceAmount: '',
  originalPriceAmount: '',
  stockQuantity: null,
  isFeatured: false,
  tags: [],
  serviceGuarantees: ['正品保障'],
  categoryIds: [],
  coverAssetId: '',
  coverUrl: '',
  mediaAssetIds: [],
  newMediaAssetIds: [],
  newMediaUrlList: [],
  deletedApiMediaIndices: new Set(),
  productStatus: null,
}
```

- [ ] **Step 2: 验证类型导入**

确保 `AdminProductKind` 等类型可从 `@/plugins/ecommerce/contracts/admin-products.dto` 正确导入。

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20`

---

## Task 2: 创建左侧主编辑区组件

**Files:**
- Create: `apps/backend/src/components/business/admin/product/product-editor/product-editor-main.tsx`

- [ ] **Step 1: 创建 ProductEditorMain 组件**

参考 `editor-main.tsx` 的风格，创建商品编辑器左侧区域：

布局结构（参考文章编辑器左侧）:
```
div.flex-1.flex.flex-col.p-7.space-y-4.overflow-auto
├── Input (商品名称) — borderless, text-2xl font-semibold, 自动聚焦
├── Separator
├── Textarea (营销摘要) — borderless, text-sm text-muted-foreground, 2 行
├── Separator
├── div.flex-1.min-h-0
    └── RichTextEditor (详细描述)
```

Props 接口:
```typescript
interface ProductEditorMainProps {
  form: ProductFormState
  onFormChange: (updates: Partial<ProductFormState>) => void
  viewing?: boolean
}
```

注意：此组件只负责纯 UI 渲染，不含业务逻辑。输入变化通过 `onFormChange` 回调传递。

---

## Task 3: 创建右侧设置面板组件

**Files:**
- Create: `apps/backend/src/components/business/admin/product/product-editor/product-editor-settings-panel.tsx`

- [ ] **Step 1: 创建 ProductEditorSettingsPanel 组件**

参考 `editor-settings-panel.tsx` 的风格，创建商品设置面板。

面板宽度：`w-[360px] shrink-0 border-l p-6 overflow-auto space-y-6`

内容区块（从上到下，用 `<Separator />` 分隔）:

1. **封面图** — 与文章编辑器相同模式：MaterialPicker + 预览 + 删除按钮
2. **商品类型** — Select (course/certificate)
3. **所属类目** — Popover 多选（复用现有分类选择逻辑）
4. **定价与库存** — 销售价 + 划线价 + 库存数量
5. **搜索标签** — 标签添加/删除
6. **服务保障** — 选项按钮组 (正品保障/7天无理由/极速退款/假一赔四)
7. **精选推荐** — Switch toggle
8. **轮播图集** — 缩略图网格 + MaterialPicker
9. **商品状态** — Badge 展示

Props 接口:
```typescript
interface ProductEditorSettingsPanelProps {
  form: ProductFormState
  onFormChange: (updates: Partial<ProductFormState>) => void
  categories: AdminCategory[]
  categoriesLoading: boolean
  viewing?: boolean
  // AI 功能回调（可选）
  onAiFieldGenerate?: (field: string) => void
  isAiTextEnabled?: boolean
  isAiPricingEnabled?: boolean
}
```

关键实现细节:
- 分类选择逻辑从现有 admin-product-form.tsx 的 Popover 部分迁移
- 定价部分保留 `¥` 前缀 + font-mono 风格
- 媒体管理复用 MaterialPicker
- 零价格警告在此组件内处理

---

## Task 4: 创建编辑器包裹组件

**Files:**
- Create: `apps/backend/src/components/business/admin/product/product-editor/index.tsx`

- [ ] **Step 1: 创建 ProductEditor 组件**

参考 `article-editor/index.tsx`:

```tsx
export function ProductEditor({ form, onFormChange, ...props }: ProductEditorProps) {
  return (
    <div className="flex h-full">
      <ProductEditorMain form={form} onFormChange={onFormChange} viewing={props.viewing} />
      <ProductEditorSettingsPanel form={form} onFormChange={onFormChange} {...panelProps} />
    </div>
  )
}
```

导出所有子组件和类型，供页面组件使用。

---

## Task 5: 创建商品创建页面

**Files:**
- Create: `apps/backend/src/app/admin/products/create/page.tsx`

- [ ] **Step 1: 创建目录和页面**

参考 `/admin/blog/write/page.tsx` 的完整结构。

页面结构:
```
div.flex.h-full.flex-col
├── div.flex.h-[60px].shrink-0.items-center.justify-between.border-b.bg-white.px-7
│   ├── h2 "创建商品"
│   └── div.flex.items-center.gap-2
│       ├── Button (返回) — ArrowLeft + "返回"
│       ├── Button (保存草稿) — Save + "保存草稿"
│       └── Button (发布) — SendHorizontal + "立即发布"
└── div.flex-1.overflow-hidden
    └── ProductEditor
```

迁移要点:
- 从 `admin-products-client.tsx` 的 "添加商品" 按钮逻辑迁移 mutation
- 从 `admin-product-form.tsx` 的 `saveProductMutation` 迁移创建逻辑
- 保留 Zod 验证（`AdminCreateProductRequestSchema`）
- 保留零价格二次确认 Dialog
- 保留草稿自动保存（localStorage）
- 创建成功后跳转到 `/admin/products/${product.id}/edit`

---

## Task 6: 创建商品编辑页面

**Files:**
- Create: `apps/backend/src/app/admin/products/[id]/edit/page.tsx`

- [ ] **Step 1: 创建编辑页面**

参考 `/admin/blog/[id]/edit/page.tsx` 的完整结构。

与创建页面的区别:
- 使用 `useParams<{ id: string }>()` 获取商品 ID
- 使用 `useQuery` 加载商品详情，加载完成后填充表单
- 使用 PATCH 请求更新（而非 POST 创建）
- 支持加载中状态（Loader2 spinner）
- 使用 `isInitialized` 标记避免重复初始化
- 删除按钮（仅编辑模式显示，在底部操作栏或设置面板中）

顶部标题改为 "编辑商品"，添加商品 ID 显示。

---

## Task 7: 更新商品列表页导航

**Files:**
- Modify: `apps/backend/src/app/admin/products/admin-products-client.tsx`

- [ ] **Step 1: 修改添加按钮为路由跳转**

将 "添加商品" 按钮的 `onClick` 从打开 Dialog 改为:
```tsx
onClick={() => router.push('/admin/products/create')}
```

- [ ] **Step 2: 修改列表项操作为路由跳转**

将 `AdminProductList` 的 `onSelect` 和 `onView` 回调改为路由跳转:
```tsx
onSelect={(productId) => router.push(`/admin/products/${productId}/edit`)}
onView={(productId) => router.push(`/admin/products/${productId}/edit`)}
```

- [ ] **Step 3: 移除 Dialog 相关代码**

- 移除 `activeProductId`、`mode` 等 Dialog 控制状态
- 移除 `<AdminProductForm>` 组件引用
- 移除 `import { AdminProductForm }` 语句
- 保留列表页的搜索、筛选、分页等功能不变

---

## Task 8: AI 功能迁移

**Description:** 将 admin-product-form.tsx 中的 AI 功能（一键生成、单字段生成、历史记录、预览采纳）迁移到新的页面组件中。

**Files:**
- Modify: `apps/backend/src/app/admin/products/create/page.tsx`
- Modify: `apps/backend/src/app/admin/products/[id]/edit/page.tsx`

- [ ] **Step 1: 迁移 AI 一键生成**

将 `handleAiGenerate`、`processAiStream`、`extractJsonFromContent` 函数迁移到页面组件中。AI 生成对话框 (Dialog) 保留在页面层级。

- [ ] **Step 2: 迁移单字段 AI 生成**

将 `handleAiFieldGenerate`、`adoptAiPreview` 迁移到页面组件，通过 props 传递给 ProductEditorSettingsPanel。

- [ ] **Step 3: 迁移 AI 历史记录**

将 `useAiGenerationHistory` hook 的使用迁移到页面组件中，AI 历史对话框保留在页面层级。

---

## Task 9: 验证与清理

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `cd apps/backend && npx tsc --noEmit --pretty`

- [ ] **Step 2: 运行 lint 检查**

Run: `cd apps/backend && npx next lint --dir src/app/admin/products --dir src/components/business/admin/product`

- [ ] **Step 3: 浏览器验证**

手动验证:
1. 从商品列表点击 "添加商品" → 跳转到创建页面
2. 创建页面布局：左侧编辑区 + 右侧设置面板
3. 填写表单 → 保存草稿/发布
4. 从列表点击商品 → 跳转到编辑页面
5. 编辑页面加载已有数据
6. AI 功能正常工作（如果启用）
7. 返回按钮回到列表

- [ ] **Step 4: 标记旧组件为 deprecated（可选）**

在 `admin-product-form.tsx` 顶部添加 `@deprecated` 注释，指向新组件。确认一切正常后可在后续 PR 中删除。

---

## 注意事项

1. **保留所有现有功能** — AI 生成、草稿自动保存、零价格确认、素材选择器等功能必须完整迁移
2. **类型安全** — 使用 Zod schema 验证，不引入 `any`
3. **设计规范** — 遵循 `ai-frontend-design-rules.md` 中的色彩、字体、间距规范
4. **分类查询复用** — categories 查询在页面组件中发起，通过 props 传递给设置面板
5. **媒体管理** — 轮播图集的添加/删除逻辑迁移到页面组件中，通过 onFormChange 更新状态
