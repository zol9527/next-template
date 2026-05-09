# 硕博达小程序 — 设计系统规范

---

## 1. 视觉气质 (Mood)

**关键词**: 矿物感 (mineral) + 自然教育 (botanical)

整体风格克制、专业、清爽，带有知识教育类产品的信任感。主色为自然绿，搭配青灰色中性色系。不过度装饰，依靠清晰的层级关系和稳定的间距来传递品质。

---

## 2. 颜色系统 (Color System)

### 2.1 Primary 主色

| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | `#009666` | 主按钮、Active Tab、关键 CTA、品牌强调 |
| Brand Dark | `#004D40` | Logo 文字、深色 Banner 渐变起点 |
| Primary Light | `#E8F7F0` | 图标背景容器、Active Tag 背景 |

**约束规则**:
- Primary 只用于关键操作和选中状态，不要大面积填充
- 品牌文字（VANTAGE）固定使用 Brand Dark + Inter 800 + letter-spacing 2px

### 2.2 Neutral 中性色

| 名称 | 色值 | 用途 |
|------|------|------|
| Background | `#F5F7F6` | 页面全局背景 |
| Surface | `#FFFFFF` | 卡片、面板、弹窗背景 |
| Border | `#E2EBED` | 边框、分割线 |
| Text Primary | `#1A2E35` | 主要文字、标题 |
| Text Muted | `#6B8A94` | 辅助文字、说明、Caption |

**约束规则**:
- 页面背景统一使用 `#F5F7F6`，不要使用纯白（纯白留给卡片）
- 边框统一使用 `#E2EBED`，不要引入额外的灰色
- 文字只用两个层级：Primary `#1A2E35` 和 Muted `#6B8A94`

### 2.3 Accent 强调色

| 名称 | 色值 | 用途 |
|------|------|------|
| Accent | `#F5A623` | 邀请按钮、特殊 CTA |
| Warm BG | `#FFF0E8` | 邀请 Banner 背景 |

**约束规则**:
- Accent 色只用于特殊场景的 CTA，不要和 Primary 混用

### 2.4 渐变色 (Gradients)

| 名称 | 值 | 用途 |
|------|-----|------|
| Light Teal | `linear-gradient(135deg, #E8F5EE, #CEE8DA)` | Banner 背景、探索卡片 |
| Dark Teal | `linear-gradient(135deg, #3B6B5E, #2A5247)` | 每日学习卡片、VIP Banner |
| Profile Hero | `linear-gradient(135deg, #4A7A6D, #3A6358)` | 个人中心头部 |
| Thumbnail | `linear-gradient(135deg, #F0F5F2, #DDE9E3)` | 课程/商品缩略图占位 |

**约束规则**:
- 所有渐变角度统一 135deg
- 渐变只在 Banner/Hero 区域和缩略图占位使用，不在普通卡片上使用
- 渐变方向必须从浅到深（左上到右下）

---

## 3. 字体层级 (Typography)

### 3.1 字体族

| 用途 | 字体 |
|------|------|
| 品牌英文 Logo | `Inter` (Google Fonts, variable weight) |
| 中文标题 | `"PingFang SC", system-ui, sans-serif` |
| 正文/UI | `system-ui, sans-serif` |
| 代码/数值标注 | `"JetBrains Mono", monospace` |

### 3.2 字体层级表

