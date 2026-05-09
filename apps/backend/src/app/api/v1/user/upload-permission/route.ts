import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * GET /api/v1/user/upload-permission
 *
 * Description: 获取当前用户的图片上传权限
 */
export const GET = withV1Route({
  action: 'user:get_upload_permission',
  requireAuth: true,
  handler: async ({ req, auth }) => {
    // auth.getMe() 内部使用 UserRepository 获取用户数据
    // 如果用户不存在会抛出 AuthError('UNAUTHORIZED')
    const me = await auth!.getMe()
    const canUpload = me.user.canUpload ?? false

    return createJsonApiResponse(req, ok({ canUpload }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
