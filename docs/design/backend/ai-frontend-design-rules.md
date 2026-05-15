# NextAdmin — AI 前端开发规则

> 此文档可直接交给 AI Agent 作为持久化前端开发约束。
> 基于已有 Dashboard 页面的真实设计证据提炼，确保后续生成的页面在视觉、交互、状态、代码结构、安全性和可维护性上保持一致。
> 生成日期：2026-05-12

---

## 核心提示词（复制使用）

```text
你是一个资深前端设计师和前端工程师。

请根据以下设计规则，为「NextAdmin」设计或实现前端页面。

=== 产品背景 ===

- 产品名称：NextAdmin
- 产品类型：教育行业 SaaS 管理后台
- 目标用户：教育培训机构管理员、学校教务人员、运营人员
- 核心业务：学员管理、课程管理、商城管理、财务管理、权限控制
- 使用场景：PC 端办公场景为主，偶尔移动端查看
- 视觉气质：专业克制、温暖有质感、数据密度高但不拥挤。暖灰色调基底搭配暖橙色强调色，避免冷感科技风
- 页面设计目标：让管理者快速掌握运营数据和系统状态，高效处理审批和日常管理任务

=== 技术栈 ===

- 框架：Next.js (App Router) + TypeScript
- 组件系统：shadcn/ui + Radix 原语
- 样式方案：Tailwind CSS + CSS Variables（通过 :root 设计令牌）
- 图标系统：lucide-react（24px viewBox，stroke 2px，round linecap/join）
- 单位系统：px
- 设计画布：1440px 桌面宽度
- 数据层：Server Components 优先读取服务端数据；Client Components 仅用于交互、浏览器 API 和客户端状态
- 表单栈：react-hook-form + zod
- 测试栈：Vitest 单元测试 + Playwright E2E
- 样式架构：Tailwind v4 + @theme inline（所有设计令牌通过 CSS Variables → Tailwind token 自动映射）
- 主题策略：仅浅色主题（暗色主题暂不支持），通过 globals.css :root 变量统一管理
- 组件策略：shadcn/ui base 组件不可修改（`components/base/`），所有主题定制仅通过 globals.css 变量

=== 色彩系统 ===

所有颜色必须来自以下令牌，禁止引入新颜色：

| 令牌名               | 值                            | 用途                                      |
|----------------------|-------------------------------|-------------------------------------------|
| --bg                 | #f2f1ed                       | 页面背景（暖灰）                          |
| --surface            | #ffffff                       | 卡片/面板背景                             |
| --surface-alt        | #f7f7f4                       | 表格表头、次要面板背景                    |
| --fg                 | #26251e                       | 主要文字                                  |
| --fg-secondary       | #6b6960                       | 辅助文字                                  |
| --fg-muted           | #9c9a91                       | 标签、提示文字、占位符                    |
| --border             | rgba(38,37,30,0.08)           | 默认边框/分割线                           |
| --border-medium      | rgba(38,37,30,0.15)           | 中等强调边框                              |
| --border-strong      | rgba(38,37,30,0.25)           | 强调边框                                  |
| --accent             | #f54e00                       | 主色（暖橙），用于主按钮、Active 状态、关键 CTA |
| --accent-hover       | #d94400                       | 主色悬停态                                |
| --accent-subtle      | rgba(245,78,0,0.08)           | 主色浅底，用于选中行/图标背景             |
| --gold               | #c08532                       | 辅助色（金棕），用于 KPI、警告态          |
| --gold-subtle        | rgba(192,133,50,0.1)          | 金棕浅底                                  |
| --teal               | #1f8a65                       | 辅助色（青绿），用于成功态、正向指标      |
| --teal-subtle        | rgba(31,138,101,0.1)          | 青绿浅底                                  |
| --rose               | #cf2d56                       | 辅助色（玫红），用于错误态、危险操作      |
| --rose-subtle        | rgba(207,45,86,0.08)          | 玫红浅底                                  |
| --brown              | #8b6f47                       | 辅助色（棕色），用于特定 KPI              |
| --brown-subtle       | rgba(139,111,71,0.1)          | 棕色浅底                                  |
| --peach              | #dfa88f                       | 辅助色（桃色），用于活动 Feed 点          |
| --peach-subtle       | rgba(223,168,143,0.12)        | 桃色浅底                                  |

> **⚠️ CSS 工程命名说明：** 为了避免与 shadcn/ui 的 `--accent` 和 `--border` 变量冲突，CSS 实际代码使用以下别名：
> - `--accent` → CSS 中为 `--ds-accent` (ds = design system)
> - `--accent-hover` → CSS 中为 `--ds-accent-hover`
> - `--accent-subtle` → CSS 中为 `--ds-accent-subtle`
> - `--border` → CSS 中为 `--border-default`
>
> 开发时请使用 `--ds-accent` / `--border-default`，设计规范文档中使用简写 `--accent` / `--border`。

语义色映射：
- 成功 (--success / --success-bg): #1f8a65 / rgba(31,138,101,0.08)
- 警告 (--warning / --warning-bg): #c08532 / rgba(192,133,50,0.08)
- 错误 (--error / --error-bg): #cf2d56 / rgba(207,45,86,0.08)

色彩规则：
- 主色 #f54e00 仅用于品牌强调、主按钮、Active 导航、关键 CTA
- 禁止将辅助色用于与语义无关的装饰
- 辅助色与其浅底色必须成对使用（如 teal + teal-subtle）
- 状态色必须使用语义映射，不允许直接写 hex 值
- 新页面不允许引入色板之外的颜色

=== 字体系统 ===

| 层级         | 字体族      | 字重 | 字号    | 行高  | 颜色            | 用途                     |
|-------------|-------------|------|---------|-------|-----------------|--------------------------|
| 品牌/Logo   | Outfit      | 600  | 17px    | 1.2   | --fg            | 侧边栏品牌名             |
| 页面标题    | Outfit      | 600  | 18px    | 1.2   | --fg            | 页面顶部标题             |
| 区块标题    | Outfit      | 600  | 15px    | 1.3   | --fg            | 卡片标题、图表标题       |
| KPI 数值    | Outfit      | 600  | 18px    | 1.2   | --fg            | 仪表盘 KPI 数字          |
| 环形图中心值 | Outfit     | 600  | 22px    | 1.2   | --fg            | Donut 中心大数字         |
| 正文        | DM Sans     | 400  | 13px    | 1.5   | --fg            | 常规内容文字             |
| 导航项      | DM Sans     | 500  | 13.5px  | 1.4   | --fg-secondary  | 侧边栏导航文字           |
| 表格内容    | DM Sans     | 400  | 13px    | 1.5   | --fg            | 表格单元格文字           |
| 表头        | DM Sans     | 600  | 11px    | 1.4   | --fg-muted      | 表头文字（大写）         |
| 标签/说明   | DM Sans     | 400  | 11px    | 1.4   | --fg-muted      | KPI 标签、时间戳、图例   |
| 代码/ID     | JetBrains Mono | 500 | 11.5-12.5px | 1.5 | --fg-secondary  | 订单号、IP、指标数值     |
| 状态药丸    | DM Sans     | 500  | 11.5px  | 1.3   | 语义色          | 状态标签                 |
| 按钮        | DM Sans     | 500  | 13px    | 1.3   | 视变体而定      | 按钮文字                 |
| 趋势标签    | DM Sans     | 600  | 10px    | 1.2   | 语义色          | ↑↓趋势指标               |

字体族定义：
- --font-display: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif
- --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
- --font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace

字体规则：
- 禁止使用 Outfit 以外的 display 字体
- 禁止使用 DM Sans 以外的 body 字体
- 数值型数据必须使用 font-variant-numeric: tabular-nums 保持对齐
- 禁止随意创建新字号，新页面只能使用上表中的字号

=== shadcn/ui 语义映射 ===

以下映射将 NextAdmin 令牌桥接到 shadcn/ui 组件系统（定义在 globals.css `:root` 中）：

| shadcn 变量              | 映射到                    | 说明         |
|--------------------------|---------------------------|--------------|
| --background             | var(--surface)            | 页面背景     |
| --foreground             | var(--fg)                 | 页面前景     |
| --card / --card-foreground | var(--surface) / var(--fg) | 卡片       |
| --popover / --popover-foreground | var(--surface) / var(--fg) | 弹出层 |
| --primary / --primary-foreground | var(--ds-accent) / #ffffff | 主色   |
| --secondary / --secondary-foreground | var(--bg) / var(--fg) | 次要   |
| --muted / --muted-foreground | var(--bg) / var(--fg-muted) | 静音   |
| --accent / --accent-foreground | var(--ds-accent-subtle) / var(--ds-accent) | shadcn强调 |
| --destructive / --destructive-foreground | var(--rose) / #ffffff | 破坏性 |
| --border                 | var(--border-default)     | 边框         |
| --input                  | var(--border-medium)      | 输入框边框   |
| --ring                   | var(--ds-accent)          | 焦点环       |

注意：不要直接修改 shadcn 基础组件（`components/base/`），所有主题定制通过 globals.css 变量完成。

=== 标题层级 (Heading Hierarchy) ===

HTML 语义标题到设计 token 的映射，所有页面必须遵循此层级：

| HTML 元素 | 对应样式名   | 字体族  | 字重 | 字号  | 行高 | 颜色            | 典型场景                    | 示例文本           |
|-----------|-------------|---------|------|-------|------|-----------------|-----------------------------|-------------------|
| h1        | heading-1   | Outfit  | 600  | 18px  | 1.2  | --fg            | 页面顶部唯一主标题          | 数据面板           |
| h2        | heading-2   | Outfit  | 600  | 15px  | 1.3  | --fg            | 卡片标题、区块标题          | 系统状态           |
| h3        | heading-3   | Outfit  | 600  | 13px  | 1.3  | --fg            | 子区块、卡片内分组标题      | 今日活跃学员       |
| h4        | heading-4   | DM Sans | 600  | 12px  | 1.4  | --fg-secondary  | 小标题、表单分组标签        | 筛选条件           |
| h5        | heading-5   | DM Sans | 500  | 11px  | 1.4  | --fg-muted      | 极少使用，深层分组          | 高级选项           |
| h6        | heading-6   | DM Sans | 500  | 10px  | 1.4  | --fg-muted      | 几乎不用，最低层级          | 辅助信息           |

标题规则：
- 每个页面只能有一个 h1（页面标题）
- 标题层级不可跳级（h1 → h3 禁止，必须 h1 → h2 → h3）
- h5/h6 在管理后台中极少使用，优先用 heading-4 + caption 组合替代
- 侧边栏品牌名使用独立的 "品牌/Logo" 样式（Outfit 600 17px），不等于 h1
- 区块标题与 heading-2 等价，卡片内标题与 heading-2 或 heading-3 等价

=== 文本样式组 (Text Styles) ===

可复用的文本样式 class，开发时直接引用样式名：

| 样式名     | 字体族         | 字重 | 字号    | 行高 | 颜色            | 用途                       | letter-spacing |
|-----------|---------------|------|---------|------|-----------------|----------------------------|---------------|
| body-lg   | DM Sans       | 400  | 15px    | 1.6  | --fg            | 长文段落、帮助文档、说明   | normal        |
| body      | DM Sans       | 400  | 13px    | 1.5  | --fg            | 常规正文（默认）           | normal        |
| body-sm   | DM Sans       | 400  | 12px    | 1.5  | --fg-secondary  | 次要说明、辅助描述         | normal        |
| caption   | DM Sans       | 400  | 11px    | 1.4  | --fg-muted      | 标签、时间戳、图例         | normal        |
| overline  | DM Sans       | 600  | 11px    | 1.4  | --fg-muted      | 表头、分组标签             | 0.04em        |

文本样式规则：
- overline 必须配合 text-transform: uppercase 使用
- body-sm 不用于按钮或可交互元素（最小可交互文字 13px）
- 数值型数据使用 --font-mono + font-variant-numeric: tabular-nums

> **✅ 已实现为 CSS 工具类：** 以上文本样式已通过 `@layer utilities` 注册为全局 class，可直接使用 `.heading-1`~`.heading-6`、`.text-body`、`.text-body-lg`、`.text-body-sm`、`.text-caption`、`.text-overline`、`.text-tabular` 等类名。

=== 链接样式 (Link Styles) ===

| 状态     | 颜色           | 装饰线 | 其他                                  |
|---------|---------------|--------|---------------------------------------|
| default | --accent      | 无     | 无                                    |
| hover   | --accent-hover| 下划线 | cursor: pointer                       |
| focus   | --accent      | 无     | outline: none; box-shadow: 0 0 0 3px rgba(245,78,0,0.08) |
| visited | --accent      | 无     | 管理后台单页应用，visited 不做特殊处理  |
| disabled| --fg-muted    | 无     | opacity: 0.5; cursor: not-allowed     |

链接规则：
- 管理后台中链接不使用下划线（hover 态除外）
- 面包屑链接使用 --fg-secondary 颜色，当前项使用 --fg + font-weight: 600
- 表格内的可点击文本（如学员姓名）使用链接样式

=== 图标系统 (Icon System) ===

图标库：lucide-react
默认参数：strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"

| 尺寸令牌    | 值    | 用途                                |
|------------|-------|-------------------------------------|
| icon-xs    | 16px  | 状态药丸内图标、紧凑列表图标       |
| icon-sm    | 20px  | 导航项图标、表单字段图标           |
| icon-md    | 24px  | 默认图标尺寸，按钮内图标、工具栏   |
| icon-lg    | 32px  | 空状态插图、大图标按钮             |

图标规则：
- 图标必须通过 size 属性控制尺寸，禁止使用 CSS 缩放
- 图标颜色继承父元素 color，不单独设置
- 纯装饰图标添加 aria-hidden="true"
- 可操作图标按钮必须有 aria-label

=== 间距系统 ===

基础单位：4px，主要使用 4px / 8px / 12px / 16px / 20px / 24px / 28px

| 场景                | 值            | 说明                           |
|---------------------|---------------|--------------------------------|
| 页面外边距          | 20px          | .app 容器 padding              |
| 内容区水平内边距    | 28px          | .card-content padding 水平     |
| 内容区垂直内边距    | 24px          | .card-content padding 垂直     |
| 卡片头部 padding    | 0 28px        | .card-header padding           |
| 卡片头部高度        | 60px          | .card-header 固定高度          |
| 卡片内边距          | 20px          | 图表卡片、系统卡片             |
| 区块间距            | 24px          | 各主要区块之间的 margin-bottom  |
| 网格间距            | 16px          | grid gap                       |
| 导航项间距          | 2px           | 侧边栏 nav-item gap            |
| 导航项内边距        | 9px 12px      | nav-item padding               |
| 表格行内边距        | 12px 20px     | td padding                     |
| 表头内边距          | 9px 20px      | th padding                     |
| 指标行间距          | 11px 0 / 8px 0 | 普通模式和紧凑模式             |

=== 圆角系统 ===

| 令牌           | 值     | 用途                                     |
|----------------|--------|------------------------------------------|
| --radius-sm    | 8px    | 按钮、输入框、导航项、图标按钮           |
| --radius-md    | 12px   | 卡片、面板、表格容器                     |
| --radius-lg    | 16px   | 主卡片、弹窗                             |
| --radius-pill  | 9999px | 搜索框、状态药丸、标签、趋势指标、头像  |

圆角规则：
- 同一层级的元素必须使用相同圆角令牌
- 禁止在同一页面上混用不同的圆角风格
- 状态标签必须使用 pill 圆角
- 普通卡片禁止使用 pill 圆角

=== 阴影与层级 ===

| 令牌          | 值                                                      | 用途              |
|---------------|---------------------------------------------------------|-------------------|
| --shadow-card | 0 1px 3px rgba(38,37,30,0.04), 0 8px 24px rgba(38,37,30,0.06) | 卡片默认阴影      |
| --shadow-hover| 0 2px 6px rgba(38,37,30,0.06), 0 12px 32px rgba(38,37,30,0.08) | 卡片悬停阴影      |

层级规则：
- 主内容卡片使用 --shadow-card
- 普通信息卡片使用 border + 背景对比，不使用阴影
- 侧边栏融入背景，不使用阴影
- 下拉菜单和弹窗可使用更强的阴影表达层级
- 禁止在普通卡片上使用渐变背景
- 遮罩层使用 rgba(38,37,30,0.3) + backdrop-filter: blur(2px)

=== 页面结构模板 ===

--- App Shell 布局 ---
- 侧边栏宽度: 224px（展开）/ 64px（折叠）
- 侧边栏融入背景色，无边框无阴影
- 侧边栏结构: 品牌区 → 导航分组（带 label）→ 底部操作区
- 主内容区为白色圆角卡片 (border-radius: 16px, box-shadow: --shadow-card)
- 卡片内部分为 Header（固定 60px 高度 + 底部边框）+ Content（可滚动）
- Header 左侧: 页面标题 + 补充信息；右侧: 搜索框 + 操作按钮 + 头像

--- Dashboard 模板 ---
- 信息层级自上而下:
  1. 系统状态面板 + 交易数据面板（2 列）
  2. KPI 指标条（6 列，每个含图标/数值/标签/趋势）+ 最近动态 Feed（2 列）
  3. 图表区：折线图（学员趋势）+ 环形图（分类分布）（比例 1.4:1）
  4. 表格区：数据表格 × 2（等宽 2 列）
- 每个区块间距 24px

--- List/Table 模板 ---
- 卡片标题 + "查看全部"链接
- 表格容器可横向滚动，最小宽度 480px
- 表头使用 --surface-alt 背景 + 大写字母 + 11px 字号
- 行悬停使用 rgba(38,37,30,0.02) 背景
- 用户列: 头像（首字 + 渐变背景）+ 姓名 + 邮箱
- 状态列: 状态药丸（色点 + 文字）
- ID/编号列: 等宽字体

--- Detail 模板 ---
- 顶部摘要卡片：标题 + 状态 + 关键指标
- Tab 切换区
- 信息卡片分组
- 底部操作区/危险区

--- Form 模板 ---
- 分组表单字段
- 字段级验证消息
- 底部保存/取消按钮组
- 危险操作独立区块，使用玫瑰色强调

=== 栅格与布局系统 (Grid & Layout) ===

基于 1440px 画布，内容区域 1312px（两侧 64px 外边距）。

| 参数             | 值           | 说明                          |
|-----------------|-------------|-------------------------------|
| 画布宽度         | 1440px      | 设计基准                      |
| 内容区最大宽度   | 1312px      | 主内容容器                    |
| 外边距           | 64px        | 内容区两侧                    |
| 栅格列数         | 12 列       | 标准网格                      |
| 列间距 (gutter)  | 16px        | grid gap                      |
| 区块间距         | 24px        | 各主要区块之间的垂直间距      |
| 侧边栏宽度       | 224px       | 展开态                        |
| 侧边栏宽度       | 64px        | 折叠态                        |

常用栅格比例：
- 2 列等宽: 1fr 1fr（如系统状态 + 交易数据）
- 1.4:1 不等宽: 1.4fr 1fr（如折线图 + 环形图）
- 3:1 主次: 3fr 1fr（如 KPI 条 + 活动流）
- 6 列等宽: repeat(6, 1fr)（如 KPI 指标条）

=== 响应式断点 (Responsive Breakpoints) ===

| 断点名称  | 宽度范围        | 布局变化                                    |
|----------|----------------|---------------------------------------------|
| 桌面      | > 1400px       | 完整布局，侧边栏展开                        |
| 中等      | 1024px ~ 1400px | 部分网格折叠（KPI 6→3 列），侧边栏保持     |
| 平板/小屏 | < 1024px       | 侧边栏收起为移动抽屉，网格变单列，搜索隐藏  |
| 手机      | < 640px        | 间距缩小，表格 padding 缩小，内容 padding 缩小 |

关键响应行为：
- < 1400px: KPI 条从 6 列变 3 列
- < 1024px:
  - 侧边栏变为 fixed 抽屉，通过汉堡按钮触发
  - 所有双列网格变单列
  - 搜索框隐藏
  - 内容 padding 缩小至 20px
- < 640px:
  - 环形图下方图例垂直排列
  - 表格 padding 缩小至 14px
  - 内容 padding 缩小至 16px
  - 外边距缩小至 8px

=== 导航组件 (Navigation Components) ===

--- 侧边栏 (Sidebar) ---
- 展开态宽度: 224px，折叠态: 64px
- 背景色融入页面 (--bg)，无边框无阴影
- 结构分区: 品牌区 → 导航分组（带 label）→ 底部操作区
- 导航项: 9px 12px padding，--radius-sm 圆角，2px 间距
- 导航分组 label: overline 样式（DM Sans 600 11px uppercase）
- Active 导航项: --accent-subtle 背景 + --accent 左侧指示条 (3px) + --accent 文字
- Hover 导航项: rgba(38,37,30,0.04) 背景
- 折叠态: 仅显示图标，hover 时 tooltip 显示文字

--- 面包屑 (Breadcrumb) ---
- 层级: 首页 > 模块 > 子页面
- 链接颜色: --fg-secondary，当前项: --fg + font-weight: 600
- 分隔符: "/" 或 chevron 图标，颜色 --fg-muted
- 间距: 8px

=== 动画与过渡 (Motion & Transitions) ===

| 参数        | 值                    | 用途                          |
|------------|----------------------|-------------------------------|
| duration-fast   | 0.1s ease            | 按钮 press、toggle 切换      |
| duration-normal | 0.15s ease           | hover 背景变化、tooltip 出现 |
| duration-slow   | 0.25s ease           | 展开/折叠、模态框出现        |
| easing          | ease (default)       | 标准缓动                     |
| easing-spring   | cubic-bezier(0.34, 1.56, 0.64, 1) | 微弹性效果（badge 弹出） |

动画规则：
- transition 时长不超过 0.25s
- 后台管理工具优先保证渲染可预测和扫描速度，而非装饰性动画
- 禁止自动播放的循环动画（除非是实时数据更新指示器）
- 模态框使用 fade + scale(0.98→1) 进入，fade 退出
- Toast 使用 slide-in-from-right 进入，slide-out 退出

=== 数据可视化色板 (Chart Palette) ===

图表专用配色，按数据系列使用：

| 序号 | 颜色     | 值      | 用途                  |
|-----|---------|---------|----------------------|
| 1   | 暖橙     | #f54e00 | 主数据系列、核心指标  |
| 2   | 金棕     | #c08532 | 第二数据系列          |
| 3   | 青绿     | #1f8a65 | 第三数据系列、正向    |
| 4   | 玫红     | #cf2d56 | 第四数据系列、负向    |
| 5   | 棕色     | #8b6f47 | 第五数据系列          |
| 6   | 桃色     | #dfa88f | 第六数据系列          |

图表规则：
- 数据系列必须按序号 1-6 使用颜色，禁止跳色
- 面积图/折线图使用主色 + 10% 透明度填充
- 饼图/环形图使用完整色板
- 坐标轴网格线使用 --border (rgba 8%)
- 图例使用 caption 样式

=== NextAdmin CSS 工具类 ===

以下工具类已在 `globals.css` 中定义，可直接在 Tailwind className 中使用：

**排版类：**
- `.heading-1` ~ `.heading-6` — 标题层级（font-family/weight/size/line-height/color 组合）
- `.text-body-lg` / `.text-body` / `.text-body-sm` — 正文变体
- `.text-caption` / `.text-overline` — 标签/表头
- `.text-tabular` — 等宽数字（font-mono + tabular-nums）

**动画类：**
- `.animate-toast-in` / `.animate-toast-out` — Toast 滑入/滑出
- `.animate-modal-in` / `.animate-modal-out` — Modal 缩放进入/退出

**滚动条类：**
- `.edu-scrollbar` — 自定义滚动条（4px 高度、指定轨道/滑块颜色）

**组件级令牌（CSS 变量）：**
- `--table-row-hover` — 表格行悬停背景色
- `--table-header-bg` — 表头背景
- `--card-header-height` — 卡片头部固定高度 (60px)
- `--kpi-icon-size` / `--activity-dot-size` — 组件尺寸
- `--progress-bar-height` / `--progress-bar-radius` — 进度条规格

=== 组件规则 ===

--- 按钮 ---
- 主按钮: --accent 背景，白色文字，--radius-sm 圆角，hover 态 --accent-hover
- 次要按钮: 透明背景，--border 边框，--fg-secondary 文字
- 图标按钮: 34×34px，--radius-sm，hover 态 --bg 背景
- 危险按钮: hover 态 --rose-subtle 背景 + --rose 文字 + --rose 边框
- 按钮文字必须使用动词，禁止模糊标签如"提交"

--- 卡片 ---
- 信息卡片: --surface 背景 + --border 边框 + --radius-md，无阴影
- 主内容卡片: --surface 背景 + --shadow-card + --radius-lg
- 紧凑模式: 指标行 padding 减至 8px，字号缩小

--- 状态药丸 ---
- 结构: 色点 (5×5px) + 文字
- 样式: pill 圆角，语义色浅底 + 语义色文字
- 变体: success / warning / error / neutral
- neutral 使用 --bg 背景 + --fg-secondary 文字

--- 进度条 ---
- 容器: 90×5px, --bg 背景, 3px 圆角
- 填充: 3px 圆角，颜色变体 green(--teal) / gold(--gold) / orange(--accent)

--- 搜索框 ---
- pill 圆角，--bg 背景 + --border 边框
- 聚焦态: --accent 边框 + box-shadow 0 0 0 3px rgba(245,78,0,0.08)
- 内部: 搜索图标 + input + 快捷键提示

--- 图表 Tab ---
- pill 圆角小按钮组
- 默认态: --surface 背景 + --border 边框 + --fg-secondary 文字
- Active 态: --accent 背景 + 白色文字
- 间距: 3px gap

--- KPI 指标条 ---
- 6 列等宽网格
- 每项: 图标色块 (28×28px) + 数值 + 标签 + 趋势标签
- 列间用 --border 分割线分隔（最后一列无分割线）

--- 活动Feed ---
- 时间线风格: 色点 (7×7px) + 文字 + 时间
- 色点颜色对应事件类型（peach=用户行为，teal=系统事件，rose=退款/异常，gold=安全事件）

=== 状态规则 ===

- Loading: 骨架屏优先，禁止全页面单一 spinner
- Empty: 说明为空原因 + 提供有效下一步操作
- Error: 说明失败原因 + 重试或下一步操作
- Disabled: 降低透明度，移除可操作暗示
- Permission denied: 说明缺少的权限，隐藏不可用的 CTA
- Validation error: 字段级消息 + 修复指引
- Success: Toast 通知或内联状态更新
- Hover: 轻微背景变化或阴影提升，transition 0.15s
- Active/Selected: --accent-subtle 背景 + --accent 文字

=== 可访问性规则 ===

- 使用语义化 HTML: header, nav, main, aside, section
- 键盘导航: 所有可交互元素可通过 Tab 访问
- 可见焦点态: 搜索框使用 ring 效果，按钮使用可见 focus 样式
- 图标按钮必须有 aria-label 或 title 属性
- 表单字段必须关联 label
- 状态不能仅靠颜色传达，必须同时使用文字或图标
- 对话框必须捕获焦点并在关闭时还原焦点
- 图片必须有 alt 文本
- 可点击区域最小 34×34px

=== 响应式规则 ===

断点:
- 桌面: > 1400px — 完整布局
- 中等: 1024px ~ 1400px — 部分网格折叠
- 平板/小屏: < 1024px — 侧边栏收起为移动抽屉，网格变单列
- 手机: < 640px — 间距缩小，搜索框隐藏

关键响应行为:
- < 1400px: KPI 条从 6 列变 3 列
- < 1024px:
  - 侧边栏变为 fixed 抽屉，通过汉堡按钮触发
  - 所有双列网格变单列
  - 搜索框隐藏
  - 内容 padding 缩小至 20px
- < 640px:
  - 环形图下方图例垂直排列
  - 表格 padding 缩小至 14px
  - 内容 padding 缩小至 16px
  - 外边距缩小至 8px

=== 数据获取与状态管理 ===

- Server Components 处理静态或服务端可读的数据
- Client Components 仅用于交互、浏览器 API、本地状态、客户端数据 hooks
- 不要因为一个组件需要交互就把整个页面标记为 "use client"
- API 适配器和数据映射放在低级 UI 组件之外
- Loading / Empty / Error 状态必须在消费数据的组件附近渲染
- Query keys 必须稳定且包含筛选/分页参数

=== 表单规则 ===

- 使用 react-hook-form + zod schema 验证
- 验证错误出现在相关字段附近
- 提交按钮必须显示 pending 状态并防止重复提交
- 破坏性操作需要二次确认
- 敏感输入（密码、API Key）使用 type="password" 或掩码显示
- 服务端错误映射回对应字段

=== 安全规则 ===

- 不渲染未经消毒的 HTML（禁止直接使用 dangerouslySetInnerHTML，除非经过 DOMPurify 等库处理）
- 不在 localStorage 存储长期敏感 token，除非项目明确接受此风险
- 不信任客户端角色检查作为唯一权限边界
- 破坏性操作（删除、退款、退出登录）必须二次确认
- URL 跳转验证: 禁止开放重定向
- 文件上传: 限制类型和大小，预览不信任 MIME 类型
- 前端隐藏 ≠ 权限控制，敏感操作必须有服务端权限校验
- 不在客户端代码中存储密钥或私有 API Key

=== 性能规则 ===

- 图片必须有明确的 width/height 或 aspect-ratio
- 首屏以下的重内容使用懒加载
- 大列表使用虚拟滚动或分页
- 避免不必要的 Client Components
- 列表渲染使用稳定的 key
- 渲染路径中避免昂贵的重计算
- 后台管理工具优先保证渲染可预测和扫描速度，而非装饰性动画
- transition 时长不超过 0.25s，优先使用 ease

=== 交互文案规则 ===

- 按钮文字使用简短动词（如"导出"而非"提交"，"保存"而非"确定"）
- 破坏性操作必须明确描述后果（如"退出登录"而非"退出"）
- 空状态说明原因并提供下一步操作
- 错误消息指明失败内容并提供恢复方式
- 成功消息确认已完成的具体操作
- 产品术语保持一致（学员、课程、订单、商城等）

=== 设计令牌与主题规则 ===

- 所有视觉值通过 CSS Variables 或 Tailwind theme tokens 引用
- 禁止在组件中硬编码颜色值（如 style="color: #f54e00"）
- 语义令牌优先于原始颜色（使用 --success 而非 --teal 表达成功）
- Tailwind 项目中优先使用配置好的 theme tokens 和 CSS Variables
- Arbitrary values 仅在匹配已有设计令牌或不可避免的布局约束时使用

=== 代码落地约束 ===

文件组织:
- app/ 放路由页面
- components/ui 放基础 UI 组件
- components/layout 放布局组件（Sidebar, Header, AppShell）
- components/<domain> 放业务组件（StudentList, CourseCard）
- lib/ 放 API 适配器、工具函数、数据映射
- types/ 放 TypeScript 类型定义
- page.tsx 只负责路由级组织，不承载所有 UI 细节

命名规范:
- 组件文件使用 PascalCase: StudentTable.tsx
- 工具函数使用 camelCase: formatDate.ts
- CSS 变量使用 kebab-case: --accent-subtle
- 常量使用 UPPER_SNAKE_CASE: MAX_PAGE_SIZE

TypeScript:
- 所有组件 props 定义类型
- API 响应定义类型
- 禁止 any，未知类型使用 unknown

=== 不要做的事 ===

- 不要引入色板之外的颜色
- 不要在普通卡片上使用渐变背景
- 不要混用多个 UI 库
- 不要使用装饰性重阴影
- 不要让按钮文字溢出
- 不要在移动端使用过小的文字（最小 11px）
- 不要隐藏重要的加载/空/错误状态
- 不要把所有代码放入一个巨大的页面文件
- 不要使用营销 Hero 布局做管理后台
- 不要在前端代码中硬编码密钥或 API Key
- 不要直接渲染未经验证的外部 HTML
- 不要仅靠前端隐藏控制权限
- 不要跳过 UI 变更后的实际渲染验证
- 不要在 Tailwind 项目中使用未配置的任意颜色值
- 不要在同一个页面上混用不同圆角风格

=== 质量检查清单 ===

每完成一个页面或组件，必须验证:

[ ] 色彩 — 所有颜色来自设计令牌，无硬编码 hex
[ ] 字体 — 仅使用 Outfit / DM Sans / JetBrains Mono 三个字体族
[ ] 字号 — 仅使用字体系统表中列出的字号
[ ] 间距 — 使用 4px 倍数间距系统
[ ] 圆角 — 使用 --radius-sm/md/lg/pill 四个令牌
[ ] 状态完整性 — Loading / Empty / Error / Disabled 四态覆盖
[ ] 组件一致性 — 按钮、卡片、表格、状态药丸遵循组件规则
[ ] 响应式 — 至少在桌面宽度和移动宽度检查渲染
[ ] 可访问性 — 语义 HTML、键盘导航、aria-label
[ ] 数据获取 — S/C Component 边界正确，Loading/Error 状态就近渲染
[ ] 表单 — 验证、提交状态、防重复提交
[ ] 安全 — 无 XSS 风险、无密钥泄露、破坏性操作有确认
[ ] 性能 — 图片有尺寸、列表有分页/虚拟化、无多余 Client Component
[ ] 代码结构 — 文件组织符合规范，类型定义完整
[ ] 交互文案 — 按钮动词明确、错误消息可操作、术语一致
[ ] 实际渲染 — 在浏览器中打开并验证，不能仅靠 build 通过
```

