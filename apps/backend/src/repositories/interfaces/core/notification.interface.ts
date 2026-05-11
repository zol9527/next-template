/**
 * File: notification.interface.ts
 * Description: 通知 Repository 接口定义
 */

import type { RepoContext } from '@/types/repo/repo-context'

/** 通知列表查询结果项 */
export type NotificationRow = {
  id: string
  type: string
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isGlobal: boolean
  targetUser: string | null
  createdAt: string
  readAt: string | null
}

/** 分页结果 */
export type PaginatedResult<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface NotificationRepository {
  /** 获取用户通知列表（cursor 分页，合并全局+定向通知） */
  listByUser(ctx: RepoContext, params: {
    userId: string
    limit: number
    cursor: string | null
    type?: string
  }): Promise<PaginatedResult<NotificationRow>>

  /** 获取用户未读通知数量 */
  getUnreadCount(ctx: RepoContext, params: { userId: string }): Promise<number>

  /** 标记单条通知为已读 */
  markAsRead(ctx: RepoContext, params: { notificationId: string; userId: string }): Promise<void>

  /** 标记所有通知为已读（为每条未读通知创建 read 记录） */
  markAllAsRead(ctx: RepoContext, params: { userId: string }): Promise<number>

  /** 根据 ID 查找通知 */
  findById(ctx: RepoContext, params: { notificationId: string }): Promise<{ id: string; type: string } | null>
}
