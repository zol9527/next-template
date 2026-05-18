# 用户管理模块重构设计文档

> 日期: 2026-05-18
> 状态: 已确认
> Paper Design 参考: 3FJ-0, 7HY-0, 4MK-0, 4ML-0, 4MM-0, 4YZ-0, 4Z0-0

---

## 1. 背景与目标

### 当前状况
- 用户管理 (`/admin/users`) 和角色权限管理 (`/admin/rbac`) 是两个独立路由
- 用户管理页面 655 行单体组件，用户详情 Sheet 无 Tab 分类
- 角色管理使用左右分栏 + 内联编辑矩阵
- UI 风格与 Paper Design 设计稿不一致

### 重构目标
1. **完全对齐 Paper Design** — 7 个 artboard 的所有页面、交互、视觉细节
2. **合并路由** — 用户列表和角色管理合并为单页 Tab 切换
3. **组件化拆分** — 每个文件 ≤ 200 行，单一职责，独立可测试
4. **补齐 API** — 新增编辑用户、编辑角色等缺失端点
5. **独立可合并** — 不涉及 AppShell/菜单改动，合并时只需修改菜单项指向

### 不在范围内
- AppShell / 侧边栏 / 导航菜单
- 登录页面
- 其他模块（博客、商城等）

---

## 2. 页面路由

```
/admin/users          → 用户管理主页（合并版）
  ├── Tab: 用户列表   → 用户表格 + 状态筛选 + 详情/编辑 Drawer
  └── Tab: 角色管理   → 角色卡片网格 + 编辑角色 Drawer
```

- 移除 `/admin/rbac` 独立路由（代码保留，但不在菜单中暴露）
- 未来合并时，菜单中"用户管理"指向 `/admin/users`，包含两个 Tab

---

## 3. 组件架构

### 3.1 文件结构

```
src/components/business/admin/user/
├── user-management-page.tsx          # 主页面容器（Tab 切换）
├── user-list-tab.tsx                 # 用户列表 Tab 内容
├── user-list-header.tsx              # CardHeader: 标题+搜索+筛选+添加
├── user-status-pills.tsx             # 状态筛选药丸（全部/活跃/未验证/禁用）
├── user-filter-bar.tsx               # 高级筛选栏（搜索+下拉+chip）
├── user-table-columns.tsx            # 表格列定义
├── user-detail-drawer.tsx            # 用户详情 Drawer 外壳（3 Tab）
├── user-basic-info-tab.tsx           # Tab1: 基本信息
├── user-role-assignment-tab.tsx      # Tab2: 角色分配
├── user-permission-detail-tab.tsx    # Tab3: 权限详情
└── edit-user-drawer.tsx              # 编辑用户表单 Drawer

src/components/business/admin/rbac/
├── role-list-tab.tsx                 # 角色管理 Tab（卡片网格）
├── role-card.tsx                     # 单个角色卡片
└── edit-role-drawer.tsx              # 编辑角色 Drawer（权限配置）
```

### 3.2 设计原则
- 每个文件 ≤ 200 行，单一职责
- Drawer 统一使用 shadcn/ui `Sheet` 组件
- 复用现有 `DataTable`, `AdminPageLayout`, `Badge`, `Switch` 等通用组件
- 严格遵循 Design System（`#F54E00` 主色, DM Sans, 圆角 12px 卡片等）
- 所有颜色使用 CSS 变量 `var(--ds-accent)` 等，不硬编码

---

## 4. 后端 API 变更

### 4.1 新增端点

#### PUT /api/v1/admin/users/[id]
- **用途**: 编辑用户基本信息
- **权限**: `admin:users:write`
- **请求体**: `{ nickname?, email?, phone?, status? }`
- **响应**: `{ user: SafeAdminUserDetail }`
- **实现**: 在 `users/[id]/route.ts` 中新增 PUT handler

#### GET /api/v1/admin/rbac/roles/[id]
- **用途**: 获取单个角色详情（含权限列表和分配用户数）
- **权限**: `admin:rbac:read`
- **响应**: `{ role: { id, name, description, grants, userCount, createdAt, updatedAt } }`
- **实现**: 在 `roles/[id]/route.ts` 中新增 GET handler