| 层级 | 字体 | 字重 | 字号 | 行高 | 颜色 | 用途 |
|------|------|------|------|------|------|------|
| Brand Logo | Inter | 800 | 22px | 28px | #004D40 | VANTAGE 品牌标识，letter-spacing: 2px |
| Page Title | PingFang SC | 600 | 22px | 30px | #1A2E35 | 页面主标题（如"我的订单"） |
| Section Title | PingFang SC | 600 | 17px | 24px | #1A2E35 | 区块标题（如"探索内容""热门推荐"） |
| Banner Subtitle | PingFang SC | 600 | 20px | 28px | #1A2E35 | Banner 内副标题 |
| Card Title | system-ui | 600 | 14px | 20px | #1A2E35 | 卡片内标题、课程名 |
| Body | PingFang SC | 400 | 13px | 18px | #1A2E35 | 正文内容 |
| Caption | system-ui | 400 | 13px | 18px | #6B8A94 | 辅助说明（如"查看全部→"） |
| Label | system-ui | 500 | 11px | 14px | #6B8A94 | 小标签（如"128门课程""每日签到"） |
| Badge Text | system-ui | 600 | 11px | 14px | #FFFFFF | VIP/限时 标签 |
| Button | system-ui | 600 | 13px | 16px | #FFFFFF | 按钮文字 |
| Button Small | system-ui | 600 | 12px | 16px | #FFFFFF | 小按钮文字（如"立即邀请"） |
| Tab Bar | system-ui | 400/500 | 10px | 12px | 视状态 | 底部导航文字 |
| Section Label | system-ui | 600 | 11px | - | #6B8A94 | Section 编号标签（如"01 · COLOR"），letter-spacing: 1px |

**约束规则**:
- 字号只使用上述层级中的值，不要使用 15px、18px 等中间值
- 中文字体统一 PingFang SC，英文/数字统一 system-ui 或 Inter
- 通过颜色和字重来区分层级，不要只依赖字号

---

## 4. 间距系统 (Spacing)

基于 4px/8px 基准，实际使用的间距值：

| 值 | 用途 |
|----|------|
| 2px | 极小间距（如邀请 Banner 文字行距） |
| 4px | 图标与文字间距、卡片内子元素最小间距 |
| 6px | Quick Grid gap、进度指示器间距 |
| 8px | Tab 间距、搜索框内 gap |
| 10px | 卡片内部 padding-top/bottom |
| 12px | 课程列表 gap、菜单项图标间距、搜索框 padding-bottom、Section 间距 |
| 14px | 课程卡片内 padding、订单项 padding |
| 16px | 搜索框 padding-inline、订单列表 padding、组件间距 |
| 18px | 邀请 Banner padding-block |
| 20px | 页面水平 padding、Section 间距、Banner margin |
| 24px | Banner padding-block、Footer padding-top |
| 32px | Footer padding-bottom、大区块间距 |

**约束规则**:
- 页面水平 padding 固定 20px，所有内容不超出此范围
- 卡片与卡片之间的间距使用 12px 或 20px
- 不要使用非标准间距值（如 13px、17px）

---

## 5. 圆角系统 (Border Radius)

| 值 | 用途 |
|----|------|
| 8px | 缩略图圆角（课程小图） |
| 10px | 设计规范中色块展示 |
| 12px | 图标容器（Quick Grid）、缩略图、菜单图标背景 |
| 16px | 卡片、面板、商品卡、订单卡 |
| 20px | 药丸形按钮、搜索框、Banner、Tab 标签 |

**约束规则**:
- 按钮和搜索框使用 20px（药丸形）
- 卡片使用 16px
- 图标容器/缩略图使用 12px
- 不要在同一页面混用不同圆角风格

---

## 6. 阴影与边框 (Shadow & Border)

### 6.1 边框

| 类型 | 值 | 用途 |
|------|-----|------|
| Standard | `1px solid #E2EBED` | 卡片、订单、课程列表、Tab 分割线 |
| Search | `1.5px solid #E2EBED` | 搜索框（稍粗以突出交互） |

### 6.2 阴影

| 类型 | 值 | 用途 |
|------|-----|------|
| Tab Bar | `0px -1px 12px rgba(0,0,0,0.06)` | 底部导航栏上方微阴影 |

**约束规则**:
- 卡片只使用边框，不使用阴影
- 阴影只在 Tab Bar 使用，且非常轻微
- 优先级：边框 > 背景色差异 > 阴影

---

## 7. 布局框架 (Layout)

小程序画布宽度: **375px**

### 7.1 通用结构

