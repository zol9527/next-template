/**
 * AI Generation DTO
 *
 * @module contracts/ai-generation
 * @description AI 生成相关 API 的请求/响应契约定义
 *   使用 Zod Schema 定义运行时校验，同时用于 OpenAPI 文档生成
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 文本生成 ====================

/**
 * Schema: AiGenerateTextRequestSchema
 *
 * Description: AI 文本生成请求体（生成商品名称/描述/标签等）
 */
export const AiGenerateTextRequestSchema = z.object({
  kind: z.string().min(1).openapi({ description: '生成类型（name/description/tags 等）' }),
  categoryIds: z.array(z.string().uuid()).optional().default([]).openapi({ description: '分类 ID 列表' }),
  prompt: z.string().optional().openapi({ description: '补充提示词' }),
}).openapi({ description: 'AI 文本生成请求' })

/** 文本生成请求类型 */
export type AiGenerateTextRequest = z.infer<typeof AiGenerateTextRequestSchema>

/**
 * Schema: AiGenerateTextResponseSchema
 *
 * Description: AI 文本生成响应体
 */
export const AiGenerateTextResponseSchema = z.object({
  content: z.string().openapi({ description: '生成的文本内容（已 sanitize）' }),
}).openapi({ description: 'AI 文本生成响应' })

/** 文本生成响应类型 */
export type AiGenerateTextResponse = z.infer<typeof AiGenerateTextResponseSchema>

// ==================== 图片生成 ====================

/**
 * Schema: AiGenerateImageRequestSchema
 *
 * Description: AI 图片生成请求体
 */
export const AiGenerateImageRequestSchema = z.object({
  prompt: z.string().min(1).openapi({ description: '图片描述提示词' }),
}).openapi({ description: 'AI 图片生成请求' })

/** 图片生成请求类型 */
export type AiGenerateImageRequest = z.infer<typeof AiGenerateImageRequestSchema>

/**
 * Schema: AiGenerateImageResponseSchema
 *
 * Description: AI 图片生成响应体
 */
export const AiGenerateImageResponseSchema = z.object({
  url: z.string().openapi({ description: '图片永久 URL' }),
  assetId: z.string().openapi({ description: 'MediaAsset ID' }),
}).openapi({ description: 'AI 图片生成响应' })

/** 图片生成响应类型 */
export type AiGenerateImageResponse = z.infer<typeof AiGenerateImageResponseSchema>

// ==================== 价格建议 ====================

/**
 * Schema: AiGeneratePricingRequestSchema
 *
 * Description: AI 价格建议请求体
 */
export const AiGeneratePricingRequestSchema = z.object({
  kind: z.string().min(1).openapi({ description: '商品类型（course/certificate 等）' }),
  categoryIds: z.array(z.string().uuid()).optional().default([]).openapi({ description: '分类 ID 列表' }),
  prompt: z.string().optional().openapi({ description: '补充提示词' }),
}).openapi({ description: 'AI 价格建议请求' })

/** 价格建议请求类型 */
export type AiGeneratePricingRequest = z.infer<typeof AiGeneratePricingRequestSchema>

/**
 * Schema: AiGeneratePricingResponseSchema
 *
 * Description: AI 价格建议响应体
 */
export const AiGeneratePricingResponseSchema = z.object({
  suggestedPrice: z.number().openapi({ description: '建议价格' }),
  reasoning: z.string().openapi({ description: '定价理由' }),
}).openapi({ description: 'AI 价格建议响应' })

/** 价格建议响应类型 */
export type AiGeneratePricingResponse = z.infer<typeof AiGeneratePricingResponseSchema>

// ==================== 一键全生成 ====================

/**
 * Schema: AiGenerateProductAllRequestSchema
 *
 * Description: AI 一键全生成请求体（SSE 流式响应）
 */
export const AiGenerateProductAllRequestSchema = z.object({
  kind: z.string().min(1).openapi({ description: '商品类型（course/certificate 等）' }),
  categoryIds: z.array(z.string().uuid()).optional().default([]).openapi({ description: '分类 ID 列表' }),
  prompt: z.string().optional().openapi({ description: '补充提示词' }),
}).openapi({ description: 'AI 一键全生成请求' })

/** 一键全生成请求类型 */
export type AiGenerateProductAllRequest = z.infer<typeof AiGenerateProductAllRequestSchema>
