import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Function: checkMaintenanceMode
 *
 * Description: 检查系统是否处于维护模式，如果是则返回 503 响应
 *
 * 注意：Middleware 运行在 Edge Runtime，无法进行数据库操作。
 * 此函数仅返回 null 放行请求，实际维护模式检查应在 API 层进行。
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *     NextResponse | null: 始终返回 null（放行请求）
 */
export async function checkMaintenanceMode(_req: NextRequest): Promise<NextResponse | null> {
  // Middleware 在 Edge Runtime 运行，无法访问数据库
  // 维护模式检查移至 API 层实现
  return null
}

/**
 * Function: withMaintenanceModeCheck
 *
 * Description: 高阶函数，为路由处理器添加维护模式检查
 *
 * Parameters:
 *     handler(function): 原始路由处理函数
 *
 * Returns:
 *     function: 带维护模式检查的路由处理函数
 *
 * @example
 * ```typescript
 * export const GET = withMaintenanceModeCheck(async (req) => {
 *   // 正常处理逻辑
 *   return createJsonApiResponse(req, ok(data))
 * })
 * ```
 */
export function withMaintenanceModeCheck<
  T extends NextRequest & { params?: Record<string, string> } = NextRequest,
>(
  handler: (req: T) => Promise<NextResponse> | NextResponse,
): (req: T) => Promise<NextResponse> {
  return async (req: T) => {
    const maintenanceResponse = await checkMaintenanceMode(req)
    if (maintenanceResponse) {
      return maintenanceResponse
    }
    return handler(req)
  }
}
