# 订单系统架构文档

> 本文档详细描述了订单系统的完整架构，包括状态流转、文件关系、核心业务逻辑等。

---

## 目录

- [一、订单状态流转图](#一订单状态流转图)
- [二、订单涉及文件清单](#二订单涉及文件清单)
- [三、文件逻辑关系图](#三文件逻辑关系图)
- [四、核心业务逻辑详解](#四核心业务逻辑详解)
- [五、数据模型关键关系](#五数据模型关键关系)

---

## 一、订单状态流转图

```
                    ┌──────────────────────────────────────────────────────────────────┐
                    │                        订单生命周期                              │
                    └──────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                                    订单创建                                           │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
    │  │  用户发起     │───▶│  API 层校验   │───▶│  Service 层   │───▶│  Repository  │      │
    │  │  创建订单     │    │  (Zod Schema)│    │  业务逻辑      │    │  持久化      │      │
    │  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘      │
    │         │                                      │                                     │
    │         ▼                                      ▼                                     │
    │  ┌─────────────────────────────────────────────────────────────────────────┐        │
    │  │  幂等性检查  IdempotencyRequest (24小时有效期)                            │        │
    │  │  - 相同请求 → 返回缓存订单                                                │        │
    │  │  - 参数冲突 → IDEMPOTENCY_CONFLICT                                       │        │
    │  │  - 进行中 → CONFLICT                                                      │        │
    │  └─────────────────────────────────────────────────────────────────────────┘        │
    │         │                                      │                                     │
    │         ▼                                      ▼                                      │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                               │
    │  │  优惠券折扣    │    │  推广码绑定   │    │  生成订单号    │                               │
    │  │  计算/核销     │    │  (可选)      │    │  ORD+时间戳   │                               │
    │  └──────────────┘    └──────────────┘    └──────────────┘                         .          
    └─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
    ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    ║                              状态: pending_payment (待支付)                             ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════╝
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
         │   用户取消订单    │    │   系统自动取消   │    │   发起微信支付   │
         │  (用户主动操作)   │    │  (定时任务超时)   │    │  (JSAPI 支付)    │
         └──────────────────┘    └──────────────────┘    └──────────────────┘
                    │                       │                       │
                    ▼                       ▼                       ▼
    ╔════════════════════════════╗  ╔════════════════════════════╗  ╔═══════════════════════╗
    ║   状态: cancelled (已取消)  ║  ║   状态: cancelled (已取消)  ║  ║  创建 Payment 记录   ║
    ╚════════════════════════════╝  ╚════════════════════════════╝  ╚═══════════════════════╝
                                                                      │
                                                                      ▼
                                            ┌───────────────────────────────────────┐
                                            │          微信支付回调处理              │
                                            │  ┌─────────────────────────────────┐  │
                                            │  │  1. 验证签名 + 解密回调数据      │  │
                                            │  │  2. 幂等性校验 (providerTradeNo) │  │
                                            │  │  3. 确认支付状态                  │  │
                                            │  │  4. 推进订单状态 → paid          │  │
                                            │  │  5. 创建履约任务                  │  │
                                            │  └─────────────────────────────────┘  │
                                            └───────────────────────────────────────┘
                                                                      │
                                                                      ▼
    ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    ║                              状态: paid (已支付)                                      ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════╝
                                            │
                                            ▼
    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              订单履约流程 OrderFulfillment                              │
    │  ┌─────────────────────────────────────────────────────────────────────────┐        │
    │  │  履约任务 Job (order_fulfillment_jobs)                                   │        │
    │  │  status: pending → processing → succeeded/retrying/manual_required       │        │
    │  └─────────────────────────────────────────────────────────────────────────┘        │
    │         │                                                                           │
    │         ▼                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────────┐        │
    │  │  RPC 原子操作 (applyFulfillment)                                          │        │
    │  │  1. 发放权益 CourseEntitlement (用户获得课程权限)                          │        │
    │  │  2. 冻结佣金 CommissionRecord (status: frozen)                            │        │
    │  └─────────────────────────────────────────────────────────────────────────┘        │
    │         │                                                                           │
    │         ▼                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────────┐        │
    │  │  失败重试机制                                                               │        │
    │  │  - 最多重试 5 次                                                            │        │
    │  │  - 指数退避: 5s → 10s → 20s → 40s → 80s → 300s(max)                        │        │
    │  │  - 5次失败 → manual_required (需人工处理)                                  │        │
    │  └─────────────────────────────────────────────────────────────────────────┘        │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
    ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    ║                      状态: paid (已支付，履约完成，等待管理员确认)                     ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════╝
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
         │   管理员确认完成  │    │   发起退款       │    │   (长期未处理)   │
         │  (履约确认)      │    │  (部分/全额)     │    │   保持 paid 状态  │
         └──────────────────┘    └──────────────────┘    └──────────────────┘
                    │                       │
                    ▼                       ▼
    ╔════════════════════════════╗  ╔════════════════════════════════════════════════════════╗
    ║   状态: completed (已完成)  ║  ║  状态: refunding (退款中) → refunded (已退款)         ║
    ║   佣金变为可结算            ║  ║  - 调用微信退款 API                                     ║
    ║   (frozen → payable)       ║  ║  - 调整佣金 (adjustCommissionForRefund)                 ║
    ╚════════════════════════════╝  ╚════════════════════════════════════════════════════════╝
```

### 订单状态枚举

| 状态 | 说明 | 可转移状态 |
|------|------|-----------|
| `pending_payment` | 待支付 | → cancelled / → paid |
| `paid` | 已支付 | → completed / → refunding / → refunded |
| `cancelled` | 已取消 | 终态 |
| `completed` | 已完成 | 终态 |
| `refunding` | 退款中 | → refunded |
| `refunded` | 已退款 | 终态 |

### 履约状态枚举

| 状态 | 说明 |
|------|------|
| `pending` | 待处理 |
| `processing` | 处理中 |
| `retrying` | 重试中 |
| `succeeded` | 成功 |
| `manual_required` | 需人工处理 |

---

## 二、订单涉及文件清单

### API 路由层

| 文件路径 | 职责说明 | 关键方法/行号 |
|----------|----------|---------------|
| `src/app/api/v1/user/orders/route.ts` | 用户订单主路由 (创建/列表) | POST:47-96, GET:98-126 |
| `src/app/api/v1/user/orders/[orderId]/route.ts` | 获取单个订单详情 | GET |
| `src/app/api/v1/user/orders/[orderId]/cancel/route.ts` | 用户取消订单 | POST |
| `src/app/api/v1/user/orders/[orderId]/wechat-pay/route.ts` | 发起微信支付 | POST |
| `src/app/api/v1/internal/wechat-pay/notify/route.ts` | 处理微信支付回调 | POST |
| `src/app/api/v1/admin/orders/route.ts` | 管理端订单列表 | GET |
| `src/app/api/v1/admin/orders/[orderId]/route.ts` | 管理端订单详情 | GET |
| `src/app/api/v1/admin/orders/[orderId]/complete/route.ts` | 管理员确认订单完成 | POST |
| `src/app/api/v1/admin/orders/[orderId]/refund/route.ts` | 管理员处理退款 | POST |
| `src/app/api/v1/internal/cron/orders/cancel-expired/route.ts` | 定时任务取消超时订单 | POST |
| `src/app/api/v1/internal/cron/order-fulfillment/run/route.ts` | 定时任务执行履约 | POST |

### 契约层 (Contract Layer)

| 文件路径 | 职责说明 |
|----------|----------|
| `src/contracts/dtos/orders.dto.ts` | 订单状态/Schema 定义 |
| `src/contracts/dtos/admin/orders.dto.ts` | 管理端订单 DTO |
| `src/contracts/dtos/admin/order-fulfillment-jobs.dto.ts` | 履约任务 DTO |

### 业务层 (Service Layer)

| 文件路径 | 职责说明 | 关键方法/行号 |
|----------|----------|---------------|
| `src/services/order.service.ts` | 用户订单核心业务逻辑 | createOrderForUser:595-714 |
| `src/services/admin-order.service.ts` | 管理端订单业务逻辑 | completeOrder:111-152, refundOrder:154-207 |
| `src/services/order-fulfillment.service.ts` | 订单履约自动化处理 | runDueJobs:51-149 |
| `src/services/wechat-pay.service.ts` | 微信支付/退款/回调处理 | handleNotify:173-322 |
| `src/services/commission.service.ts` | 佣金计算与结算 |
| `src/services/coupon.service.ts` | 优惠券计算与核销 |

### 数据层 (Repository Layer)

| 文件路径 | 职责说明 |
|----------|----------|
| `src/repositories/interfaces/order.interface.ts` | 订单仓储接口定义 |
| `src/repositories/factory/order.factory.ts` | 动态创建订单仓储 |
| `src/repositories/prisma/order.repository.ts` | Prisma 订单实现 |
| `src/repositories/supabase/order.repository.ts` | Supabase 订单实现 |
| `src/repositories/interfaces/order-fulfillment-job.interface.ts` | 履约任务仓储接口 |
| `src/repositories/prisma/order-fulfillment-job.repository.ts` | Prisma 履约任务实现 |

### 数据库 (Prisma Schema)

| 表名 | 说明 | 关键行号 |
|------|------|----------|
| `orders` | 订单主表 | 227-256 |
| `payments` | 支付记录表 | 258-277 |
| `order_fulfillment_jobs` | 履约任务表 | 478-498 |
| `course_entitlements` | 课程权益表 | 279-297 |
| `commission_records` | 佣金记录表 | 347-368 |
| `idempotency_requests` | 幂等性请求表 | 457-476 |

### UI 组件

| 文件路径 | 职责说明 |
|----------|----------|
| `src/components/business/admin/order/admin-order-list.tsx` | 管理端订单列表 |
| `src/components/business/admin/order/admin-order-detail-form.tsx` | 管理端订单详情 |

### 小程序前端

| 文件路径 | 职责说明 |
|----------|----------|
| `platforms/tencent/miniprogram/pages/orders/orders.vue` | 小程序订单列表页面 |
| `platforms/tencent/miniprogram/services/api/orders.js` | 小程序订单 API 服务 |

---

## 三、文件逻辑关系图

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    表现层                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────┐                               │
│  │   微信小程序前端      │         │    管理端前端         │                               │
│  │   orders.vue         │         │    admin-order-list  │                               │
│  └──────────┬───────────┘         └──────────┬───────────┘                               │
│             │                                │                                           │
│             ▼                                ▼                                           │
│  ┌──────────────────────┐         ┌──────────────────────┐                               │
│  │   services/api/      │         │   React Components   │                               │
│  │   orders.js          │         │   (TanStack Query)   │                               │
│  └──────────┬───────────┘         └──────────┬───────────┘                               │
└─────────────┼────────────────────────────────┼───────────────────────────────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    接口层 (API Layer)                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                         withV1Route (route-handler.ts)                      │        │
│  │  - 身份验证 (JWT/Session)                                                    │        │
│  │  - 提取 traceId → 创建 requestLogger                                         │        │
│  │  - Zod Schema 校验 (schemas)                                                │        │
│  │  - 统一响应格式 (jsonApi)                                                     │       │
│  └─────────────────────────────────────────────────────────────────────────────┘       │
│                                          │                                             │
│         ┌────────────────────────────────┼────────────────────────────────┐            │
│         ▼                                ▼                                ▼            
│  ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐          │
│  │  用户订单 API    │        │   微信支付 API   │        │  管理端订单 API      │          │
│  │  /user/orders    │        │  /wechat-pay     │        │  /admin/orders   │          │
│  └────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘          │
│           │                           │                           │                     │
└───────────┼───────────────────────────┼───────────────────────────┼─────────────────────┘
            │                           │                           │
            ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    契约层 (Contract Layer)                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────┐  │
│  │   orders.dto.ts          │  │   wechat-pay.dto.ts      │  │  admin/orders.dto.ts │  │
│  │   - OrderSchema          │  │   - JsapiParams          │  │  - AdminOrderSchema  │  │
│  │   - OrderStatus enum     │  │   - NotifyPayload        │  │                      │  │
│  │   - CreateOrderRequest   │  │                          │  │                      │  │
│  └──────────────────────────┘  └──────────────────────────┘  └──────────────────────┘  │
│                                          │                                            │
└──────────────────────────────────────────┼────────────────────────────────────────────┘
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    业务层 (Service Layer)                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                          createOrderService()                                │        │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │        │
│  │  │  createOrderForUser() - 创建订单核心流程                              │   │        │
│  │  │  1. validateProductForOrder() - 验证商品                              │   │        │
│  │  │  2. checkIdempotencyOrThrow() - 幂等性检查                           │   │        │
│  │  │  3. calculateCouponDiscount() - 计算优惠券折扣                        │   │        │
│  │  │  4. orders.createOrder() - 创建订单记录                              │   │        │
│  │  │  5. redeemCouponWithRollback() - 核销优惠券                           │   │        │
│  │  │  6. bindPromoterCodeIfExists() - 绑定推广码                           │   │        │
│  │  └─────────────────────────────────────────────────────────────────────┘   │        │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │        │
│  │  │  cancelOrderForUser() - 取消订单                                     │   │        │
│  │  │  cancelExpiredOrders() - 定时任务取消超时订单                        │   │        │
│  │  └─────────────────────────────────────────────────────────────────────┘   │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                          │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                        createWechatPayService()                              │        │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │        │
│  │  │  createJsapiPayForOrder() - 创建 JSAPI 支付                          │   │        │
│  │  │  handleNotify() - 处理支付回调                                       │   │        │
│  │  │  refund() - 处理退款                                                 │   │        │
│  │  └─────────────────────────────────────────────────────────────────────┘   │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                          │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                     createOrderFulfillmentService()                          │        │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │        │
│  │  │  runDueJobs() - 执行到期履约任务                                     │   │        │
│  │  │  - jobs.tryMarkProcessing() - 尝试标记处理中                         │   │        │
│  │  │  - jobs.applyFulfillment() - RPC 原子执行履约                         │   │        │
│  │  │  - jobs.markSucceeded() / markRetrying() / markManualRequired()      │   │        │
│  │  └─────────────────────────────────────────────────────────────────────┘   │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                          │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                        createAdminOrderService()                             │        │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │        │
│  │  │  completeOrder() - 管理员确认订单完成                                │   │        │
│  │  │  refundOrder() - 管理员处理退款                                      │   │        │
│  │  │  getOrderDetail() - 获取订单详情                                    │   │        │
│  │  └─────────────────────────────────────────────────────────────────────┘   │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                          │                                            │
└──────────────────────────────────────────┼────────────────────────────────────────────┘
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    数据层 (Repository Layer)                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                         OrderRepository (interface)                           │        │
│  │  - createOrder()     - getOrderById()    - updateOrderStatus()              │        │
│  │  - listOrders()      - getOrderByOrderNo() - updateOrder()                  │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                          │                                            │
│         ┌────────────────────────────────┴────────────────────────────────┐           │
│         ▼                                ▼                                ▼           │
│  ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐          │
│  │ Prisma 实现      │        │ Supabase 实现    │        │  工厂模式        │          │
│  │ order.repository │        │ order.repository │        │ order.factory.ts │          │
│  └──────────────────┘        └──────────────────┘        └──────────────────┘          │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                    OrderFulfillmentJobRepository (interface)                  │        │
│  │  - upsertJobByPaymentId() - listDueJobs() - applyFulfillment()               │        │
│  │  - tryMarkProcessing() - markSucceeded() - markRetrying()                    │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                                                                          │
│  ┌─────────────────────────┐  ┌───────────────────┐  ┌──────────────────────────┐      │
│  │ PaymentRepository      │  │ ProductRepository │  │ CouponRepository        │      │
│  │ - createPayment()      │  │ - getProductById()│  │ - getCouponById()       │      │
│  │ - confirmPayment...()  │  │                   │  │                          │      │
│  └─────────────────────────┘  └───────────────────┘  └──────────────────────────┘      │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                基础设施层                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────┐  ┌───────────────────┐  ┌───────────────────┐                    │
│  │ Prisma Client    │  │ 微信支付 SDK      │  │ Pino Logger       │                    │
│  │ (ORM)            │  │ (lib/wechat/pay)  │  │ (结构化日志)      │                    │
│  └──────────────────┘  └───────────────────┘  └───────────────────┘                    │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐        │
│  │                         数据库                                              │        │
│  │  - orders (订单表)             - payments (支付记录)                          │        │
│  │  - order_fulfillment_jobs      - course_entitlements (课程权益)              │        │
│  │  - commission_records (佣金)   - idempotency_requests (幂等性)               │        │
│  └─────────────────────────────────────────────────────────────────────────────┘        │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 四、核心业务逻辑详解

### 1. 订单创建流程

**位置**: `src/services/order.service.ts:595-714`

```
用户发起创建订单
    │
    ├─ 验证商品存在且可购买 (validateProductForOrder)
    │   └─ 检查 product.status === 'published'
    │
    ├─ 幂等性检查 (checkIdempotencyOrThrow)
    │   ├─ 过期检查: expiresAt <= now → IDEMPOTENCY_KEY_EXPIRED
    │   ├─ 冲突检查: requestHash 不匹配 → IDEMPOTENCY_CONFLICT
    │   ├─ 缓存命中: 已完成订单 → IDEMPOTENCY_HIT (返回订单)
    │   └─ 并发处理: status === 'pending' → CONFLICT
    │
    ├─ 优惠券折扣计算 (calculateCouponDiscount)
    │   └─ 调用 couponService.calculateDiscount()
    │
    ├─ 创建订单记录 (orders.createOrder)
    │   ├─ 生成订单号: ORD + 时间戳 + 随机数
    │   ├─ status: 'pending_payment'
    │   └─ 写入 discountAmount, couponRedemptionId
    │
    ├─ 核销优惠券 (redeemCouponWithRollback)
    │   ├─ couponService.redeemCoupon()
    │   ├─ 更新订单 couponRedemptionId
    │   └─ 失败时回滚: discountAmount → '0.00'
    │
    ├─ 绑定推广码 (bindPromoterCodeIfExists)
    │   └─ promoterCodeService.bindByPromoterCode()
    │
    └─ 更新幂等性状态 → succeeded
```

**关键代码位置**:
- 商品验证: `order.service.ts:211-222`
- 幂等性检查: `order.service.ts:241-348`
- 优惠券计算: `order.service.ts:365-422`
- 订单创建: `order.service.ts:661-670`

### 2. 支付回调处理

**位置**: `src/services/wechat-pay.service.ts:173-322`

```
微信支付回调
    │
    ├─ 1. 验证签名 + 解密数据
    │
    ├─ 2. 根据 outTradeNo 查询订单
    │
    ├─ 3. 幂等性检查 (providerTradeNo)
    │   ├─ 已存在 → 检查 orderId 是否匹配
    │   ├─ 匹配 → 重放处理, 确保订单状态
    │   └─ 不匹配 → 防御性 no-op (避免重试风暴)
    │
    ├─ 4. 确认支付状态
    │   ├─ payments.confirmPaymentSucceeded()
    │   ├─ 设置 providerTradeNo, providerPayerId, confirmedAt
    │   └─ status: 'succeeded'
    │
    ├─ 5. 推进订单状态
    │   ├─ orders.updateOrderStatus() → 'paid'
    │   ├─ 设置 paidAt, paidAmount
    │
    └─ 6. 创建履约任务
        └─ fulfillmentJobs.upsertJobByPaymentId()
            └─ status: 'pending', availableAt: now()
```

**关键代码位置**:
- 回调验证: `wechat-pay.service.ts:173-186`
- 幂等性处理: `wechat-pay.service.ts:206-249`
- 订单状态更新: `wechat-pay.service.ts:303-311`

### 3. 订单履约流程

**位置**: `src/services/order-fulfillment.service.ts:51-149`

```
定时任务触发
    │
    ├─ 1. 查询到期任务
    │   └─ jobs.listDueJobs({ limit, nowIso })
    │       └─ WHERE status = 'pending' AND availableAt <= now
    │
    ├─ 2. 尝试标记处理中
    │   └─ jobs.tryMarkProcessing()
    │       ├─ CAS 更新: status = 'pending' → 'processing'
    │       └─ 失败 → 跳过 (被其他进程处理)
    │
    ├─ 3. 执行履约 RPC
    │   └─ jobs.applyFulfillment({ orderId, paymentId })
    │       ├─ 发放权益: INSERT course_entitlements
    │       └─ 冻结佣金: INSERT commission_records (status: 'frozen')
    │
    ├─ 4. 处理结果
    │   ├─ 成功 → markSucceeded()
    │   │   └─ status: 'succeeded'
    │   │
    │   └─ 失败 → 重试机制
    │       ├─ attemptCount >= 5 → markManualRequired()
    │       │   └─ status: 'manual_required'
    │       │
    │       └─ 计算退避时间 → markRetrying()
    │           ├─ delay = 5 * 2^(attemptCount-1) 秒
    │           ├─ 最大延迟: 300 秒
    │           └─ status: 'retrying', nextAvailableAt
```

**重试策略**:
- 最大重试次数: 5次
- 退避算法: 指数退避
- 延迟计算: `5 * 2^(attemptCount-1)` 秒
- 最大延迟: 300秒 (5分钟)

**关键代码位置**:
- 主流程: `order-fulfillment.service.ts:51-149`
- 退避计算: `order-fulfillment.service.ts:9-14`

### 4. 订单完成流程

**位置**: `src/services/admin-order.service.ts:111-152`

```
管理员确认订单完成
    │
    ├─ 1. 验证订单状态
    │   ├─ 不存在 → NOT_FOUND
    │   ├─ 已完成 → 幂等返回
    │   └─ 非 paid 状态 → INVALID_STATE
    │
    ├─ 2. 更新订单状态
    │   ├─ status: 'paid' → 'completed'
    │   └─ 设置 completedAt
    │
    └─ 3. 推进佣金状态
        └─ commissionService.markCommissionPayableForCompletedOrder()
            └─ commission_records: 'frozen' → 'payable'
```

### 5. 退款流程

**位置**: `src/services/admin-order.service.ts:154-207`

```
管理员发起退款
    │
    ├─ 1. 验证订单状态
    │   ├─ 非 paid/completed → INVALID_STATE
    │   └─ 检查退款金额是否超额
    │
    ├─ 2. 检查佣金状态
    │   └─ 有 settling/settled 佣金 → 不可退款
    │
    ├─ 3. 调用微信退款
    │   └─ wechatPayService.refund()
    │
    ├─ 4. 更新订单状态
    │   ├─ refundedAmount += refundAmount
    │   ├─ 全额退款 → status: 'refunded'
    │   └─ 部分退款 → status: 'refunding'
    │
    └─ 5. 调整佣金
        └─ commissionService.adjustCommissionForRefund()
```

---

## 五、数据模型关键关系

### 数据库表关系图

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              数据库表关系图 (Prisma Schema)                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │       User          │
                    │  ─────────────────  │
                    │  id (PK)            │
                    │  username           │
                    │  phone              │
                    └──────────┬──────────┘
                               │ 1
                               │
                               │ N
            ┌──────────────────┴──────────────────┐
            │                                     │
    ┌───────▼────────┐                  ┌────────▼────────┐
    │     Order      │                  │ DistributionRelation│
    │  ────────────  │                  │  ───────────────  │
    │  id (PK)       │◄─────────────────│  userId (FK)     │
    │  orderNo (UK)  │                  │  promoterUserId  │
    │  userId (FK)   │                  └─────────────────┘
    │  productId(FK) │
    │  status        │
    │  paidAmount    │                  ┌─────────────────┐
    │  refundedAmount│                  │ CommissionRecord│
    └───────┬────────┘                  │  ─────────────  │
            │                           │  orderId (FK)   │
            │ N                         │  promoterUserId │
            │                           │  amount         │
            │                           │  status         │
    ┌───────▼──────────────────────┐    └─────────────────┘
    │        Payment                │
    │  ──────────────────────────   │
    │  id (PK)                      │
    │  orderId (FK)                 │
    │  providerTradeNo (UK)         │
    │  status                       │
    └───────┬───────────────────────┘
            │ 1
            │
            │ N
    ┌───────▼──────────────────────┐
    │  OrderFulfillmentJob         │
    │  ──────────────────────────   │
    │  id (PK)                     │
    │  orderId (FK)                │
    │  paymentId (UK, FK)          │
    │  status                      │
    │  attemptCount                │
    └──────────────────────────────┘

            ┌──────────────────────┐
            │   CouponRedemption    │
            │  ──────────────────   │
            │  id (PK)              │
            │  orderId (FK)          │
            │  userCouponId (UK, FK) │
            │  discountAmount        │
            └───────────────────────┘

            ┌──────────────────────┐
            │  CourseEntitlement    │
            │  ──────────────────   │
            │  id (PK)              │
            │  userId (FK)          │
            │  productId (FK)       │
            │  grantedByOrderId(FK) │
            │  status               │
            └───────────────────────┘
```

### 关键字段说明

#### Order 表 (订单主表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| orderNo | String(Unique) | 业务订单号 (ORD+时间戳+随机数) |
| userId | UUID(FK) | 下单用户 |
| productId | UUID(FK) | 商品 ID |
| status | String | 订单状态 |
| priceAmount | Decimal | 订单金额 |
| paidAmount | Decimal? | 实际支付金额 |
| refundedAmount | Decimal | 已退款金额 |
| couponRedemptionId | UUID?(Unique, FK) | 优惠券核销记录 |
| discountAmount | Decimal? | 折扣金额 |

#### Payment 表 (支付记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| orderId | UUID(FK) | 关联订单 |
| providerTradeNo | String(Unique) | 微信支付交易号 |
| status | String | 支付状态 |
| amount | Decimal | 支付金额 |

#### OrderFulfillmentJob 表 (履约任务)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| orderId | UUID(FK) | 关联订单 |
| paymentId | UUID(Unique, FK) | 关联支付记录 |
| status | String | 履约状态 |
| attemptCount | Int | 重试次数 |
| availableAt | DateTime | 下次可执行时间 |

---

## 六、架构设计特点

1. **六层架构严格遵循**: UI → API → Contract → Service → Repository → Infrastructure
2. **幂等性保证**: 使用 Idempotency-Key 防止重复下单，24小时缓存
3. **状态机管理**: 订单状态单向流转，支持重试和人工介入
4. **多数据库支持**: 通过工厂模式支持 Prisma/Supabase 切换
5. **自动化履约**: 异步任务处理佣金发放和权益发放，支持指数退避重试
6. **完整日志审计**: 所有操作记录 traceId，支持追踪和排障

---

## 七、相关文档

- [佣金结算流程](../promotion/佣金结算流程.md)
- [佣金冻结](../promotion/佣金冻结.md)
