# IDOR 安全审计与修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面审计后端 API 路由的 IDOR（不安全的直接对象引用）漏洞，确认并修复所有安全问题

**Architecture:** 后端使用 Next.js App Router API Routes，通过 `withV1Route()` 统一路由处理，JWT + Session 双重认证，RBAC 权限控制。用户路由通过 Service 层 ownership check 防护，管理路由通过 RBAC scope 控制。

**Tech Stack:** Next.js 16+ (App Router), TypeScript, Prisma, JWT (HS256), RBAC (AccessManager)

---

## 审计结论摘要

经过对 90+ 个 API 路由文件的全面审计，结果如下：

### 用户路由 IDOR 检查结果 — 全部安全 ✅

| 路由文件 | HTTP 方法 | 所有权校验位置 | 状态 |
|---------|----------|---------------|------|
| `user/sessions/[sessionId]/route.ts` | DELETE | L42: `session.userId !== userId` | ✅ 安全 |
| `user/orders/[orderId]/route.ts` | GET | order.service.ts L668: `order.userId !== params.userId` | ✅ 安全 |
| `user/orders/[orderId]/cancel/route.ts` | POST | order.service.ts L784: `order.userId !== params.userId` | ✅ 安全 |
| `user/orders/[orderId]/wechat-pay/route.ts` | POST | wechat-pay.service.ts L95: `order.userId !== params.userId` | ✅ 安全 |
| `user/notifications/[id]/route.ts` | GET | notification.repo.ts L216: `userId` 过滤 | ✅ 安全 |
| `user/notifications/[id]/read/route.ts` | PUT | 服务层检查通知归属 | ✅ 安全 |
| `user/favorites/[id]/route.ts` | DELETE | favorite.repo.ts L72: `where: { id, userId }` | ✅ 安全 |
| `user/feedback/[id]/route.ts` | GET | feedback.service.ts L130: `feedback.userId !== userId` | ✅ 安全 |
| `user/documents/[id]/route.ts` | DELETE | user-document.service.ts L164: `doc.userId !== userId` | ✅ 安全 |
| `user/documents/[id]/file/route.ts` | GET | route.ts L30: `doc.userId !== userId` (admin 例外) | ✅ 安全 |
| `user/promoter-codes/[id]/route.ts` | DELETE | promoter-code.service.ts L371: 所有权检查 | ✅ 安全 |
| `user/promoter-codes/[id]/status/route.ts` | PATCH | promoter-code.service.ts L326: 所有权检查 | ✅ 安全 |
| `user/coupons/calculate/route.ts` | POST | coupon.service.ts L486: `userCoupon.userId !== params.userId` | ⚠️ 信息泄露 |

### 管理路由 RBAC 检查结果 — 均受 RBAC 保护 ✅

所有 admin 路由均使用 `requireAccess: { action, scope }` 进行 RBAC 权限校验。单租户系统下管理员可操作所有资源是预期行为。

| 路由文件 | RBAC Scope | 额外防护 | 状态 |
|---------|-----------|---------|------|
| `admin/orders/[orderId]/route.ts` | `read:orders` | — | ✅ 安全 |
| `admin/orders/[orderId]/refund/route.ts` | `write:orders` | MFA action token | ✅ 安全 |
| `admin/orders/[orderId]/complete/route.ts` | `write:orders` | — | ✅ 安全 |
| `admin/orders/[orderId]/promoter/route.ts` | `write:orders` | — | ✅ 安全 |
| `admin/users/[id]/mfa/reset/route.ts` | `write:users` | 审计日志 | ✅ 安全 |
| `admin/mfa/exemptions/[userId]/route.ts` | `write:mfa` | — | ✅ 安全 |
| `admin/notifications/[id]/route.ts` | `read/write:notifications` | — | ✅ 安全 |

### 内部/公开路由检查结果

