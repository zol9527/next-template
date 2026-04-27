/**
 * AI Generation Service
 *
 * @module services/core/ai-generation
 * @description 生成编排服务 — 文本/图片/价格/一键 Pipeline
 *   遵循六层架构，通过 Repository 接口访问数据
 *   不直接写数据库到商品表（G6），仅返回生成结果
 */

import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { AiUsageLogRepository } from '@/repositories/interfaces/core/ai-usage-log.interface'
import type { AiPromptTemplateRepository } from '@/repositories/interfaces/core/ai-prompt-template.interface'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { AiTemplateService } from '@/services/core/ai-template.service'
import type { TokenUsage, IAITextProvider, IAIImageProvider } from '@/lib/ai/core/types'
import { getProviderConfig, getDefaultProviderName } from '@/lib/ai/core/config'
import { parseStructuredOutput } from '@/lib/ai/core/structured-output'
import { calculateCost, calculateImageCost } from '@/lib/ai/cost-table'
import { sanitizeHtml } from '@/lib/utils/sanitize-html.util'
import { AiKeyEncryption } from '@/lib/ai/core/encryption'
import { createMiniMaxTextProvider } from '@/lib/ai/providers/minimax'
import { MiniMaxImageProvider } from '@/lib/ai/providers/minimax'

// ==================== 类型定义 ====================

/** Pipeline 事件类型 */
export type PipelineEvent =
  | { type: 'pipeline_start'; steps: string[] }
  | { type: 'text_delta'; field: string; delta: string }
  | { type: 'step_complete'; step: string; data: unknown }
  | { type: 'step_error'; step: string; error: string }
  | { type: 'pipeline_complete'; results: Record<string, unknown> }
  | { type: 'pipeline_error'; error: string; partialResults?: Record<string, unknown> }

/** 文本生成结果 */
export interface TextGenerationOutput {
  content: string
  usage: TokenUsage
}

/** 图片生成结果 */
export interface ImageGenerationOutput {
  url: string
  assetId: string
}

/** 价格建议结果 */
export interface PricingSuggestionOutput {
  suggestedPrice: number
  reasoning: string
}

// ==================== 错误构造 ====================

function providerNotConfiguredError(capability: string): Error & { code: string } {
  const error = new Error(`AI Provider 未配置，无法执行: ${capability}`) as Error & { code: string }
  error.code = 'AI_PROVIDER_NOT_CONFIGURED'
  return error
}

function providerUnavailableError(name: string): Error & { code: string } {
  const error = new Error(`AI Provider "${name}" 未注册到 Provider Registry`) as Error & { code: string }
  error.code = 'AI_PROVIDER_NOT_REGISTERED'
  return error
}

// ==================== Service 工厂 ====================

/**
 * Function: createAiGenerationService
 *
 * Description: 创建 AI 生成编排服务实例
 *   提供文本生成、图片生成、价格建议和一键 Pipeline 能力
 *
 * Parameters:
 *   deps(object): 依赖注入
 *     aiUsageLog(AiUsageLogRepository): 使用日志仓库
 *     aiPromptTemplate(AiPromptTemplateRepository): 模板仓库
 *     systemSettings(SystemSettingsRepository): 系统设置仓库
 *     templateService(AiTemplateService): 模板服务（用于插值）
 *   ctx(ServiceContext): Service 层执行上下文
 *
 * Returns:
 *   service(AiGenerationService): 生成编排服务实例
 */
