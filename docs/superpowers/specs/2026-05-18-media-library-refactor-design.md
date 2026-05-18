# 媒体管理页面重构设计文档

> **日期**: 2026-05-18
> **范围**: 媒体管理主内容区域（不含 AppShell / 菜单部分）
> **方案**: 就地重构（方案 A）— 保持后端架构不变，重写 UI 层 + 增量 API 扩展

---

## 1. 背景与目标

### 1.1 现状

当前媒体管理页面采用**双列布局**（左侧上传面板 + 右侧媒体网格），与 Paper Design 设计稿中的**全宽单列布局**存在本质差异。功能层面已基本完成（上传、删除、引用查询、游标分页），但 UI 需要全面重构以匹配设计稿。

### 1.2 目标

1. **UI 完全匹配 Paper Design** — 4 个画板：网格视图、列表视图、上传 Overlay、详情 Overlay
2. **遵循设计系统** — 使用 `globals.css` 中定义的 CSS 变量（已验证 100% 一致）
3. **功能完善** — 新增搜索、类型筛选、列表视图、文件详情、重命名、存储空间等
4. **素材选择器同步重构** — 保持接口不变，UI 匹配新设计系统
5. **合并友好** — 合并代码时只需修改菜单项即可接入

### 1.3 排除范围

- AppShell（顶栏、侧边栏、导航菜单）
- 其他管理页面
- 数据库 Schema 变更

---

## 2. 设计系统一致性

### 2.1 验证结论

通过 @observer 对 Paper Design Design System 画板与 `globals.css` 进行了全面对比验证：

| 检查项 | 匹配度 | 状态 |
|--------|--------|------|
| 颜色值 | 100% | ✅ 优秀 |
| 圆角系统 | 100% | ✅ 优秀 |
| 间距系统 | 100% | ✅ 优秀 |
| 阴影系统 | 100% | ✅ 优秀 |
| Z-Index 层级 | 100% | ✅ 优秀 |
| 字体家族 | 100% | ✅ 优秀 |
| 排版工具类覆盖 | ~65% | 🟡 需补充 |

### 2.2 需要补充的排版工具类

以下排版样式在 Paper Design 中有定义但 `globals.css` 中缺失或部分匹配：

**缺失（需新增）：**
- 品牌/Logo: Outfit 600, 17px, line-height 1.2
- 环形图中心值: Outfit 600, 22px, line-height 1.2
- 导航项: DM Sans 500, 13.5px, line-height 1.4
- 状态药丸: DM Sans 500, 11.5px, line-height 1.3
- 按钮: DM Sans 500, 13px, line-height 1.3
- 趋势标签: DM Sans 600, 10px, line-height 1.2

**部分匹配（需修正）：**
- 表头 `.heading-4`: 需改为 11px + uppercase + letter-spacing 0.04em
- 代码/ID `.text-tabular`: 需补充 font-size 12px + font-weight 500 + line-height 1.5

**命名不一致（需添加别名）：**
- Paper 用 `--font-body`，CSS 用 `--font-sans` → 添加 `--font-body: var(--font-sans)`

---

## 3. 架构设计

### 3.1 组件树

```
admin/media/page.tsx
└── AdminPageLayout                    ← 保持现有布局框架
    └── MediaLibrary                   ← 新主容器（替换 AdminMediaUploader）
        ├── MediaToolbar               ← 面包屑 + 搜索 + 视图切换 + 上传按钮
        ├── MediaFilterBar             ← 分类筛选 + 统计 + 存储空间
        ├── MediaGridView              ← 网格视图容器
        │   └── MediaGridCard[]        ← 网格卡片（复用）
        ├── MediaListView              ← 列表视图容器 + 行组件
        ├── MediaPagination            ← 标准页码分页器
        ├── UploadDialog               ← 上传 Modal（Dialog 组件）
        ├── DetailPanel                ← 文件详情侧边栏（Sheet 组件）
        │   └── MediaDetailInfo        ← 详情信息区
        └── DeleteConfirmDialog        ← 删除确认（微调样式）
```

### 3.2 文件结构