| 路由文件 | 认证机制 | 状态 |
|---------|---------|------|
| `internal/test/reset-password` | 环境变量 + Token | ✅ 安全 |
| `internal/test/reset-mfa` | 环境变量 + Token | ✅ 安全 |
| `internal/user-documents/[id]/file` | JWT + RBAC | ✅ 安全 |
| `internal/cron/orders/cancel-expired` | Token + IP 白名单 | ✅ 安全 |
| `internal/cron/sessions/cleanup` | Token + IP 白名单 | ✅ 安全 |
| `internal/cron/order-fulfillment/run` | Token + IP 白名单 | ✅ 安全 |
| **`internal/rate-limit/cleanup`** | **仅 Token** | **⚠️ 缺少 IP 白名单** |
| `public/files/[...path]` | 三层路径防护 | ✅ 安全 |
| `public/webhooks/wechat/pay/notify` | RSA 签名验签 | ✅ 安全 |
| `public/products/[id]` | 仅返回 published | ✅ 安全 |
| `public/blog/articles/[slug]` | 仅返回 PUBLISHED | ✅ 安全 |

---

## 需要修复的问题（按优先级排序）

### 问题 1: internal/rate-limit/cleanup 缺少 IP 白名单检查 (MEDIUM)

**文件:** `apps/backend/src/app/api/v1/internal/rate-limit/cleanup/route.ts`

**问题:** 其他所有 cron 内部路由都使用 `isInternalIp(clientIp)` 进行 IP 白名单校验，但 rate-limit/cleanup 仅依赖 cron token。如果 token 泄露，外部攻击者可以触发无限速率限制清理。

**参考防护模式:** `internal/cron/orders/cancel-expired/route.ts` L35-38

### 问题 2: coupons/calculate 信息泄露 (LOW)

**文件:** `apps/backend/src/plugins/ecommerce/services/coupon.service.ts`

**问题:** L486-494 — 当用户试图计算不属于自己的优惠券折扣时，虽然返回 `canUse: false`，但仍然包含了 `coupon: userCoupon.coupon!` 完整优惠券对象，导致其他用户优惠券信息泄露。

---

## Task 1: 修复 internal/rate-limit/cleanup IP 白名单

**Files:**
- Modify: `apps/backend/src/app/api/v1/internal/rate-limit/cleanup/route.ts`

- [ ] **Step 1: 确认 isInternalIp 工具函数的位置和用法**

Run: `grep -rn "isInternalIp" apps/backend/src/ --include="*.ts" | head -20`
Expected: 找到 `isInternalIp` 定义位置和使用模式

- [ ] **Step 2: 修改 rate-limit/cleanup/route.ts 添加 IP 白名单检查**

在 cron token 验证之后、执行清理逻辑之前，添加 IP 白名单检查：

```typescript
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
// 需要确认 isInternalIp 的实际 import 路径
```

在 handler 中，token 验证通过后添加：

```typescript
const { ip: clientIp } = extractClientIpSafe(req, { requireIp: false })
if (clientIp && !isInternalIp(clientIp)) {
  return createJsonApiResponse(req, fail('FORBIDDEN', 'Access denied'), { status: 403 })
}
```

注意：必须与 `internal/cron/orders/cancel-expired/route.ts` 的防护模式保持完全一致。

- [ ] **Step 3: 验证修改**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app/api/v1/internal/rate-limit/cleanup/route.ts
git commit -m "fix(security): add IP whitelist check to rate-limit cleanup cron route"
```

---

## Task 2: 修复 coupons/calculate 信息泄露

**Files:**
- Modify: `apps/backend/src/plugins/ecommerce/services/coupon.service.ts:480-495`

- [ ] **Step 1: 修改 calculateDiscount 方法，当优惠券不属于当前用户时不返回 coupon 详情**

将 L486-494 的代码：

```typescript
if (userCoupon.userId !== params.userId) {
  return {
    canUse: false,
    reason: 'Coupon does not belong to user',
    originalAmount: params.originalAmount,
    discountAmount: '0.00',
    finalAmount: params.originalAmount,
    coupon: userCoupon.coupon!,
  }
}
```

修改为：

```typescript
if (userCoupon.userId !== params.userId) {
  return {
    canUse: false,
    reason: 'Coupons are not available',
    originalAmount: params.originalAmount,
    discountAmount: '0.00',
    finalAmount: params.originalAmount,
    coupon: null,
  }
}
```

注意：
1. `coupon` 设为 `null` 而非 `userCoupon.coupon!`，避免泄露其他用户的优惠券信息
2. `reason` 使用通用文案 `'Coupons are not available'`，不泄露具体原因
3. 需要确认返回类型定义中 `coupon` 字段是否允许 `null`，如果不允许需要调整类型定义

- [ ] **Step 2: 检查并更新类型定义**

如果 `CalculateDiscountResult` 类型中 `coupon` 不允许 null，需要更新类型：

Run: `grep -rn "CalculateDiscountResult\|calculateDiscount" apps/backend/src/plugins/ecommerce/contracts/ --include="*.ts"`

根据结果更新类型定义使 `coupon` 字段允许 `null`。

- [ ] **Step 3: 更新使用该返回值的前端代码（如果有）**

Run: `grep -rn "calculation.coupon\|\.coupon" apps/ --include="*.tsx" --include="*.ts" | grep -i "calculat"`

确保前端代码处理 `coupon: null` 的情况。

- [ ] **Step 4: 验证修改**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/plugins/ecommerce/services/coupon.service.ts
git commit -m "fix(security): prevent coupon info leak in calculateDiscount when coupon belongs to another user"
```

