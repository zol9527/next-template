# 博客管理页面重构设计文档

> 基于 Paper Design 中的博客管理页面设计，对现有博客管理模块进行 UI 重构与 API 对接优化。
> 范围：仅 Main Content 区域，不涉及 AppShell 和侧边栏菜单。

## 1. 背景与目标

### 现状
- 博客管理使用 `AdminPageLayout` + `AdminFilterBar` + `DataTable` + `Dialog` 弹窗模式
- 分类管理在独立路由页面 `/admin/blog/categories`
- 文章表单通过 1096 行的 Dialog 弹窗实现（含 5 个 Tab）
- 文章详情在弹窗内查看

### 目标
- 还原 Paper Design 中的三页面设计：博客列表、文章详情、写文章
- 分类管理从独立页面内嵌到列表页左侧面板
- 文章编辑从 Dialog 弹窗改为独立路由页面
- 文章详情从弹窗改为右侧 overlay 抽屉
- 合并代码时只需修改菜单项即可直接接入

## 2. 关键决策

| 决策项             | 选择                 | 理由                                     |
| ------------------ | -------------------- | ---------------------------------------- |
| 写文章路由策略     | 独立路由页面         | URL 可分享，浏览器前进后退可用           |
| 文章详情交互       | 右侧 Overlay 抽屉    | 不离开列表上下文，Paper Design 原生设计   |
| 分类管理位置       | 内嵌左侧面板         | 取消独立 categories 页面，同一上下文操作  |
| 实现路径           | 原地重写             | 路由清晰，合并无冲突                     |
| API 对接           | 客户端 fetch + React Query | 保持现有模式，与项目一致             |

## 3. 路由与文件结构

### 路由变更

```
app/admin/blog/
├── page.tsx                      # 博客管理主页（重写：双栏布局）
├── write/page.tsx                # 新增：写文章
├── [id]/edit/page.tsx            # 新增：编辑文章
└── categories/page.tsx           # 删除（内嵌到主页左侧面板）
```

### 组件结构

```
components/business/admin/blog/
├── blog-main-layout.tsx              # 新增：双栏布局容器
├── category-panel/
│   ├── index.tsx                     # 分类面板（搜索 + 列表 + 添加）
│   ├── category-item.tsx             # 单个分类行（可展开子分类）
│   └── category-inline-form.tsx      # 分类内联新建/编辑表单
├── article-panel/
│   ├── index.tsx                     # 文章面板（筛选 + 表格 + 分页）
│   ├── article-columns.tsx           # 表格列定义（重写）
│   └── article-detail-drawer.tsx     # 右侧详情抽屉（Sheet）
├── article-editor/
│   ├── index.tsx                     # 编辑器布局（左编辑 + 右设置）
│   ├── editor-main.tsx               # 编辑器主体（标题 + 摘要 + 富文本）
│   └── editor-settings-panel.tsx     # 右侧设置面板（封面/分类/标签/SEO/发布）
│
├── admin-blog-article-list.tsx       # 删除（被 article-panel 替代）
├── admin-blog-article-columns.tsx    # 删除（被 article-columns 替代）
├── admin-blog-article-form.tsx       # 删除（被 article-editor 替代）
├── admin-blog-category-list.tsx      # 删除（被 category-panel 替代）
└── admin-blog-category-form.tsx      # 删除（被 category-inline-form 替代）
```

## 4. 页面设计

### 4.1 博客管理主页

**布局：MainCard 内左右双栏**

```
MainCard (rounded-2xl shadow-card bg-white)
├── CardHeader (h-[60px] px-7 border-b)
│   ├── 左: "博客管理" 标题 + 状态药丸（已发布/草稿/归档计数）
│   └── 右: AdminSearchBar(pill圆角) + "写文章" Button(accent)
│
└── CardContent (flex)
    ├── CategoryPanel (w-[260px] border-r shrink-0)
    │   ├── 顶栏: "分类管理" + 添加按钮
    │   ├── 搜索框: Input 小尺寸
    │   ├── 分类列表: 树形，选中态 accent 背景 + 左边框
    │   └── 底栏: "共 N 个分类" + 管理入口
    │
    └── ArticlePanel (flex-1 py-6 px-7)
        ├── FilterBar: pill 状态标签组（全部/已发布/草稿/归档）+ 操作按钮
        ├── DataTable: 复用现有组件
        │   └── 列: 标题(缩略图+标题+描述) | 分类 | 状态 | 浏览 | 点赞 | 更新时间
        └── DataTablePagination: 复用现有组件
```

