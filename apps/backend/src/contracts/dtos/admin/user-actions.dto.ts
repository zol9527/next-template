import { z } from 'zod'
import { AdminUserDetailResponseSchema } from '@/contracts/dtos/admin/user-detail.dto'

export const AdminUnlockUserResponseSchema = AdminUserDetailResponseSchema.openapi({
  description: '后台解锁用户响应（重置失败次数与锁定状态）',
})

export type AdminUnlockUserResponse = z.infer<typeof AdminUnlockUserResponseSchema>

export const AdminRevokeUserSessionsResponseSchema = AdminUserDetailResponseSchema.openapi({
  description: '后台强制踢出响应（吊销用户全部 Session，使所有受保护端口立即失效）',
})

export type AdminRevokeUserSessionsResponse = z.infer<typeof AdminRevokeUserSessionsResponseSchema>
