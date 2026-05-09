/**
 * AI SDK 核心类型定义
 *
 * Description: 定义 AI Provider 接口、生成参数和结果类型
 */

// ==================== 通用类型 ====================

/** AI 能力类型 */
export type AICapability = 'text_generation' | 'image_generation' | 'pricing_suggestion'

/** AI Provider 名称 */
export type AIProviderName = 'minimax' | 'openai' | 'anthropic'

/** AI 生成状态 */
export type AIGenerationStatus = 'pending' | 'running' | 'success' | 'failed'

// ==================== 文本生成 ====================

/** 聊天消息角色 */
export type ChatMessageRole = 'system' | 'user' | 'assistant'

/** 聊天消息 */
export interface ChatMessage {
  role: ChatMessageRole
  content: string
}

/** 文本生成参数 */
export interface TextGenerationParams {
  /** 模型名称 */
  model: string
  /** 对话消息列表 */
  messages: ChatMessage[]
  /** 最大生成 token 数 */
  maxTokens?: number
  /** 温度参数 (0-1) */
  temperature?: number
  /** 是否流式返回 */
  stream?: boolean
}

/** Token 使用统计 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** 文本生成结果 */
export interface TextGenerationResult {
  /** 生成的内容 */
  content: string
  /** Token 使用统计 */
  usage: TokenUsage
  /** 使用的模型 */
  model: string
}

/** 文本流式增量 */
export interface TextDelta {
  /** 增量文本内容 */
  content: string
  /** 是否完成 */
  done: boolean
}

// ==================== 图片生成 ====================

/** 图片宽高比 */
export type ImageAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

/** 图片生成参数 */
export interface ImageGenerationParams {
  /** 提示词 */
  prompt: string
  /** 模型名称 */
  model?: string
  /** 宽高比 */
  aspectRatio?: ImageAspectRatio
  /** 生成数量 */
  n?: number
}

/** 图片生成结果 */
export interface ImageGenerationResult {
  /** 图片 URL（永久 URL，已存储到 MediaAsset） */
  url: string
  /** MediaAsset ID */
  assetId?: string
}

// ==================== Provider 接口 ====================

/** AI 文本 Provider 接口 */
export interface IAITextProvider {
  /** 非流式文本生成 */
  generateText(params: TextGenerationParams): Promise<TextGenerationResult>
  /** 流式文本生成 */
  streamText(params: TextGenerationParams): AsyncIterable<TextDelta>
}

/** AI 图片 Provider 接口 */
export interface IAIImageProvider {
  /** 图片生成 */
  generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult>
}

// ==================== 配置类型 ====================

/** AI Provider 配置 */
export interface AIProviderConfig {
  /** Provider 名称 */
  provider: AIProviderName
  /** API Key（已解密） */
  apiKey: string
  /** API 基础 URL */
  baseUrl: string
  /** 文本模型名称 */
  textModel: string
  /** 图片模型名称 */
  imageModel: string
}

// ==================== SSE 事件类型 ====================

/** SSE Pipeline 事件类型 */
export type SSEEventType =
  | 'pipeline_start'
  | 'text_delta'
  | 'step_complete'
  | 'step_error'
  | 'pipeline_complete'
  | 'pipeline_error'

/** SSE Pipeline 步骤 */
export type SSEStepName = 'text' | 'image' | 'pricing'

/** SSE Pipeline 事件数据映射 */
export interface SSEEventData {
  pipeline_start: { steps: SSEStepName[] }
  text_delta: { field: string; delta: string }
  step_complete: { step: SSEStepName; data: unknown }
  step_error: { step: SSEStepName; error: string }
  pipeline_complete: { results: Record<string, unknown> }
  pipeline_error: { error: string; partialResults?: Record<string, unknown> }
}
