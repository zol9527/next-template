import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository } from '@/repositories/factory'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'
import {
  BatchUpdateProductStatusRequestSchema,
  BatchDeleteProductsRequestSchema,
} from '@/plugins/ecommerce/contracts/admin-products.dto'

/**
 * File: route.ts
 * Description: 管理后台商品批量操作 API - 支持批量更新状态和批量删除
 */

// PATCH /api/v1/admin/products/batch - 批量更新商品状态
export const PATCH = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:product:batch_update',
  schemas: {
    body: BatchUpdateProductStatusRequestSchema,
  },
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ body, serviceContext, req, userId }) => {
    const productsRepo = await createProductRepository()
    const productService = createAdminProductService({ products: productsRepo }, serviceContext!)

    const result = await productService.batchUpdateProductStatus({
      productIds: body!.productIds,
      status: body!.status,
      updatedBy: userId,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

// DELETE /api/v1/admin/products/batch - 批量删除商品
export const DELETE = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:product:batch_delete',
  schemas: {
    body: BatchDeleteProductsRequestSchema,
  },
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ body, serviceContext, req, userId }) => {
    const productsRepo = await createProductRepository()
    const productService = createAdminProductService({ products: productsRepo }, serviceContext!)

    const result = await productService.batchDeleteProducts({
      productIds: body!.productIds,
      deletedBy: userId,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
