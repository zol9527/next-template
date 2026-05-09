import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository } from '@/repositories/factory'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'

/**
 * Function: POST
 *
 * Description: 发布产品（管理员）
 *
 * Returns:
 * 	Response: 包含发布后的产品信息的响应
 */
export const POST = withV1Route<{ id: string }>({
  action: 'admin:products:write',
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ params, userId, serviceContext, req }) => {
    const products = await createProductRepository()
    const service = createAdminProductService({ products }, serviceContext!)
    const updated = await service.publishProduct(params.id, userId!)

    if (!updated) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(updated))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
