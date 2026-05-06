import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createFavoriteRepository } from '@/repositories/factory'
import { createFavoriteService, FavoriteError } from '@/services/core/favorite.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * Route: DELETE /api/v1/user/favorites/[id]
 *
 * Description: 移除指定收藏项（物理删除，决策 D2）
 * 通过 repository 层的 userId 参数进行所有权校验
 * 收藏项不存在或无权删除时返回 404
 */
export const DELETE = withV1Route({
  requireAuth: true,
  action: 'user_favorites:remove',
  schemas: {
    params: z.object({ id: z.string().uuid() }),
  },
  handler: async ({ req, params, serviceContext, userId }) => {
    const { id } = params

    const service = createFavoriteService(
      { favorite: await createFavoriteRepository() },
      serviceContext,
    )

    try {
      const result = await service.removeFavorite(userId, id)
      return createJsonApiResponse(req, ok(result))
    } catch (error) {
      if (error instanceof FavoriteError && error.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
