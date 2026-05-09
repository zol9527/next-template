/**
 * AI 图片生成路由
 *
 * @module app/api/v1/admin/ai/generate/image
 * @description SSE 流式图片生成接口，根据提示词生成商品图片
 *   遵循六层架构，通过 Service 层编排生成逻辑
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { withV1StreamingRoute } from '@/app/api/v1/_shared/streaming-route-handler'
import { createOptionsResponse } from '@/lib/http/response'
import { AiGenerateImageRequestSchema } from '@/contracts/ai-generation.dto'
import { createSystemSettingsRepository, createAiUsageLogRepository, createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiGenerationService } from '@/services/core/ai-generation.service'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: POST
 *
 * Description: AI 图片生成（SSE 流式响应）
 *   接收图片描述提示词，通过 AI Provider 生成图片
 *   以 SSE 事件推送生成结果（step_complete 含图片 URL）
 */
export const POST = withV1StreamingRoute({
  action: 'admin:ai:generate:write',
  requireAccess: { action: 'write' as Action, scope: 'ai.generate' as Scope },
  handler: async (ctx, emitter) => {
    // 解析请求体
    const body = await ctx.req.json()
    const parsed = AiGenerateImageRequestSchema.safeParse(body)

    if (!parsed.success) {
      emitter.error(`请求参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR')
      return
    }

    const { prompt } = parsed.data

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
      // 调用图片生成服务
      const result = await generationService.generateProductImage({
        prompt,
        userId: ctx.userId!,
        traceId: ctx.traceId,
      })

      // 推送 SSE 事件（step_complete 含图片 URL 和 assetId）
      emitter.send('step_complete', {
        step: 'image',
        data: { url: result.url, assetId: result.assetId },
      })
      emitter.done()
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片生成失败'
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
