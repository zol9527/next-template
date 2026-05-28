import { createHmac } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { env } from '@/config'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { appendAuthCookies, removeAuthCookies } from '@/lib/http'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { RefreshSessionRequestSchema } from '@/contracts/dtos/auth/refresh.dto'
import { isNonBrowserClient } from '@/lib/http/client-detector'

/**
 * 从请求中提取 refresh token
 *
 * 支持三种来源（按优先级）：
 *   1. 请求体中的 refreshToken 字段（小程序等非浏览器客户端）
 *   2. Authorization: Bearer <token> 请求头（小程序等非浏览器客户端）
 *   3. HttpOnly Cookie（浏览器端）
 */
function extractRefreshToken(
  req: NextRequest,
  body?: { refreshToken?: string } | null,
): string | null {
  // 优先级 1：请求体中的 refreshToken
  if (body?.refreshToken) {
    return body.refreshToken
  }

  // 优先级 2：Authorization: Bearer <token> 请求头
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  // 优先级 3：HttpOnly Cookie（浏览器端）
  const cookieToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (cookieToken) return cookieToken

  return null
}

export const POST = withV1Route({
  action: 'auth:refresh',
  schemas: { body: RefreshSessionRequestSchema },
  rateLimit: {
    // 安全修复: 降低刷新限流阈值，添加 identity 维度防止被盗 token 滥用
    max: 20,
    windowMs: 60_000,
    identity: ({ req }) => {
      // 安全修复 C-4: 使用 HMAC 哈希前缀作为限流标识，避免暴露 token 明文
      const token = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
        ?? req.headers.get('authorization')?.slice(7).trim()
      if (!token) return undefined
      // 安全修复: 使用环境变量 pepper 作为 HMAC 盐，避免硬编码
      return createHmac('sha256', env.AUTH_REFRESH_TOKEN_PEPPER || 'dev-only-fallback')
        .update(token)
        .digest('hex')
        .slice(0, 16)
    },
    network: {
      max: 30,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, traceId, logger }) => {
    // 从多种来源提取 refresh token
    const refreshToken = extractRefreshToken(req, body)
    if (!refreshToken) {
      const res = createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
      removeAuthCookies(res)
      return res
    }

    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip
    // 创建 ServiceContext
    const ctx = { traceId, logger, userAgent: req.headers.get('user-agent'), clientIp }

    const auth = await createAuth(ctx)

    const result = await auth.refreshSession({
      refreshToken,
      ctx: { userAgent: req.headers.get('user-agent'), clientIp },
    })

    // 构建响应：始终设置 Cookie（浏览器端），同时为非浏览器客户端返回 token
    const responseData: Record<string, unknown> = {
      userId: result.userId,
    }

    // 安全修复: 仅对非浏览器客户端在响应体中返回 token
    // 移除 body?.refreshToken 条件 — 该条件允许攻击者在浏览器端通过附带
    // refreshToken 来绕过客户端类型检查，获取响应体中的明文 token
    if (isNonBrowserClient(req)) {
      responseData.accessToken = result.accessToken
      responseData.refreshToken = result.refreshToken
    }

    const res = createJsonApiResponse(req, ok(responseData))
    // 始终设置 Cookie，确保浏览器端也能正常工作
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
  },
  onError: (_ctx, res) => {
    removeAuthCookies(res)
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
