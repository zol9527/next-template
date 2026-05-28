# AppShell + Dashboard 重构设计文档

> 日期：2026-05-18
> 范围：AppShell 主框架 + Dashboard 数据面板
> 约束：不修改其他菜单页面，现有页面直接链接，没有的用占位

---

## 1. 背景

当前后台管理系统的 AppShell 使用 shadcn/ui Sidebar 组件实现，带有折叠/展开功能。Dashboard 页面包含系统监控和电商数据两个条件渲染区块，布局与设计系统不完全一致。

本次重构目标：
- **AppShell**：按 Paper Design 的 App Shell 模板重做侧边栏和主卡片布局，仅保留展开态（224px）
- **Dashboard**：按 Paper Design 的 Dashboard 设计完整重做数据面板，对接真实后端 API
- **菜单**：按 Paper Design 的 10 个菜单项配置，链接到现有页面或占位页面

---

## 2. 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 侧边栏折叠 | 仅展开态 (224px) | Paper Design 只有展开态，简化实现 |
| 底层实现 | 基于 shadcn/ui 覆盖 | 保留 SidebarProvider 状态管理，自定义 UI 层 |
| Dashboard 范围 | 完整重做 | 当前布局与设计系统差异大 |
| 数据来源 | 真实后端 API | 不使用 mock 数据 |
| 图表库 | recharts | 项目已安装，可自定义主题匹配设计系统 |

---

## 3. AppShell 设计

### 3.1 整体布局

```
┌──────────────────────────────────────────────────┐
│  Page Wrapper (bg-[--bg] p-5)                     │
│  ┌─────────┐  ┌──────────────────────────────┐   │
│  │ Sidebar  │  │ MainCard                     │   │
│  │ 224px    │  │ (grow, rounded-2xl,          │   │
│  │          │  │  shadow-card, bg-white)      │   │
│  │ Brand    │  │ ┌──────────────────────────┐ │   │
│  │ Nav ×10  │  │ │ CardHeader (h-15)        │ │   │
│  │          │  │ │ 标题 + 搜索 + 按钮 + 头像 │ │   │
│  │ Logout   │  │ ├──────────────────────────┤ │   │
│  │          │  │ │ CardContent (py-6 px-7)   │ │   │
│  │          │  │ │ {children}                │ │   │
│  │          │  │ └──────────────────────────┘ │   │
│  └─────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

- 页面背景：`var(--bg)` (#f2f1ed)
- 页面内边距：20px
- Sidebar 与 MainCard 间距：20px (gap-5)
- Sidebar 融入背景色，无边框无阴影

### 3.2 侧边栏（Sidebar）

**结构**（自上而下）：
1. **品牌区**（52px）：36×36px 深色 Logo 方块 + "EduAdmin" 文字（Outfit 600, 17px）
2. **导航区**（grow）：10 个扁平导航项，无分组 label
3. **底部操作区**（54px）：退出登录按钮

**导航项样式**：
- 尺寸：204×36px（px-3 py-2.25）
- 圆角：rounded-lg (8px)
- 间距：gap-0.5 (2px)
- 图标：18px lucide-react

**导航项状态**：
- **默认**：透明背景，图标 + 文字 `#6B6960`
- **Hover**：`rgba(38,37,30,0.04)` 背景
- **Active**：`--ds-accent-subtle` 背景 + 左侧 3px `--ds-accent` 指示条 + `--ds-accent` 文字和图标

**菜单项配置**（完全按 Paper Design）：

| # | 名称 | 图标 (lucide) | 路由 | 状态 |
|---|------|---------------|------|------|
| 1 | 仪表盘 | LayoutGrid | /admin | 已有页面 |
| 2 | 媒体库 | Image | /admin/media | 已有页面 |
| 3 | 博客管理 | FileText | /admin/blog | 已有页面 |
| 4 | 用户管理 | Users | /admin/users | 已有页面 |
| 5 | 商城管理 | ShoppingCart | /admin/products | 已有页面 |
| 6 | 通知中心 | Bell | /admin/notifications | 已有页面 |
| 7 | 签到管理 | CalendarCheck | /admin/checkin | 已有页面 |
| 8 | 用户反馈 | MessageSquare | /admin/feedback | 已有页面 |
| 9 | 系统配置 | Settings | /admin/site-config | 已有页面 |
| 10 | 插件管理 | Layers | /admin/plugins | 已有页面 |