```
src/components/business/admin/media/
├── media-library.tsx              ← 主容器（新，替换 admin-media-uploader.tsx）
├── media-toolbar.tsx              ← 工具栏（新）
├── media-filter-bar.tsx           ← 分类筛选 + 统计（新）
├── media-grid-view.tsx            ← 网格视图容器（新）
├── media-grid-card.tsx            ← 网格卡片（重写自 media-card.tsx）
├── media-list-view.tsx            ← 列表视图容器 + 行组件（新）
├── media-pagination.tsx           ← 分页器（新）
├── media-upload-dialog.tsx        ← 上传 Dialog（重写自 media-upload-panel.tsx）
├── media-detail-panel.tsx         ← 文件详情侧边栏（新）
├── media-detail-info.tsx          ← 详情信息区（新）
├── delete-confirm-dialog.tsx      ← 删除确认（微调样式）
└── material-picker.tsx            ← 素材选择器（重构 UI，保持接口）

保留旧文件（标记为 @deprecated，后续清理）：
├── admin-media-uploader.tsx       ← 旧主组件
├── media-upload-panel.tsx         ← 旧上传面板
└── media-card.tsx                 ← 旧媒体卡片
```

### 3.3 布局变化

**当前布局**（双列）：
```
┌──────────────┬───────────────────────────────┐
│  上传面板     │  媒体网格                      │
│  (固定宽度)   │  (自适应宽度)                   │
└──────────────┴───────────────────────────────┘
```

**目标布局**（全宽单列）：
```
┌─────────────────────────────────────────────────┐
│ CardHeader: 面包屑 | 搜索 | 视图切换 | 上传按钮   │
├─────────────────────────────────────────────────┤
│ FilterBar: 分类标签 | 统计 | 存储空间             │
├─────────────────────────────────────────────────┤
│ 内容区: 网格/列表 (自适应)                        │
├─────────────────────────────────────────────────┤
│ 分页器                                           │
└─────────────────────────────────────────────────┘
```

**详情面板打开时**：
```
┌──────────────────────────────┬──────────────┐
│ 主内容区（收缩）              │ DetailPanel  │
│                              │ (420px 固定) │
└──────────────────────────────┴──────────────┘
```

---

## 4. 组件详细设计

### 4.1 MediaLibrary（主容器）

**职责**: 状态管理中心，协调子组件间的交互。

**布局**: MainCard 容器，圆角 `--radius-lg (16px)`，阴影 `--shadow-card`，背景 `--surface (#FFFFFF)`。

**CardHeader（60px）**:
- 面包屑: "内容管理 > 媒体库"（使用 `--fg-secondary` 和 `--fg`）
- 搜索框: 220×33px，圆角 `--radius-sm`，左侧搜索图标，placeholder "搜索文件..."
- 视图切换: 两个 32×30px 按钮（网格图标/列表图标），激活态使用 `--ds-accent` 背景
- 上传按钮: `--ds-accent` 背景色，白色文字 + 上传图标，102×31px

**状态管理**（通过扩展 Context Provider）:

```typescript
interface MediaLibraryState {
  // 现有状态保持
  list: MediaAsset[];
  isLoading: boolean;

  // 新增状态
  viewMode: 'grid' | 'list';
  searchQuery: string;
  typeFilter: 'all' | 'image' | 'video' | 'document' | 'audio';
  currentPage: number;       // 从 1 开始
  pageSize: number;          // 默认 20
  totalCount: number;
  totalPages: number;

  selectedIds: Set<string>;
  detailAssetId: string | null;
  isUploadDialogOpen: boolean;

  storageUsage: { used: number; total: number; breakdown?: Record<string, number> } | null;
}
```

### 4.2 MediaFilterBar（筛选栏）

**布局**: flex, padding 24px 28px, gap 8px。

**分类筛选标签**（左侧）:
- 全部（默认激活）、图片、视频、文档、音频
- Pill 样式: 圆角 `--radius-pill`，padding 4px 12px
- 激活态: `--ds-accent` 背景色，白色文字
- 默认态: 透明背景，`--fg-secondary` 文字，`--border` 边框

