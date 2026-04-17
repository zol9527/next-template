import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminCreateCategoryRequestSchema, AdminCategoryListQuerySchema } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCategoryRepository } from '@/repositories/factory'
import { createAdminCategoryService } from '@/plugins/ecommerce/services/admin-category.service'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:categories:read',
  requireAccess: { action: 'read' as Action, scope: 'categories' as Scope },
  schemas: { query: AdminCategoryListQuerySchema },
  handler: async ({ serviceContext, query, req }) => {
    const categories = await createCategoryRepository()
    const service = createAdminCategoryService({ categories }, serviceContext!)
    const data = await service.listCategories(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:categories:write',
  requireAccess: { action: 'write' as Action, scope: 'categories' as Scope },
  schemas: { body: AdminCreateCategoryRequestSchema },
  handler: async ({ serviceContext, body, req }) => {
    if (!body) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INVALID_INPUT', message: 'Request body is required' } },
        { status: 400 },
      )
    }

    const categories = await createCategoryRepository()
    const service = createAdminCategoryService({ categories }, serviceContext!)
    const created = await service.createCategory(body)

    return createJsonApiResponse(req, ok(created))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
