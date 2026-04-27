/**
 * AI SDK 统一导出
 *
 * Description: AI 基础设施 SDK 的公共 API 入口
 */

// 核心类型
export type {
  AICapability,
  AIProviderName,
  AIGenerationStatus,
  ChatMessageRole,
  ChatMessage,
  TextGenerationParams,
  TokenUsage,
  TextGenerationResult,
  TextDelta,
  ImageAspectRatio,
  ImageGenerationParams,
  ImageGenerationResult,
  IAITextProvider,
  IAIImageProvider,
  AIProviderConfig,
  SSEEventType,
  SSEStepName,
  SSEEventData,
} from './core/types'

// Provider 注册表
export {
  registerProvider,
  getTextProvider,
  getImageProvider,
  getDefaultProviderName as getRegistryDefaultProviderName,
  listAvailableProviders,
  clearProviders,
} from './core/provider-registry'

// SSE 解析器
export { SSEParser, parseSSEStream } from './core/sse-parser'
export type { SSEParserCallbacks } from './core/sse-parser'

// Structured Output
export { extractJSON, parseStructuredOutput } from './core/structured-output'
export type { StructuredOutputResult } from './core/structured-output'

// 配置
export { getProviderConfig, getDefaultProviderName } from './core/config'

// MiniMax Provider
export { MiniMaxImageProvider, downloadImageToBuffer } from './providers/minimax'