**统计信息**（中间，弹性占位后）:
- "共 N 个文件"，`--fg-muted` 颜色

**存储空间**（右侧）:
- 文字: "已用 X.X GB / Y GB"
- 进度条: 6px 高，圆角 `--radius-pill`，`--teal` 背景色，`--border` 轨道色
- 宽度 120px

### 4.3 MediaGridCard（网格卡片）

**尺寸**: 自适应宽度（CSS Grid 5列），高度约 209px。

**样式**:
- 圆角: `--radius-md (12px)`
- 边框: `1px solid var(--border)`
- overflow: clip
- hover: `--shadow-hover` + 显示操作按钮

**内部结构**:

```
┌─────────────────────┐
│ ☐  (左上角复选框)    │  ← absolute 定位, top-2 left-2
│                      │
│   缩略图/文件图标     │  ← 自适应高度, 占大部分空间
│                      │
├──────────────────────┤  ← 1px solid var(--border) 分隔线
│ 文件名.jpg           │  ← 单行截断, --fg, font-size 13px
│ 1.2 MB · 2026-05-10  │  ← --fg-muted, font-size 11px
└──────────────────────┘
```

**文件类型视觉**:
- 图片: 直接显示缩略图
- 视频: 深色覆盖层 + 中央播放图标 + 右下角时长标签（`--radius-sm` 背景）
- 文档: 浅色背景 + 文件类型图标（PDF红/XLSX绿/DOC黑/PPT橙等）

### 4.4 MediaListView（列表视图）

**容器**: 圆角 `--radius-md (12px)`，边框 `1px solid var(--border)`，overflow clip。

**表头**:
- 高度 35px，背景 `--surface-alt (#F7F7F4)`
- 文字: `--heading-4` 样式（11px, 600, uppercase, letter-spacing 0.04em）
- 列: 复选框(40px) | 文件名(flex) | 类型(80px) | 大小(90px) | 上传时间(110px) | 上传者(80px) | 操作(50px)

**数据行**:
- 高度约 57px，底部 `1px solid var(--border)` 分隔
- hover: `--ds-accent-subtle` 背景
- 文件名列: 36×36 文件图标（`--radius-sm`，带类型色背景）+ 文件名
- 类型列: Pill 标签（浅色背景 + 类型色文字，如 JPG 橙/PNG 绿/MP4 蓝/PDF 红）

### 4.5 UploadDialog（上传弹窗）

**容器**: shadcn `Dialog`，560px 宽，圆角 `--radius-lg (16px)`，阴影 `--shadow-modal`。

**头部（71px）**:
- 标题: "上传文件"，`--fg`，加粗
- 关闭按钮: 30×30px，X 图标

**拖拽上传区（512×192）**:
- 虚线边框（dashed），`--border-medium` 颜色
- 居中: 48×48 上传图标（`--ds-accent` 颜色）
- 主文字: "拖拽文件到此处，或点击上传"
- 副文字: "支持 JPG、PNG、GIF、MP4、PDF、DOCX 等格式，单文件最大 200 MB"，`--fg-muted`

**文件列表**:
- 每项 62px 高
- 文件图标 36×36（类型色背景）+ 文件名 + 大小
- 三种状态:
  - ✅ 已完成: 绿色对勾图标
  - 🔄 上传中: 橙色进度条 + 百分比
  - ⏳ 等待中: 灰色文字 "等待中" + X 删除按钮

**底部（66px）**:
- 取消按钮: 灰色/白色背景
- 全部上传按钮: `--ds-accent` 背景，白色文字

### 4.6 DetailPanel（详情侧边栏）

**容器**: shadcn `Sheet`（右侧滑出），420px 宽，阴影 `-4px 0 24px rgba(38,37,30,0.078)`。

**头部**:
- 标题: "文件详情"
- 操作按钮组: 下载图标(30×30) + 复制链接图标(30×30) + 关闭图标(30×30)

**预览区**:
- 宽 372px, 4:3 比例, 圆角 `--radius-md (12px)`
- 图片: 直接显示预览
- 非图片: 渐变背景 + 文件类型图标

