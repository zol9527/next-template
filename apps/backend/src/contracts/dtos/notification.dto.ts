/**
 * File: notification.dto.ts
 * Description: 通知系统 DTO — 请求查询参数和响应结构的 Zod Schema
 */

import { z } from 'zod'

// ======================== 请求 Schema ========================

/** 通知列表查询参数 */
export const NotificationListQuerySchema = z.object({
  /** 分页游标（createdAt ISO 字符串） */
  cursor: z.string().nullable().optional(),
  /** 每页数量，默认 20，最大 50 */
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  /** 通知类型筛选（可选） */
  type: z.enum(['SYSTEM', 'COURSE', 'ACTIVITY', 'ORDER']).optional(),
})

/** 标记已读路径参数 */
export const NotificationReadParamsSchema = z.object({
  id: z.string().uuid(),
})

// ======================== 响应类型 ========================

/** 单条通知的响应结构 */
export const NotificationItemSchema = z.object({
  id: z.string(),
  type: z.enum(['SYSTEM', 'COURSE', 'ACTIVITY', 'ORDER']),
  title: z.string(),
  summary: z.string().nullable(),
  icon: z.string().nullable(),
  linkType: z.string().nullable(),
  linkId: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
})

/** 通知列表响应 */
export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})

/** 未读计数响应 */
export const UnreadCountResponseSchema = z.object({
  count: z.number(),
})

// ======================== TS 类型推导 ========================

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>
export type NotificationReadParams = z.infer<typeof NotificationReadParamsSchema>
export type NotificationItem = z.infer<typeof NotificationItemSchema>
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>
