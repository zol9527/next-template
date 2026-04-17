import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { ToggleUploadPermissionRequestSchema } from '@/contracts/dtos/admin/users.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserRepository } from '@/repositories/factory'
import { createAdminUserService } from '@/services/core/admin-user.service'

/**
 * POST /api/v1/admin/users/:id/upload-permission
 *
 * Function: SetUserUploadPermissionRoute
 *
 * Description: 设置指定用户的图片上传权限
 *
 * Parameters:
 * 	params.id(string): 用户 ID
 * 	body.canUpload(boolean): 是否允许上传
 *
 * Returns:
 * 	response(object): 包含更新后的用户 ID 和上传权限状态
 */
export const POST = withV1Route({
  action: 'admin:users:set_upload_permission',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: {
    params: IdParamsSchema,
    body: ToggleUploadPermissionRequestSchema,
  },
  handler: async ({ serviceContext, userId, params, body, req }) => {
    const users = await createUserRepository()
    const service = createAdminUserService({ users }, serviceContext!, userId!)
    const result = await service.setUploadPermission(params.id, body?.canUpload ?? false)

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