**退出登录按钮**：
- 容器：w-full, rounded-lg, `--border` 边框
- 图标：LogOut, 18px, `--fg-muted`
- 文字：DM Sans 500, 13px, `--fg-muted`

### 3.3 主卡片（MainCard）

**CardHeader**：
- 高度：60px (h-15)，固定
- 底部边框：`--border` (rgba(38,37,30,0.08))
- 内边距：px-7 (28px)
- 左侧：页面标题（heading-1, Outfit 600, 18px）+ 补充说明（text-caption）
- 右侧：搜索框 + 通知按钮（34×34）+ 用户头像（32×32）

**搜索框**：
- pill 圆角，`--bg` 背景 + `--border` 边框
- 搜索图标 (16px, `--fg-muted`) + placeholder "搜索..." + ⌘K 快捷键提示

**CardContent**：
- 内边距：py-6 px-7 (24px 28px)
- 间距：gap-6 (24px)
- 可滚动，overflow-y-auto

### 3.4 响应式

- **桌面** (> 1024px)：侧边栏固定展开 224px
- **小屏** (< 1024px)：侧边栏隐藏，通过 Header 中的汉堡按钮触发 Sheet 抽屉

---

## 4. Dashboard 数据面板设计

### 4.1 页面结构（自上而下 4 个区域）

```
CardContent (flex flex-col gap-6)
  ├── TopGrid (grid grid-cols-2 gap-4)
  │     ├── SystemStatusCard
  │     └── TransactionCard
  ├── KpiActivityRow (grid grid-cols-[1.2fr_1fr] gap-4)
  │     ├── KpiStrip (grid grid-cols-6)
  │     └── ActivityFeed
  └── ChartsGrid (grid grid-cols-[1.4fr_1fr] gap-4)
        ├── StudentTrendChart (recharts AreaChart)
        └── CourseDistributionChart (recharts PieChart)
```

### 4.2 TopGrid 区域

**布局**：`grid grid-cols-2 gap-4`（2 列等宽）

#### 4.2.1 系统状态卡片

卡片样式：rounded-xl (`--radius-md`), `--surface` 背景, `--border` 边框, p-5

标题："系统状态" + 绿色活动图标 (`--teal`)

| 指标 | 数值格式 | 进度条颜色 |
|------|---------|-----------|
| CPU | 百分比 | `--teal` |
| 内存 | X / Y GB | `--gold` |
| 磁盘 | X / Y GB | `--ds-accent` |
| API 响应 | Xms | `--teal` |
| 运行时间 | X 天 Y 小时 | 无进度条 |

每行结构：label (13px, `--fg-secondary`) + 数值 (JetBrains Mono 12.5px) + 进度条 (90×5px, 3px 圆角)

#### 4.2.2 交易数据卡片

标题："交易数据" + 橙色货币图标 (`--ds-accent`)

| 指标 | 数值格式 | 颜色 |
|------|---------|------|
| 今日交易额 | ¥X,XXX | `--teal` |
| 待处理订单 | X 笔 | `--gold` |
| 退款中 | X 笔 | `--rose` |
| 今日转化率 | X.X% + 进度条 | `--fg` |
| 客单价 | ¥X,XXX | `--fg` |

### 4.3 KpiActivityRow 区域

**布局**：`grid grid-cols-[1.2fr_1fr] gap-4`

#### 4.3.1 KPI 指标条（6 列）

容器：rounded-xl, `--surface` 背景, `--border` 边框, py-4 px-5

每个 KPI 单元：
1. 图标色块（28×28px, rounded-md, 对应颜色浅底 + 深色图标）
2. 数值（Outfit 600, 18px, tabular-nums）
3. 标签（11px, `--fg-muted`）
4. 趋势标签（rounded-full, 10px DM Sans 600, 语义色）
5. 底部分隔线（`border-t`, `--border` 6% 透明度）
6. 底部详情（2 行 key-value + 进度条 3px）

