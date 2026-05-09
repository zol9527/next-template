# VANTAGE 硕博达 - 财经教育在线学习平台

> 基于 uni-app + Vue 3 + Pinia + TypeScript 构建的财经在线教育微信小程序

## AI 开发

使用 [mcp](https://github.com/yfmeii/weapp-dev-mcp) 前提条件
```bash
1. 打开微信开发者工具
2. 进入 设置 → 安全设置 → 服务端口
3. 开启 "HTTP 调试" 和 "自动化测试"
```

微信开发者工具

```bash
# mac 启动微信开发者工具的自动化 CLI，监听项目文件变化并自动编译
/Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project /path/to/your/project --auto-port 9420
```

```bash
# windows
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" auto --project C:\path\to\your\project --auto-port 9420
```

## 项目简介

VANTAGE 硕博达是一款面向财经领域学习者的在线教育微信小程序，提供课程浏览、购买、在线学习、题库练习、证书管理等功能。项目采用分层架构设计，包含 HTTP 客户端、拦截器链、链路追踪、日志脱敏、错误处理等完善的基础设施。

### 核心功能

| 模块 | 功能说明 |
|------|----------|
| 🔐 认证系统 | 微信登录（生产）/ 密码登录（开发）、JWT Token + Cookie 双认证、自动登录状态恢复 |
| 📚 课程系统 | 分类浏览、课程列表、关键词搜索、课程详情、我的课程（学习进度跟踪） |
| 📦 订单系统 | 创建订单、支付、状态跟踪 |
| 💳 支付系统 | 微信支付集成 |
| 🤝 分销系统 | 推广员管理、推广码生成、佣金记录、提现申请 |
| 📄 协议/证件 | 用户协议展示、证书/证件上传与管理 |

### 技术栈

- **框架**: uni-app (Vue 3 + Composition API)
- **状态管理**: Pinia + 自定义 `createStorageStore`（带持久化）
- **语言**: TypeScript + JavaScript（混合）
- **样式**: SCSS + 硕博达设计系统 (Design Tokens)
- **分包加载**: 5 个子包，按需预加载

---

## 目录结构

```
shuoboda-miniprograme/
├── config/                          # 配置模块
│   ├── constants.ts                 # 常量定义（错误码、HTTP状态码、存储键、角色、订单状态等）
│   ├── env.ts                       # 环境配置（自动识别开发/体验/生产环境）
│   ├── api-response.ts              # API 标准响应封装（{ success, data, error }）
│   └── index.ts                     # 配置统一导出入口
├── core/                            # 核心网络层
│   ├── http-client.ts               # HTTP 客户端（拦截器链、自动重试、业务响应解包）
│   ├── interceptors.ts              # HTTP 拦截器（Token/Cookie 注入、响应解包、错误分类）
│   └── request-interceptor.ts       # uni-app 原生请求拦截器（addInterceptor）
├── services/                        # 服务层（业务 API 封装）
│   ├── api/
│   │   ├── auth.service.ts          # 认证服务（密码登录 / 微信登录）
│   │   ├── auth.js                  # 认证辅助
│   │   ├── products.js              # 商品服务（分类、列表、搜索、详情）
│   │   ├── orders.js                # 订单服务（创建、查询、取消、统计）
│   │   ├── payment.js               # 支付服务（微信支付）
│   │   ├── distribution.js          # 分销服务（推广员、推广码、佣金、提现）
│   │   ├── banner.ts                # 轮播图服务
│   │   ├── user.js                  # 用户服务
│   │   ├── agreement.js             # 协议服务
│   │   ├── site-config.js           # 站点配置服务
│   │   └── index.ts                 # 服务统一导出（聚合为 api 对象）
│   ├── types/                       # 服务层类型定义
│   │   ├── api.types.ts             # 通用 API 类型（Money、Timestamp 等）
│   │   ├── auth.types.ts            # 认证类型
│   │   ├── product.types.ts         # 商品类型（Product、Category、Review 等）
│   │   └── index.ts
│   └── user-documents.js            # 用户证件服务
├── stores/                          # 状态管理（Pinia）
│   ├── index.ts                     # Pinia 实例
│   ├── authStore.ts                 # 认证状态（登录/登出/自动登录/用户信息）
│   ├── createStorageStore.ts        # 持久化 Store 工厂函数
│   └── user-documents-store.js      # 用户证件状态
├── hooks/                           # 组合式函数（Composables）
│   ├── useAuth.ts                   # 认证逻辑封装
│   ├── useFetch.ts                  # 数据请求封装
│   ├── useProducts.ts               # 商品数据封装
│   ├── useBanners.ts                # 轮播图数据封装
│   ├── useAsyncState.ts             # 异步状态管理
│   └── index.ts                     # 统一导出
├── utils/                           # 工具模块
│   ├── logger.ts                    # 日志模块（分级日志、子Logger、脱敏）
│   ├── error-handler.ts             # 错误处理（AppError、BusinessError、NetworkError）
│   ├── storage.ts                   # 本地存储封装（同步/异步、JSON 支持）
│   ├── toast.ts                     # Toast 提示封装
│   ├── trace-id.ts                  # 链路追踪 ID 生成
│   ├── auth.ts                      # 认证辅助工具
│   ├── url.ts                       # URL 处理工具
│   ├── update-manager.ts            # 小程序版本更新管理
│   └── index.ts                     # 统一导出
├── pages/                           # 主包页面
│   ├── index/index.vue              # 首页
│   ├── shop/shop.vue                # 商城页
│   ├── orders/orders.vue            # 订单页
│   └── profile/profile.vue          # 个人中心
├── subpackages/                     # 分包页面
│   ├── agreements/detail.vue        # 协议详情
│   ├── product/detail.vue           # 商品详情
│   ├── orders-detail/detail.vue     # 订单详情
│   ├── promotion/                   # 推广中心（中心/推广码/佣金）
│   └── user-documents/              # 证件管理（列表/上传/预览）
├── components/                      # 公共组件
│   ├── error-boundary.vue           # 错误边界组件
│   ├── product-card.vue             # 商品卡片组件
│   ├── ProfileCompletion.vue        # 资料完善提示组件
│   └── Popupcustom.vue              # 自定义弹窗组件
├── custom-tab-bar/                  # 自定义 TabBar（微信原生）
├── static/                          # 静态资源（图标、TabBar 图标、Banner 图等）
├── types/                           # 全局类型定义
│   └── index.ts                     # LoginParams、UserInfo、ApiResponse、PaginatedResponse
├── docs/plans/                      # 开发计划文档
├── App.vue                          # 应用根组件（ErrorBoundary 包裹）
├── main.js                          # 应用入口（初始化 Pinia、HttpClient、请求拦截器）
├── manifest.json                    # uni-app 应用配置（微信 AppID、权限等）
├── pages.json                       # 页面路由 & TabBar 配置
├── uni.scss                         # 全局 SCSS 变量（Plantify 主题色）
└── tsconfig.json                    # TypeScript 配置
```

---

## 快速开始

### 环境要求

- [HBuilderX](https://www.dcloud.io/hbuilderx.html) 或 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- Node.js（仅用于类型检查，**禁止 `npm install`**）

### ⚠️ 依赖管理须知

**严禁在本项目目录中使用 `npm install` 安装依赖。** 项目已有 `node_modules`，仅包含：

| 依赖 | 用途 |
|------|------|
| `vue@^3.5` | Vue 3 运行时 |
| `pinia@^3.0` | 状态管理 |
| `@dcloudio/types` | uni-app 类型定义 |
| `@types/wechat-miniprogram` | 微信小程序类型 |
| `@uni-helper/uni-app-types` | uni-app 增强类型 |

如需引入新 UI 组件，请通过 [DCloud 插件市场](https://ext.dcloud.net.cn/) 下载源码放入 `components/` 目录。

### 配置后端地址

编辑 `config/env.ts`，修改 API 地址：

```typescript
// 开发环境
if (env === 'development') {
  return 'http://localhost:3000/api/v1';  // 本地后端
}

// 生产环境
return 'https://www.shuoboda.cn/api/v1';
```

### 运行项目

1. 使用 HBuilderX 打开项目根目录
2. 选择 **运行 → 运行到小程序模拟器 → 微信开发者工具**
3. 或直接将 `unpackage/dist/dev/mp-weixin` 目录导入微信开发者工具

---

## 架构设计

### 请求链路

```
页面/Hook
  ↓ 调用 service 方法
Service 层 (services/api/*.js)
  ↓ httpClient.get/post/put/delete
HttpClient (core/http-client.ts)
  ↓ 拦截器链 apply
RequestInterceptor (注入 Token/Cookie/TraceId)
  ↓ uni.request()
微信小程序网络层
  ↓ 响应
ResponseInterceptor (Set-Cookie 处理 / 业务解包)
  ↓ { success, data, error }
HttpClient 业务判断 (success ? data : throw BusinessError)
  ↓ 返回 data
Service 层返回给调用方
```

### 认证流程

```
App.onLaunch()
  → authStore.initAuthState()
  → 检查本地 Token
    ├── 有效 Token → authStore.fetchUserInfo() → 恢复登录状态
    └── 无 Token   → 等待用户手动触发登录
                       ├── 生产环境: wx.login() → code → loginWithWechat(code)
                       └── 开发环境: 自动使用测试账号密码登录
```

### 状态管理

使用 Pinia + 自定义 `createStorageStore` 实现持久化状态管理：

```
createStorageStore(name, { defaultState, storageKey, persist })
  → 基于 Vue ref() 的响应式状态
  → 自动 watch + uni.setStorageSync 持久化
  → 提供 state / setState / resetState / action
```

### 分包策略

| 子包 | 预加载时机 | 包含页面 |
|------|-----------|----------|
| `product` | 进入商城页时 | 商品详情 |
| `orders-detail` | 进入订单页时 | 订单详情 |
| `promotion` | 进入个人中心时 | 推广中心、推广码、佣金记录 |
| `user-documents` | 进入个人中心时 | 证件列表、上传、预览 |
| `agreements` | 不预加载 | 协议详情 |

---

## 模块使用指南

### 1. HTTP 请求

```typescript
import { httpClient } from '@/core/http-client'

// GET 请求
const data = await httpClient.get('/public/products', { limit: 10 })

// POST 请求（自动处理幂等性）
const order = await httpClient.post('/user/orders',
  { productId: 'xxx' },
  { headers: { 'Idempotency-Key': traceId } }
)

// PUT / DELETE
await httpClient.put('/user/profile', { nickname: '新昵称' })
await httpClient.delete('/user/promoter-codes/codeId')

// 带配置的请求
const data = await httpClient.get('/api/data', {}, {
  showLoading: true,     // 显示 loading
  retry: false,          // 禁用自动重试
  timeout: 60000,        // 自定义超时（ms）
})
```

### 2. 认证状态管理

```typescript
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// 响应式状态
authStore.isLoggedIn   // 是否已登录
authStore.userId       // 用户 ID
authStore.displayName  // 显示名称（nickname > username > '微信用户'）
authStore.roles        // 角色列表
authStore.permissions  // 权限列表

// 操作
await authStore.login('identifier', 'password')  // 密码登录
await authStore.loginWithWechat(code)             // 微信登录
await authStore.autoLogin()                       // 自动登录（根据环境选择方式）
await authStore.logout()                          // 退出登录

// 权限检查
authStore.hasRole('admin')
authStore.hasPermission('order:create')
```

### 3. API 服务

所有业务 API 通过 `services/api/index.ts` 统一导出：

```typescript
import { api } from '@/services/api'

// 商品
await api.product.listProducts({ limit: 20, categoryId: 'xxx' })
await api.product.getProductDetail('productId')

// 订单
await api.order.createOrder('productId')
await api.order.getOrderList({ status: 'paid' })
await api.order.getOrderStats()

// 支付
await api.payment.createWechatPay('orderId', 'payerOpenId')

// 分销
await api.distribution.getPromoterProfile()
await api.distribution.generatePromoterCode({ type: 'auto' })
await api.distribution.getCommissions({ status: 'settled' })
await api.distribution.applySettlement({ amount: '100', paymentMethod: 'wechat' })

// 轮播图
await api.banner.getBanners()
```

### 4. 创建自定义 Store

```typescript
// stores/myStore.ts
import { createStorageStore } from './createStorageStore'

interface MyState {
  count: number
  name: string
}

const store = createStorageStore<MyState>('my', {
  defaultState: { count: 0, name: '' },
  storageKey: 'my_store',
  persist: true,
})

export function useMyStore() {
  const increment = store.action(async () => {
    store.setState({ count: store.state.value.count + 1 })
  })

  return {
    state: store.state,
    count: computed(() => store.state.value.count),
    increment,
    reset: store.resetState,
  }
}
```

### 5. 日志模块

```typescript
import { logger } from '@/utils/logger'

logger.debug('调试信息', { key: 'value' })
logger.info('用户登录', { userId: '123' })
logger.warn('警告', { warning: 'something' })
logger.error('操作失败', error, { context: '额外信息' })

// 子 Logger（绑定上下文）
const requestLogger = logger.child({ service: 'auth', userId: '123' })
const traceLogger = logger.withTraceId('trace-abc-123')
```

**自动脱敏字段**: password、token、secret、authorization、cookie、phone、idCard、creditCard、wechatpay-* 等。

### 6. 错误处理

```typescript
import { errorHandler, BusinessError, NetworkError } from '@/utils/error-handler'

try {
  await someApiCall()
} catch (error) {
  errorHandler.handle(error)  // 自动显示错误提示
}

// 注册特定错误码处理器
errorHandler.registerHandler('LOCKED', (error, parsedError) => {
  uni.showModal({
    title: '账户锁定',
    content: '您的账户已被锁定，请联系客服',
    showCancel: false,
  })
})
```

### 7. Toast 提示

```typescript
import { showSuccess, showError, showText, showLoading, hideLoading, showConfirm } from '@/utils/toast'

showSuccess('操作成功')
showError('操作失败')
showLoading('加载中...')
hideLoading()
const confirmed = await showConfirm('确定要删除吗？')
```

### 8. 本地存储

```typescript
import { storage } from '@/utils/storage'

storage.set('key', 'value')
const value = storage.get('key', 'default')
storage.remove('key')

storage.setJSON('user', { name: 'John', age: 30 })
const user = storage.getJSON('user', {})

// 异步操作
await storage.setAsync('key', 'value')
const value = await storage.getAsync('key', 'default')
```

---

## 配置参考

### 环境配置 (`config/env.ts`)

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `env` | 环境标识 | `development` / `trial` / `production`（自动判断） |
| `authMode` | 认证模式 | `password`（开发）/ `wechat`（体验版+生产） |
| `apiBaseURL` | API 基础地址 | 开发: `https://www.shuoboda.cn/api/v1` |
| `logLevel` | 日志级别 | `debug`（开发）/ `info`（生产） |
| `requestTimeout` | 请求超时（ms） | `30000` |
| `requestRetryTimes` | 重试次数 | `3` |
| `requestRetryDelay` | 重试延迟（ms） | `1000` |

### 错误码映射

后端错误码自动映射为用户友好的中文提示：

| 错误码 | 中文提示 |
|--------|----------|
| `INVALID_INPUT` | 输入参数有误，请检查 |
| `UNAUTHORIZED` | 请先登录 |
| `INVALID_CREDENTIALS` | 用户名或密码错误 |
| `ACCOUNT_DISABLED` | 账户已被禁用，请联系客服 |
| `LOCKED` | 账户已锁定，请稍后再试 |
| `SESSION_REUSE_DETECTED` | 会话异常，请重新登录 |
| `FORBIDDEN` | 无权限访问 |
| `NOT_FOUND` | 请求的资源不存在 |
| `IDEMPOTENCY_CONFLICT` | 请勿重复提交 |
| `TOO_MANY_REQUESTS` | 操作过于频繁，请稍后再试 |
| `INTERNAL_ERROR` | 服务器异常，请稍后再试 |
| `NETWORK_ERROR` | 网络连接失败，请检查网络 |
| `TIMEOUT` | 请求超时，请重试 |

### API 响应格式

所有 API 遵循统一的响应格式：

```typescript
// 成功响应
{ success: true, data: { ... }, error: null }

// 失败响应
{ success: false, data: null, error: { code: 'ERROR_CODE', message: '错误描述' } }
```

---

## 主题定制

项目使用 SCSS 变量定义 Plantify 品牌主题（`uni.scss`）：

```scss
// 品牌主色
$plant-primary: #004D40;       // 深绿
$plant-secondary: #009666;     // 翠绿
$plant-text-main: #002140;     // 深蓝黑
$plant-text-grey: #4F6C7B;     // 灰蓝

// 功能背景色
$plant-bg-mint: #CCF3E4;       // 薄荷绿
$plant-bg-yellow: #FFF8D0;     // 淡黄
$plant-bg-peach: #FFDFD6;      // 桃粉
$plant-bg-lime: #DDF3A3;       // 青柠
```

---

## 项目约定

1. **禁止 `npm install`** - 依赖已预置，新增组件通过 DCloud 插件市场或手动放入 `components/`
2. **TypeScript 优先** - 新增文件使用 `.ts`，类型定义放在 `types/` 或 `services/types/`
3. **中文注释** - 代码注释和文档优先使用中文
4. **服务层模式** - 业务逻辑封装在 `services/api/` 中，页面只调用 service 方法
5. **错误码同步** - `config/constants.ts` 中的 `ErrorCode` 需与后端保持一致
6. **日志脱敏** - 敏感字段（token、phone、idCard 等）在日志中自动替换为 `[REDACTED]`
7. **幂等性** - 创建订单等写操作需携带 `Idempotency-Key` 头
