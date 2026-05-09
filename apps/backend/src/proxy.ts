import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/token'
import { normalizeTraceId, TRACE_ID_HEADER, tryRefreshSessionByCookie, continueRequest, createUnauthorizedResponse, createForbiddenResponse, createRedirectToHome, createTooManyRequestsResponse, handleRefreshedTokenResponse, appendSecurityHeaders, } from '@/lib/http'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { checkRateLimitSync } from '@/lib/utils/rate-limit-sync'
import {
  // 路径判断
  isApiPath,
  isAuthRateLimitedPath,
  isDocsRateLimitedPath,
  isPublicAdminPath,
} from '@/middleware/path-checks'
import {
  // 维护模式
  checkMaintenanceMode,
} from '@/middleware/maintenance-mode'
import { env } from '@/config'

/**
 * Function: proxy
 *
 * Description: 全局代理，负责：
 *   - 基于环境决定是否进行速率限制（对认证及文档路径）
 *   - 处理根路径重定向至 `/admin`
 *   - 为请求注入并传播 `TRACE_ID_HEADER`
 *   - 为所有响应添加安全头（CSP、HSTS 等）
 *   - 对受保护路由进行鉴权（检查访问令牌并验证是否为 admin）
 *   - 对 API 路径和页面路径在未授权/未通过鉴权时返回不同的响应（JSON 或重定向）
 *
 * Parameters:
 *   req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *   NextResponse: 根据不同情况返回 `NextResponse.next()`、`NextResponse.redirect()` 或 `NextResponse.json()`。
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 初始化 traceId，用于链路追踪
  const traceId = normalizeTraceId(req.headers.get(TRACE_ID_HEADER))

  // 辅助函数：统一为所有响应添加安全头（CSP、HSTS 等）
  const withSecurityHeaders = (response: NextResponse) => appendSecurityHeaders(response)

  // ==================== 1. 维护模式检查 ====================
  const maintenanceResponse = await checkMaintenanceMode(req)
  if (maintenanceResponse) {
    return withSecurityHeaders(maintenanceResponse)
  }

  // ==================== 2. 速率限制检查（生产环境） ====================
  const { NODE_ENV } = process.env
  const shouldRateLimit = NODE_ENV === 'production'

  if (shouldRateLimit && (isAuthRateLimitedPath(pathname) || isDocsRateLimitedPath(pathname))) {
    const ipResult = extractClientIpSafe(req)
    const ip = ipResult.ip || 'unknown'
    const nowMs = Date.now()
    const isDocs = isDocsRateLimitedPath(pathname)

    const rl = checkRateLimitSync({
      key: `${isDocs ? 'docs' : 'auth'}:${pathname}:${ip}`,
      limit: isDocs ? 30 : 10,
      windowMs: 60_000,
      nowMs,
    })

    if (!rl.allowed) {
      return withSecurityHeaders(createTooManyRequestsResponse(traceId, rl.retryAfterSeconds))
    }
  }

  // ==================== 3. 公开路径处理 ====================

  // 认证端点（登录、刷新等）直接放行
  if (pathname.startsWith('/api/v1/auth/')) {
    return withSecurityHeaders(continueRequest(req, traceId))
  }

  // 根路径：直接渲染 Landing Page（不再自动跳转到后台）
  if (pathname === '/') {
    return withSecurityHeaders(continueRequest(req, traceId))
  }

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin')

  // 公开的管理员登录页面
  if (isPublicAdminPath(pathname)) {
    return withSecurityHeaders(continueRequest(req, traceId))
  }

  // 非保护路径直接放行
  if (!isProtected) {
    return withSecurityHeaders(continueRequest(req, traceId))
  }

  // ==================== 4. 受保护路径的鉴权处理 ====================

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const isApi = isApiPath(pathname)
  let verifiedPayload

  // 4.1 尝试验证现有的 access token
  if (token) {
    try {
      const secretKey = env.AUTH_JWT_ACCESS_SECRET
      if (!secretKey) {
        throw new Error('AUTH_JWT_ACCESS_SECRET is not configured')
      }
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secretKey))
      verifiedPayload = payload
    } catch {
      // Token 验证失败（过期或签名无效），忽略并进入刷新逻辑
    }
  }

  // 4.2 如果验证成功，检查角色
  if (verifiedPayload) {
    const roles = (verifiedPayload.roles as string[]) || []

    // 检查是否包含 admin 角色
    if (!roles.includes('admin')) {
      // 这里的 behavior 可以是 403 Forbidden，或者重定向到首页
      return withSecurityHeaders(isApi ? createForbiddenResponse(traceId) : createRedirectToHome(req, traceId))
    }

    return withSecurityHeaders(continueRequest(req, traceId))
  }

  // 4.3 验证失败或无 token：尝试刷新
  const refreshed = await tryRefreshSessionByCookie(req, traceId)

  // 刷新成功：API 返回 401 让客户端重试（带上新 cookie），页面重定向回原地址（带上新 cookie）
  if (refreshed) {
    return withSecurityHeaders(handleRefreshedTokenResponse(req, traceId, refreshed, isApi))
  }

  // 刷新失败：API 返回 401，页面重定向到首页
  return withSecurityHeaders(isApi ? createUnauthorizedResponse(traceId) : createRedirectToHome(req, traceId))
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/api/v1/admin/:path*', '/api/v1/auth/:path*', '/docs/swagger'],
}