export function createAiGenerationService(
  deps: {
    aiUsageLog: AiUsageLogRepository
    aiPromptTemplate: AiPromptTemplateRepository
    systemSettings: SystemSettingsRepository
    templateService: AiTemplateService
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  /**
   * Function: getSetting
   *
   * Description: 从 SystemSetting 读取配置的辅助函数
   */
  async function getSetting(key: string): Promise<string | null> {
    return deps.systemSettings.getSetting<string | null>(repoCtx, { key })
  }

  /**
   * Function: resolveTextProvider
   *
   * Description: 解析并验证文本 Provider 可用性
   */
  async function resolveTextProvider(): Promise<{ provider: IAITextProvider; config: Awaited<ReturnType<typeof getProviderConfig>>; providerName: string }> {
    const providerName = await getDefaultProviderName(getSetting)
    const config = await getProviderConfig(getSetting, (encrypted) => AiKeyEncryption.decrypt(encrypted), providerName)
    if (!config) throw providerNotConfiguredError('text_generation')

    if (providerName === 'minimax') {
      const provider = createMiniMaxTextProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.textModel,
      })
      return { provider, config, providerName }
    }

    throw providerUnavailableError(providerName)
  }

  async function resolveImageProvider(): Promise<{ provider: IAIImageProvider; config: Awaited<ReturnType<typeof getProviderConfig>>; providerName: string }> {
    const providerName = await getDefaultProviderName(getSetting)
    const config = await getProviderConfig(getSetting, (encrypted) => AiKeyEncryption.decrypt(encrypted), providerName)
    if (!config) throw providerNotConfiguredError('image_generation')

    if (providerName === 'minimax') {
      const provider = new MiniMaxImageProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.imageModel,
      })
      return { provider, config, providerName }
    }

    throw providerUnavailableError(providerName)
  }

  /**
   * Function: logUsage
   *
   * Description: 记录 AI 使用日志（异步，不阻塞主流程）
   */
  async function logUsage(params: {
    userId: string
    capability: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    costAmount: number
    durationMs: number
    status: string
    errorMessage?: string
  }): Promise<void> {
    try {
      await deps.aiUsageLog.create(repoCtx, {
        userId: params.userId,
        capability: params.capability,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costAmount: params.costAmount,
        currencyCode: 'CNY',
        durationMs: params.durationMs,
        status: params.status,
        errorMessage: params.errorMessage,
        traceId: ctx.traceId,
      })
    } catch (logError) {
      logger.error({ action: 'ai_generation.log_usage_error', error: logError }, '审计日志写入失败')
    }
  }

  return {
    /**
     * Function: generateProductText
     *
     * Description: 文本生成（名称/描述/标签等）
     *   使用模板插值 → 调用 LLM → 解析结构化输出 → sanitize
     *
     * Parameters:
     *   params(object): 生成参数
     *     kind(string): 生成类型（如 product_name, product_description）
     *     categoryNames(string[], optional): 商品分类名列表
     *     prompt(string, optional): 用户补充提示
     *     userId(string): 触发用户 ID
     *     traceId(string, optional): 外部链路追踪 ID
     *
     * Returns:
     *   result(TextGenerationOutput): { content, usage }
     */
    async generateProductText(params: {
      kind: string
      categoryNames?: string[]
      prompt?: string
      userId: string
      traceId?: string
    }): Promise<TextGenerationOutput> {
      const startTime = Date.now()
      const { kind, categoryNames, userId } = params

      const { provider, config, providerName } = await resolveTextProvider()

      // kind → template slug 映射
      const kindToSlug: Record<string, string> = {
        name: 'product_text_generation',
        description: 'product_text_generation',
        tags: 'product_text_generation',
      }
      const templateSlug = kindToSlug[kind] ?? `product_${kind}`

      const { prompt: systemPrompt } = await deps.templateService.interpolateTemplate(
        templateSlug,
        {
          kind,
          categoryNames: categoryNames?.join(', ') ?? '',
          prompt: params.prompt ?? '',
        },
      )

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: params.prompt ?? `请生成商品${kind === 'name' ? '名称' : kind === 'description' ? '描述' : '标签'}` },
      ]

      const result = await provider.generateText({
        model: config.textModel,
        messages,
        maxTokens: 2000,
        temperature: 0.7,
      })

      const durationMs = Date.now() - startTime
      const costAmount = calculateCost(config.textModel, result.usage.promptTokens, result.usage.completionTokens)

      // sanitize AI 生成的 HTML（G5: AI 生成内容必须经过 sanitize）
      const sanitizedContent = sanitizeHtml(result.content)

      // 记录审计日志
      await logUsage({
        userId,
        capability: 'text_generation',
        provider: providerName,
        model: config.textModel,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        costAmount,
        durationMs,
        status: 'success',
      })

      logger.info({
        action: 'ai_generation.text',
        kind,
        model: config.textModel,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        costAmount,
        durationMs,
      })

      return {
        content: sanitizedContent,
        usage: result.usage,
      }
    },

    /**
     * Function: generateProductImage
     *
     * Description: 图片生成
     *   调用图片 Provider → 返回 URL + assetId
     *
     * Parameters:
     *   params(object): 生成参数
     *     prompt(string): 图片描述提示词
     *     userId(string): 触发用户 ID
     *     traceId(string, optional): 外部链路追踪 ID
     *
     * Returns:
     *   result(ImageGenerationOutput): { url, assetId }
     */
    async generateProductImage(params: {
      prompt: string
      userId: string
      traceId?: string
    }): Promise<ImageGenerationOutput> {
      const startTime = Date.now()
      const { prompt, userId } = params

      const { provider, config, providerName } = await resolveImageProvider()

      const result = await provider.generateImage({
        prompt,
        model: config.imageModel,
        aspectRatio: '1:1',
        n: 1,
      })

      const durationMs = Date.now() - startTime
      const costAmount = calculateImageCost(config.imageModel, 1)

      // 记录审计日志
      await logUsage({
        userId,
        capability: 'image_generation',
        provider: providerName,
        model: config.imageModel,
        inputTokens: 0,
        outputTokens: 0,
        costAmount,
        durationMs,
        status: 'success',
      })

      logger.info({
        action: 'ai_generation.image',
        model: config.imageModel,
        costAmount,
        durationMs,
      })

      return {
        url: result.url,
        assetId: result.assetId ?? '',
      }
    },

    /**
     * Function: suggestProductPricing
     *
     * Description: 价格建议
     *   使用 LLM 生成价格建议，返回结构化的价格 + 推理说明
     *
     * Parameters:
     *   params(object): 生成参数
     *     kind(string): 商品类型
     *     categoryNames(string[], optional): 商品分类名列表
     *     prompt(string, optional): 用户补充提示
     *     userId(string): 触发用户 ID
     *     traceId(string, optional): 外部链路追踪 ID
     *
     * Returns:
     *   result(PricingSuggestionOutput): { suggestedPrice, reasoning }
     */
    async suggestProductPricing(params: {
      kind: string
      categoryNames?: string[]
      prompt?: string
      userId: string
      traceId?: string
    }): Promise<PricingSuggestionOutput> {
      const startTime = Date.now()
      const { kind, categoryNames, userId } = params

      const { provider, config, providerName } = await resolveTextProvider()

      const { prompt: systemPrompt } = await deps.templateService.interpolateTemplate(
        'product_pricing_suggestion',
        {
          kind,
          categoryNames: categoryNames?.join(', ') ?? '',
          prompt: params.prompt ?? '',
        },
      )

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: params.prompt ?? '请给出价格建议' },
      ]

      const result = await provider.generateText({
        model: config.textModel,
        messages,
        maxTokens: 1000,
        temperature: 0.3,
      })

      const durationMs = Date.now() - startTime
      const costAmount = calculateCost(config.textModel, result.usage.promptTokens, result.usage.completionTokens)

      // 解析结构化输出
      const parsed = await parseStructuredOutput<{ suggestedPrice: number; reasoning: string }>(
        result.content,
      )

      const suggestedPrice = parsed.data?.suggestedPrice ?? 0
      const reasoning = parsed.data?.reasoning ?? result.content

      // 记录审计日志
      await logUsage({
        userId,
        capability: 'pricing_suggestion',
        provider: providerName,
        model: config.textModel,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        costAmount,
        durationMs,
        status: parsed.success ? 'success' : 'error',
        errorMessage: parsed.success ? undefined : '结构化输出解析失败',
      })

      logger.info({
        action: 'ai_generation.pricing',
        kind,
        model: config.textModel,
        suggestedPrice,
        parseSuccess: parsed.success,
        costAmount,
        durationMs,
      })

      return {
        suggestedPrice,
        reasoning: sanitizeHtml(reasoning),
      }
    },

    /**
     * Function: generateProductAll
     *
     * Description: 一键全生成 Pipeline（SSE 事件流）
     *   依次执行: 文本生成 → 图片 + 价格并行 → 汇总结果
     *
     * Parameters:
     *   params(object): 生成参数（同 generateProductText）
     *
     * Returns:
     *   generator(AsyncGenerator<PipelineEvent>): SSE 事件流
     */
    async *generateProductAll(params: {
      kind: string
      categoryNames?: string[]
      prompt?: string
      userId: string
      traceId?: string
    }): AsyncGenerator<PipelineEvent> {
      const steps = ['text', 'image', 'pricing'] as const
      const results: Record<string, unknown> = {}

      yield { type: 'pipeline_start', steps: [...steps] }

      // Step 1: 文本生成
      try {
        const textResult = await this.generateProductText(params)
        results.text = textResult
        yield { type: 'step_complete', step: 'text', data: textResult }
      } catch (error) {
        const message = error instanceof Error ? error.message : '文本生成失败'
        logger.error({ action: 'ai_generation.pipeline.text_error', error }, message)
        yield { type: 'step_error', step: 'text', error: message }
      }

      // Step 2 + 3: 图片 + 价格并行生成
      const [imageResult, pricingResult] = await Promise.allSettled([
        this.generateProductImage({
          prompt: params.prompt ?? `商品图片: ${params.kind}`,
          userId: params.userId,
          traceId: params.traceId,
        }),
        this.suggestProductPricing(params),
      ])

      // 处理图片结果
      if (imageResult.status === 'fulfilled') {
        results.image = imageResult.value
        yield { type: 'step_complete', step: 'image', data: imageResult.value }
      } else {
        const message = imageResult.reason instanceof Error ? imageResult.reason.message : '图片生成失败'
        logger.error({ action: 'ai_generation.pipeline.image_error', error: imageResult.reason }, message)
        yield { type: 'step_error', step: 'image', error: message }
      }

      // 处理价格结果
      if (pricingResult.status === 'fulfilled') {
        results.pricing = pricingResult.value
        yield { type: 'step_complete', step: 'pricing', data: pricingResult.value }
      } else {
        const message = pricingResult.reason instanceof Error ? pricingResult.reason.message : '价格建议失败'
        logger.error({ action: 'ai_generation.pipeline.pricing_error', error: pricingResult.reason }, message)
        yield { type: 'step_error', step: 'pricing', error: message }
      }

      yield { type: 'pipeline_complete', results }
    },
  }
}

export type AiGenerationService = ReturnType<typeof createAiGenerationService>
