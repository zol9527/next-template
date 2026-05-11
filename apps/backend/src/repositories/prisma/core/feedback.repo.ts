import type { FeedbackRepository } from '@/repositories/interfaces/core/feedback.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { FeedbackStatus, FeedbackType } from '@/lib/prisma/generated/prisma'
import { prisma } from '@/lib/prisma'

/**
 * Function: transformReply
 *
 * Description: 将 Prisma FeedbackReply 模型转换为 DTO
 *
 * Parameters:
 *   row: Prisma FeedbackReply 原始数据
 *
 * Returns:
 *   回复 DTO
 */
function transformReply(row: {
  id: string
  feedbackId: string
  adminId: string
  content: string
  createdAt: Date
}) {
  return {
    id: row.id,
    feedbackId: row.feedbackId,
    adminId: row.adminId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Function: transformFeedback
 *
 * Description: 将 Prisma Feedback 模型（含回复）转换为 DTO
 *
 * Parameters:
 *   row: Prisma Feedback 原始数据
 *
 * Returns:
 *   反馈 DTO（含回复列表）
 */
function transformFeedback(row: {
  id: string
  userId: string
  type: string
  title: string
  content: string
  images: unknown
  status: string
  createdAt: Date
  updatedAt: Date
  replies?: Array<{
    id: string
    feedbackId: string
    adminId: string
    content: string
    createdAt: Date
  }>
  user?: {
    id: string
    username: string | null
    nickname: string | null
    phone: string | null
    avatarUrl: string | null
    wechatAccounts?: { id: string } | null
  }
}) {
  const sourcePlatform = row.user?.wechatAccounts ? '微信小程序' : '后台'

  return {
    id: row.id,
    userId: row.userId,
    type: row.type.toLowerCase(),
    title: row.title,
    content: row.content,
    images: (row.images as string[]) ?? [],
    status: row.status.toLowerCase(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          username: row.user.username,
          nickname: row.user.nickname,
          phone: row.user.phone,
          avatarUrl: row.user.avatarUrl,
          sourcePlatform,
        }
      : undefined,
    replies: row.replies?.map(transformReply) ?? [],
  }
}

/**
 * Function: createPrismaFeedbackRepository
 *
 * Description: 创建基于 Prisma 的 FeedbackRepository 实现
 *
 * Returns:
 *   FeedbackRepository 实例
 *
 * 注意事项:
 * - Prisma FeedbackStatus/FeedbackType 枚举值为大写 (PENDING, SUGGESTION, BUG 等)
 * - 接口层可能传入小写值，需在查询时转换
 * - cursor 分页采用 take+1 模式检测 hasMore
 * - Decision D3: 不包含 countByUserSince（限流在路由层处理）
 * - Decision D7: 不包含 totalCount
 */
export function createPrismaFeedbackRepository(): FeedbackRepository {
  return {
    async create(
      ctx: RepoContext,
      params: {
        userId: string
        type: string
        title: string
        content: string
        images?: string[] | null
      }
    ) {
      ctx.logger.info({ userId: params.userId, type: params.type }, 'Creating feedback')

      const row = await prisma.feedback.create({
        data: {
          userId: params.userId,
          type: params.type.toUpperCase() as FeedbackType,
          title: params.title,
          content: params.content,
          images: params.images ?? [],
          status: 'PENDING' as FeedbackStatus,
        },
      })

      return transformFeedback(row)
    },

    async findById(
      ctx: RepoContext,
      params: { id: string }
    ) {
      ctx.logger.debug({ id: params.id }, 'Finding feedback by id')

      const row = await prisma.feedback.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              phone: true,
              avatarUrl: true,
              wechatAccounts: { select: { id: true } },
            },
          },
          replies: { orderBy: { createdAt: 'asc' } },
        },
      })

      return row ? transformFeedback(row) : null
    },

    async listByUser(
      ctx: RepoContext,
      params: {
        userId: string
        cursor?: string | null
        limit: number
        status?: string | null
      }
    ) {
      ctx.logger.debug(
        { userId: params.userId, limit: params.limit, status: params.status },
        'Listing feedback by user'
      )

      const safeLimit = Math.min(Math.max(params.limit, 1), 50)

      // Prisma 枚举值大写，接口可能传入小写，需 .toUpperCase() 转换
      const where: Record<string, unknown> = { userId: params.userId }
      if (params.status) {
        where.status = params.status.toUpperCase()
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cursorCondition: Record<string, any> = {}
      if (params.cursor) {
        cursorCondition.cursor = { createdAt: new Date(params.cursor) }
        cursorCondition.skip = 1
      }

      // take + 1 模式：多取一条用于检测 hasMore
      const rows = await prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit + 1,
        ...cursorCondition,
      })

      const hasMore = rows.length > safeLimit
      const data = hasMore ? rows.slice(0, safeLimit) : rows

      return {
        items: data.map((row) => transformFeedback(row)),
        nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
        hasMore,
      }
    },

    // 仅返回 { id, status, updatedAt }，状态流转验证在 Service 层处理
    async updateStatus(
      ctx: RepoContext,
      params: { id: string; status: string }
    ) {
      ctx.logger.info({ id: params.id, status: params.status }, 'Updating feedback status')

      const row = await prisma.feedback.update({
        where: { id: params.id },
        data: {
          status: params.status.toUpperCase() as FeedbackStatus,
        },
      })

      return {
        id: row.id,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      }
    },

    async listAll(
      ctx: RepoContext,
      params: {
        cursor?: string | null
        limit: number
        status?: string | null
        keyword?: string | null
      }
    ) {
      ctx.logger.debug(
        { limit: params.limit, status: params.status, keyword: params.keyword },
        'Listing all feedback (admin)'
      )

      const safeLimit = Math.min(Math.max(params.limit, 1), 50)
      const keyword = params.keyword?.trim()

      // Prisma 枚举值大写
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {}
      if (params.status) {
        where.status = params.status.toUpperCase()
      }
      if (keyword) {
        where.OR = [
          { id: { contains: keyword } },
          { userId: { contains: keyword } },
          { title: { contains: keyword } },
          { content: { contains: keyword } },
          {
            user: {
              is: {
                OR: [
                  { id: { contains: keyword } },
                  { username: { contains: keyword } },
                  { nickname: { contains: keyword } },
                  { phone: { contains: keyword } },
                ],
              },
            },
          },
        ]
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cursorCondition: Record<string, any> = {}
      if (params.cursor) {
        cursorCondition.cursor = { createdAt: new Date(params.cursor) }
        cursorCondition.skip = 1
      }

      const rows = await prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit + 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              phone: true,
              avatarUrl: true,
              wechatAccounts: { select: { id: true } },
            },
          },
        },
        ...cursorCondition,
      })

      const hasMore = rows.length > safeLimit
      const data = hasMore ? rows.slice(0, safeLimit) : rows

      return {
        items: data.map((row) => {
          const feedback = transformFeedback(row)
          return {
            ...feedback,
            user: feedback.user!,
          }
        }),
        nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
        hasMore,
      }
    },

    async createReply(
      ctx: RepoContext,
      params: {
        feedbackId: string
        adminId: string
        content: string
      }
    ) {
      ctx.logger.info(
        { feedbackId: params.feedbackId, adminId: params.adminId },
        'Creating feedback reply'
      )

      const row = await prisma.feedbackReply.create({
        data: {
          feedbackId: params.feedbackId,
          adminId: params.adminId,
          content: params.content,
        },
      })

      return transformReply(row)
    },

    async findRepliesByFeedbackId(
      ctx: RepoContext,
      params: { feedbackId: string }
    ) {
      ctx.logger.debug({ feedbackId: params.feedbackId }, 'Finding feedback replies')

      const rows = await prisma.feedbackReply.findMany({
        where: { feedbackId: params.feedbackId },
        orderBy: { createdAt: 'asc' },
      })

      return rows.map(transformReply)
    },
  }
}
