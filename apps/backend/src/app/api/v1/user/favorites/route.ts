import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { FavoriteListQuerySchema, AddFavoriteRequestSchema } from '@/contracts/dtos/favorite.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createFavoriteRepository } from '@/repositories/factory'
import { createFavoriteService, FavoriteError } from '@/services/core/favorite.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * Route: GET /api/v1/user/favorites
 *
 * Description: 获取当前登录用户的收藏列表（cursor 分页）
 *
 * 支持按 targetType 筛选，默认返回所有类型。
 * 不返回 totalCount（决策 D7）。
 */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user_favorites:list',
  schemas: { query: FavoriteListQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {
    const service = createFavoriteService(
      { favorite: await createFavoriteRepository() },
      serviceContext,
    )

    const result = await service.listFavorites(userId, {
      cursor: query.cursor ?? null,
      limit: query.limit,
      targetType: query.type ?? null,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

/**
 * Route: POST /api/v1/user/favorites
 *
 * Description: 添加收藏
 *
 * 请求体：{ targetId: string, type: 'course' | 'product' | 'article' }
 * 重复收藏返回 409 ALREADY_FAVORITED
 */
export const POST = withV1Route({
  requireAuth: true,
  action: 'user_favorites:add',
  schemas: { body: AddFavoriteRequestSchema },
  handler: async ({ req, serviceContext, userId, body }) => {
    const service = createFavoriteService(
      { favorite: await createFavoriteRepository() },
      serviceContext,
    )

    try {
      // body 由 withV1Route 根据 schemas.body 校验并解析，保证存在
      const result = await service.addFavorite(userId, body!.type, body!.targetId)
      return createJsonApiResponse(req, ok(result))
    } catch (error) {
      if (error instanceof FavoriteError && error.code === 'ALREADY_FAVORITED') {
        return createJsonApiResponse(req, fail('ALREADY_FAVORITED', error.message), { status: 409 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
