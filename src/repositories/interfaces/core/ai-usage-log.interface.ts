/**
 * AI Usage Log Repository 接口
 *
 * @module repositories/interfaces/ai-usage-log
 * @description AI 使用日志的数据访问接口
 *   不存完整 prompt 内容，只存 token 统计和成本
 */

import type { RepoContext } from '@/types/repo/repo-context'

/** 创建 AI 使用日志的参数 */
export interface CreateAiUsageLogParams {
  /** 触发调用的用户 ID */
  userId: string
  /** AI 能力类型（如 text-generation, image-generation） */
  capability: string
  /** AI 提供商（如 minimax） */
  provider: string
  /** 模型名称 */
  model: string
  /** 输入 token 数 */
  inputTokens: number
  /** 输出 token 数 */
  outputTokens: number
  /** 本次调用费用 */
  costAmount: number
  /** 货币代码 */
  currencyCode: string
  /** 调用耗时（毫秒） */
  durationMs: number
  /** 调用状态（success / error） */
  status: string
  /** 错误信息（status 为 error 时） */
  errorMessage?: string
  /** 关联实体类型（如 blog_post） */
  entity?: string
  /** 关联实体 ID */
  entityId?: string
  /** 链路追踪 ID */
  traceId?: string
}

/** AI 使用日志 DTO */
export interface AiUsageLogDto {
  id: string
  userId: string
  capability: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costAmount: number
  currencyCode: string
  durationMs: number
  status: string
  errorMessage: string | null
  entity: string | null
  entityId: string | null
  traceId: string | null
  createdAt: string
}

/** 使用统计聚合结果 */
export interface AiUsageStatsDto {
  /** 总调用次数 */
  totalCalls: number
  /** 总输入 token 数 */
  totalInputTokens: number
  /** 总输出 token 数 */
  totalOutputTokens: number
  /** 总费用 */
  totalCost: number
  /** 按提供商聚合 */
  byProvider: Array<{ provider: string; calls: number; cost: number }>
  /** 按能力类型聚合 */
  byCapability: Array<{ capability: string; calls: number; cost: number }>
}

/**
 * AI Usage Log Repository
 *
 * Description: AI 使用日志的数据访问接口，
 *   提供创建日志、分页查询和统计聚合能力
 */
export interface AiUsageLogRepository {
  /**
   * Function: create
   *
   * Description: 创建一条 AI 使用日志记录
   *
   * Parameters:
   *   ctx(RepoContext): Repository 层执行上下文
   *   params(CreateAiUsageLogParams): 日志创建参数
   *
   * Returns:
   *   log(AiUsageLogDto): 创建的日志 DTO
   */
  create(ctx: RepoContext, params: CreateAiUsageLogParams): Promise<AiUsageLogDto>

  /**
   * Function: findMany
   *
   * Description: 分页查询 AI 使用日志
   *
   * Parameters:
   *   ctx(RepoContext): Repository 层执行上下文
   *   params(object): 查询参数（含分页、过滤条件）
   *
   * Returns:
   *   result(object): { items: 日志列表, total: 总数 }
   */
  findMany(ctx: RepoContext, params: {
    offset: number
    limit: number
    userId?: string
    provider?: string
    capability?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{ items: AiUsageLogDto[]; total: number }>

  /**
   * Function: getStats
   *
   * Description: 获取 AI 使用统计聚合
   *
   * Parameters:
   *   ctx(RepoContext): Repository 层执行上下文
   *   params(object): 统计查询参数（日期范围、用户过滤）
   *
   * Returns:
   *   stats(AiUsageStatsDto): 聚合统计结果
   */
  getStats(ctx: RepoContext, params: {
    startDate?: Date
    endDate?: Date
    userId?: string
  }): Promise<AiUsageStatsDto>
}
