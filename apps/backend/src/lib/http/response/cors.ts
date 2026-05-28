import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import { env } from '@/config'

/**
 * Module: cors
 *
 * Description: CORS 响应头处理
 *
 * 提供跨域资源共享的决策和响应头设置功能
 */

/** CORS 允许的请求头列表 */
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Wechatpay-Serial',
  'Wechatpay-Signature',
  'Wechatpay-Timestamp',
  'Wechatpay-Nonce',
  'Wechatpay-Signature-Type',
].join(', ')

/** CORS 允许的方法列表 */
const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS'

/** CORS 决策结果类型 */
export type CorsDecision = {
  allowed: boolean
  origin?: string
}

/**
 * Function: decideCors
 *
 * Description: 根据请求来源决定是否允许 CORS
 *
 * Parameters:
 *     origin(string | null): 请求的 Origin 头
 *
 * Returns:
 *     decision(CorsDecision): CORS 决策结果
 */
export function decideCors(origin: string | null): CorsDecision {
  if (!origin) return { allowed: false }

  const allowlistRaw = env.AUTH_ALLOWED_ORIGINS
  const isDev = env.NODE_ENV !== 'production'

  if (!allowlistRaw) {
    if (isDev && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return { allowed: true, origin }
    }
    return { allowed: false }
  }

  const allowlist = allowlistRaw.split(',').map((s) => s.trim()).filter(Boolean)

  if (allowlist.includes(origin)) {
    return { allowed: true, origin }
  }

  return { allowed: false }
}

/**
 * Function: appendCorsHeaders
 *
 * Description: 为响应添加 CORS 头
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     res(NextResponse): Next.js 响应对象
 *     allowedMethods(string | undefined): 该路由支持的 HTTP 方法列表
 *         未指定时使用默认值（GET,POST,PATCH,DELETE,OPTIONS）
 *
 * Returns:
 *     res(NextResponse): 添加了 CORS 头的响应对象
 */
export function appendCorsHeaders(
  req: NextRequest,
  res: NextResponse,
  allowedMethods?: string,
): NextResponse {
  const origin = req.headers.get('origin')
  const decision = decideCors(origin)

  if (decision.allowed && decision.origin) {
    res.headers.set('Access-Control-Allow-Origin', decision.origin)
    res.headers.set('Vary', 'Origin')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
    res.headers.set('Access-Control-Allow-Methods', allowedMethods ?? ALLOWED_METHODS)
  }

  return res
}
