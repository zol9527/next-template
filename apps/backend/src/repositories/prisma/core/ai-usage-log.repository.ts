/**
 * AI Usage Log Prisma Repository
 *
 * @module repositories/prisma/ai-usage-log
 * @description AI 使用日志的 Prisma 实现，
 *   使用 aiUsageLog 模型进行数据访问
 */

import { prisma } from '@/lib/prisma'
import type {
  AiUsageLogRepository,
  CreateAiUsageLogParams,
  AiUsageLogDto,
  AiUsageStatsDto,
} from '@/repositories/interfaces/core/ai-usage-log.interface'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * Function: toDto
 *
 * Description: 将 Prisma AiUsageLog 记录转换为 DTO
 *
 * Parameters:
 *   row(object): Prisma 查询返回的原始记录
 *
 * Returns:
 *   dto(AiUsageLogDto): 转换后的 DTO
 */
function toDto(row: {
  id: string
  userId: string
  capability: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costAmount: { toNumber(): number }
  currencyCode: string
  durationMs: number
  status: string
  errorMessage: string | null
  entity: string | null
  entityId: string | null
  traceId: string | null
  createdAt: Date
}): AiUsageLogDto {
  return {
    id: row.id,
    userId: row.userId,
    capability: row.capability,
    provider: row.provider,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costAmount: row.costAmount.toNumber(),
    currencyCode: row.currencyCode,
    durationMs: row.durationMs,
    status: row.status,
    errorMessage: row.errorMessage,
    entity: row.entity,
    entityId: row.entityId,
    traceId: row.traceId,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Function: createPrismaAiUsageLogRepository
 *
 * Description: 创建基于 Prisma 的 AI 使用日志 Repository 实例
 *
 * Returns:
 *   repository(AiUsageLogRepository): Repository 实例
 */
export function createPrismaAiUsageLogRepository(): AiUsageLogRepository {
  return {
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
    async create(ctx: RepoContext, params: CreateAiUsageLogParams): Promise<AiUsageLogDto> {
      const { logger } = ctx
      logger.info({ action: 'ai_usage_log.create', model: params.model, capability: params.capability })

      const row = await prisma.aiUsageLog.create({
        data: {
          userId: params.userId,
          capability: params.capability,
          provider: params.provider,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costAmount: params.costAmount,
          currencyCode: params.currencyCode,
          durationMs: params.durationMs,
          status: params.status,
          errorMessage: params.errorMessage,
          entity: params.entity,
          entityId: params.entityId,
          traceId: params.traceId ?? ctx.traceId,
        },
      })

      return toDto(row)
    },

    /**
     * Function: findMany
     *
     * Description: 分页查询 AI 使用日志
     *
     * Parameters:
     *   ctx(RepoContext): Repository 层执行上下文
     *   params(object): 查询参数（分页 + 过滤条件）
     *
     * Returns:
     *   result(object): { items: 日志列表, total: 总数 }
     */
    async findMany(ctx: RepoContext, params: {
      offset: number
      limit: number
      userId?: string
      provider?: string
      capability?: string
      status?: string
      startDate?: Date
      endDate?: Date
    }): Promise<{ items: AiUsageLogDto[]; total: number }> {
      const { logger } = ctx
      logger.info({ action: 'ai_usage_log.findMany', ...params })

      // 构建 where 条件
      const where: Record<string, unknown> = {}
      if (params.userId) where.userId = params.userId
      if (params.provider) where.provider = params.provider
      if (params.capability) where.capability = params.capability
      if (params.status) where.status = params.status

      // 日期范围过滤
      if (params.startDate || params.endDate) {
        const createdAt: Record<string, Date> = {}
        if (params.startDate) createdAt.gte = params.startDate
        if (params.endDate) createdAt.lte = params.endDate
        where.createdAt = createdAt
      }

      const [rows, total] = await Promise.all([
        prisma.aiUsageLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
        prisma.aiUsageLog.count({ where }),
      ])

      return {
        items: rows.map(toDto),
        total,
      }
    },

    /**
     * Function: getStats
     *
     * Description: 获取 AI 使用统计聚合
     *
     * Parameters:
     *   ctx(RepoContext): Repository 层执行上下文
     *   params(object): 统计参数（日期范围 + 用户过滤）
     *
     * Returns:
     *   stats(AiUsageStatsDto): 聚合统计结果
     */
    async getStats(ctx: RepoContext, params: {
      startDate?: Date
      endDate?: Date
      userId?: string
    }): Promise<AiUsageStatsDto> {
      const { logger } = ctx
      logger.info({ action: 'ai_usage_log.getStats', ...params })

      // 构建 where 条件
      const where: Record<string, unknown> = {}
      if (params.userId) where.userId = params.userId
      if (params.startDate || params.endDate) {
        const createdAt: Record<string, Date> = {}
        if (params.startDate) createdAt.gte = params.startDate
        if (params.endDate) createdAt.lte = params.endDate
        where.createdAt = createdAt
      }

      // 并行执行聚合查询
      const [aggregateResult, byProviderRows, byCapabilityRows] = await Promise.all([
        prisma.aiUsageLog.aggregate({
          where,
          _count: true,
          _sum: {
            inputTokens: true,
            outputTokens: true,
            costAmount: true,
          },
        }),
        prisma.aiUsageLog.groupBy({
          by: ['provider'],
          where,
          _count: true,
          _sum: { costAmount: true },
        }),
        prisma.aiUsageLog.groupBy({
          by: ['capability'],
          where,
          _count: true,
          _sum: { costAmount: true },
        }),
      ])

      return {
        totalCalls: aggregateResult._count,
        totalInputTokens: aggregateResult._sum.inputTokens ?? 0,
        totalOutputTokens: aggregateResult._sum.outputTokens ?? 0,
        totalCost: aggregateResult._sum.costAmount?.toNumber() ?? 0,
        byProvider: byProviderRows.map((row) => ({
          provider: row.provider,
          calls: row._count,
          cost: row._sum.costAmount?.toNumber() ?? 0,
        })),
        byCapability: byCapabilityRows.map((row) => ({
          capability: row.capability,
          calls: row._count,
          cost: row._sum.costAmount?.toNumber() ?? 0,
        })),
      }
    },
  }
}
