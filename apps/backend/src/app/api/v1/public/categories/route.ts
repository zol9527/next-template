import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok } from '@/contracts/api-response.schema'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCategoryRepository } from '@/repositories/factory'
import { createPublicCategoryService } from '@/plugins/ecommerce/services/public-category.service'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  handler: async ({ req, serviceContext }) => {
    const categories = await createCategoryRepository()

    const service = createPublicCategoryService({ categories }, serviceContext)
    const data = await service.listCategories()

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: Request) {
  return createOptionsResponse(req as never)
}
