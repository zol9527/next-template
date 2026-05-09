import type { FeedbackRepository } from '@/repositories/interfaces/core/feedback.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

// ============ 错误定义 ============

type AdminFeedbackErrorCode = 'NOT_FOUND' | 'INVALID_STATUS_TRANSITION' | 'INTERNAL_ERROR'

/**
 * 管理员反馈服务错误
 * 用于反馈管理过程中的业务异常（如反馈不存在、状态流转不合法等）
 */
export class AdminFeedbackError extends Error {
  public readonly code: AdminFeedbackErrorCode

  constructor(code: AdminFeedbackErrorCode, message: string) {
    super(message)
    this.name = 'AdminFeedbackError'
    this.code = code
  }
}

// ============ 状态流转校验 ============

/**
 * 合法的状态流转映射（决策 D13）
 *
 * pending → processing ✅
 * pending → closed ✅ （允许跳过 processing）
 * processing → resolved ✅
 * processing → closed ✅
 *
 * 禁止：
 * - resolved → 任何状态 ❌
 * - closed → 任何状态 ❌
 * - processing → pending ❌
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'closed'],
  processing: ['resolved', 'closed'],
  resolved: [],
  closed: [],
}

/**
 * 校验状态流转是否合法
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否允许流转
 */
function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ============ 服务工厂 ============

/**
 * 创建管理员反馈管理服务
 *
 * 职责：
 * - 查看所有用户反馈（决策 D14：管理员无归属限制）
 * - 反馈状态流转管理（决策 D13）
 * - 管理员回复反馈
 *
 * 复用 FeedbackRepository，不引入额外的数据层依赖
 */
export function createAdminFeedbackService(
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
     * 管理员查看所有反馈列表（cursor 分页）
     * 返回结果包含用户基本信息（id, nickname, avatarUrl）
     */
    async listAllFeedback(query: {
      cursor?: string | null
      limit: number
      status?: string | null
    }) {
      logger.info({ query }, '管理员查询全部反馈列表')

      const result = await deps.feedback.listAll(repoCtx, query)

      return result
    },

    /**
     * 管理员查看反馈详情（含回复列表）
     * @param feedbackId 反馈 ID
     * @throws AdminFeedbackError NOT_FOUND — 反馈不存在
     */
    async getFeedbackDetail(feedbackId: string) {
      logger.info({ feedbackId }, '管理员查询反馈详情')

      const feedback = await deps.feedback.findById(repoCtx, { id: feedbackId })

      if (!feedback) {
        throw new AdminFeedbackError('NOT_FOUND', '反馈不存在')
      }

      return feedback
    },

    /**
     * 更新反馈状态（含状态流转校验，决策 D13）
     *
     * 允许的流转路径：
     *   pending → processing | closed
     *   processing → resolved | closed
     *
     * 禁止的流转：
     *   resolved → 任何状态
     *   closed → 任何状态
     *   processing → pending（不可逆）
     *
     * @param feedbackId 反馈 ID
     * @param newStatus 目标状态（小写，如 'processing'）
     * @throws AdminFeedbackError NOT_FOUND — 反馈不存在
     * @throws AdminFeedbackError INVALID_STATUS_TRANSITION — 状态流转不合法
     */
    async updateFeedbackStatus(feedbackId: string, newStatus: string) {
      logger.info({ feedbackId, newStatus }, '管理员更新反馈状态')

      const current = await deps.feedback.findById(repoCtx, { id: feedbackId })

      if (!current) {
        throw new AdminFeedbackError('NOT_FOUND', '反馈不存在')
      }

      if (!isValidTransition(current.status, newStatus)) {
        throw new AdminFeedbackError(
          'INVALID_STATUS_TRANSITION',
          `不允许从 ${current.status} 变更为 ${newStatus}`
        )
      }

      // repo 层处理大小写转换
      const result = await deps.feedback.updateStatus(repoCtx, {
        id: feedbackId,
        status: newStatus,
      })

      logger.info({ feedbackId, from: current.status, to: newStatus }, '反馈状态更新成功')

      return result
    },

    /**
     * 管理员回复反馈
     * @param adminId 管理员用户 ID
     * @param feedbackId 反馈 ID
     * @param content 回复内容
     * @throws AdminFeedbackError NOT_FOUND — 反馈不存在
     */
    async replyToFeedback(adminId: string, feedbackId: string, content: string) {
      logger.info({ adminId, feedbackId }, '管理员回复反馈')

      const feedback = await deps.feedback.findById(repoCtx, { id: feedbackId })

      if (!feedback) {
        throw new AdminFeedbackError('NOT_FOUND', '反馈不存在')
      }

      const reply = await deps.feedback.createReply(repoCtx, {
        feedbackId,
        adminId,
        content,
      })

      logger.info({ feedbackId, replyId: reply.id }, '管理员回复创建成功')

      return reply
    },
  }
}
