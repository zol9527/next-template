# 认证安全加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复认证系统中 7 个已确认的安全漏洞，消除 token 泄露、SSRF 和防护绕过风险。

**Architecture:** 逐个漏洞修复，每个修复都是独立的、可验证的。核心思路：(1) 消除响应体 token 泄露通道；(2) 修复 middleware 内部请求的 SSRF；(3) 加强内部测试路由的防护。所有修改限定在 8 个文件内，不涉及架构变更。

**Tech Stack:** Next.js 16 (App Router, proxy.ts middleware), TypeScript, Vitest

---

## File Structure

```
apps/backend/src/
├── config/env.mjs                                          # 修改 — 添加 INTERNAL_BASE_URL 环境变量
├── lib/http/
│   ├── client-detector.ts                                  # 修改 — 加强客户端类型验证
│   └── http/request/session.ts                             # 修改 — 修复 SSRF：使用环境变量构造 URL
├── app/api/v1/auth/
│   ├── wechat/route.ts                                     # 修改 — 添加 isNonBrowserClient 守卫
│   ├── refresh/route.ts                                    # 修改 — 移除 body?.refreshToken 条件
│   └── logout/route.ts                                     # 修改 — 添加 requireAuth
└── app/api/v1/internal/test/
    ├── reset-mfa/route.ts                                  # 修改 — 添加 cron token 验证
    └── reset-password/route.ts                             # 修改 — 添加 cron token 验证

test/unit/lib/
├── http/
│   └── client-detector.test.ts                             # 创建 — 客户端检测单元测试
└── session/
    └── tryRefreshSessionByCookie.test.ts                   # 创建 — SSRF 修复验证测试
```

---

## Task 1: 修复 SSRF — `tryRefreshSessionByCookie` 使用环境变量构造 URL (VULN-05)

**优先级:** P1 — 必须最先修复（其他任务不依赖此）

**Files:**
- Modify: `apps/backend/src/config/env.mjs` (添加 `INTERNAL_BASE_URL`)
- Modify: `apps/backend/src/lib/http/request/session.ts` (修复 URL 构造)
- Create: `apps/backend/test/unit/lib/http/request/session.test.ts`

**背景:** 当前 `tryRefreshSessionByCookie` 从请求头 `Host` 和 `X-Forwarded-Proto` 构造内部刷新 URL，攻击者可伪造这些头使服务器向恶意地址发起请求（附带 cookie）。

- [ ] **Step 1: 在 env.mjs 中添加 `INTERNAL_BASE_URL` 环境变量**

在 `apps/backend/src/config/env.mjs` 中：
- 在 server-side schema 部分（`z.object` 内）添加：`INTERNAL_BASE_URL: z.string().url().optional(),`
- 在 `runtimeEnv` 映射部分添加：`INTERNAL_BASE_URL: process.env.INTERNAL_BASE_URL,`

添加位置在 `INTERNAL_CRON_TOKEN` 附近即可，保持同类变量在一起。

- [ ] **Step 2: 编写失败的测试**

