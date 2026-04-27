/**
 * AI 设置管理 DTO
 *
 * @module contracts/ai-settings
 * @description AI Provider 配置和 Prompt 模板的 API 契约定义
 *   遵循 Schema First 原则，使用 Zod 进行运行时校验和 OpenAPI 文档生成
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Provider 配置 ====================

/**
 * Schema: AiProviderConfigRequestSchema
 *
 * Description: AI Provider 配置更新请求
 *   API Key 以明文传入，服务端加密存储（AES-256-GCM）
 */
export const AiProviderConfigRequestSchema = z.object({
  provider: z.string().default('minimax').openapi({ description: 'Provider 名称' }),
  baseUrl: z.string().url().optional().openapi({ description: 'API Base URL' }),
  apiKey: z.string().min(1).openapi({ description: 'API Key（明文，服务端加密存储）' }),
  textModel: z.string().optional().openapi({ description: '文本模型名称' }),
  imageModel: z.string().optional().openapi({ description: '图片模型名称' }),
}).openapi({ description: 'AI Provider 配置请求' })

export type AiProviderConfigRequest = z.infer<typeof AiProviderConfigRequestSchema>

/**
 * Schema: AiProviderConfigResponseSchema
 *
 * Description: AI Provider 配置响应
 *   API Key 已脱敏处理（sk-****xxxx 格式），不暴露明文
 */
export const AiProviderConfigResponseSchema = z.object({
  provider: z.string().openapi({ description: 'Provider 名称' }),
  baseUrl: z.string().openapi({ description: 'API Base URL' }),
  apiKey: z.string().openapi({ description: 'API Key（脱敏）' }),
  textModel: z.string().openapi({ description: '文本模型名称' }),
  imageModel: z.string().openapi({ description: '图片模型名称' }),
  isConfigured: z.boolean().openapi({ description: '是否已配置' }),
}).openapi({ description: 'AI Provider 配置响应' })

export type AiProviderConfigResponse = z.infer<typeof AiProviderConfigResponseSchema>

// ==================== Prompt 模板 ====================

/**
 * Schema: AiTemplateListResponseSchema
 *
 * Description: AI Prompt 模板列表响应
 *   返回所有活跃模板的摘要信息
 */
export const AiTemplateListResponseSchema = z.object({
  items: z.array(z.object({
    slug: z.string().openapi({ description: '模板唯一标识' }),
    name: z.string().openapi({ description: '模板名称' }),
    category: z.string().openapi({ description: '模板分类' }),
    version: z.number().openapi({ description: '当前版本号' }),
    isActive: z.boolean().openapi({ description: '是否活跃' }),
    variables: z.array(z.string()).openapi({ description: '变量列表' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
  })).openapi({ description: '模板列表' }),
}).openapi({ description: 'AI Prompt 模板列表响应' })

export type AiTemplateListResponse = z.infer<typeof AiTemplateListResponseSchema>

/**
 * Schema: AiTemplateDetailResponseSchema
 *
 * Description: AI Prompt 模板详情响应
 *   包含完整的模板内容和变量声明
 */
export const AiTemplateDetailResponseSchema = z.object({
  slug: z.string().openapi({ description: '模板唯一标识' }),
  name: z.string().openapi({ description: '模板名称' }),
  category: z.string().openapi({ description: '模板分类' }),
  content: z.string().openapi({ description: '模板内容' }),
  variables: z.array(z.string()).openapi({ description: '变量列表' }),
  version: z.number().openapi({ description: '当前版本号' }),
  isActive: z.boolean().openapi({ description: '是否活跃' }),
  createdAt: z.string().openapi({ description: '创建时间' }),
}).openapi({ description: 'AI Prompt 模板详情' })

export type AiTemplateDetailResponse = z.infer<typeof AiTemplateDetailResponseSchema>

/**
 * Schema: AiCreateTemplateVersionRequestSchema
 *
 * Description: 创建模板新版本请求
 *   支持使用 {{变量名}} 语法进行模板变量插值
 */
export const AiCreateTemplateVersionRequestSchema = z.object({
  name: z.string().min(1).openapi({ description: '模板名称' }),
  category: z.string().min(1).openapi({ description: '模板分类' }),
  content: z.string().min(1).openapi({ description: '模板内容（支持 {{变量名}} 插值）' }),
  variables: z.array(z.string()).optional().default([]).openapi({ description: '变量列表' }),
}).openapi({ description: '创建模板版本请求' })

export type AiCreateTemplateVersionRequest = z.infer<typeof AiCreateTemplateVersionRequestSchema>

/**
 * Schema: AiRollbackTemplateRequestSchema
 *
 * Description: 回滚模板到指定版本请求
 */
export const AiRollbackTemplateRequestSchema = z.object({
  targetVersion: z.number().int().min(1).openapi({ description: '目标版本号' }),
}).openapi({ description: '回滚模板请求' })

export type AiRollbackTemplateRequest = z.infer<typeof AiRollbackTemplateRequestSchema>

/**
 * Schema: AiTemplateVersionHistoryResponseSchema
 *
 * Description: 模板版本历史响应
 *   按版本号降序返回所有历史版本
 */
export const AiTemplateVersionHistoryResponseSchema = z.object({
  items: z.array(z.object({
    version: z.number().openapi({ description: '版本号' }),
    name: z.string().openapi({ description: '模板名称' }),
    content: z.string().openapi({ description: '模板内容' }),
    isActive: z.boolean().openapi({ description: '是否活跃版本' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
  })).openapi({ description: '版本历史' }),
}).openapi({ description: 'AI Prompt 模板版本历史' })

export type AiTemplateVersionHistoryResponse = z.infer<typeof AiTemplateVersionHistoryResponseSchema>
