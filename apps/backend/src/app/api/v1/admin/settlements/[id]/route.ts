import type { NextRequest } from 'next/server'


import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSettlementRepository, createCommissionRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'

/**
Function: GET

Description: 获取单个结算单详情

Parameters:
    req(NextRequest): Next.js 请求对象

Returns:
    response(Response): JSON 响应，包含结算单数据
*/
export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlements:read',
  requireAccess: { action: 'read' as Action, scope: 'settlements' as Scope },
    schemas: {
      params: z.object({ id: z.string().uuid() })
    },
  handler: async ({ req, params, serviceContext }) => {
    const { id } = params as { id: string }
    const service = createAdminSettlementService({
      commissions: await createCommissionRepository(),
      settlements: await createSettlementRepository(),
    }, serviceContext!)
    const settlement = await service.getSettlementById(id)

    if (!settlement) {
      return createJsonApiResponse(req, ok({ settlement: null }))
    }

    return createJsonApiResponse(req, ok({ settlement }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
