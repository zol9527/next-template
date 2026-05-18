# 商城管理模块重构设计文档

> 日期：2026-05-18
> 状态：待实施
> 范围：`apps/backend/src/` 商城管理 main content 部分

---

## 1. 背景与目标

### 1.1 背景

项目已有商城管理功能（商品、订单、分类、优惠券、分销），代码分散在 `app/admin/*/` 各路由目录下。UI 使用基础 shadcn/ui 组件，与 Paper Design 中的设计规范存在较大差距。

Paper Design 中定义了一套完整的商城管理页面体系，包含统一 Tab 导航、统一卡片容器、状态筛选系统、KPI 卡片、表格样式等。

### 1.2 目标

1. **视觉还原**：将所有商城管理页面重构为 Paper Design 设计稿的样式
2. **架构统一**：所有页面共享 Tab 导航栏和 MainCard 容器
3. **设计系统一致**：使用项目已有的 Design Token（globals.css 中的 CSS 变量 + Tailwind 映射）
4. **API 功能保持**：保留现有所有 API 对接和业务逻辑
5. **可独立合并**：重构完成后，合并代码时只需调整菜单项即可接入

### 1.3 不涉及

- ❌ AppShell / Sidebar / 菜单部分
- ❌ API 路由和服务层（plugins/ecommerce, plugins/promotion）
- ❌ globals.css 设计 Token 修改
- ❌ Base UI 组件（components/base/）

---

## 2. 设计稿页面清单

| # | Paper Design 页面 | 路由 | 核心交互 |
|---|---|---|---|
| 1 | 商品管理 | `/admin/products` | 状态 Pill 筛选 + 搜索 + 分类/排序下拉 + 表格 + 行选中高亮 |
| 2 | 订单管理 + 详情抽屉 | `/admin/orders` | 状态 Pill 筛选 + 日期/分类筛选 + 表格 + 右侧 Drawer |
| 3 | 分类管理 | `/admin/categories` | 双栏布局（280px 树形面板 + 880px 详情面板）+ Dialog |
| 4 | 分销管理 | `/admin/affiliate` | KPI 统计卡片(4个) + 推广员表格 + 分页 |
| 5 | 优惠券管理 | `/admin/coupons` | KPI 统计卡片(4个) + 筛选标签 + 表格 + 分页 |
| 6 | 新建分类 Dialog | (分类管理内触发) | 520px Dialog，表单：名称、标识(slug)、图标选择、上级分类、排序权重、描述 |
| 7 | 添加子分类 Dialog | (分类管理内触发) | 520px Dialog，表单：名称、标识(slug)、图标选择、排序权重(显示当前排序)、状态开关 |
| 8 | 创建优惠券 | `/admin/coupons/create` | 全页面表单，分段：基本信息、使用规则、其他设置 |

---

## 3. 架构设计

### 3.1 共享 Tab 导航方案

```
/admin/products   → ShopMainCard(activeTab="products")   → ProductsContent
/admin/categories → ShopMainCard(activeTab="categories")  → CategoriesContent
/admin/orders     → ShopMainCard(activeTab="orders")      → OrdersContent
/admin/coupons    → ShopMainCard(activeTab="coupons")     → CouponsContent
/admin/affiliate  → ShopMainCard(activeTab="affiliate")   → AffiliateContent
```

Tab 切换通过 `router.push()` 实现路由跳转，非 SPA 状态切换。

### 3.2 MainCard 容器结构

```
┌──────────────────────────────────────────────┐
│  TabBar: [商品管理 | 分类管理 | 订单管理 | 优惠券 | 分销管理]  [搜索框] [操作按钮]
│───────────────────────────────────────────────│
│  Content Area (由各页面自行渲染)                │
│                                               │
│                                               │
└──────────────────────────────────────────────┘
```

- 外壳：白色卡片，`border-radius: 16px`，`box-shadow: 0px 1px 3px #26251E0A, 0px 8px 24px #26251E0F`
- TabBar 区域：高度 60px，底部 1px border 分割线 `#26251E14`
- Content 区域：`padding: 24px 28px`，`flex: 1`

### 3.3 Tab 导航样式

- 非选中 Tab：`color: #6B6960`，`font-weight: 500`，`font-size: 13.5px`
- 选中 Tab：`color: #F54E00`，`font-weight: 600`，底部 2px 橙色下划线
- Tab 之间用 1px × 20px 竖线分隔 `#26251E14`
- Tab 间距：`padding: 8px 16px`

---

## 4. 新建共享组件

### 4.1 组件目录结构

```
components/business/admin/shop/
├── shop-main-card.tsx          # MainCard 容器 + Tab 导航
├── shop-status-filter.tsx      # 状态筛选按钮组（Pill + Count Badge）
├── shop-table-header.tsx       # 表格表头
├── shop-table-row.tsx          # 表格行（含选中高亮、左边框）
├── shop-kpi-cards.tsx          # KPI 统计卡片组
├── shop-pagination.tsx         # 分页组件
├── shop-search-input.tsx       # 搜索输入框
└── shop-filter-dropdown.tsx    # 筛选下拉按钮
```

