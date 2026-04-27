/**
 * AI 使用日志路由
 *
 * @module app/api/v1/admin/ai/logs
 * @description AI 使用日志列表查询接口，支持分页和多种过滤条件
 *   遵循六层架构，通过 Repository 接口访问日志数据
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { AiLogsQuerySchema } from '@/contracts/core/ai-logs.dto'
import { createAiUsageLogRepository } from '@/repositories/factory'
import { createAiAuditService } from '@/services/core/ai-audit.service'

/**
 * Function: GET
 *
 * Description: 查询 AI 使用日志（分页）
 *   支持按提供商、能力类型、状态、日期范围过滤
 *   使用 AiLogsQuerySchema 校验查询参数
 */
export const GET = withV1Route({
  action: 'admin:ai:logs:read',
  schemas: { query: AiLogsQuerySchema },
  requireAccess: { action: 'read' as Action, scope: 'ai.logs' as Scope },
  handler: async ({ query, serviceContext, req }) => {
    const aiUsageLog = await createAiUsageLogRepository()
    const auditService = createAiAuditService({ aiUsageLog }, serviceContext!)

    const result = await auditService.getUsageLogs({
      offset: query.offset,
      limit: query.limit,
      provider: query.provider,
      capability: query.capability,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    })

    return createJsonApiResponse(req, ok({
      items: result.items.map((log) => ({
        id: log.id,
        userId: log.userId,
        capability: log.capability,
        provider: log.provider,
        model: log.model,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        costAmount: log.costAmount,
        currencyCode: log.currencyCode,
        durationMs: log.durationMs,
        status: log.status,
        errorMessage: log.errorMessage,
        entity: log.entity,
        entityId: log.entityId,
        traceId: log.traceId,
        createdAt: log.createdAt,
      })),
      total: result.total,
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