**文件名区**:
- 文件名: 加粗，较大字号
- 状态标签: 绿色圆点 + "已上传" 文字

**文件信息区**（标签-值对）:
| 标签（80px 宽，`--fg-muted`） | 值（`--fg`） |
|-------------------------------|-------------|
| 文件类型 | JPEG 图片 |
| 文件大小 | 1.2 MB |
| 分辨率 | 1920 × 1080 |
| 上传时间 | 2026-05-10 14:32 |
| 上传者 | 管理员 |
| URL | /uploads/...（`--ds-accent` 颜色，可点击） |

**引用此文件区**:
- 标题: "引用此文件"
- 列表: 文档图标 + 引用名称，浅色背景卡片

**底部操作区**:
- 下载按钮: 默认/灰色边框样式
- 重命名按钮: 默认/灰色边框样式
- 删除按钮: `--error` 红色文字，警示样式

### 4.7 MaterialPicker（素材选择器重构）

**接口保持不变**: `multiple`, `typeFilter`, `onSelect` 等属性。

**UI 重构**:
- Dialog 样式与设计系统一致
- 内部使用新的 `MediaGridCard` 组件
- 保留 Tab 切换（全部/图片/视频/上传素材）
- 选中高亮: `ring-2 ring-ds-accent` + CheckCircle2 图标

### 4.8 MediaPagination（分页器）

**布局**: flex, align-items center, gap 4px, padding 12px 28px。

**页码按钮**:
- 尺寸: 32×32px，圆角 `--radius-sm (8px)`
- 当前页: `--ds-accent` 背景色，白色文字
- 其他页: 透明背景，`--fg-secondary` 文字
- hover: `--ds-accent-subtle` 背景
- 禁用态: opacity 0.4
- 省略号: 纯文字显示 "..."

**右侧**: "每页 N 条" 下拉选择器

**分页逻辑**: 传统 offset/limit 分页，显示 1 2 3 ... 25 格式（前后各显示 2 页 + 首尾页）。

---

## 5. API 扩展

### 5.1 分页 API 修改

**端点**: `GET /api/v1/admin/media-assets`

**现有**: 已有 `listMediaAssets()` 传统分页方法，通过 `legacy=true` 参数触发。

**修改**:
- 将传统分页作为默认模式（移除 `legacy` 参数判断）
- 新增查询参数:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页条数 |
| `search` | string? | - | 按文件名搜索（模糊匹配） |
| `type` | string? | - | 文件类型过滤: image/video/document/audio |
| `sort` | string? | createdAt:desc | 排序方式 |

**返回值扩展**:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 248,
    "totalPages": 13
  }
}
```

### 5.2 新增：重命名 API

**端点**: `PATCH /api/v1/admin/media-assets/[id]`

**请求体**:

```json
{
  "name": "新文件名.jpg"
}
```

**响应**:

```json
{
  "success": true,
  "data": { ...updatedAsset }
}
```

**Service 层**: 在 `admin-media-asset.service.ts` 中新增 `renameMediaAsset(id, name)` 方法。

### 5.3 新增：存储空间 API

**端点**: `GET /api/v1/admin/storage/usage`

**响应**:

```json
{
  "used": 2580480000,
  "total": 10737418240,
  "breakdown": {
    "image": 1548000000,
    "video": 800000000,
    "document": 200000000,
    "audio": 32000000
  }
}
```

**实现**: 使用 Prisma 的 `sum` 聚合查询 `MediaAsset.sizeBytes` 字段，按 `contentType` 分组统计。`total`（总配额）通过环境变量 `STORAGE_LIMIT_BYTES` 配置，默认 10 GB。

### 5.4 Context Provider 扩展

在 `AdminMediaAssetsContext` 中新增:

```typescript
// 新增方法
renameAsset(id: string, name: string): Promise<void>;
fetchStorageUsage(): Promise<void>;
fetchList(params: { page: number; pageSize: number; search?: string; type?: string }): Promise<void>;

