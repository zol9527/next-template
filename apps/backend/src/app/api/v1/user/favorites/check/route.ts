import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createFavoriteRepository } from '@/repositories/factory'
import { createFavoriteService } from '@/services/core/favorite.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * Route: GET /api/v1/user/favorites/check?targetId=xxx&type=xxx
 *
 * Description: 检查当前用户是否已收藏某目标
 * 返回 { isFavorited: boolean, favoriteId?: string }
 */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user_favorites:check',
  schemas: {},
  handler: async ({ req, serviceContext, userId, query }) => {
    const rawQuery = query as Record<string, string | string[]>
    const targetId = rawQuery.targetId as string | undefined
    const type = rawQuery.type as string | undefined

    if (!targetId || !type) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', '缺少 targetId 或 type 参数'), { status: 400 })
    }

    const service = createFavoriteService(
      { favorite: await createFavoriteRepository() },
      serviceContext,
    )

    const result = await service.checkFavorite(userId, type, targetId)
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
