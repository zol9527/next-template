# 系统配置管理 — 整体重构设计

> 日期: 2026-05-18
> 状态: 已批准
> Paper Design 参考: 6 个系统配置画板 (927-0, 9FK-0, 9JV-0, 9SC-0, 9XT-0, A3A-0)

## 1. 目标

将散落在 6 个独立路由的系统设置页面，重构为**统一的 Tab 导航页面** `/admin/settings`，UI 完全匹配 Paper Design 设计稿，API 层复用现有实现。

### 约束

- 不涉及 AppShell / 菜单部分的改动（合并时只需修改菜单项指向）
- API 层基本完善，前端对接为主，缺失时再补充
- 尽量复用现有业务逻辑组件，UI 层按设计稿重写

## 2. 路由架构

**整体替换策略**: 新建统一路由，删除旧路由，一次性完成。

| 变更类型 | 路径 |
|---------|------|
| 新建 | `src/app/admin/settings/page.tsx` |
| 删除 | `src/app/admin/site-config/page.tsx` |
| 删除 | `src/app/admin/feature-flags/page.tsx` |
| 删除 | `src/app/admin/agreements/page.tsx` |
| 删除 | `src/app/admin/ai-settings/page.tsx` |
| 删除 | `src/app/admin/data-management/page.tsx` |
| 删除 | `src/app/admin/logs/page.tsx` |
| 修改 | `sidebar-items.ts` → 系统配置 href 改为 `/admin/settings` |

## 3. 页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│ Tab Bar                                                          │
│ 站点配置 | 协议管理 | 功能开关 | AI设置 | 数据管理 | 日志管理      │
│                                              最后更新 | 保存配置  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  <ActiveTabContent />                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 组件文件结构

```
src/components/business/admin/settings/
├── settings-page.tsx                ← 主容器 (client component, Tab 状态管理)
├── settings-tab-bar.tsx             ← 顶部 Tab 导航栏 + 右侧操作区
├── tabs/
│   ├── site-config-tab.tsx          ← 站点配置面板
│   ├── agreement-tab.tsx            ← 协议管理面板
│   ├── feature-flags-tab.tsx        ← 功能开关面板
│   ├── ai-settings-tab.tsx          ← AI 设置面板
│   ├── data-management-tab.tsx      ← 数据管理面板
│   └── logs-tab.tsx                 ← 日志管理面板
└── shared/
    ├── settings-card.tsx            ← 通用设置卡片 (图标+标题头部 + 内容区)
    └── settings-form-section.tsx    ← 通用表单分区 (两列/三列网格)
```

### 3.2 Tab 状态管理

- `useState<'site-config' | 'agreement' | 'feature-flags' | 'ai-settings' | 'data-management' | 'logs'>` 管理当前激活 Tab
- 纯前端状态，无路由变化
- Tab 切换时组件卸载，React Query 缓存保留
- 「保存配置」按钮仅在需要保存的 Tab 显示（站点配置、AI 设置）

## 4. 各 Tab 面板设计

### 4.1 站点配置 (Site Config Tab)

**布局**: 纵向堆叠的分组卡片表单

| 分组卡片   | 图标色       | 字段                                                                    |
| ---------- | ------------ | ----------------------------------------------------------------------- |
| 基础信息   | 橙 `#F54E00` | 平台名称*(必填) + 平台标语 (两列), Logo 上传 (预览+更换按钮+尺寸提示)   |
| 关于页展示 | 金 `#C08532` | 3列统计卡片网格，每卡含图标+统计值输入框+描述输入框                     |
| 联系方式   | 绿 `#1F8A65` | 客服电话 + 客服微信号 + 客服邮箱 (三列)                                 |
| 备案与版权 | 棕 `#8B6F47` | ICP备案信息 + 版权声明 (两列)                                           |

**每张卡片结构**: 圆角白色卡片 → 图标+标题头(带底部分隔线) → 表单字段区

**API**: `GET/PUT /api/v1/admin/site-config`
**复用**: `admin-site-config-form.tsx` 的业务逻辑和 API 调用

### 4.2 协议管理 (Agreement Tab)

**布局**: 纵向列表卡片，每张为水平布局

每张卡片:
- **左侧**: 圆角图标容器(size-11) + 标题(Outfit 15px semibold) + 描述(11px muted)
- **右侧**: 版本号(JetBrains Mono 等宽) + 生效日期 + 状态徽章(绿点+已启用) + 编辑按钮

| 协议项   | 图标色       | 描述                     |
| -------- | ------------ | ------------------------ |
| 用户协议 | 橙 `#F54E00` | 用户注册时需要同意的服务条款 |
| 隐私政策 | 绿 `#1F8A65` | 数据收集、使用与保护声明   |
| 关于我们 | 金 `#C08532` | 平台介绍与关于页面内容     |

**交互**: 点击「编辑」打开 Dialog 编辑富文本内容
**复用**: `agreement/` 业务组件

### 4.3 功能开关 (Feature Flags Tab)

**布局**: 黄色警告横幅 + 3列卡片网格

- **警告横幅**: `功能开关变更会即时生效，请谨慎操作。建议在维护模式下进行关键功能的切换。`
- **卡片网格**: 每张含图标(圆角方块背景 size-10) + Toggle 开关 + 标题 + 描述