| # | 标签 | 颜色主题 | 趋势方向 | 底部详情 |
|---|------|---------|---------|---------|
| 1 | 学员总数 | `--ds-accent` | ↑12.5% | 本周新增 +148, 活跃率 68.3% |
| 2 | 活跃课程 | `--gold` | ↑3.2% | 本周上线 +12, 完课率 82.1% |
| 3 | 本月营收 | `--teal` | ↑8.7% | 目标 ¥220K, 达成率 84.7% |
| 4 | 商城订单 | `--rose` | ↓2.1% | 今日 47, 退单率 2.4% |
| 5 | 系统可用率 | `--brown` | 稳定 | 宕机 1.3m, SLA 99.95% |
| 6 | 今日登录 | `--peach` | ↑5.3% | 峰值 14:00, MFA 98.2% |

列间用 `--border` 分割线分隔（最后一列无）

#### 4.3.2 活动 Feed

标题："最近动态" (Outfit 600, 15px)

每条条目：
- 色点（7×7px, 圆形）+ 内容（13px）+ 时间戳（11.5px, `--fg-muted`）
- 条目间距 py-3, 底部 border 分割

色点颜色映射：
| 颜色 | 含义 |
|------|------|
| `--peach` | 用户行为 |
| `--teal` | 系统事件 |
| `--rose` | 退款/异常 |
| `--gold` | 安全事件 |

### 4.4 ChartsGrid 区域

**布局**：`grid grid-cols-[1.4fr_1fr] gap-4`

#### 4.4.1 学员增长趋势（折线图）

标题行："学员增长趋势" + Tab 切换（周/月/年）

Tab 按钮样式：
- 默认：rounded-full, `--surface` 背景, `--border` 边框, `--fg-secondary` 文字
- Active：`--ds-accent` 背景, 白色文字
- 间距 gap-0.75 (3px)

图表（recharts AreaChart）：
- 渐变填充：`--ds-accent` 12% 透明度 → 透明
- 网格线：`--border` 颜色
- 折线：`--ds-accent`, strokeWidth 2.5
- 数据点：白色填充 + `--ds-accent` 边框
- Y 轴/X 轴标签：11px, `--fg-muted`

#### 4.4.2 课程分类分布（环形图）

标题："课程分类分布"

图表（recharts PieChart）：
- 环形：innerRadius/outerRadius 比例匹配设计
- 数据系列颜色：`--ds-accent`, `--gold`, `--teal`, `--rose`, `--brown`
- 中心汇总数值：Outfit 600, 22px + "总课程" 11px

图例：色块（9×9px, rounded 3px）+ 分类名 + 百分比

---

## 5. 数据对接

### 5.1 数据获取架构

```
admin/page.tsx (Server Component)
  ├── fetchDashboardSummary() → SystemStatus + TransactionData
  ├── fetchKpiData() → KPI 6 列数据
  ├── fetchRecentActivities() → 活动 Feed
  ├── fetchStudentTrend(period) → 折线图数据
  └── fetchCourseDistribution() → 环形图数据
      │
      ▼
DashboardClient (Client Component)
  ├── 顶部区域 (Server 数据直传)
  ├── KPI + Feed (Server 数据直传)
  └── 图表区域 (Tab 切换时客户端请求)
```

### 5.2 API 端点规划

| 端点 | 方法 | 说明 | 状态 |
|------|------|------|------|
| `/api/admin/dashboard/system-status` | GET | CPU/内存/磁盘/响应时间/运行时间 | 可能需新增 |
| `/api/admin/dashboard/transactions` | GET | 今日交易/订单/退款/转化率/客单价 | 可能需新增 |
| `/api/admin/dashboard/kpi` | GET | 6 列 KPI 数据 | 可能需新增 |
| `/api/admin/dashboard/activities` | GET | 最近活动 Feed | 可能需新增 |
| `/api/admin/dashboard/student-trend` | GET | 学员增长趋势（支持 period 参数） | 可能需新增 |
| `/api/admin/dashboard/course-distribution` | GET | 课程分类分布 | 可能需新增 |

已有的用户统计、订单统计等 API 可以复用，缺失的端点需新增。

### 5.3 TypeScript 类型

