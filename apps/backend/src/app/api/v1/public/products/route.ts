import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok } from '@/contracts/api-response.schema'
import { PublicProductListQuerySchema } from '@/plugins/ecommerce/contracts/public-products.dto'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createProductRepository, createMediaAssetRepository } from '@/repositories/factory'
import { createPublicProductService } from '@/plugins/ecommerce/services/public-product.service'
import { getStorageProvider } from '@/lib/storage/helper'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  schemas: { query: PublicProductListQuerySchema },
  handler: async ({ req, query, serviceContext }) => {
    const products = await createProductRepository()
    const media = await createMediaAssetRepository()
    const storage = getStorageProvider()
    const service = createPublicProductService({ products, media, storage }, serviceContext)
    const data = await service.listProducts(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: Request) {
  return createOptionsResponse(req as never)
}