#### PUT /api/v1/admin/rbac/roles/[id]
- **用途**: 编辑角色名称和描述
- **权限**: `admin:rbac:write`
- **请求体**: `{ name?, description? }`
- **响应**: `{ role: AdminRoleDetail }`
- **实现**: 在 `roles/[id]/route.ts` 中新增 PUT handler

### 4.2 修改端点

#### GET /api/v1/admin/users
- **新增查询参数**: `role?: string`（按角色 ID 筛选）
- **新增响应字段**: `lastLoginAt?: string`, `lastDevice?: string`
- **实现**: 从 sessions 表聚合最后登录信息；增加 role 过滤逻辑

### 4.3 DTO 变更

```typescript
// AdminUserListItemSchema 新增字段
lastLoginAt: z.string().nullable().optional()
lastDevice: z.string().nullable().optional()

// AdminUserListQuerySchema 新增参数
role: z.string().optional()

// 新增 schemas
UpdateUserRequestSchema: { nickname?, email?, phone?, status? }
UpdateRoleRequestSchema: { name?, description? }
AdminRoleDetailSchema: { id, name, description, grants, userCount, createdAt, updatedAt }
```

### 4.4 不需要修改的端点
- 用户角色 CRUD (`/users/[id]/roles`) — 已完整
- 角色权限 CRUD (`/roles/[id]/permissions`) — 已完整
- 权限列表 (`/permissions`) — 已完整
- 用户会话 (`/users/[id]/sessions`) — 已完整
- 用户操作 (`/users/[id]/disable`, `/enable`, `/unlock`, `/revoke-sessions`, `/mfa/reset`, `/upload-permission`) — 已完整

---

## 5. 7 个页面的交互设计

### 5.1 用户列表 — 默认视图 (3FJ-0)

