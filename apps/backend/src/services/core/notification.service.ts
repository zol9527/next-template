/**
 * File: notification.service.ts
 * Description: 通知业务逻辑 Service
 *
 * 遵循项目工厂函数 + DI 模式：
 * - Service 通过 Repository 接口访问数据
 * - RepoContext 传播 traceId + logger
 */

import type { NotificationRepository } from '@/repositories/interfaces/core/notification.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { NotificationListQuery, NotificationItem, UnreadCountResponse, NotificationDetailResponse } from '@/contracts/dtos/notification.dto'

export function createNotificationService(
  deps: {
    notification: NotificationRepository
  },
  ctx: ServiceContext
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 获取用户通知列表（cursor 分页）
     *
     * 合并全局广播通知 + 定向通知，按 priority + createdAt 降序排列。
     * 通过 LEFT JOIN notification_reads 判断已读状态。
     */
    async listNotifications(userId: string, query: NotificationListQuery): Promise<{
      items: NotificationItem[]
      nextCursor: string | null
      hasMore: boolean
    }> {
      logger.info({ userId, limit: query.limit, type: query.type }, 'Listing notifications')

      const result = await deps.notification.listByUser(repoCtx, {
        userId,
        limit: query.limit,
        cursor: query.cursor ?? null,
        type: query.type,
      })

      // 转换为 DTO：isRead = readAt !== null
      const items: NotificationItem[] = result.items.map(row => ({
        id: row.id,
        type: row.type as NotificationItem['type'],
        title: row.title,
        summary: row.summary,
        icon: row.icon,
        linkType: row.linkType,
        linkId: row.linkId,
        isRead: row.readAt !== null,
        createdAt: row.createdAt,
      }))

      return {
        items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      }
    },

    /**
     * 获取未读通知计数
     */
    async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
      logger.info({ userId }, 'Getting unread notification count')

      const count = await deps.notification.getUnreadCount(repoCtx, { userId })

      return { count }
    },

    /**
     * 标记单条通知为已读
     *
     * 先验证通知存在，再创建/更新 read 记录。
     */
    async markAsRead(userId: string, notificationId: string): Promise<void> {
      logger.info({ userId, notificationId }, 'Marking notification as read')

      // 验证通知存在
      const notification = await deps.notification.findById(repoCtx, { notificationId })
      if (!notification) {
        logger.warn({ notificationId }, 'Notification not found')
        return // 幂等：不存在则忽略
      }

      await deps.notification.markAsRead(repoCtx, { notificationId, userId })
    },

    /**
     * 获取通知详情
     *
     * 返回完整内容（含 content 字段），验证用户可见性。
     */
    async getNotificationDetail(userId: string, notificationId: string): Promise<NotificationDetailResponse | null> {
      logger.info({ userId, notificationId }, 'Getting notification detail')

      const row = await deps.notification.findDetailById(repoCtx, { notificationId, userId })
      if (!row) return null

      return {
        id: row.id,
        type: row.type as NotificationDetailResponse['type'],
        title: row.title,
        content: row.content,
        summary: row.summary,
        icon: row.icon,
        linkType: row.linkType,
        linkId: row.linkId,
        isRead: row.readAt !== null,
        priority: row.priority,
        createdAt: row.createdAt,
      }
    },

    /**
     * 标记所有通知为已读
     *
     * 返回实际标记的数量（可能为 0）
     */
    async markAllAsRead(userId: string): Promise<{ markedCount: number }> {
      logger.info({ userId }, 'Marking all notifications as read')

      const markedCount = await deps.notification.markAllAsRead(repoCtx, { userId })

      return { markedCount }
    },
  }
}