---

## 页面特定补充规则

### Dashboard 数据面板

- 系统状态面板必须包含: CPU、内存、磁盘、API 响应时间、运行时间
- 交易数据面板必须包含: 今日交易额、待处理订单、退款中、转化率、客单价
- KPI 条使用 6 列等宽布局，每个指标必须包含趋势标签（↑ up / ↓ down / 稳定）
- 折线图必须有渐变填充区域 + 悬停放大圆点
- 环形图必须有中心汇总数值 + 右侧图例列表
- 表格必须有头像渐变色（135deg 方向，使用色板中的两色渐变）

### 表格通用规则

- 表头使用 --surface-alt 背景，大写字母，letter-spacing: 0.04em
- 行悬停: rgba(38,37,30,0.02)
- 用户列: 圆形头像 (30px, pill) + 姓名 + 邮箱 (11.5px, --fg-muted)
- 单号/ID 列: 等宽字体 (--font-mono)
- 状态列: 状态药丸 (pill, 语义色)
- 表格容器支持横向滚动，最小宽度 480px
- 滚动条: 4px 高度，--border-medium 颜色

---

## 工具或平台特定补充

### Tailwind CSS 集成

将 CSS Variables 映射到 Tailwind 配置:

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        fg: 'var(--fg)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        gold: { DEFAULT: 'var(--gold)', subtle: 'var(--gold-subtle)' },
        teal: { DEFAULT: 'var(--teal)', subtle: 'var(--teal-subtle)' },
        rose: { DEFAULT: 'var(--rose)', subtle: 'var(--rose-subtle)' },
        brown: { DEFAULT: 'var(--brown)', subtle: 'var(--brown-subtle)' },
        peach: { DEFAULT: 'var(--peach)', subtle: 'var(--peach-subtle)' },
        success: { DEFAULT: 'var(--success)', bg: 'var(--success-bg)' },
        warning: { DEFAULT: 'var(--warning)', bg: 'var(--warning-bg)' },
        error: { DEFAULT: 'var(--error)', bg: 'var(--error-bg)' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
      },
    },
  },
}
```

### shadcn/ui 主题映射

```
--background → var(--surface)        // 0 - 背景
--foreground → var(--fg)             // 0 - 前景
--card → var(--surface)              // 1 - 卡片
--card-foreground → var(--fg)        // 1
--popover → var(--surface)           // 2 - 弹出层
--popover-foreground → var(--fg)     // 2
--primary → var(--accent)            // 3 - 主色
--primary-foreground → #ffffff       // 3
--secondary → var(--bg)              // 4 - 次要
--secondary-foreground → var(--fg)   // 4
--muted → var(--bg)                  // 5 - 静音
--muted-foreground → var(--fg-muted) // 5
--accent → var(--accent-subtle)      // 6 - 强调
--accent-foreground → var(--accent)  // 6
--destructive → var(--rose)          // 7 - 破坏性
--destructive-foreground → #ffffff   // 7
--border → var(--border)             // 8
--input → var(--border-medium)       // 9
--ring → var(--accent)               // 10
```

---

## 前端工程规则

### Makefile 集成

如果项目有 Makefile，优先查看并使用 make 暴露的命令:

```makefile
# 示例参考
dev:        # 启动开发服务器
build:      # 生产构建
lint:       # 代码检查
typecheck:  # 类型检查
test:       # 运行测试
e2e:        # E2E 测试
```

### Git 工作流

- 功能分支: feature/<domain>-<description>
- 修复分支: fix/<description>
- 提交信息: 中文或英文，简明描述变更内容
- 提交前必须通过 lint + typecheck

---

## 代码落地约束

### Mock 数据格式

所有 Dashboard 相关 mock 数据必须符合以下结构:

```typescript
// types/dashboard.ts
interface SystemStatus {
  cpu: number            // 百分比
  memory: { used: number; total: number; unit: 'GB' }
  disk: { used: number; total: number; unit: 'GB' }
  apiResponseMs: number
  uptime: string         // "47 天 12 小时"
}

