/**
 * AI 一键全生成路由
 *
 * @module app/api/v1/admin/ai/generate/product-all
 * @description SSE 流式一键全生成接口，依次执行文本→图片+价格→汇总
 *   遵循六层架构，通过 Service 层的 Pipeline 编排生成逻辑
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { withV1StreamingRoute } from '@/app/api/v1/_shared/streaming-route-handler'
import { createOptionsResponse } from '@/lib/http/response'
import { AiGenerateProductAllRequestSchema } from '@/contracts/ai-generation.dto'
import { createSystemSettingsRepository, createAiUsageLogRepository, createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiGenerationService } from '@/services/core/ai-generation.service'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: POST
 *
 * Description: AI 一键全生成（SSE 流式响应）
 *   接收商品信息，依次执行文本生成→图片+价格并行→汇总
 *   以 SSE 事件推送 Pipeline 各阶段（pipeline_start → step_complete → pipeline_complete）
 */
export const POST = withV1StreamingRoute({
  action: 'admin:ai:generate:write',
  requireAccess: { action: 'write' as Action, scope: 'ai.generate' as Scope },
  handler: async (ctx, emitter) => {
    // 解析请求体
    const body = await ctx.req.json()
    const parsed = AiGenerateProductAllRequestSchema.safeParse(body)

    if (!parsed.success) {
      emitter.error(`请求参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR')
      return
    }

    const { kind, categoryIds, prompt } = parsed.data

    // 构建服务依赖
    const systemSettings = await createSystemSettingsRepository()
    const aiUsageLog = await createAiUsageLogRepository()
    const aiPromptTemplate = await createAiPromptTemplateRepository()
    const templateService = createAiTemplateService({ aiPromptTemplate }, ctx.serviceContext)
    const generationService = createAiGenerationService(
      { aiUsageLog, aiPromptTemplate, systemSettings, templateService },
      ctx.serviceContext,
    )

    try {
      // 调用 Pipeline 生成器，逐事件推送到 SSE
      const pipeline = generationService.generateProductAll({
        kind,
        categoryNames: categoryIds,
        prompt,
        userId: ctx.userId!,
        traceId: ctx.traceId,
      })

      for await (const event of pipeline) {
        switch (event.type) {
          case 'pipeline_start':
            emitter.send('pipeline_start', { steps: event.steps })
            break
          case 'text_delta':
            emitter.send('text_delta', { field: event.field, delta: event.delta })
            break
          case 'step_complete':
            emitter.send('step_complete', { step: event.step, data: event.data })
            break
          case 'step_error':
            emitter.send('step_error', { step: event.step, error: event.error })
            break
          case 'pipeline_complete':
            emitter.send('pipeline_complete', { results: event.results })
            break
          case 'pipeline_error':
            emitter.send('pipeline_error', { error: event.error, partialResults: event.partialResults })
            break
        }
      }

      emitter.done()
    } catch (error) {
      const message = error instanceof Error ? error.message : '一键全生成失败'
      emitter.error(message, 'PIPELINE_ERROR')
    }
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
