/**
 * File: notification.dto.ts
 * Description: 管理员通知管理 DTO
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ======================== 创建通知请求 ========================

export const CreateNotificationRequestSchema = z.object({
  type: z.enum(['SYSTEM']).default('SYSTEM'),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  summary: z.string().max(200).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  linkType: z.string().max(50).optional().nullable(),
  linkId: z.string().max(100).optional().nullable(),
  isGlobal: z.boolean().default(true),
  targetUser: z.string().uuid().optional().nullable(),
  priority: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
}).openapi({ description: '创建通知请求' })

// ======================== 更新通知请求 ========================

export const UpdateNotificationRequestSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  summary: z.string().max(200).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  linkType: z.string().max(50).optional().nullable(),
  linkId: z.string().max(100).optional().nullable(),
  isGlobal: z.boolean().optional(),
  targetUser: z.string().uuid().optional().nullable(),
  priority: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
}).openapi({ description: '更新通知请求' })

// ======================== 查询参数 ========================

export const AdminNotificationListQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: z.enum(['SYSTEM']).optional(),
  isActive: z.coerce.boolean().optional(),
}).openapi({ description: '管理员通知列表查询' })

// ======================== 路径参数 ========================

export const AdminNotificationParamsSchema = z.object({
  id: z.string().uuid(),
})

// ======================== TS 类型 ========================

export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>
export type UpdateNotificationRequest = z.infer<typeof UpdateNotificationRequestSchema>
export type AdminNotificationListQuery = z.infer<typeof AdminNotificationListQuerySchema>
export type AdminNotificationParams = z.infer<typeof AdminNotificationParamsSchema>