**组件复用：**

| 元素         | 复用方案                                    |
| ------------ | ------------------------------------------- |
| 搜索框       | `AdminSearchBar`                            |
| 状态药丸     | `StatusBadge`                               |
| 写文章按钮   | `Button` variant="default"                  |
| 文章表格     | `DataTable` + TanStack Table                |
| 分页         | `DataTablePagination`                       |
| 批量操作     | `BatchActionBar`                            |
| 状态筛选标签 | `Button`/`Badge` pill 组合（新增小组件）    |
| 分类面板     | 全新组件                                    |

**状态筛选改为 pill 标签组：** 替代当前的 Select 下拉。选中态 `bg-accent text-white`，默认态 `bg-white border text-fg-secondary`。

### 4.2 文章详情抽屉

**基于 `Sheet` 组件，side="right"，自定义 w-[640px]**

```
Sheet (w-[640px])
├── PanelHeader (py-4 px-6 border-b flex justify-between)
│   ├── 左: 关闭按钮 + StatusBadge
│   └── 右: "编辑" Button + 更多菜单 DropdownMenu
│
├── PanelContent (p-6 overflow-auto)
│   ├── 封面图 (h-52 rounded-xl)
│   ├── 标题 (text-lg font-semibold)
│   ├── 元信息行: 分类 · 发布时间 · 阅读时长 (text-xs text-muted)
│   ├── 标签组: Badge pills
│   ├── 分隔线
│   ├── 摘要区: label + 内容
│   └── 正文预览: 多段落 + 渐变截断遮罩
│
└── PanelFooter (py-3 px-6 border-t flex justify-between)
    ├── 左: 统计(浏览/点赞/评论) + 图标
    └── 右: slug 路径 (font-mono text-xs text-muted)
```

### 4.3 写文章 / 编辑文章页

**同一 `ArticleEditor` 组件，props 区分新建/编辑**

```
MainCard (rounded-2xl shadow-card bg-white)
├── CardHeader (h-[60px] px-7 border-b)
│   ├── 左: "写文章" / "编辑文章" 标题
│   └── 右: "返回" Button + "保存草稿" Button(outline) + "发布" Button(accent)
│
└── CardContent (flex)
    ├── EditorMain (flex-1 p-7)
    │   ├── 标题输入 (text-2xl font-semibold, 无边框)
    │   ├── 分隔线
    │   ├── 摘要输入 (text-sm text-muted)
    │   ├── 富文本工具栏
    │   └── RichTextEditor (Tiptap)
    │
    └── SettingsPanel (w-[300px] border-l shrink-0)
        ├── 封面图: 上传/更换
        ├── 分类: Select 下拉
        ├── 标签: Tag pills + 添加
        ├── URL Slug: Input (font-mono)
        ├── SEO 设置: 可折叠区 (Meta Title / Meta Description)
        └── 发布设置: 可见性 Select + 发布时间 Select + 允许评论 Switch
```

**组件复用：**

| 元素             | 复用方案                           |
| ---------------- | ---------------------------------- |
| 富文本编辑器     | `RichTextEditor` (现有 Tiptap 封装) |
| 封面图上传       | `MaterialPicker` (现有素材选择器)   |
| 分类下拉         | `Select` + `useQuery` categories   |
| 标签管理         | `Badge` + `Input` 组合             |
| Switch           | `Switch` 组件                      |
| SEO 折叠区       | 可用 `Collapsible` 或自定义        |

## 5. 分类面板设计

### 内联 CRUD

| 操作   | 实现方式                                  |
| ------ | ----------------------------------------- |
| 新建   | 点击"+"展开 inline form（名称 + 确认/取消）|
| 编辑   | hover 显示编辑图标，点击后 inline 编辑     |
| 删除   | `AlertDialog` 确认，检测文章关联冲突       |
| 搜索   | `Input` 过滤分类名                        |
| 展开   | 有子分类时显示展开箭头，点击展开/收起       |

### 选中态交互

- 点击分类 → 筛选右侧文章列表
- "全部文章" 为默认选中（带 accent 左边框 + 背景）
- 选中分类时调用 `refetch` 带 `categorySlug` 参数

## 6. 数据流

