import type { Action, Scope } from '@/config/access'
/**
 * File: route.ts
 *
 * Description: 管理员个人资料 API - 获取和更新当前登录管理员的个人资料
 *
 * HTTP Methods:
 * - GET: 获取当前管理员信息
 * - PUT: 更新当前管理员个人资料
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { UpdateProfileSchema } from '@/contracts/dtos/admin/me'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAdminMeService } from '@/services/core/admin-me.service'
import { createUserRepository, createSessionRepository } from '@/repositories/factory'

/**
 * Function: GET
 *
 * Description: 获取当前登录管理员的信息
 *
 * Parameters:
 *   userId(string): 当前登录管理员 ID（自动注入）
 *
 * Returns:
 *   profile(object): 管理员个人资料（不包含敏感信息如密码）
 */
export const GET = withV1Route({
  action: 'admin:me:get',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  handler: async ({ userId, serviceContext, req }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    const profile = await service.getCurrentProfile(userId!)

    return createJsonApiResponse(req, ok(profile))
  },
})

/**
 * Function: PUT
 *
 * Description: 更新当前管理员的个人资料
 *
 * Parameters:
 *   userId(string): 当前登录管理员 ID（自动注入）
 *   body(UpdateProfileDto): 更新的资料数据
 *
 * Returns:
 *   updated(object): 更新后的管理员资料
 *
 * Throws:
 *   ValidationError: 数据验证失败或邮箱已被使用时抛出
 */
export const PUT = withV1Route({
  action: 'admin:me:update',
  requireAccess: { action: 'read' as Action, scope: 'account' as Scope },
  schemas: { body: UpdateProfileSchema },
  handler: async ({ userId, serviceContext, body, req }) => {
    const users = await createUserRepository()
    const sessions = await createSessionRepository()

    const service = createAdminMeService({ users, sessions }, serviceContext!)
    const updated = await service.updateProfile(userId!, body!)

    return createJsonApiResponse(req, ok(updated))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 处理 CORS 预检请求
 *
 * Parameters:
 *   req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *   NextResponse: CORS 预检响应
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
