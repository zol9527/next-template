/**
 * Module: path-checks
 *
 * Description: 路径判断相关的辅助函数集合
 *
 * 提供多种路径匹配检查函数，用于确定请求路径的性质
 */

/**
 * Function: isApiPath
 *
 * Description: 判断给定路径是否为 API 路径（以 `/api/` 开头）
 *
 * Parameters:
 *     pathname(string): 请求的路径字符串
 *
 * Returns:
 *     boolean: 如果路径以 `/api/` 开头则返回 true，否则返回 false
 */
export function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

/**
 * Function: isAuthRateLimitedPath
 *
 * Description: 判断路径是否属于需要对认证相关接口进行速率限制的集合
 *
 * Parameters:
 *     pathname(string): 请求的路径字符串
 *
 * Returns:
 *     boolean: 如果路径在登录/微信登录/刷新令牌等路径中返回 true
 */
export function isAuthRateLimitedPath(pathname: string): boolean {
  return (
    pathname === '/api/v1/auth/login' ||
    pathname === '/api/v1/auth/wechat' ||
    pathname === '/api/v1/auth/refresh'
  )
}

/**
 * Function: isDocsRateLimitedPath
 *
 * Description: 判断路径是否为文档页面，该路径可能有不同的速率限制策略
 *
 * Parameters:
 *     pathname(string): 请求的路径字符串
 *
 * Returns:
 *     boolean: 如果路径等于 `/docs/swagger` 则返回 true
 */
export function isDocsRateLimitedPath(pathname: string): boolean {
  return pathname === '/docs/swagger'
}

/**
 * Function: isPublicAdminPath
 *
 * Description: 判断路径是否为对外公开的管理员登录页面（无需鉴权）
 *
 * Parameters:
 *     pathname(string): 请求的路径字符串
 *
 * Returns:
 *     boolean: 如果路径等于 `/login` 则返回 true
 */
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/login'
}
