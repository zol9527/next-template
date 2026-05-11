/**
 * File: notification.repo.ts
 * Description: 通知 Repository 的 Prisma 实现
 *
 * 核心查询策略:
 * - 使用 (isGlobal=true OR targetUser=userId) 合并全局+定向通知
 * - LEFT JOIN notification_reads 判断已读状态
 * - cursor 基于 createdAt 降序分页
 */

import type { NotificationRepository, NotificationRow, NotificationDetailRow, PaginatedResult } from '@/repositories/interfaces/core/notification.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { prisma } from '@/lib/prisma'

/** 转换数据库行为 DTO */
function transformRow(row: {
  id: string
  type: string
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isGlobal: boolean
  targetUser: string | null
  createdAt: Date
  reads: Array<{ readAt: Date }>
}): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    icon: row.icon,
    linkType: row.linkType,
    linkId: row.linkId,
    isGlobal: row.isGlobal,
    targetUser: row.targetUser,
    createdAt: row.createdAt.toISOString(),
    readAt: row.reads.length > 0 ? row.reads[0].readAt.toISOString() : null,
  }
}

export function createPrismaNotificationRepository(): NotificationRepository {
  return {
    async listByUser(ctx, params) {
      const { userId, limit, cursor, type } = params
      const safeLimit = Math.min(Math.max(limit, 1), 50)

      // WHERE 条件: 全局广播 或 指定用户
      const where: Record<string, unknown> = {
        isActive: true,
        OR: [
          { isGlobal: true },
          { targetUser: userId },
        ],
      }

      // 可选类型筛选
      if (type) {
        where.type = type
      }

      // cursor 条件: createdAt < cursorValue（降序分页）
      if (cursor) {
        where.createdAt = { lt: new Date(cursor) }
      }

      // take + 1 模式检测 hasMore
      const rows = await prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: safeLimit + 1,
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
          },
        },
      })

      const hasMore = rows.length > safeLimit
      const data = hasMore ? rows.slice(0, safeLimit) : rows

      return {
        items: data.map(transformRow),
        nextCursor: hasMore
          ? data[data.length - 1].createdAt.toISOString()
          : null,
        hasMore,
      }
    },

    async getUnreadCount(ctx, params) {
      const { userId } = params

      // 获取用户所有可见通知 ID
      const visibleNotifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          OR: [
            { isGlobal: true },
            { targetUser: userId },
          ],
        },
        select: { id: true },
      })

      const visibleIds = visibleNotifications.map(n => n.id)
      if (visibleIds.length === 0) return 0

      // 已读通知 ID
      const readNotificationIds = await prisma.notificationRead.findMany({
        where: {
          userId,
          notificationId: { in: visibleIds },
        },
        select: { notificationId: true },
      })

      const readIdSet = new Set(readNotificationIds.map(r => r.notificationId))
      return visibleIds.filter(id => !readIdSet.has(id)).length
    },

    async markAsRead(ctx, params) {
      const { notificationId, userId } = params

      ctx.logger.info({ notificationId, userId }, 'Marking notification as read')

      await prisma.notificationRead.upsert({
        where: {
          notificationId_userId: { notificationId, userId },
        },
        create: {
          notificationId,
          userId,
        },
        update: {
          readAt: new Date(),
        },
      })
    },

    async markAllAsRead(ctx, params) {
      const { userId } = params

      // 获取用户所有可见但未读的通知
      const visibleNotifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          OR: [
            { isGlobal: true },
            { targetUser: userId },
          ],
        },
        select: { id: true },
      })

      const visibleIds = visibleNotifications.map(n => n.id)
      if (visibleIds.length === 0) return 0

      // 获取已读 ID
      const readRecords = await prisma.notificationRead.findMany({
        where: {
          userId,
          notificationId: { in: visibleIds },
        },
        select: { notificationId: true },
      })

      const readIdSet = new Set(readRecords.map(r => r.notificationId))
      const unreadIds = visibleIds.filter(id => !readIdSet.has(id))

      if (unreadIds.length === 0) return 0

      // 批量创建 read 记录
      await prisma.notificationRead.createMany({
        data: unreadIds.map(notificationId => ({
          notificationId,
          userId,
        })),
        skipDuplicates: true,
      })

      ctx.logger.info({ userId, count: unreadIds.length }, 'Marked all notifications as read')
      return unreadIds.length
    },

    async findById(ctx, params) {
      const row = await prisma.notification.findUnique({
        where: { id: params.notificationId },
        select: { id: true, type: true },
      })
      return row
    },

    async findDetailById(ctx, params) {
      const { notificationId, userId } = params

      const row = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
          },
        },
      })

      if (!row) return null

      // 验证用户有权查看：全局通知或定向给该用户
      if (!row.isGlobal && row.targetUser !== userId) return null

      return {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content,
        summary: row.summary,
        icon: row.icon,
        linkType: row.linkType,
        linkId: row.linkId,
        isGlobal: row.isGlobal,
        targetUser: row.targetUser,
        priority: row.priority,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        readAt: row.reads.length > 0 ? row.reads[0].readAt.toISOString() : null,
      } satisfies NotificationDetailRow
    },
  }
}