```
┌─────────────────────────────┐
│ Header (375×62px, bg: #FFF) │  ← padding: 16px 20px 10px
├─────────────────────────────┤
│ Search (375×55px, bg: #FFF) │  ← padding: 0 20px 12px
├─────────────────────────────┤
│                             │
│  Content Area (bg: #F5F7F6) │  ← padding: 0 20px
│  margin/padding between     │     gap: 12-20px
│  sections: 12-20px          │
│                             │
├─────────────────────────────┤
│ Tab Bar (375×56px, fixed)   │  ← bg: #FFF, shadow
└─────────────────────────────┘
```

### 7.2 Header 组件

- 高度: 62px
- 左侧: Logo 文字 (Inter 800, 22px, #004D40)
- 右侧: 功能图标 (36×36px 容器, 18px SVG 图标)
- 背景: #FFFFFF
- 某些页面（如订单页）使用页面标题替代 Logo

### 7.3 Tab Bar 组件

- 高度: 56px (含底部安全区)
- 四个 Tab: 首页、商城、订单、我的
- Active 状态: 图标 #009666, 文字 #009666
- Inactive 状态: 图标 #6B8A94, 文字 #6B8A94
- 图标大小: 22×22px
- 文字大小: 10px

### 7.4 Quick Grid

- 每行 4 个，使用 `grid-template-columns: repeat(4, 1fr)`
- 每个格子: 79px 宽
- 图标容器: 44×44px, border-radius: 12px, bg: #E8F7F0
- 图标 SVG: 22×22px
- 文字: 11px, #6B8A94

---

## 8. 组件规范 (Components)

### 8.1 按钮 (Button)

| 变体 | 背景 | 文字 | 圆角 | padding |
|------|------|------|------|---------|
| Primary | #009666 | #FFFFFF 600 13px | 20px | 8px 16px |
| Primary Small | #009666 | #FFFFFF 600 12px | 20px | 8px 16px |
| Accent | #F5A623 | #FFFFFF 600 12px | 20px | 8px 16px |
| Tag Active | #009666 | #FFFFFF 600 13px | 20px | 7px 18px |

### 8.2 搜索框 (Search Bar)

- 背景: #F5F7F6
- 边框: 1.5px solid #E2EBED
- 圆角: 20px
- 内边距: 10px 16px
- 搜索图标: 15×15px
- Placeholder 文字: 13px, #6B8A94

### 8.3 卡片 (Card)

- 背景: #FFFFFF
- 边框: 1px solid #E2EBED
- 圆角: 16px
- 内边距: 14px
- 缩略图: 100×80px, border-radius: 12px

### 8.4 菜单项 (Menu Item)

- 内边距: 14px 16px
- 图标容器: 32×32px, border-radius: 8px, bg: #E8F7F0
- 分割线: 1px solid #E2EBED
- 右侧箭头: #6B8A94

### 8.5 订单卡片 (Order Card)

- 背景: #FFFFFF
- 边框: 1px solid #E2EBED
- 圆角: 16px
- 头部 padding: 14px 16px
- 分割线: 1px solid #E2EBED

### 8.6 Banner (广告条)

- 圆角: 20px
- 内边距: 24px
- margin: 12px 20px 20px
- 渐变背景 (见渐变色章节)

---

## 9. 设计检查清单

每次完成新页面前，检查以下项目：

### 视觉一致性
- [ ] 页面背景是否使用 #F5F7F6
- [ ] 卡片背景是否使用 #FFFFFF + border #E2EBED
- [ ] Primary 色是否只用于关键位置
- [ ] 文字颜色是否只用 #1A2E35 和 #6B8A94 两种
- [ ] 圆角是否遵循 12/16/20px 三级

### 间距一致性
- [ ] 页面水平 padding 是否为 20px
- [ ] Section 间距是否为 12-20px
- [ ] 卡片内 padding 是否为 14-16px
- [ ] 是否避免了非标准间距值

### 字体层级
- [ ] 是否使用了正确的字体族
- [ ] 字号是否严格使用层级表中的值
- [ ] 中英文是否使用了正确的字体

### 组件规范
- [ ] 按钮是否使用药丸形 (radius: 20px)
- [ ] 卡片是否使用 16px 圆角 + 1px 边框
- [ ] 搜索框是否使用 1.5px 边框
- [ ] Tab Bar 是否固定底部，高度 56px
