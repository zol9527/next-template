# 首页 Banner 动态配置设计

> 日期: 2026-05-09
> 状态: 已批准
> 范围: 后台 (next-template) + 小程序 (shuoboda-miniprograme)

## 背景

小程序首页有一个"限时免费" Banner box，目前是**静态兜底内容** — 当没有 featured 商品时显示硬编码的"限时免费"文字。商城页面的 VIP Banner 已经实现了后台动态配置管理，用户希望首页 Banner 也具备同样的动态配置能力。

## 目标

在后台管理系统中新增首页 Banner 配置功能，与商城 VIP Banner 配置模式完全对称，使运营人员可以动态设置首页 Banner 的标签、标题、副标题和跳转链接。

## 设计决策

**选择方案 A（复用商城配置模式）**，理由：
- 与商城 VIP Banner 配置完全对称，代码模式统一
- 维护者一看就懂，学习成本低
- 完全满足当前需求，不做过度设计

## 数据模型

首页 Banner 配置使用 `SystemSetting` 存储，key 为 `miniprogram.home.banner_config`。

### 字段定义

| 字段       | 类型     | 默认值                         | 说明                                   |
| ---------- | -------- | ------------------------------ | -------------------------------------- |
| `enabled`  | boolean  | `true`                         | 是否启用首页 Banner                    |
| `tagText`  | string   | `"限时免费"`                   | 标签文字（对应现有的"限时免费"标签）   |
| `title`    | string   | `"零基础入门\n数据分析实战课"` | 主标题（支持 `\n` 换行）               |
| `subtitle` | string   | `"前 100 名报名免费"`          | 副标题                                 |
| `linkType` | enum     | `"none"`                       | 跳转类型：`product`/`ad`/`custom`/`none` |
| `linkUrl`  | string?  | null                           | 自定义链接（linkType=custom 时）       |
| `productId`| string?  | null                           | 关联商品 ID（linkType=product 时）     |

### DTO 定义

```typescript
// src/contracts/dtos/admin/miniprogram-home-config.dto.ts

const HomeBannerLinkTypeEnum = z.enum(['product', 'ad', 'custom', 'none'])

const MiniprogramHomeBannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tagText: z.string().min(1).default('限时免费'),
  title: z.string().min(1).default('零基础入门\n数据分析实战课'),
  subtitle: z.string().min(1).default('前 100 名报名免费'),
  linkType: HomeBannerLinkTypeEnum.default('none'),
  linkUrl: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
})
```

## API 设计

### 后台管理接口

| 方法 | 路径                                        | 权限                                    | 说明           |
| ---- | ------------------------------------------- | --------------------------------------- | -------------- |
| GET  | `/api/v1/admin/miniprogram/home-config`     | `admin:miniprogram:home:config:view`    | 获取首页配置   |
| PUT  | `/api/v1/admin/miniprogram/home-config`     | `admin:miniprogram:home:config:update`  | 更新首页配置   |

### 公开接口

| 方法 | 路径                                        | 权限 | 说明               |
| ---- | ------------------------------------------- | ---- | ------------------ |
| GET  | `/api/v1/public/miniprogram/home-config`    | 公开 | 小程序端获取配置   |

## 后台管理页面

- 路由：`/admin/miniprogram/home-config`
- 位置：小程序管理子菜单，与商城设置平级
- 表单结构（两个 ConfigCard + 保存按钮）：
  1. **Banner 内容** — 启用开关、标签文字、主标题、副标题
  2. **点击跳转** — 跳转类型选择、条件字段（商品 ID / 自定义链接）
- 风格：与 `MiniprogramShopConfigForm` 完全一致

## 小程序端改造

### 首页 `index.vue` 变更

1. 新增 `homeBannerConfig` ref 存储配置
2. 新增 `loadHomeBannerConfig()` 调用公开 API
3. Banner 区域渲染逻辑：
   - 有热门商品 → 展示热门商品卡片（保持不变）
   - 无热门商品 + `homeBannerConfig.enabled` → 展示后台配置内容
   - 无热门商品 + `!homeBannerConfig.enabled` → 不显示 Banner
4. 点击事件：根据 `linkType` 执行跳转（复用商城跳转逻辑）

### API 调用

```
GET /public/miniprogram/home-config → { enabled, tagText, title, subtitle, linkType, linkUrl, productId }
```

## 文件清单

### 后台项目 (next-template) — 新增 5 个文件

1. `src/contracts/dtos/admin/miniprogram-home-config.dto.ts` — DTO 定义
2. `src/app/api/v1/admin/miniprogram/home-config/route.ts` — 后台管理 API
3. `src/app/api/v1/public/miniprogram/home-config/route.ts` — 公开 API
4. `src/app/admin/miniprogram/home-config/page.tsx` — 管理页面
5. `src/components/business/admin/miniprogram/home-config-form.tsx` — 表单组件

### 小程序项目 (shuoboda-miniprograme) — 修改 1 个文件

1. `src/pages/index/index.vue` — Banner 配置获取 + 动态渲染

## 权限配置

需在权限系统中注册：

- Actions: `admin:miniprogram:home:config:view`, `admin:miniprogram:home:config:update`
- Scope: `miniprogram.home-config`
