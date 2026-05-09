import { z } from 'zod'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok, fail } from '@/contracts/api-response.schema'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository, createMediaAssetRepository } from '@/repositories/factory'
import { createPublicProductService } from '@/plugins/ecommerce/services/public-product.service'
import { getStorageProvider } from '@/lib/storage/helper'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  schemas: { params: ParamsSchema },
  handler: async ({ req, params, serviceContext }) => {
    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()

    const service = createPublicProductService({ products, media, storage }, serviceContext)
    const product = await service.getProductById(params.id)

    if (!product) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '商品不存在或已下架'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(product))
  },
})

export function OPTIONS(req: Request) {
  return createOptionsResponse(req as never)
}