### 主页状态管理

```
page.tsx ('use client')
├── useQuery('admin-blog-categories') → CategoryPanel
├── useQuery('admin-blog-articles', { categorySlug, status, keyword }) → ArticlePanel
├── useState: selectedCategoryId
├── useState: statusFilter ('all' | 'published' | 'draft' | 'archived')
├── useState: searchKeyword (debounced)
├── useState: detailDrawerOpen + selectedArticleId
└── router: push('/admin/blog/write') | push(`/admin/blog/${id}/edit`)
```

### 编辑器状态管理

```
write/page.tsx ('use client')
├── 新建模式: 空表单
│   ├── useMutation: createArticle
│   └── useMutation: saveDraft (创建时带 status=draft)
│
├── 编辑模式 [id]/edit/page.tsx:
│   ├── useQuery('admin-blog-article', id) → 填充表单
│   ├── useMutation: updateArticle
│   └── useMutation: saveDraft (更新时)
│
└── ArticleEditor 共享组件
    ├── useQuery: categories (分类下拉)
    ├── useQuery: tags (标签选择)
    └── useMutation: createTag (实时创建标签)
```

### API 调用模式

保持现有模式：客户端 `fetch('/api/v1/admin/blog/*')` + React Query 管理。
可考虑抽取 `lib/blog/admin-api.ts` 封装 admin API 调用（类似已有的 `client-api.ts`），减少重复的 fetch 模板代码。这是可选优化，不影响核心重构。

## 7. 可优化项

以下优化可在重构过程中顺带完成：

1. **AdminSearchBar 组件增强**：当前 pill 圆角样式与 Paper Design 一致，但可以增加内联搜索模式（不需要独立组件，直接用 Input + Search 图标）
2. **StatusBadge 统一**：确保所有状态药丸使用相同组件，避免硬编码色值
3. **DataTable 表格行交替色**：添加 `bg-[rgba(38,37,30,0.02)]` 偶数行背景，匹配 Paper Design
4. **Pagination 样式统一**：确保分页按钮使用 `size-8 rounded-lg`，当前页 `bg-accent`

## 8. 不变的层

- **API 路由**：`app/api/v1/admin/blog/*` — 完全不动
- **Service 层**：`services/content/admin-blog-*.service.ts` — 不动
- **Repository 层**：`repositories/prisma/content/` — 不动
- **DTO/Schema**：`contracts/dtos/admin/blog/` — 不动
- **数据库**：Prisma schema — 不动

## 9. 删除清单

| 文件                                      | 原因                     |
| ----------------------------------------- | ------------------------ |
| `app/admin/blog/categories/page.tsx`       | 分类管理内嵌到主页       |
| `components/business/admin/blog/admin-blog-article-list.tsx` | 被 article-panel 替代 |
| `components/business/admin/blog/admin-blog-article-columns.tsx` | 被 article-columns 替代 |
| `components/business/admin/blog/admin-blog-article-form.tsx` | 被 article-editor 替代 |
| `components/business/admin/blog/admin-blog-category-list.tsx` | 被 category-panel 替代 |
| `components/business/admin/blog/admin-blog-category-form.tsx` | 被 category-inline-form 替代 |

## 10. 新增清单

| 文件                                          | 用途                  |
| --------------------------------------------- | --------------------- |
| `app/admin/blog/write/page.tsx`                | 写文章独立页面         |
| `app/admin/blog/[id]/edit/page.tsx`            | 编辑文章独立页面       |
| `components/business/admin/blog/blog-main-layout.tsx` | 双栏布局容器   |
| `components/business/admin/blog/category-panel/index.tsx` | 分类面板  |
| `components/business/admin/blog/category-panel/category-item.tsx` | 分类行 |
| `components/business/admin/blog/category-panel/category-inline-form.tsx` | 内联表单 |
| `components/business/admin/blog/article-panel/index.tsx` | 文章面板 |
| `components/business/admin/blog/article-panel/article-columns.tsx` | 列定义 |
| `components/business/admin/blog/article-panel/article-detail-drawer.tsx` | 详情抽屉 |
| `components/business/admin/blog/article-editor/index.tsx` | 编辑器布局 |
| `components/business/admin/blog/article-editor/editor-main.tsx` | 编辑器主体 |
| `components/business/admin/blog/article-editor/editor-settings-panel.tsx` | 设置面板 |
