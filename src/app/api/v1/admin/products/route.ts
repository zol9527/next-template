import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AdminCreateProductRequestSchema,
  AdminProductListQuerySchema,
} from '@/plugins/ecommerce/contracts/admin-products.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository, createMediaAssetRepository } from '@/repositories/factory'
import { getStorageProvider } from '@/lib/storage/helper'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'

/**
 * Function: GET
 *
 * Description: 获取产品列表（管理员）
 *
 * Returns:
 * 	Response: 包含产品列表的响应
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:products:read',
  schemas: { query: AdminProductListQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'products' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createAdminProductService({ products, media, storage }, serviceContext!)
    const data = await service.listProducts(query)

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: POST
 *
 * Description: 创建新产品（管理员）
 *
 * Returns:
 * 	Response: 包含创建的产品信息的响应
 */
export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:products:write',
  schemas: { body: AdminCreateProductRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ body, userId, serviceContext, req }) => {

    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createAdminProductService({ products, media, storage }, serviceContext!)
    const created = await service.createProduct({
      name: body!.name,
      kind: body!.kind,
      summary: body!.summary,
      description: body!.description,
      priceAmount: body!.priceAmount,
      originalPriceAmount: body!.originalPriceAmount,
      stockQuantity: body!.stockQuantity,
      isFeatured: body!.isFeatured,
      tags: body!.tags,
      categoryIds: body!.categoryIds,
      coverAssetId: body!.coverAssetId,
      mediaAssetIds: body!.mediaAssetIds,
      createdBy: userId!,
    })

    return createJsonApiResponse(req, ok(created))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
