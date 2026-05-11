/**
 * File: notifications.ts
 * Description: 通知 API 服务 — 对接后端通知相关接口
 *
 * 后端 API 端点:
 *   GET  /user/notifications              — 通知列表（cursor 分页）
 *   GET  /user/notifications/unread-count  — 未读计数
 *   PUT  /user/notifications/:id/read      — 标记单条已读
 *   PUT  /user/notifications/read-all      — 全部标记已读
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

// ======================== 类型定义 ========================

/** 通知类型 */
export type NotificationType = 'SYSTEM' | 'COURSE' | 'ACTIVITY' | 'ORDER'

/** 单条通知 */
export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isRead: boolean
  createdAt: string
}

/** 通知列表响应 */
export interface NotificationListResponse {
  items: NotificationItem[]
  nextCursor: string | null
  hasMore: boolean
}

/** 未读计数响应 */
export interface UnreadCountResponse {
  count: number
}

/** 全部已读响应 */
export interface ReadAllResponse {
  markedCount: number
}

/** 通知列表查询参数 */
export interface NotificationListParams {
  cursor?: string | null
  limit?: number
  type?: NotificationType
}

// ======================== API 服务 ========================

export const notificationService = {
  /**
   * 获取通知列表（cursor 分页）
   */
  async list(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    logger.info('获取通知列表', params)

    const queryParams: Record<string, string | number> = {}
    if (params.cursor) queryParams.cursor = params.cursor
    if (params.limit) queryParams.limit = params.limit
    if (params.type) queryParams.type = params.type

    const result = await httpClient.get<NotificationListResponse>(
      '/user/notifications',
      queryParams
    )
    return result
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    logger.info('获取未读通知数量')

    const result = await httpClient.get<UnreadCountResponse>(
      '/user/notifications/unread-count'
    )
    return result
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    logger.info('标记通知已读', { notificationId })

    await httpClient.put(`/user/notifications/${notificationId}/read`)
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(): Promise<ReadAllResponse> {
    logger.info('标记所有通知为已读')

    const result = await httpClient.put<ReadAllResponse>(
      '/user/notifications/read-all'
    )
    return result
  },
}
