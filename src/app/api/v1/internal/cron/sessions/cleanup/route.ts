import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { env } from '@/config'
import { createSessionRepository } from '@/repositories/factory'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { withCronLock } from '@/lib/security/cron-lock'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { isInternalIp } from '@/lib/security/ip-whitelist'

function getCronToken(req: NextRequest): string | null {
  return req.headers.get('x-internal-cron-token')
}

export const POST = withV1Route({
  action: 'internal:cron:sessions:cleanup',
  handler: async ({ req, serviceContext }) => {
    const configured = env.INTERNAL_CRON_TOKEN
    const provided = getCronToken(req)

    if (!configured) {
      return createJsonApiResponse(req, fail('INTERNAL_ERROR', 'Cron token not configured'), { status: 500 })
    }

    if (!provided || provided !== configured) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
    }

    const ipResult = extractClientIpSafe(req, { trustProxy: true, allowPrivateIp: true, requireIp: false })
    const clientIp = ipResult.ip

    if (clientIp && !isInternalIp(clientIp)) {
      serviceContext!.logger.warn({ action: 'internal_ip_rejected', ip: clientIp }, 'Internal API access from non-whitelisted IP')
      return createJsonApiResponse(req, fail('FORBIDDEN', 'Access denied'), { status: 403 })
    }

    const deletedCount = await withCronLock(
      'cron:sessions:cleanup',
      serviceContext!.logger,
      async () => {
        const sessions = await createSessionRepository()
        return sessions.cleanupExpiredAndRevokedSessions({
          traceId: serviceContext!.traceId,
          logger: serviceContext!.logger.child({ layer: 'repository' }),
        })
      },
    )

    return createJsonApiResponse(req, ok({ deletedCount }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
