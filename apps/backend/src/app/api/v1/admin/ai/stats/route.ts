/**
 * AI 使用统计路由
 *
 * @module app/api/v1/admin/ai/stats
 * @description AI 使用统计聚合查询接口
 *   支持按日期范围和用户 ID 过滤，返回总调用次数、Token 用量、费用等聚合数据
 *   遵循六层架构，通过 Repository 接口访问日志数据
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { AiStatsQuerySchema } from '@/contracts/core/ai-logs.dto'
import { createAiUsageLogRepository } from '@/repositories/factory'
import { createAiAuditService } from '@/services/core/ai-audit.service'

/**
 * Function: GET
 *
 * Description: 查询 AI 使用统计聚合数据
 *   返回总调用次数、Token 用量、总费用、按提供商和能力的聚合统计
 *   使用 AiStatsQuerySchema 校验查询参数
 */
export const GET = withV1Route({
  action: 'admin:ai:logs:read',
  schemas: { query: AiStatsQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'ai.logs' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const aiUsageLog = await createAiUsageLogRepository()
    const auditService = createAiAuditService({ aiUsageLog }, serviceContext!)

    const stats = await auditService.getUsageStats({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      userId: query.userId,
    })

    return createJsonApiResponse(req, ok({
      totalCalls: stats.totalCalls,
      totalInputTokens: stats.totalInputTokens,
      totalOutputTokens: stats.totalOutputTokens,
      totalCost: stats.totalCost,
      byProvider: stats.byProvider,
      byCapability: stats.byCapability,
    }))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: CORS 预检请求处理
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
