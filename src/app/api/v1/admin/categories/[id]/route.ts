import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { AdminUpdateCategoryRequestSchema } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCategoryRepository } from '@/repositories/factory'
import { createAdminCategoryService } from '@/plugins/ecommerce/services/admin-category.service'

export const PATCH = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:categories:write',
  requireAccess: { action: 'write' as Action, scope: 'categories' as Scope },
  schemas: { params: IdParamsSchema, body: AdminUpdateCategoryRequestSchema },
  handler: async ({ serviceContext, params, body, req }) => {
    const categories = await createCategoryRepository()
    const service = createAdminCategoryService({ categories }, serviceContext!)
    const updated = await service.updateCategory({ categoryId: params.id, ...body })

    if (!updated) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Not found'), { status: 404 })
    }

    return createJsonApiResponse(req, ok(updated))
  },
})

export const DELETE = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:categories:write',
  requireAccess: { action: 'write' as Action, scope: 'categories' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const categories = await createCategoryRepository()
    const service = createAdminCategoryService({ categories }, serviceContext!)
    const result = await service.deleteCategory(params.id)

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