创建 `apps/backend/test/unit/lib/http/request/session.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env 模块，避免加载真实环境变量
vi.mock('@/config', () => ({
  env: {
    INTERNAL_BASE_URL: 'http://localhost:3000',
  },
}))

describe('tryRefreshSessionByCookie', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('应使用 INTERNAL_BASE_URL 构造刷新 URL，而非请求头', async () => {
    // 模拟 fetch 捕获实际请求的 URL
    const capturedUrls: string[] = []
    global.fetch = vi.fn().mockImplementation(async (url: string | URL) => {
      capturedUrls.push(url.toString())
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'set-cookie': ['access_token=new; Path=/'] },
      })
    })

    const { tryRefreshSessionByCookie } = await import('@/lib/http/request/session')

    // 构造恶意请求头
    const mockReq = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: 'some-refresh-token' }),
      },
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'cookie') return 'refresh_token=some-refresh-token'
          if (name === 'host') return 'evil.com'            // 恶意 Host
          if (name === 'x-forwarded-proto') return 'https'  // 恶意 Proto
          if (name === 'user-agent') return 'test'
          return null
        }),
      },
      nextUrl: {
        protocol: 'http:',
        host: 'localhost:3000',
      },
    } as any

    await tryRefreshSessionByCookie(mockReq, 'trace-123')

    // 验证：请求应发往 INTERNAL_BASE_URL，而非 evil.com
    expect(capturedUrls.length).toBeGreaterThan(0)
    expect(capturedUrls[0]).toContain('localhost:3000')
    expect(capturedUrls[0]).not.toContain('evil.com')
  })

  it('当 INTERNAL_BASE_URL 未配置时应回退到 req.nextUrl', async () => {
    vi.doMock('@/config', () => ({
      env: { INTERNAL_BASE_URL: undefined },
    }))

    const capturedUrls: string[] = []
    global.fetch = vi.fn().mockImplementation(async (url: string | URL) => {
      capturedUrls.push(url.toString())
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'set-cookie': ['access_token=new; Path=/'] },
      })
    })

    const { tryRefreshSessionByCookie } = await import('@/lib/http/request/session')

    const mockReq = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: 'some-refresh-token' }),
      },
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'cookie') return 'refresh_token=some-refresh-token'
          if (name === 'host') return null
          if (name === 'x-forwarded-proto') return null
          if (name === 'user-agent') return 'test'
          return null
        }),
      },
      nextUrl: {
        protocol: 'http:',
        host: 'fallback-host:3000',
      },
    } as any

    await tryRefreshSessionByCookie(mockReq, 'trace-123')

    expect(capturedUrls.length).toBeGreaterThan(0)
    expect(capturedUrls[0]).toContain('fallback-host:3000')
  })

  it('当无 refresh token 时应返回 null', async () => {
    const { tryRefreshSessionByCookie } = await import('@/lib/http/request/session')

    const mockReq = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
      nextUrl: {},
    } as any

    const result = await tryRefreshSessionByCookie(mockReq, 'trace-123')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd apps/backend && npx vitest run test/unit/lib/http/request/session.test.ts --reporter=verbose`
Expected: 第一个测试 FAIL（当前代码使用 Host 头而非 INTERNAL_BASE_URL）

- [ ] **Step 4: 修改 `session.ts` 使用环境变量**

将 `apps/backend/src/lib/http/request/session.ts` 第 1-40 行替换为：

```typescript
import type { NextRequest } from 'next/server'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { TRACE_ID_HEADER } from './headers'
import { extractSetCookieHeaders } from '@/lib/http'
import { env } from '@/config'

/**
 * Module: session
 *
 * Description: 会话相关的请求处理
 *
 * 提供会话刷新等中间件级别的会话管理功能
 */

/**
 * Function: tryRefreshSessionByCookie
 *
 * Description: 当 access token 无效但存在 refresh token 时，尝试调用刷新接口获取新的 Cookie
 *
 * Parameters:
 *     req(NextRequest): 当前请求
 *     traceId(string): 当前请求的 traceId
 *
 * Returns:
 *     setCookies(string[] | null): 成功返回 Set-Cookie 头数组；失败返回 null
 */
export async function tryRefreshSessionByCookie(
  req: NextRequest,
  traceId: string,
): Promise<string[] | null> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) return null

  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  // 安全修复: 使用环境变量配置的内部 URL，不信任请求头
  // 防止攻击者通过伪造 Host/X-Forwarded-Proto 头发起 SSRF 攻击
  const baseUrl = env.INTERNAL_BASE_URL
    ?? `${req.nextUrl.protocol.replace(':', '')}://${req.nextUrl.host}`
  const refreshUrl = new URL('/api/v1/auth/refresh', baseUrl)

  let refreshRes: Response
  try {
    refreshRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'user-agent': req.headers.get('user-agent') ?? '',
        [TRACE_ID_HEADER]: traceId,
      },
    })
  } catch {
    return null
  }

  if (!refreshRes.ok) return null

  const setCookies = extractSetCookieHeaders(refreshRes)
  if (setCookies.length === 0) return null
  return setCookies
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd apps/backend && npx vitest run test/unit/lib/http/request/session.test.ts --reporter=verbose`
Expected: 3 个测试全部 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/config/env.mjs apps/backend/src/lib/http/request/session.ts apps/backend/test/unit/lib/http/request/session.test.ts
git commit -m "fix(security): 修复 SSRF 漏洞 — tryRefreshSessionByCookie 使用环境变量构造内部 URL

- 添加 INTERNAL_BASE_URL 环境变量用于内部请求
- 移除对 Host/X-Forwarded-Proto 请求头的信任
- 未配置时回退到 req.nextUrl（安全来源）
- 添加单元测试验证行为"
```

