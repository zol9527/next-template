import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { AdminUpdateProductRequestSchema } from '@/plugins/ecommerce/contracts/admin-products.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository, createMediaAssetRepository } from '@/repositories/factory'
import { getStorageProvider } from '@/lib/storage/helper'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'

/**
 * Function: GET
 *
 * Description: 获取单个产品详情（管理员）
 *
 * Returns:
 * 	Response: 包含产品详情的响应
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:products:read',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'read' as Action, scope: 'products' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createAdminProductService({ products, media, storage }, serviceContext!)
    const product = await service.getProductById(params.id)

    if (!product) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(product))
  },
})

/**
 * Function: PATCH
 *
 * Description: 更新产品信息（管理员）
 *
 * Returns:
 * 	Response: 包含更新后的产品信息的响应
 */
export const PATCH = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:products:write',
  schemas: { params: IdParamsSchema, body: AdminUpdateProductRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ params, body, userId, serviceContext, req }) => {

    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createAdminProductService({ products, media, storage }, serviceContext!)
    const updated = await service.updateProduct({
      productId: params.id,
      name: body!.name,
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
      serviceGuarantees: body!.serviceGuarantees,
      updatedBy: userId!,
    })

    if (!updated) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(updated))
  },
})

/**
 * Function: DELETE
 *
 * Description: 删除产品（管理员）
 *
 * Returns:
 * 	Response: 包含删除结果的响应
 */
export const DELETE = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:products:write',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'write' as Action, scope: 'products' as Scope },
  handler: async ({ params, userId, serviceContext, req }) => {
    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createAdminProductService({ products, media, storage }, serviceContext!)
    const result = await service.deleteProduct({ productId: params.id, deletedBy: userId! })

    if (!result) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