// 新增状态
storageUsage: { used: number; total: number; breakdown?: Record<string, number> } | null;
```

---

## 6. 实现顺序

按依赖关系排列，分为以下批次：

### 批次 1: 基础设施（不涉及 UI）
1. 补充 `globals.css` 排版工具类
2. 扩展 Context Provider 状态和方法
3. 后端 API 扩展（分页参数、搜索、类型过滤）
4. 新增重命名 API + Service 方法
5. 新增存储空间 API

### 批次 2: 核心页面（网格视图优先）
6. 实现 `MediaLibrary` 主容器
7. 实现 `MediaToolbar` 工具栏
8. 实现 `MediaFilterBar` 筛选栏
9. 实现 `MediaGridCard` 网格卡片
10. 实现 `MediaGridView` 网格视图容器
11. 实现 `MediaPagination` 分页器

### 批次 3: 列表视图 + 交互
12. 实现 `MediaListView` 列表视图
13. 实现 `UploadDialog` 上传弹窗
14. 实现 `DetailPanel` + `MediaDetailInfo` 详情面板
15. 微调 `DeleteConfirmDialog` 样式

### 批次 4: 素材选择器 + 清理
16. 重构 `MaterialPicker` 素材选择器
17. 更新 `admin/media/page.tsx` 使用新组件
18. 清理旧文件（标记 deprecated）

---

## 7. 关键技术决策

| 决策 | 选项 | 选择 | 原因 |
|------|------|------|------|
| 分页策略 | 游标/传统 | 传统分页 | 匹配设计稿的页码跳转 UI |
| 存储空间数据 | 模拟/真实 | 真实数据 | 增加一个简单的聚合查询 |
| 重命名功能 | 跳过/实现 | 实现 | 设计稿中有重命名按钮 |
| 视图切换存储 | 内存/localStorage | URL 查询参数 | 便于分享和书签 |
| 详情面板 | Dialog/Sheet | Sheet（右侧滑出） | 匹配设计稿的侧边栏样式 |
| 上传弹窗 | Dialog/Sheet | Dialog（居中弹窗） | 匹配设计稿的 Modal 样式 |
| 素材选择器 | 不改/重构 | 重构 UI | 保持接口不变，统一视觉风格 |

---

## 8. 设计令牌参考

所有组件严格使用以下 CSS 变量，不使用硬编码值：

```css
/* 颜色 */
var(--bg)              /* #f2f1ed 页面背景 */
var(--surface)         /* #ffffff 卡片/面板背景 */
var(--surface-alt)     /* #f7f7f4 表头/次要背景 */
var(--fg)              /* #26251e 主文字 */
var(--fg-secondary)    /* #6b6960 次要文字 */
var(--fg-muted)        /* #9c9a91 辅助文字 */
var(--border)          /* rgba(38,37,30,0.08) 默认边框 */
var(--ds-accent)       /* #f54e00 主题色 */
var(--ds-accent-hover) /* #d94400 主题色悬停 */
var(--ds-accent-subtle)/* rgba(245,78,0,0.08) 主题色浅底 */
var(--teal)            /* #1f8a65 成功色 */
var(--rose)            /* #cf2d56 错误/危险色 */
var(--gold)            /* #c08532 警告色 */

/* 圆角 */
var(--radius-sm)       /* 8px 按钮、输入框 */
var(--radius-md)       /* 12px 卡片、面板 */
var(--radius-lg)       /* 16px 主卡片、弹窗 */
var(--radius-pill)     /* 9999px 标签、状态药丸 */

/* 阴影 */
var(--shadow-card)     /* 卡片默认阴影 */
var(--shadow-hover)    /* 卡片悬停阴影 */
var(--shadow-modal)    /* 弹窗阴影 */

/* 间距 */
var(--space-4)         /* 16px 网格间距 */
var(--space-5)         /* 20px 区块间距 */
var(--space-6)         /* 24px 垂直内边距 */
var(--space-7)         /* 28px 水平内边距 */

/* Z-Index */
var(--z-overlay)       /* 40 遮罩层 */
var(--z-modal)         /* 50 对话框 */
```