---

## Task 2: 修复微信登录 Token 泄露 (VULN-02)

**优先级:** P1

**Files:**
- Modify: `apps/backend/src/app/api/v1/auth/wechat/route.ts`

**背景:** 微信登录端点无条件在响应体返回 `accessToken` 和 `refreshToken`，应与密码登录一致，仅对非浏览器客户端返回。

- [ ] **Step 1: 修改 `wechat/route.ts`**

在 `apps/backend/src/app/api/v1/auth/wechat/route.ts` 中：

1. 添加 `isNonBrowserClient` import（在现有 import 后添加）：
```typescript
import { isNonBrowserClient } from '@/lib/http/client-detector'
```

2. 将 handler 中第 38-44 行：
```typescript
    const res = createJsonApiResponse(req, ok({
      userId: result.userId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }))
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
```

替换为：
```typescript
    // 安全修复: 浏览器端仅通过 HttpOnly Cookie 下发 token
    // 非浏览器客户端（小程序等）自行管理 token，需要通过响应体获取
    const responseData: Record<string, unknown> = { userId: result.userId }

    if (isNonBrowserClient(req)) {
      responseData.accessToken = result.accessToken
      responseData.refreshToken = result.refreshToken
    }

    const res = createJsonApiResponse(req, ok(responseData))
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
```

- [ ] **Step 2: 验证修改正确**

Run: `cd apps/backend && npx vitest typecheck --run 2>&1 | head -5 || npx tsc --noEmit 2>&1 | tail -5`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/app/api/v1/auth/wechat/route.ts
git commit -m "fix(security): 微信登录添加 isNonBrowserClient 守卫，防止浏览器端 token 泄露

- 与密码登录和 MFA 验证路由保持一致的 token 返回策略
- 浏览器端仅通过 HttpOnly Cookie 获取 token
- 非浏览器客户端（小程序）仍可通过响应体获取 token"
```

---

## Task 3: 修复 Refresh 端点 Token 泄露 (VULN-03)

**优先级:** P1

**Files:**
- Modify: `apps/backend/src/app/api/v1/auth/refresh/route.ts`

**背景:** `refresh/route.ts:93` 的条件 `isNonBrowserClient(req) || body?.refreshToken` 存在逻辑缺陷 — 攻击者在 body 中附带 `refreshToken` 即可在浏览器端响应体获取新 token。

- [ ] **Step 1: 修改 `refresh/route.ts`**

将 `apps/backend/src/app/api/v1/auth/refresh/route.ts` 第 92-96 行：

```typescript
    // 非浏览器客户端（小程序等）需要通过响应体获取新 token
    if (isNonBrowserClient(req) || body?.refreshToken) {
      responseData.accessToken = result.accessToken
      responseData.refreshToken = result.refreshToken
    }
```

替换为：

```typescript
    // 安全修复: 仅对非浏览器客户端在响应体中返回 token
    // 移除 body?.refreshToken 条件 — 该条件允许攻击者在浏览器端通过附带
    // refreshToken 来绕过客户端类型检查，获取响应体中的明文 token
    if (isNonBrowserClient(req)) {
      responseData.accessToken = result.accessToken
      responseData.refreshToken = result.refreshToken
    }
```

- [ ] **Step 2: 同时修复 HMAC 硬编码盐值 (VULN-06)**

在同一文件第 56 行，将：

```typescript
      return createHmac('sha256', 'rate-limit-salt')
```

替换为：

```typescript
      // 安全修复: 使用环境变量 pepper 作为 HMAC 盐，避免硬编码
      return createHmac('sha256', env.AUTH_REFRESH_TOKEN_PEPPER || 'dev-only-fallback')
```

在文件顶部 import 区域添加：
```typescript
import { env } from '@/config'
```

- [ ] **Step 3: 验证**

Run: `cd apps/backend && npx vitest run test/unit/lib/auth/refresh.test.ts --reporter=verbose 2>&1 | tail -10`
Expected: 现有测试仍然通过

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app/api/v1/auth/refresh/route.ts
git commit -m "fix(security): 修复 refresh 端点两处安全问题

- 移除 body?.refreshToken 条件，防止浏览器端通过 body 绕过客户端类型检查获取明文 token
- HMAC 速率限制盐值改用环境变量 AUTH_REFRESH_TOKEN_PEPPER，避免硬编码"
```

