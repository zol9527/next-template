/**
 * AI 文本生成路由
 *
 * @module app/api/v1/admin/ai/generate/text
 * @description SSE 流式文本生成接口，支持商品名称/描述/标签等生成
 *   遵循六层架构，通过 Service 层编排生成逻辑
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { withV1StreamingRoute } from '@/app/api/v1/_shared/streaming-route-handler'
import { createOptionsResponse } from '@/lib/http/response'
import { AiGenerateTextRequestSchema } from '@/contracts/ai-generation.dto'
import { createSystemSettingsRepository, createAiUsageLogRepository, createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiGenerationService } from '@/services/core/ai-generation.service'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: POST
 *
 * Description: AI 文本生成（SSE 流式响应）
 *   接收生成类型和提示词，通过 LLM 生成文本内容
 *   以 SSE 事件流推送生成过程（text_delta → step_complete）
 */
export const POST = withV1StreamingRoute({
  action: 'admin:ai:generate:write',
  requireAccess: { action: 'write' as Action, scope: 'ai.generate' as Scope },
  handler: async (ctx, emitter) => {
    // 解析请求体
    const body = await ctx.req.json()
    const parsed = AiGenerateTextRequestSchema.safeParse(body)

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
      const result = await generationService.generateProductText({
        kind,
        categoryNames: categoryIds,
        prompt,
        userId: ctx.userId!,
        traceId: ctx.traceId,
      })

      // 推送 SSE 事件
      emitter.send('text_delta', { field: kind, delta: result.content })
      emitter.send('step_complete', { step: 'text', data: { content: result.content } })
      emitter.done()
    } catch (error) {
      const message = error instanceof Error ? error.message : '文本生成失败'
      emitter.error(message, 'GENERATION_ERROR')
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