### 4.2 ShopMainCard 组件

```typescript
interface ShopMainCardProps {
  activeTab: 'products' | 'categories' | 'orders' | 'coupons' | 'affiliate'
  children: React.ReactNode
  // TabBar 右侧区域可自定义
  headerRight?: React.ReactNode
}
```

### 4.3 ShopStatusFilter 组件

参照 Paper Design 的状态筛选 Pill 模式：

```typescript
interface ShopStatusFilterProps {
  filters: Array<{
    label: string       // 如 "全部"、"上架中"、"低库存"
    count: number       // 对应数量
    value: string       // 筛选值
    color?: string      // 主题色，用于 count badge 背景
  }>
  activeFilter: string
  onFilterChange: (value: string) => void
}
```

- 选中状态：`bg-primary text-white`，count badge 用 `bg-white/20`
- 未选中状态：`bg-surface border border-border-default`，count badge 根据语义色

### 4.4 ShopKPICards 组件

```typescript
interface KPICard {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
}

interface ShopKPICardsProps {
  cards: KPICard[]
}
```

- 布局：4 列等宽 grid，`gap: 16px`
- 每个卡片：264px 宽，92px 高，白色背景，1px border `#26251E14`，`border-radius: 12px`

### 4.5 表格行高亮

参照 Paper Design 的选中行样式：
- 左边框 3px 橙色 `#F54E00`
- 背景 `#F54E000A`（10% 透明度橙色）
- 选中行左侧 checkbox 为橙色填充 + 白色勾选

---

## 5. 各页面具体设计

### 5.1 商品管理 (`/admin/products`)

**TabBar 右侧**：搜索框 (220px) + 「添加商品」按钮 (橙色实心)

**内容区**：
1. 状态筛选行：全部(128) | 上架中(89) | 低库存(12) | 草稿(15) | 已下架(12)
2. 右侧辅助筛选：「全部分类」下拉 + 「按销量」下拉
3. 表格列：复选框 | 商品(名称+SKU+图标) | 分类(Badge) | 价格 | 库存 | 销量 | 状态(圆点+文字) | 操作(编辑/复制) | 更多菜单

