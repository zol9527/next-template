/**
 * Rate Limit 定时清理任务
 *
 * Description: 定期清理过期的计数器记录
 *
 * 使用方式：
 * 1. Vercel Cron: 配置 cron.yml 每小时调用此 API
 * 2. 自托管: 使用 cron 定期调用此 API
 * 3. 开发环境: 使用 setInterval 在应用启动时调用（见下方注释）
 */

import type { NextRequest } from 'next/server'
import { cleanupExpiredCounters } from '@/lib/utils/rate-limit'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { env } from '@/config'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

function getCronToken(req: NextRequest): string | null {
  return req.headers.get('x-internal-cron-token')
}

export const POST = withV1Route({
  action: 'internal:rate_limit:cleanup',
  handler: async ({ req, serviceContext }) => {
    const configured = env.INTERNAL_CRON_TOKEN
    const provided = getCronToken(req)

    if (!configured) {
      return createJsonApiResponse(req, fail('INTERNAL_ERROR', 'Cron token not configured'), { status: 500 })
    }

    if (!provided || provided !== configured) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
    }

    const deleted = await cleanupExpiredCounters(serviceContext!.logger)

    serviceContext!.logger.info(
      { deleted },
      'Rate limit counter cleanup completed',
    )

    return createJsonApiResponse(req, ok({
      message: 'Cleanup completed',
      deleted,
      timestamp: new Date().toISOString(),
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}

/**
 * 如果要在应用启动时自动调度清理任务，
 * 取消下面代码的注释并在适当的位置调用：
 *
 * ```typescript
 * // 在 app/layout.tsx 或服务初始化文件中
 * import { scheduleCleanup } from '@/lib/utils/rate-limit'
 * import { createRequestLogger } from '@/lib/logger'
 *
 * // 仅在生产环境启用
 * if (process.env.NODE_ENV === 'production') {
 *   const logger = createRequestLogger({
 *     traceId: 'system',
 *     method: 'SYSTEM',
 *     pathname: '/rate-limit-cleanup',
 *     ip: '127.0.0.1',
 *   })
 *
 *   // 每小时清理一次
 *   scheduleCleanup(logger, 60 * 60 * 1000)
 * }
 * ```
 */