```typescript
// 系统状态
interface SystemStatus {
  cpu: number
  memory: { used: number; total: number; unit: 'GB' }
  disk: { used: number; total: number; unit: 'GB' }
  apiResponseMs: number
  uptime: string
}

// 交易数据
interface TransactionData {
  todayAmount: number
  pendingOrders: number
  refunding: number
  conversionRate: number
  avgOrderValue: number
}

// KPI 项
interface KpiItem {
  id: string
  icon: string
  value: string
  label: string
  trend: { direction: 'up' | 'down' | 'stable'; value: string }
  colorTheme: 'orange' | 'gold' | 'teal' | 'rose' | 'brown' | 'peach'
  details: { label: string; value: string }[]
  progress?: number
}

// 活动项
interface ActivityItem {
  id: string
  type: 'user' | 'system' | 'refund' | 'security'
  content: string
  time: string
}

// 折线图数据
interface TrendDataPoint {
  date: string
  value: number
}

// 环形图数据
interface DistributionItem {
  name: string
  value: number
  color: string
}
```

---

## 6. 文件变更清单

### 6.1 AppShell 相关

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/layout/admin-shell-client.tsx` | 重写 | 简化布局，去掉折叠逻辑 |
| `components/layout/admin-shell.tsx` | 调整 | 适配新 props |
| `components/business/admin/sidebar/app-sidebar.tsx` | 重写 | 基于 shadcn/ui 覆盖，仅展开态 |
| `components/business/admin/sidebar/app-sidebar-menu.tsx` | 重写 | 扁平化 10 项导航 |
| `components/business/admin/sidebar/app-sidebar-header.tsx` | 重写 | 品牌区 |
| `components/business/admin/sidebar/app-sidebar-footer.tsx` | 重写 | 退出登录按钮 |
| `components/business/admin/sidebar/sidebar-items.ts` | 重写 | Paper Design 菜单配置 |
| `components/business/admin/sidebar/admin-header-user.tsx` | 保留调整 | 适配新 Header 样式 |

### 6.2 Dashboard 相关

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/admin/page.tsx` | 重写 | Server Component 数据获取 |
| `components/business/admin/admin-dashboard.tsx` | 重写 | 新布局 4 区域 |
| `components/business/admin/admin-dashboard-shell.tsx` | 删除 | 功能整合到 page.tsx |
| `components/business/admin/ecommerce-dashboard-section.tsx` | 删除 | 功能整合到新 Dashboard |
| `components/business/admin/system-monitor/system-monitor-section.tsx` | 重写 | 新系统状态卡片 |
| `components/business/admin/system-monitor/stat-card.tsx` | 重写 | 新进度条指标行 |
| `components/business/admin/stat-card.tsx` | 保留调整 | 复用于交易数据行 |
| `components/business/admin/kpi-card.tsx` | 重写 | 新 KPI 指标单元 |
| 新增 `components/business/admin/dashboard/activity-feed.tsx` | 新建 | 活动 Feed 组件 |
| 新增 `components/business/admin/dashboard/student-trend-chart.tsx` | 新建 | 折线图组件 |
| 新增 `components/business/admin/dashboard/course-distribution-chart.tsx` | 新建 | 环形图组件 |
| 新增 `components/business/admin/dashboard/types.ts` | 新建 | Dashboard 类型定义 |

---

## 7. 实施检查点（Checkpoint）

每个 checkpoint 完成后，**必须截图对比 Paper Design 参考设计**，确认视觉一致性后方可继续。

### CP1：侧边栏完成

- **触发时机**：侧边栏（品牌区 + 导航 + 退出登录）重写完成
- **验证方式**：
  1. 启动 dev server，打开 Dashboard 页面
  2. 截取侧边栏区域截图
  3. 对比 Paper Design `App Shell — 主框架模板` (FGC-1) 的 Sidebar 部分
