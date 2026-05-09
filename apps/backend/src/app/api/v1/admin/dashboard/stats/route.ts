import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderRepository, createUserRepository, createProductRepository } from '@/repositories/factory'
import { createAdminDashboardService } from '@/plugins/ecommerce/services/admin-dashboard.service'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:dashboard:read',
  schemas: {},
  requireAccess: { action: 'read' as Action, scope: 'dashboard' as Scope },
  handler: async ({ req, serviceContext }) => {
    const [orders, users, products] = await Promise.all([
      createOrderRepository(),
      createUserRepository(),
      createProductRepository(),
    ])
    const service = createAdminDashboardService({
      orders,
      users,
      products,
    }, serviceContext!)

    const data = await service.getStats()

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
