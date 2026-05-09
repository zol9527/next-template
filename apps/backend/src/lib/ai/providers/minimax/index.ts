/**
 * MiniMax AI Provider
 *
 * Description: MiniMax AI Provider 统一入口
 *   包含文本生成（MiniMax-M2.7）和图片生成（image-01）Provider
 */

import type {
  IAITextProvider,
  TextDelta,
  TextGenerationParams,
  TextGenerationResult,
} from '../../core/types'
import { generateText, streamText } from './text'
export { MiniMaxImageProvider, downloadImageToBuffer } from './image'

// ==================== Provider 类 ====================

export class MiniMaxTextProvider implements IAITextProvider {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(options: {
    apiKey: string
    baseUrl?: string
    model?: string
  }) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? 'https://api.minimax.chat/v1'
    this.model = options.model ?? 'MiniMax-M2.7'
  }

  generateText(
    params: TextGenerationParams
  ): Promise<TextGenerationResult> {
    return generateText({
      ...params,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: params.model ?? this.model,
    })
  }

  streamText(params: TextGenerationParams): AsyncIterable<TextDelta> {
    return streamText({
      ...params,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: params.model ?? this.model,
    })
  }
}

// ==================== 工厂函数 ====================

/**
 * Function: createMiniMaxTextProvider
 *
 * Description: 创建 MiniMax 文本 Provider 实例
 *
 * Parameters:
 *   options.apiKey(string): MiniMax API Key
 *   options.baseUrl(string?): API 基础 URL，默认 https://api.minimax.chat/v1
 *   options.model(string?): 模型名称，默认 MiniMax-M2.7
 *
 * Returns:
 *   provider(MiniMaxTextProvider): 文本 Provider 实例
 */
export function createMiniMaxTextProvider(options: {
  apiKey: string
  baseUrl?: string
  model?: string
}): MiniMaxTextProvider {
  return new MiniMaxTextProvider(options)
}