- **检查项**：
  - [ ] 品牌区：Logo 方块 36×36 (#26251E) + "EduAdmin" (Outfit 600 17px)
  - [ ] 10 个导航项扁平排列，无分组 label
  - [ ] 导航项尺寸 204×36，间距 2px，圆角 8px
  - [ ] Active 项：accent-subtle 背景 + 左侧 3px 指示条 + accent 色文字/图标
  - [ ] 默认项：透明背景 + #6B6960 文字/图标
  - [ ] 退出登录按钮位于底部，带 border 边框
  - [ ] 侧边栏融入页面背景色，无边框无阴影
  - [ ] 路由切换时 Active 状态正确跟随

### CP2：AppShell 主卡片完成

- **触发时机**：CardHeader + CardContent 框架完成
- **验证方式**：
  1. 截取 MainCard 区域截图
  2. 对比 Paper Design `App Shell — 主框架模板` (FGC-1) 的 MainCard 部分
- **检查项**：
  - [ ] MainCard：白色背景 + 16px 圆角 + shadow-card
  - [ ] CardHeader 高度 60px，底部分割线
  - [ ] 左侧页面标题 (Outfit 600 18px) + 补充说明
  - [ ] 右侧搜索框 (pill 圆角, --bg 背景)
  - [ ] 通知图标 34×34 + 用户头像 32×32
  - [ ] CardContent 内边距 py-6 px-7，子页面正确渲染

### CP3：Dashboard TopGrid 完成

- **触发时机**：系统状态卡片 + 交易数据卡片实现完成
- **验证方式**：
  1. 截取 TopGrid 区域截图
  2. 对比 Paper Design `Dashboard — 数据面板` (1O0-0) 的 TopGrid 部分
- **检查项**：
  - [ ] 2 列等宽布局，gap 16px
  - [ ] 子卡片 rounded-xl + border + 白色背景 + p-5
  - [ ] 系统状态 5 行指标 + 进度条正确渲染
  - [ ] 交易数据 5 行指标 + 语义色正确
  - [ ] 行间距、字体大小、颜色完全匹配

### CP4：Dashboard KPI + ActivityFeed 完成

- **触发时机**：KPI 指标条 + 活动 Feed 实现完成
- **验证方式**：
  1. 截取 KpiActivityRow 区域截图
  2. 对比 Paper Design Dashboard 的 KpiActivityRow 部分
- **检查项**：
  - [ ] KPI 条 6 列等宽，列间分割线
  - [ ] 每个 KPI：图标色块 28×28 + 数值 Outfit 600 18px + 标签 + 趋势标签
  - [ ] 6 个 KPI 颜色主题按序使用（accent/gold/teal/rose/brown/peach）
  - [ ] 底部详情区：key-value 行 + 进度条 3px
  - [ ] 活动 Feed：色点 7×7 + 内容 + 时间戳，间距匹配

### CP5：Dashboard 图表区完成

- **触发时机**：折线图 + 环形图实现完成
- **验证方式**：
  1. 截取 ChartsGrid 区域截图
  2. 对比 Paper Design Dashboard 的 ChartsGrid 部分
- **检查项**：
  - [ ] 1.4:1 网格比例
  - [ ] 折线图：渐变填充 + 数据点 + Tab 切换（周/月/年）
  - [ ] 环形图：5 色数据系列 + 中心汇总值 + 右侧图例
  - [ ] 图表颜色严格按色板顺序
  - [ ] 轴标签 11px，网格线 border 颜色

### CP6：全页面集成验证

- **触发时机**：所有区域集成完成
- **验证方式**：
  1. 截取完整页面截图
  2. 对比 Paper Design `Dashboard — 数据面板` (1O0-0) 整体
- **检查项**：
  - [ ] 整体布局与 Paper Design 一致
  - [ ] 4 个区域间距 gap-6 (24px)
  - [ ] 数据来自真实 API，无 mock
  - [ ] 响应式：小屏侧边栏变为抽屉
  - [ ] 通过 lint + typecheck
  - [ ] 新增 API 有 E2E 测试覆盖

---

## 8. 不做的事

- ❌ 不修改其他菜单页面（博客、用户、商城等）
- ❌ 不引入色板之外的颜色
- ❌ 不修改 `components/ui/` 下的 shadcn/ui 基础组件
- ❌ 不使用 mock 数据
- ❌ 不实现暗色主题
- ❌ 不添加装饰性动画（仅过渡效果）

---

## 9. 最终验证标准

- [ ] 所有 6 个 Checkpoint 通过 Paper Design 截图对比
- [ ] 所有颜色来自 `globals.css` 设计令牌
- [ ] 字体仅使用 Outfit / DM Sans / JetBrains Mono
- [ ] 对接真实后端 API，无 mock 数据
- [ ] 新增 API 有对应的 E2E 测试
- [ ] 通过 lint + typecheck
