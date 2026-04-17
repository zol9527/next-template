import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository } from '@/repositories/factory'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'

/**
 * File: route.ts
 * Description: 管理后台商品统计 API - 提供商品总数、已上架、草稿、精选、今日新增、库存预警等统计数据
 */

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:product:get_stats',
  schemas: {},
  requireAccess: { action: 'read' as Action, scope: 'products' as Scope },
  handler: async ({ req, serviceContext }) => {
    const productsRepo = await createProductRepository()
    const productService = createAdminProductService({ products: productsRepo }, serviceContext!)

    const stats = await productService.getProductStats()

    return createJsonApiResponse(req, ok(stats))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