| 开关项       | 图标色       | 状态   |
| ------------ | ------------ | ------ |
| 全站维护模式 | 红 `#CF2D56` | 关闭   |
| 支付功能     | 绿 `#1F8A65` | 开启   |
| 公告功能     | 橙 `#F54E00` | 开启   |
| 推广功能     | 棕 `#8B6F47` | 开启   |
| 优惠券功能   | 金 `#C08532` | 关闭   |

**交互**: Toggle 直接调用 API 切换(即时生效，无保存按钮)，失败时回滚状态
**复用**: `use-feature-flag.ts` hook

### 4.4 AI 设置 (AI Settings Tab)

**布局**: 二级 Tab + 分组表单

- **二级 Tab**: Provider 配置 | Prompt 模板 | 使用统计 (胶囊样式)
- **Provider 配置表单**:
  - AI Provider (下拉选择, 橙色标签)
  - Base URL (文本输入)
  - API Key (密码框 + 显示/隐藏切换)
  - 文本模型 + 图像模型 (两列)
- **底部**: 测试连接(次按钮) + 保存配置(主按钮)

**复用**: `ai-settings/` 业务组件，增加二级 Tab 布局

### 4.5 数据管理 (Data Management Tab)

**布局**: 二级 Tab + 统计卡片 + 操作区 + 数据表格

- **二级 Tab**: 数据库备份 | 文件备份 | 数据导入 | 备份历史
- **统计卡片**: 4列 (数据表数、总行数、预估大小、预估耗时)
- **操作区**: 创建数据库备份(主按钮) + 完整备份(次按钮) + 最近备份时间
- **备份表格**: ID | 类型(蓝色DB/黄色Full标签) | 状态(绿色徽章) | 大小 | 创建时间 | 操作(下载/删除)

### 4.6 日志管理 (Logs Tab)

**布局**: 工具栏 + 日志文件选择器 + 日志列表

- **工具栏**:
  - 左侧: 刷新按钮 + 自动刷新 Toggle + 显示级别下拉(全部/INFO/WARN/ERROR)
  - 右侧: 统计徽章 (info蓝色/warn黄色/error红色 + 计数)
- **日志文件选择器**: 文件路径显示 + 显示条数
- **日志列表**: 每行 时间戳 | 级别标签 | HTTP方法 | 请求路径 | 状态码 | 响应时间

**复用**: `logs/` 业务组件，调整样式

## 5. 数据流架构

```
SettingsPage (client component)
├── Tab 状态: useState<SettingsTab>
│
├── SiteConfigTab ──→ useQuery(['site-config']) + useMutation(PUT)
├── AgreementTab ──→ useQuery(['agreements']) + useMutation(PUT)
├── FeatureFlagsTab ──→ useQuery(['feature-flags']) + useMutation(PATCH per flag)
├── AiSettingsTab ──→ useQuery(['ai-settings']) + useMutation(PUT)
├── DataManagementTab ──→ useQuery(['backups']) + useMutation(POST/DELETE)
└── LogsTab ──→ useQuery(['logs', {file, level}]) + refetchInterval(可选自动刷新)
```

每个 Tab 面板独立管理数据获取和状态，互不依赖。

## 6. 错误处理

| 场景                 | 处理方式                                    |
| -------------------- | ------------------------------------------- |
| 加载失败             | Tab 内部显示错误状态 + 重试按钮             |
| 保存失败             | Toast 通知 (sonner)，保持表单数据不丢失     |
| Toggle 切换失败      | 回滚 Toggle 状态 + Toast 错误提示           |
| 网络断开             | React Query retry 机制 + 全局 Toast         |
| 表单验证             | 前端 Zod schema + 后端 DTO 双重验证         |

## 7. 组件复用映射

| 现有组件                       | 复用方式                                    |
| ------------------------------ | ------------------------------------------- |
| `admin-site-config-form.tsx`   | 提取逻辑，UI 重写为分组卡片                 |
| `ai-settings/` 组件            | 调整布局，增加二级 Tab                      |
| `agreement/` 组件              | 调整为水平列表卡片样式                      |
| `logs/` 组件                   | 调整工具栏和日志行样式                      |
| `use-feature-flag.ts` hook     | 直接复用                                    |
| shadcn/ui 基础组件             | 全部复用 (Card, Input, Switch, Tabs, Badge 等) |
| `data-table/` 组件             | 数据管理页面的备份表格复用                  |
| `MaterialPicker`               | 站点配置的 Logo 选择复用                    |

## 8. 设计系统遵循

所有组件严格遵循 Design System (Paper Design `1-0`) 中的规范：

- **颜色**: CSS Variables (`--ds-accent`, `--fg`, `--surface` 等)
- **排版**: `.heading-2` 卡片标题, `.text-body` 表单标签, `.text-caption` 辅助文字
- **圆角**: `--radius-md` (12px) 卡片, `--radius-sm` (8px) 输入框/按钮
- **阴影**: `--shadow-card` 卡片阴影
- **字体**: Outfit 标题, DM Sans 正文, JetBrains Mono 版本号/代码
- **间距**: 4px 基线 (`--space-1` ~ `--space-8`)
