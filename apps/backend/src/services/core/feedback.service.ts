import type { FeedbackRepository } from '@/repositories/interfaces/core/feedback.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 反馈服务错误码
 */
type FeedbackErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL_ERROR'

/**
 * 反馈业务错误
 * 用于在反馈服务中抛出带有明确错误码的异常，便于 API 层统一处理
 */
export class FeedbackError extends Error {
  public readonly code: FeedbackErrorCode

  constructor(code: FeedbackErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * 创建反馈服务（工厂模式）
 *
 * 职责：
 * - 提交用户反馈
 * - 查询用户反馈列表（cursor 分页）
 * - 查询反馈详情（含回复，带所有权校验）
 *
 * 注意：
 * - 频率限制由路由层处理（决策 D3），本层不实现
 * - 不提供 totalCount（决策 D7）
 * - 用户只能查看自己的反馈（决策 D14）
 */
export function createFeedbackService(
  deps: {
    feedback: FeedbackRepository
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
     * 提交用户反馈
     *
     * 注意：频率限制由路由层处理（决策 D3），此处直接创建
     *
     * @param userId - 用户 ID
     * @param data - 反馈数据（type, title, content, images）
     * @returns 创建的反馈记录
     */
    async submitFeedback(
      userId: string,
      data: {
        type: string
        title: string
        content: string
        images?: string[] | null
      }
    ) {
      logger.info({ userId, type: data.type }, '提交用户反馈')

      const feedback = await deps.feedback.create(repoCtx, {
        userId,
        ...data,
      })

      logger.info({ feedbackId: feedback.id }, '用户反馈创建成功')

      return feedback
    },

    /**
     * 查询用户反馈列表（cursor 分页）
     *
     * 决策 D7：不返回 totalCount
     *
     * @param userId - 用户 ID
     * @param query - 分页查询参数（cursor, limit, status）
     * @returns 分页结果（items, nextCursor, hasMore）
     */
    async listFeedback(
      userId: string,
      query: {
        cursor?: string | null
        limit: number
        status?: string | null
      }
    ) {
      logger.info({ userId, limit: query.limit, status: query.status }, '查询用户反馈列表')

      const result = await deps.feedback.listByUser(repoCtx, {
        userId,
        ...query,
      })

      return result
    },

    /**
     * 获取反馈详情（含回复），带所有权校验
     *
     * 决策 D14：用户只能查看自己的反馈，跨用户访问返回 403
     *
     * @param userId - 当前请求用户 ID
     * @param feedbackId - 反馈 ID
     * @returns 反馈详情（含管理员回复列表）
     * @throws FeedbackError NOT_FOUND - 反馈不存在
     * @throws FeedbackError FORBIDDEN - 无权查看该反馈
     */
    async getFeedbackDetail(userId: string, feedbackId: string) {
      logger.info({ userId, feedbackId }, '查询反馈详情')

      const feedback = await deps.feedback.findById(repoCtx, {
        id: feedbackId,
      })

      if (!feedback) {
        logger.warn({ feedbackId }, '反馈不存在')
        throw new FeedbackError('NOT_FOUND', '反馈不存在')
      }

      if (feedback.userId !== userId) {
        logger.warn({ feedbackId, userId, ownerId: feedback.userId }, '用户尝试访问他人反馈')
        throw new FeedbackError('FORBIDDEN', '无权查看该反馈')
      }

      return feedback
    },
  }
}