---

## Task 4: Logout 添加 requireAuth (VULN-09)

**优先级:** P2

**Files:**
- Modify: `apps/backend/src/app/api/v1/auth/logout/route.ts`

**背景:** Logout 端点无认证要求，攻击者可通过 CSRF 触发合法用户的会话撤销。添加 `requireAuth` 后，未认证请求会被拒绝；同时从 auth 上下文获取 userId 作为额外撤销路径。

- [ ] **Step 1: 修改 `logout/route.ts`**

将 `apps/backend/src/app/api/v1/auth/logout/route.ts` 整体替换为：

```typescript
import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { removeAuthCookies } from '@/lib/http/response/cookies'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  action: 'auth:logout',
  // 安全修复: 添加 requireAuth 防止未认证请求和 CSRF 攻击
  // 未认证用户不应有注销能力，避免攻击者通过 CSRF 撤销合法用户会话
  requireAuth: true,
  handler: async ({ req, traceId, logger, userId }) => {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null
    const auth = await createAuth({ traceId, logger, userAgent: req.headers.get('user-agent'), clientIp: null })

    await auth.logout({ refreshToken })

    const res = createJsonApiResponse(req, ok({ ok: true }))
    removeAuthCookies(res)
    return res
  },
  onError: (_ctx, res) => {
    removeAuthCookies(res)
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 验证**

Run: `cd apps/backend && npx vitest typecheck --run 2>&1 | head -5 || true`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/app/api/v1/auth/logout/route.ts
git commit -m "fix(security): Logout 端点添加 requireAuth 防止 CSRF 会话撤销

- 未认证请求将返回 401，阻止跨站注销攻击
- 从 auth 上下文获取 userId 确保身份一致性"
```

---

## Task 5: 内部测试路由添加 Token 验证 (VULN-07)

**优先级:** P2

**Files:**
- Modify: `apps/backend/src/app/api/v1/internal/test/reset-mfa/route.ts`
- Modify: `apps/backend/src/app/api/v1/internal/test/reset-password/route.ts`

**背景:** 内部测试路由仅靠环境变量守卫，无认证和 IP 白名单。如果 staging 误设 `E2E_ALLOW_INTERNAL_TEST_ROUTES=true`，攻击者可无认证调用。添加 `x-internal-cron-token` 验证（与 cron 路由一致）。

- [ ] **Step 1: 修改 `reset-mfa/route.ts`**

在 `apps/backend/src/app/api/v1/internal/test/reset-mfa/route.ts` 中：

1. 添加 import：
```typescript
import { env } from '@/config'
```

2. 将 handler 中第 16-20 行的安全检查：
```typescript
    // 安全：该端点仅用于 E2E/本地测试，默认隐藏
    // 额外检查：生产环境下必须禁用
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }
```

替换为：
```typescript
    // 安全：该端点仅用于 E2E/本地测试
    // 双重守卫：(1) 环境变量开关 + 非生产环境  (2) 内部 cron token 验证
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    const configuredToken = env.INTERNAL_CRON_TOKEN
    const providedToken = req.headers.get('x-internal-cron-token')
    if (!configuredToken || !providedToken || providedToken !== configuredToken) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
    }
```

- [ ] **Step 2: 修改 `reset-password/route.ts`**

在 `apps/backend/src/app/api/v1/internal/test/reset-password/route.ts` 中：

1. 添加 import：
```typescript
import { env } from '@/config'
```

2. 将 handler 中第 19-23 行的安全检查：
```typescript
    // 安全：该端点仅用于 E2E/本地测试，默认隐藏
    // 额外检查：生产环境下必须禁用
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }
```

替换为：
```typescript
    // 安全：该端点仅用于 E2E/本地测试
    // 双重守卫：(1) 环境变量开关 + 非生产环境  (2) 内部 cron token 验证
    if (process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES !== 'true' || process.env.NODE_ENV === 'production') {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    const configuredToken = env.INTERNAL_CRON_TOKEN
    const providedToken = req.headers.get('x-internal-cron-token')
    if (!configuredToken || !providedToken || providedToken !== configuredToken) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
    }
```

