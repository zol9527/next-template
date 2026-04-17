import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import type { AdminRunOrderFulfillmentResponse } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'
import { env } from '@/config'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderFulfillmentJobRepository } from '@/repositories/factory'
import { createOrderFulfillmentService } from '@/plugins/ecommerce/services/order-fulfillment.service'
import { withCronLock } from '@/lib/security/cron-lock'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { isInternalIp } from '@/lib/security/ip-whitelist'

function getCronToken(req: NextRequest): string | null {
  return req.headers.get('x-internal-cron-token')
}

export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'internal:cron:order_fulfillment:run',
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

    const result = await withCronLock(
      'cron:order-fulfillment-run',
      serviceContext!.logger,
      async () => {
        const jobs = await createOrderFulfillmentJobRepository()
        const service = createOrderFulfillmentService({ jobs }, serviceContext!)
        return service.runDueJobs()
      },
    )

    const payload: AdminRunOrderFulfillmentResponse = { result }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
