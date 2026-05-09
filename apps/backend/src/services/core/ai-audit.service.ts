/**
 * AI 审计日志服务
 *
 * @module services/core/ai-audit
 * @description 记录和查询 AI 使用日志
 *   不存完整 prompt 内容，只存 token 统计和成本
 */

import type { ServiceContext } from '@/types/service/service-context'
import type {
  AiUsageLogRepository,
  CreateAiUsageLogParams,
  AiUsageLogDto,
  AiUsageStatsDto,
} from '@/repositories/interfaces/core/ai-usage-log.interface'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * Function: createAiAuditService
 *
 * Description: 创建 AI 审计日志服务实例
 *
 * Parameters:
 *   deps(object): 依赖注入 { aiUsageLog: AiUsageLogRepository }
 *   ctx(ServiceContext): Service 层执行上下文
 *
 * Returns:
 *   service(AiAuditService): 审计服务实例
 */
export function createAiAuditService(
  deps: { aiUsageLog: AiUsageLogRepository },
  ctx: ServiceContext,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * Function: logUsage
     *
     * Description: 记录一次 AI 使用日志
     *
     * Parameters:
     *   params(CreateAiUsageLogParams): 使用日志参数
     *
     * Returns:
     *   log(AiUsageLogDto): 创建的日志记录
     */
    async logUsage(params: CreateAiUsageLogParams): Promise<AiUsageLogDto> {
      return deps.aiUsageLog.create(repoCtx, params)
    },

    /**
     * Function: getUsageLogs
     *
     * Description: 查询使用日志（分页）
     *
     * Parameters:
     *   params(object): 查询参数（分页、过滤条件）
     *
     * Returns:
     *   result(object): { items: 日志列表, total: 总数 }
     */
    async getUsageLogs(params: {
      offset?: number
      limit?: number
      userId?: string
      provider?: string
      capability?: string
      status?: string
      startDate?: Date
      endDate?: Date
    }): Promise<{ items: AiUsageLogDto[]; total: number }> {
      return deps.aiUsageLog.findMany(repoCtx, {
        offset: params.offset ?? 0,
        limit: params.limit ?? 20,
        userId: params.userId,
        provider: params.provider,
        capability: params.capability,
        status: params.status,
        startDate: params.startDate,
        endDate: params.endDate,
      })
    },

    /**
     * Function: getUsageStats
     *
     * Description: 获取使用统计聚合
     *
     * Parameters:
     *   params(object): 统计查询参数（日期范围、用户过滤）
     *
     * Returns:
     *   stats(AiUsageStatsDto): 聚合统计结果
     */
    async getUsageStats(params?: {
      startDate?: Date
      endDate?: Date
      userId?: string
    }): Promise<AiUsageStatsDto> {
      return deps.aiUsageLog.getStats(repoCtx, params ?? {})
    },
  }
}

/** AI 审计日志服务类型 */
export type AiAuditService = ReturnType<typeof createAiAuditService>