---

## Task 3: 创建 bd (beads) 安全审计记录

- [ ] **Step 1: 创建审计任务追踪**

```bash
bd create "IDOR 安全审计完成 - 发现 2 个安全问题" --description="全面审计 90+ API 路由文件。用户路由无 IDOR 漏洞，管理路由 RBAC 正常。发现 2 个安全改进点：1) internal/rate-limit/cleanup 缺少 IP 白名单 (MEDIUM) 2) coupons/calculate 信息泄露 (LOW)" -t task -p 1 --json
```

- [ ] **Step 2: 为每个修复创建独立 issue**

```bash
bd create "修复 internal/rate-limit/cleanup IP 白名单缺失" --description="rate-limit cleanup 路由仅检查 cron token，缺少 IP 白名单检查。其他 cron 路由（cancel-expired, sessions/cleanup 等）都使用 isInternalIp 验证。需要与现有 cron 路由保持一致的防护模式。" -t bug -p 2 --json

bd create "修复 coupons/calculate 优惠券信息泄露" --description="calculateDiscount 方法在用户尝试使用其他用户的优惠券时，虽然返回 canUse:false，但仍包含完整 coupon 对象，导致信息泄露。需要将 coupon 设为 null 并使用通用错误信息。" -t bug -p 3 --json
```

---

## 审计范围与方法论

### 审计范围

| 模块 | 路由数量 | 审计文件 |
|------|---------|---------|
| `api/v1/user/` | 30+ | 所有含动态参数的路由 |
| `api/v1/admin/` | 25+ | 所有含动态参数的路由 |
| `api/v1/internal/` | 7 | 全部路由 |
| `api/v1/public/` | 10+ | 全部路由 |
| `api/v1/auth/` | 5 | 认证机制 |
| `_shared/` | 3 | 认证中间件、路由处理器 |

### 审计方法

1. **路由处理器分析**: 检查 `withV1Route` 配置中的 `requireAuth`、`requireAccess`、`pluginGuard`
2. **动态参数追踪**: 追踪 `[id]`、`[orderId]`、`[sessionId]` 等参数在 Service 层的所有权校验
3. **用户 ID 来源验证**: 确认 userId 来自 JWT token 而非用户输入
4. **Repository 层过滤**: 验证数据库查询是否包含 userId 过滤条件
5. **信息泄露检查**: 检查错误响应是否泄露其他用户数据

### 未发现 IDOR 漏洞的原因分析

该系统的 IDOR 防护设计良好，主要归功于：

1. **统一路由处理**: `withV1Route()` 强制要求声明 `requireAuth` 或 `requireAccess`
2. **Service 层 ownership check**: 敏感操作在 Service 层显式检查 `resource.userId !== userId`
3. **Repository 层过滤**: 查询使用 `where: { id, userId }` 双重条件
4. **JWT 用户身份**: userId 始终从 JWT token 提取，不接受用户输入覆盖
5. **RBAC 权限粒度**: 管理路由使用 `action:scope` 粒度控制

---

## 自检清单

- [x] 所有用户路由动态参数已检查所有权校验
- [x] 所有管理路由已确认 RBAC 保护
- [x] 内部路由认证机制已验证
- [x] 公开路由数据过滤已确认
- [x] 认证基础设施（JWT、Session、RBAC）已审查
- [x] 2 个安全问题已确认为真实漏洞（非误报）
- [x] 修复方案已提供具体代码变更
- [x] 类型安全已考虑（tsc --noEmit 验证步骤）