interface TransactionSummary {
  todayAmount: number
  pendingOrders: number
  refunding: number
  conversionRate: number  // 百分比
  avgOrderValue: number
}

interface KpiItem {
  icon: string           // lucide icon name
  value: string | number
  label: string
  trend: { direction: 'up' | 'down' | 'stable'; value: string }
  colorTheme: 'orange' | 'gold' | 'teal' | 'rose' | 'brown' | 'peach'
}

interface ActivityItem {
  type: 'user' | 'system' | 'refund' | 'security'
  actor: string
  action: string
  time: string
}

interface LoginRecord {
  user: { name: string; email: string; avatar: string }
  time: string
  ip: string
  status: 'mfa_verified' | 'new_device' | 'mfa_failed'
}

interface OrderRecord {
  id: string
  product: string
  amount: number
  status: 'completed' | 'pending' | 'refunding' | 'shipped'
}
```

---

## 质量检查清单

完成每个前端任务后，对照以下清单逐项验证:

### 视觉一致性
- [ ] 所有颜色来自设计令牌
- [ ] 字体族仅使用 Outfit / DM Sans / JetBrains Mono
- [ ] 字号来自字体系统表
- [ ] 圆角使用 --radius-sm/md/lg/pill
- [ ] 间距使用 4px 倍数系统

### 组件一致性
- [ ] 按钮变体正确使用（primary / secondary / icon / danger）
- [ ] 卡片层级正确（shadow-card vs border-only）
- [ ] 状态药丸使用正确的语义色映射
- [ ] 表格遵循表头/行/悬停规范

### 状态完整性
- [ ] Loading 态有骨架屏或 spinner
- [ ] Empty 态有说明和下一步操作
- [ ] Error 态有失败原因和恢复方式
- [ ] Disabled 态有视觉降低
- [ ] 表单有字段级验证消息

### 响应式
- [ ] 桌面端布局正确
- [ ] 平板端布局正确（< 1024px）
- [ ] 移动端布局正确（< 640px）
- [ ] 表格在窄屏可横向滚动

### 可访问性
- [ ] 使用语义化 HTML
- [ ] 图标按钮有 aria-label
- [ ] 表单字段关联 label
- [ ] 状态不仅靠颜色传达
- [ ] 可点击区域 ≥ 34px

### 安全
- [ ] 无 XSS 风险
- [ ] 无密钥泄露
- [ ] 破坏性操作有确认
- [ ] 权限边界有服务端校验

### 性能
- [ ] 图片有明确尺寸
- [ ] 大列表有分页或虚拟化
- [ ] 无不必要的 Client Component

### 工程质量
- [ ] TypeScript 类型完整
- [ ] 文件组织符合规范
- [ ] 通过 lint + typecheck
- [ ] 在浏览器中实际验证渲染结果