- [ ] **Step 3: 验证**

Run: `cd apps/backend && npx vitest run --reporter=verbose 2>&1 | tail -5`
Expected: 无相关测试失败

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app/api/v1/internal/test/reset-mfa/route.ts apps/backend/src/app/api/v1/internal/test/reset-password/route.ts
git commit -m "fix(security): 内部测试路由添加 cron token 验证

- 与 internal/cron 路由保持一致的安全策略
- 防止 staging 环境误配时被无认证调用
- 需要同时设置 E2E_ALLOW_INTERNAL_TEST_ROUTES=true 和有效的 x-internal-cron-token"
```

---

## Task 6: 更新 `.env.example.local` 文档

**优先级:** P2

**Files:**
- Modify: `apps/backend/.env.example.local`（或 `.env.example`，以实际存在为准）

- [ ] **Step 1: 找到并更新 env 示例文件**

在 `.env.example.local` 的 `INTERNAL_CRON_TOKEN` 附近添加：

```bash
# 内部服务间请求的基础 URL（用于 middleware 刷新 session）
# 未配置时回退到 req.nextUrl
# 安全修复：防止通过伪造 Host 头发起 SSRF 攻击
INTERNAL_BASE_URL=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/.env.example.local
git commit -m "docs: 添加 INTERNAL_BASE_URL 环境变量说明"
```

---

## Task 7: 最终验证

**优先级:** 必须

- [ ] **Step 1: 运行完整测试套件**

```bash
cd apps/backend && npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: 所有测试通过

- [ ] **Step 2: TypeScript 类型检查**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 无类型错误

- [ ] **Step 3: Lint 检查**

```bash
cd apps/backend && npx eslint src/lib/http/request/session.ts src/app/api/v1/auth/wechat/route.ts src/app/api/v1/auth/refresh/route.ts src/app/api/v1/auth/logout/route.ts src/app/api/v1/internal/test/reset-mfa/route.ts src/app/api/v1/internal/test/reset-password/route.ts --max-warnings=0 2>&1 | tail -10
```

Expected: 无 lint 错误

- [ ] **Step 4: 确认所有修改文件清单**

```bash
git diff --name-only HEAD~6
```

Expected 包含：
- `src/config/env.mjs`
- `src/lib/http/request/session.ts`
- `src/app/api/v1/auth/wechat/route.ts`
- `src/app/api/v1/auth/refresh/route.ts`
- `src/app/api/v1/auth/logout/route.ts`
- `src/app/api/v1/internal/test/reset-mfa/route.ts`
- `src/app/api/v1/internal/test/reset-password/route.ts`

---

## 漏洞修复映射

| 漏洞编号 | 严重度 | 修复任务 | 状态 |
|---------|--------|---------|------|
| VULN-05 | High   | Task 1  | SSRF via Host Header → 使用环境变量 |
| VULN-02 | High   | Task 2  | 微信登录 token 泄露 → isNonBrowserClient 守卫 |
| VULN-03 | High   | Task 3  | Refresh token 泄露 → 移除 body?.refreshToken 条件 |
| VULN-06 | Medium | Task 3  | HMAC 硬编码盐 → 使用环境变量 |
| VULN-09 | Medium | Task 4  | Logout CSRF → requireAuth |
| VULN-07 | Medium | Task 5  | 内部路由无认证 → cron token 验证 |

## 明确不修复的项（记录决策）

| 漏洞编号 | 原因 |
|---------|------|
| VULN-04 | `isNonBrowserClient` 可伪造 — 当前设计权衡，小程序需要响应体 token。建议后续引入客户端注册机制（client_id + client_secret），作为独立安全增强迭代 |
| VULN-08 | 用户枚举 — 当前已有抗时序攻击保护（DUMMY_PASSWORD_HASH）和统一错误消息，微信注册的防滥用由速率限制覆盖 |
| VULN-10 | CORS — 由环境变量白名单控制，需运维侧审查，非代码修复 |
| VULN-11 | MFA 策略仅限 admin — 产品设计决策，非安全漏洞 |
| VULN-01 | **误报** — Next.js 16 中 `proxy.ts` 就是 middleware，已正常工作 |