**状态色映射**：
- 上架 → `text-success` (#1F8A65)，绿色圆点
- 低库存 → `text-warning` (#C08532)，金色圆点
- 草稿 → `text-muted-foreground` (#9C9A91)，灰色圆点
- 已下架 → `text-destructive` (#CF2D56)，红色圆点

**分类 Badge 色**：
- 编程开发 → `bg-emerald-50 text-emerald-600`
- 人工智能 → `bg-primary/10 text-primary`
- 设计创意 → `bg-amber-50 text-amber-700`
- 数据分析 → `bg-yellow-50 text-yellow-700`

### 5.2 订单管理 (`/admin/orders`)

**TabBar 右侧**：搜索框 (220px) + 筛选按钮

**内容区**：
1. 状态筛选行：全部(1,024) | 已完成(687) | 待付款(156) | 退款中(23)
2. 右侧辅助筛选：「最近7天」日期下拉 + 「全部课程」分类下拉
3. 表格列：订单号(Mono字体) | 商品 | 买家(头像+姓名) | 金额(Mono) | 状态 | 下单时间 | 操作(查看详情) | 更多

**详情抽屉 (DrawerOverlay)**：
- 从右侧滑入，宽 480px
- 背景遮罩覆盖内容区（不覆盖 Sidebar）
- 头部：「订单详情 ORD-xxx」+ 关闭按钮
- 内容：订单信息卡片（状态、金额、买家、商品等）

### 5.3 分类管理 (`/admin/categories`)

**TabBar 右侧**：搜索框 (220px) + 「添加分类」按钮

**内容区**：双栏布局（无表格）

**左栏 CategoryTreePanel（280px）**：
- 顶部：「分类列表」标题 + 「展开全部」按钮
- 搜索框
- 树形列表，每项：展开箭头 + 图标 + 名称 + 子项计数
- 底部：「+ 新建分类」按钮

**右栏 CategoryDetailPanel（剩余宽度）**：
- 面包屑路径：`分类管理 / 编程开发`
- 分类标题 + 编辑按钮 + 状态开关
- 基本信息区：Slug、图标、描述
- 子分类列表区：每个子分类行显示 图标+名称+Slug+排序+状态+操作
- 底部：「+ 添加子分类」按钮

**新建分类 Dialog（520px）**：
- 字段：分类名称(*)、分类标识/Slug(*)(含格式提示)、分类图标(6选1)、上级分类(下拉)、排序权重(数字，默认0)、分类描述(textarea)
- 底部：取消(描边按钮) + 创建分类(橙色实心按钮)

**添加子分类 Dialog（520px）**：
- 头部：「添加子分类」+ 父分类名称提示
- 字段：子分类名称(*)、分类标识/Slug(*)(含格式提示)、子分类图标(5选1)、排序权重(含当前排序提示)、启用状态(Switch开关)
- 底部：取消 + 添加子分类(橙色实心)

### 5.4 分销管理 (`/admin/affiliate`)

**TabBar 右侧**：搜索框 (220px) + 「导出数据」按钮

**内容区**：
1. KPI 卡片行（4个）：推广员总数(86)、总佣金(¥12,450)、本月佣金(¥2,890)、待结算(¥1,230)
2. 推广员表格：头像+姓名+手机号 | 推广码 | 等级 | 累计佣金 | 团队人数 | 状态 | 操作
3. 分页：左侧「显示 1-6 共 86 条」 + 右侧页码导航

### 5.5 优惠券管理 (`/admin/coupons`)

**TabBar 右侧**：搜索框 (220px) + 「创建优惠券」按钮

**内容区**：
1. KPI 卡片行（4个）：优惠券总数(128)、进行中(45)、已过期(67)、总使用次数(1,234)
2. 筛选行：左侧「全部」/「进行中」/「已过期」/「已暂停」 | 右侧「筛选」按钮
3. 表格列：名称+类型 | 面额/折扣 | 使用条件 | 已用/总量 | 有效期 | 状态 | 操作
4. 分页

**创建优惠券页面 (`/admin/coupons/create`)**：
- 不显示 TabBar，显示面包屑：优惠券管理 > 创建优惠券
- 右上角：取消(描边) + 保存并发布(橙色实心)
- 分段表单：
  - **基本信息**：优惠券名称(*)、优惠券类型(满减/折扣/固定金额下拉)
  - **使用规则**：优惠金额/折扣率(*)、最低消费、每人限领次数
  - **其他设置**：有效期(固定日期/领取后N天)、总发行量

---

## 6. 设计 Token 使用指南

所有样式通过 Tailwind 类名引用，不硬编码颜色值：

| Paper Design 值 | Tailwind 类名 | CSS 变量 |
|---|---|---|
| `#F54E00` 主色 | `bg-primary` `text-primary` | `--ds-accent` |
| `#26251E` 主文字 | `text-foreground` | `--fg` |
| `#6B6960` 次要文字 | `text-secondary-foreground` | `--fg-secondary` |
| `#9C9A91` 弱化文字 | `text-muted-foreground` | `--fg-muted` |
| `#FFFFFF` 表面 | `bg-surface` | `--surface` |
| `#F7F7F4` 交替背景 | `bg-surface-alt` | `--surface-alt` |
| `#26251E14` 边框 | `border-border-default` | `--border-default` |
| `#26251E26` 中等边框 | `border-border-medium` | `--border-medium` |
| `#1F8A65` 成功 | `text-success` `bg-success` | `--success` |
| `#C08532` 警告 | `text-warning` `bg-warning` | `--warning` |
| `#CF2D56` 错误 | `text-destructive` `bg-destructive` | `--rose` |
| `#F2F1ED` 搜索框背景 | `bg-background` | `--bg` |

**字体**：
- 正文：`font-sans` (DM Sans)
- 标题：`font-display` (Outfit)
- 代码/SKU/价格：`font-mono` (JetBrains Mono)

---

## 7. 文件变更预估

### 7.1 新建文件

```
components/business/admin/shop/
├── shop-main-card.tsx
├── shop-status-filter.tsx
├── shop-table-header.tsx
├── shop-table-row.tsx
├── shop-kpi-cards.tsx
├── shop-pagination.tsx
├── shop-search-input.tsx
└── shop-filter-dropdown.tsx
```

### 7.2 重构文件

| 文件路径 | 说明 |
|---|---|
| `app/admin/products/admin-products-client.tsx` | 重构 UI 层 |
| `app/admin/orders/admin-orders-client.tsx` | 重构 + 添加 Drawer |
| `components/business/admin/admin-category-table.tsx` | 重构为双栏布局 |
| `app/admin/coupons/admin-coupons-client.tsx` | 重构 UI 层 |
| `app/admin/affiliate/admin-affiliate-client.tsx` | 重构 UI 层 |
| `app/admin/coupons/issue/admin-coupon-issue-client.tsx` | 适配新布局 |
| `app/admin/coupons/redemptions/admin-redemptions-client.tsx` | 适配新布局 |
| `app/admin/products/page.tsx` | 引入 ShopMainCard |
| `app/admin/orders/page.tsx` | 引入 ShopMainCard |
| `app/admin/categories/page.tsx` | 引入 ShopMainCard |
| `app/admin/coupons/page.tsx` | 引入 ShopMainCard |
| `app/admin/affiliate/page.tsx` | 引入 ShopMainCard |

### 7.3 新建路由（如不存在）

| 路由 | 说明 |
|---|---|
| `/admin/coupons/create` | 创建优惠券全页面表单 |

---

## 8. 验收标准

1. **视觉还原度**：所有 8 个页面/状态与 Paper Design 设计稿视觉一致
2. **功能完整**：所有现有 CRUD 操作正常工作
3. **API 对接**：所有现有 API 调用路径和参数不变
4. **Tab 导航**：5 个页面共享 Tab 导航，切换正常
5. **响应式**：MainCard 宽度适配 Sidebar 变化
6. **可合并性**：代码合并后仅需调整菜单项即可接入