**CardHeader 区域**:
- 左侧: "用户管理" 标题 (Outfit 18px semibold) + "128 位用户" 灰色副标题
- 右侧: 搜索框 (圆角全宽) + 筛选按钮 + "添加用户" 主色按钮 (#F54E00)

**状态药丸行**:
- 全部(128) | 活跃(96) | 未验证(18) | 禁用(14)
- 选中项: `bg-[#F54E00] text-white`，带数字徽章
- 未选中项: `bg-white border border-[#26251E14]`，数字徽章用对应语义色
- 右侧: "全部角色 ▾" + "最近登录 ▾" 下拉按钮

**表格列**:
| 列     | 内容                                                | 宽度    |
| ------ | --------------------------------------------------- | ------- |
| ☑      | Checkbox                                            | w-7     |
| 用户   | 头像圆(30px,渐变底色) + 名字(13px medium) + 邮箱(11.5px gray) | w-60   |
| 角色   | 角色 pill(s) — 不同角色不同底色                     | w-45   |
| 状态   | 圆点(5px) + 文字 (绿=活跃, 橙=未验证, 红=禁用)     | w-25   |
| 最后登录 | 相对时间 ("今天 14:32")                           | w-35   |
| 登录设备 | "Chrome · macOS" + IP (JetBrains Mono 11px)      | flex-1 |
| ⋯      | 更多操作按钮                                        | w-10   |

**选中行**: `border-left: 3px solid #F54E00` + `bg-[#F54E000A]` 浅橙底

### 5.2 用户列表 — 筛选模式 (7HY-0)

**筛选栏**:
- 搜索框 + "全部状态 ▾" + "全部角色 ▾" + "全部部门 ▾" 下拉
- 右侧: "已筛选" 橙色标签 + "导出" 按钮
- 搜索框含 `⌘K` 快捷键提示

**筛选 Chip 行** (当有激活条件时显示):
- "已选条件:" + 可移除 chip (如 "状态: 活跃 ✕")
- 每种 chip 使用对应语义色的浅底色
- "清除全部" 文字按钮

### 5.3 用户详情 Drawer (3FJ-0 → 3 Tab)

**Drawer 规格**: 480px 宽，右侧滑入

**Drawer 头**:
- 头像圆(30px) + 用户名 + 角色标签(pill) + 关闭按钮

**Tab 栏**: "基本信息" | "角色分配" | "权限详情"
- 选中项: `bg-[#F54E00]` 橙色背景白色文字
- 未选中项: 白色背景灰色文字

**Tab 1 — 基本信息**:
- 个人资料卡: 大头像 + 名字 + UID + "注册于 YYYY-MM-DD" + 状态圆点
- 信息行列表: 邮箱、手机号、部门、角色、最后登录、登录IP、两步验证
- 底部按钮: "编辑信息"(主色实心) + "禁用账户"(边框) 或 "启用账户"

**Tab 2 — 角色分配**:
- 警告横幅: 黄色背景 "角色变更后，用户权限将立即生效"
- 角色列表: 每项为卡片 — Checkbox + 角色名 + "高危"红色标签(仅超管) + 描述 + "共 X 项权限"
- 选中卡片: 橙色边框 + 橙色勾选
- 底部: 取消 + 保存角色

**Tab 3 — 权限详情**:
- 继承横幅: 盾牌图标 + "通过「角色名」角色继承全部权限" + "共 X 项权限 · Y 个模块"
- 手风琴模块列表: 图标 + 模块名 + "X/Y" 计数 + 展开箭头
- 展开内容: 每个权限行 — 绿色圆点(已授权) + 权限中文名 + 英文 code (JetBrains Mono)

### 5.4 编辑用户 Drawer (4MK-0)

**Drawer 规格**: 480px 宽

**表单内容**:
- 头像编辑区: 大头像 + 相机图标 badge
- **基本信息**: 姓名* + 邮箱* + 手机号 + 部门(下拉) + 账户状态(下拉)
- **安全设置**: 重置密码行(描述+发送按钮) + 两步验证(绿色 Toggle)
- 底部: 取消 + 保存修改

### 5.5 角色管理 — 卡片网格 (4YZ-0)

**布局**: 2×3 网格，gap 适中

**卡片内容**:
- 顶部: 彩色图标圆 + 角色名(bold) + "高危"红色标签(可选)
- 描述: 一行灰色文字
- 底部: "X 项权限"(左, 橙色) + "Y 人"(右, 灰色)

**角色配色方案**:
| 角色     | 图标底色      |
| -------- | ------------- |
| 超级管理员 | 浅橙          |
| 管理员     | 浅蓝          |
| 教务       | 浅黄          |
| 财务       | 浅绿          |
| 班主任     | 浅紫          |
| 讲师       | 浅青          |

### 5.6 编辑角色 Drawer (4Z0-0)

**Drawer 规格**: 520px 宽

**内容**:
- 头部: 编辑图标 + "编辑角色" + 删除图标(红色) + 关闭按钮
- **角色信息**: 角色名称输入 + 描述文本域 + "已分配用户: X 人" + "查看"链接
- **权限配置**: "X/Y 已启用" 绿色计数 + 搜索权限框 + 手风琴模块列表
- 展开模块: 每个权限行 — Checkbox(绿色勾) + 中文名 + 英文 code
- 底部: 取消 + 保存角色

### 5.7 添加用户

- 点击 "添加用户" 按钮弹出 Toast 提示 "功能开发中"
- UI 预留但后端 API 暂不支持创建用户

---

## 6. 数据流与状态管理

### 6.1 组件状态树

```
/admin/users (page.tsx)
  └── UserManagementPage
       ├── state: activeTab ('users' | 'roles')
       │
       ├── UserListTab
       │    ├── state: search, statusFilter, roleFilter, selectedUserId
       │    ├── queries: useAdminUsers({ keyword, status, role })
       │    ├── mutations: toggleStatus, toggleUpload, revokeSessions, unlock
       │    │
       │    ├── UserDetailDrawer (when selectedUserId)
       │    │    ├── queries: useUserDetail(id), useUserRoles(id)
       │    │    ├── query: useUserEffectivePermissions(id) [NEW]
       │    │    └── 3 Tab panels
       │    │
       │    └── EditUserDrawer (when editingUserId)
       │         └── mutation: useUpdateUser [NEW]
       │
       └── RoleListTab
            ├── queries: useRbacRoles(), useRbacScopes()
            │
            └── EditRoleDrawer (when selectedRoleId)
                 ├── queries: useRbacRoleGrants(roleId), useRbacRoleDetail(roleId) [NEW]
                 └── mutations: useUpdateRbacRoleGrants, useUpdateRole [NEW]
```

### 6.2 React Query 缓存策略
- 用户列表: staleTime 2min, key `['admin', 'users', { keyword, status, role }]`
- 用户详情: staleTime 5min, key `['admin', 'users', id]`
- 角色列表: staleTime 5min, key `['admin', 'rbac', 'roles']`
- 权限列表: staleTime 10min, key `['admin', 'rbac', 'scopes']`
- 所有 mutation 成功后自动 invalidate 相关 query

### 6.3 新增 Hooks
- `useUpdateUser` — PUT /users/[id]
- `useUpdateRole` — PUT /roles/[id]
- `useRoleDetail` — GET /roles/[id]
- `useUserEffectivePermissions` — 基于 userRoles + roleGrants 计算有效权限（可在前端聚合）

---

## 7. 复用的现有组件

| 组件                     | 路径                                    | 复用方式 |
| ------------------------ | --------------------------------------- | -------- |
| DataTable                | `components/ui/data-table/index.tsx`    | 用户列表 |
| DataTablePagination      | `components/ui/data-table/pagination.tsx` | 分页     |
| AdminPageLayout          | `components/ui/admin-page-layout.tsx`   | 页面容器 |
| Badge                    | `components/base/badge.tsx`             | 角色标签 |
| Sheet                    | `components/base/sheet.tsx`             | Drawer   |
| Switch                   | `components/base/switch.tsx`            | Toggle   |
| Button                   | `components/base/button.tsx`            | 按钮     |
| Input                    | `components/base/input.tsx`             | 输入框   |
| Textarea                 | `components/base/textarea.tsx`          | 文本域   |
| Tabs                     | `components/base/tabs.tsx`              | Tab 切换 |
| Checkbox                 | `components/base/checkbox.tsx`          | 勾选     |
| Dialog                   | `components/base/dialog.tsx`            | 确认弹窗 |
| DropdownMenu             | `components/base/dropdown-menu.tsx`     | 下拉菜单 |
| Avatar                   | `components/base/avatar.tsx`            | 头像     |
| ScrollArea               | `components/base/scroll-area.tsx`       | 滚动区域 |
| Separator                | `components/base/separator.tsx`         | 分割线   |
| Tooltip                  | `components/base/tooltip.tsx`           | 提示     |
| Skeleton                 | `components/base/skeleton.tsx`          | 加载态   |

---

## 8. 设计系统 Token 参考

| Token              | 值                   | 用途                   |
| ------------------ | -------------------- | ---------------------- |
| `--ds-accent`      | `#F54E00`            | 主色（按钮、选中态）   |
| `--ds-accent-hover`| `#D94400`            | 主色悬停               |
| `--gold`           | `#C08532`            | 警告/KPI              |
| `--teal`           | `#1F8A65`            | 成功                   |
| `--rose`           | `#CF2D56`            | 错误/高危              |
| `--surface`        | `#FAFAF8`            | 页面背景               |
| `--fg`             | `#26251E`            | 主要文字               |
| `--fg-muted`       | `#6B6960`            | 次要文字               |
| `--fg-faint`       | `#9C9A91`            | 辅助文字               |
| `--border`         | `#26251E14`          | 边框                   |
| 字体 Display       | Outfit               | 标题                   |
| 字体 Sans          | DM Sans              | 正文                   |
| 字体 Mono          | JetBrains Mono       | 权限代码               |
| 圆角 Card          | 12px                 | 卡片/面板              |
| 圆角 Button        | 8px                  | 按钮/输入框            |
| 圆角 Drawer        | 16px                 | 弹窗                   |
| 圆角 Pill          | 9999px               | 药丸/标签              |

---

## 9. 文件变更清单

### 新建文件
1. `src/components/business/admin/user/user-management-page.tsx`
2. `src/components/business/admin/user/user-list-tab.tsx`
3. `src/components/business/admin/user/user-list-header.tsx`
4. `src/components/business/admin/user/user-status-pills.tsx`
5. `src/components/business/admin/user/user-filter-bar.tsx`
6. `src/components/business/admin/user/user-table-columns.tsx`
7. `src/components/business/admin/user/user-detail-drawer.tsx`
8. `src/components/business/admin/user/user-basic-info-tab.tsx`
9. `src/components/business/admin/user/user-role-assignment-tab.tsx`
10. `src/components/business/admin/user/user-permission-detail-tab.tsx`
11. `src/components/business/admin/user/edit-user-drawer.tsx`
12. `src/components/business/admin/rbac/role-list-tab.tsx`
13. `src/components/business/admin/rbac/role-card.tsx`
14. `src/components/business/admin/rbac/edit-role-drawer.tsx`
15. `src/hooks/admin/use-update-user.ts`
16. `src/hooks/admin/use-update-role.ts`
17. `src/hooks/admin/use-role-detail.ts`
18. `src/hooks/admin/use-user-effective-permissions.ts`
19. `src/hooks/admin/use-admin-users.ts` (从 page.tsx 提取)

### 修改文件
1. `src/app/admin/users/page.tsx` — 重写为薄层导入
2. `src/contracts/dtos/admin/users.dto.ts` — 新增字段和 schema
3. `src/contracts/dtos/admin/rbac/roles.dto.ts` — 新增 UpdateRole schema
4. `src/app/api/v1/admin/users/route.ts` — 新增 role 过滤 + 设备信息
5. `src/app/api/v1/admin/users/[id]/route.ts` — 新增 PUT handler
6. `src/app/api/v1/admin/rbac/roles/[id]/route.ts` — 新增 GET + PUT handler
7. `src/services/core/admin-user.service.ts` — 新增 updateUser, 聚合 lastLogin
8. `src/repositories/interfaces/core/user.interface.ts` — 新增 update 方法
9. `src/repositories/prisma/core/user.repository.ts` — 实现 update

### 删除/归档文件
1. `src/components/business/admin/user/admin-user-columns.tsx` — 替换为 user-table-columns.tsx
2. `src/components/business/admin/user/user-details-sheet.tsx` — 替换为 user-detail-drawer.tsx
3. `src/components/business/admin/user/document-review-tab.tsx` — 评估是否保留
4. `src/components/business/admin/rbac/admin-rbac-manager.tsx` — 替换为 role-list-tab + edit-role-drawer
5. `src/app/admin/rbac/page.tsx` — 不再使用（代码保留，菜单不暴露）

---

## 10. 实施顺序

### Phase 1: 后端 API 补齐
1. DTO 变更 (users.dto.ts, roles.dto.ts)
2. 修改用户列表 API (新增 role 过滤 + lastLogin 字段)
3. 新增用户更新 API (PUT /users/[id])
4. 新增角色详情/更新 API (GET/PUT /roles/[id])
5. 新增 React Query hooks

### Phase 2: 用户列表 Tab
6. 重写 page.tsx 为薄层
7. 实现 user-management-page (Tab 容器)
8. 实现 user-list-tab (表格 + 状态药丸 + 筛选)
9. 实现 user-table-columns

### Phase 3: 用户详情与编辑
10. 实现 user-detail-drawer (3 Tab 外壳)
11. 实现 user-basic-info-tab
12. 实现 user-role-assignment-tab
13. 实现 user-permission-detail-tab
14. 实现 edit-user-drawer

### Phase 4: 角色管理
15. 实现 role-list-tab (卡片网格)
16. 实现 role-card
17. 实现 edit-role-drawer

### Phase 5: 清理
18. 删除旧组件
19. 清理未使用的 imports
20. 验证所有功能正常
