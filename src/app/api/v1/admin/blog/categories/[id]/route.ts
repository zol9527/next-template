import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { AdminUpdateBlogCategoryRequestSchema } from '@/contracts/dtos/admin/blog/categories.dto'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createBlogCategoryRepository } from '@/repositories/factory/content/blog.factory'
import { createAdminBlogCategoryService } from '@/services/content/admin-blog-category.service'

/**
 * Function: GET
 *
 * Description: 获取单个博客分类详情（管理员）
 *
 * Returns:
 * 	Response: 包含博客分类详情的响应
 */
export const GET = withV1Route({
  action: 'admin:blog:categories:read',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'read' as Action, scope: 'blog.categories' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const categories = await createBlogCategoryRepository()
    const service = createAdminBlogCategoryService({ categories }, serviceContext!)

    try {
      const category = await service.listCategories()
      const found = category.items.find((c) => c.id === params.id)

      if (!found) {
        return createJsonApiResponse(req, fail('NOT_FOUND', '分类不存在'), { status: 404 })
      }

      return createJsonApiResponse(req, ok(found))
    } catch (error: unknown) {
      if ((error as Error & { code?: string }).code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '分类不存在'), { status: 404 })
      }
      throw error
    }
  },
})

/**
 * Function: PATCH
 *
 * Description: 更新博客分类信息（管理员）
 *
 * Returns:
 * 	Response: 包含更新后的博客分类信息的响应
 */
export const PATCH = withV1Route({
  action: 'admin:blog:categories:write',
  schemas: { params: IdParamsSchema, body: AdminUpdateBlogCategoryRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.categories' as Scope },
  handler: async ({ params, body, serviceContext, req }) => {
    const categories = await createBlogCategoryRepository()
    const service = createAdminBlogCategoryService({ categories }, serviceContext!)

    try {
      const updated = await service.updateCategory({
        categoryId: params.id,
        name: body!.name,
        slug: body!.slug,
        description: body!.description,
        parentId: body!.parentId,
        status: body!.status,
        sortOrder: body!.sortOrder,
      })

      if (!updated) {
        return createJsonApiResponse(req, fail('NOT_FOUND', '分类不存在'), { status: 404 })
      }

      return createJsonApiResponse(req, ok(updated))
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      if (err.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '分类不存在'), { status: 404 })
      }
      if (err.code === 'CONFLICT') {
        return createJsonApiResponse(req, fail('CONFLICT', err.message), { status: 409 })
      }
      throw error
    }
  },
})

/**
 * Function: DELETE
 *
 * Description: 删除博客分类（管理员）
 *
 * Returns:
 * 	Response: 包含删除结果的响应
 */
export const DELETE = withV1Route({
  action: 'admin:blog:categories:write',
  schemas: { params: IdParamsSchema },
  requireAccess: { action: 'write' as Action, scope: 'blog.categories' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const categories = await createBlogCategoryRepository()
    const service = createAdminBlogCategoryService({ categories }, serviceContext!)

    try {
      const result = await service.deleteCategory(params.id)
      return createJsonApiResponse(req, ok(result))
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      if (err.code === 'CONFLICT') {
        return createJsonApiResponse(req, fail('CONFLICT', err.message), { status: 409 })
      }
      if (err.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', '分类不存在'), { status: 404 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
