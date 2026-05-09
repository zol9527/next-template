import type { NextResponse } from 'next/server'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { env } from '@/config'

/**
 * Module: cookies
 *
 * Description: Cookie 响应处理函数
 *
 * 提供 Cookie 选项配置、响应头处理和认证 Cookie 操作功能
 */

// ==================== Cookie 选项 ====================

/** 认证 Cookie 选项类型 */
export type AuthCookieOptions = {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'none'
  path: string
  domain?: string
  expires?: Date
}

/**
 * Function: createAuthCookieOptions
 *
 * Description: 创建认证 Cookie 的选项配置
 *
 * Parameters: 无
 *
 * Returns:
 *     options(AuthCookieOptions): Cookie 选项配置
 */
export function createAuthCookieOptions(): AuthCookieOptions {
  const secure = env.NODE_ENV === 'production' || env.AUTH_COOKIE_SAMESITE === 'none'

  return {
    httpOnly: true,
    secure,
    sameSite: env.AUTH_COOKIE_SAMESITE,
    path: '/',
    domain: env.AUTH_COOKIE_DOMAIN,
  }
}

/**
 * Function: createAuthCookieExpireDate
 *
 * Description: 创建认证 Cookie 的过期时间（从当前时间计算）
 *
 * Parameters:
 *     secondsFromNow(number): 距离现在的秒数
 *
 * Returns:
 *     expireDate(Date): 过期时间
 */
export function createAuthCookieExpireDate(secondsFromNow: number): Date {
  return new Date(Date.now() + secondsFromNow * 1000)
}

// ==================== Cookie 响应头处理 ====================

/**
 * Function: extractSetCookieHeaders
 *
 * Description: 从 fetch Response 中安全提取所有 Set-Cookie 头（兼容不同运行时实现）
 *
 * Parameters:
 *     res(Response): fetch 返回的 Response 对象
 *
 * Returns:
 *     cookies(string[]): Set-Cookie 头数组（可能为空）
 */
export function extractSetCookieHeaders(res: Response): string[] {
  const anyHeaders = res.headers as unknown as {
    getSetCookie?: () => string[]
  }

  const list = anyHeaders.getSetCookie?.()
  if (Array.isArray(list) && list.length > 0) return list

  const single = res.headers.get('set-cookie')
  if (!single) return []
  return [single]
}

/**
 * Function: appendSetCookieHeaders
 *
 * Description: 将 Set-Cookie 头追加到 NextResponse，用于向客户端下发更新后的 Cookie
 *
 * Parameters:
 *     res(NextResponse): 要写入 header 的 NextResponse
 *     setCookies(string[]): Set-Cookie 头数组
 *
 * Returns:
 *     void(undefined): 无返回值
 */
export function appendSetCookieHeaders(res: NextResponse, setCookies: string[]): void {
  for (const cookie of setCookies) {
    res.headers.append('set-cookie', cookie)
  }
}

// ==================== 认证 Cookie 操作 ====================

/**
 * Function: appendAuthCookies
 *
 * Description: 向响应中添加认证相关的 Cookie（access token 和 refresh token）
 *
 * Parameters:
 *     res(NextResponse): Next.js 响应对象
 *     accessToken(string): 访问令牌
 *     refreshToken(string): 刷新令牌
 *
 * Returns:
 *     void(undefined): 无返回值
 */
export function appendAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  const base = createAuthCookieOptions()

  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...base,
    expires: createAuthCookieExpireDate(env.AUTH_ACCESS_TTL_SECONDS),
  })

  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...base,
    expires: createAuthCookieExpireDate(env.AUTH_REFRESH_TTL_SECONDS),
  })
}

/**
 * Function: removeAuthCookies
 *
 * Description: 从响应中移除认证相关的 Cookie（通过设置为过期时间）
 *
 * Parameters:
 *     res(NextResponse): Next.js 响应对象
 *
 * Returns:
 *     void(undefined): 无返回值
 */
export function removeAuthCookies(res: NextResponse): void {
  const base = createAuthCookieOptions()
  const expires = new Date(0)

  res.cookies.set(ACCESS_TOKEN_COOKIE, '', { ...base, expires })
  res.cookies.set(REFRESH_TOKEN_COOKIE, '', { ...base, expires })
}
