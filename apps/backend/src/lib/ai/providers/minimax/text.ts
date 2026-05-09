/**
 * MiniMax 文本生成实现
 *
 * Description: 基于 OpenAI 兼容端点实现文本生成（非流式 + SSE 流式）
 *   MiniMax API 端点: https://api.minimax.chat/v1/chat/completions
 */

import type {
  ChatMessage,
  TextDelta,
  TextGenerationParams,
  TextGenerationResult,
  TokenUsage,
} from '../../core/types'
import { aiFetch } from '../_base'

// ==================== 内部类型 ====================

interface MinimaxRequestOptions {
  apiKey: string
  baseUrl: string
  model: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

/** OpenAI 兼容的请求体格式 */
interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

/** 非流式响应格式 */
interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  choices: Array<{
    message: { role: string; content: string }
    index: number
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/** 流式响应 chunk 格式 */
interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  choices: Array<{
    delta: { role?: string; content?: string }
    index: number
    finish_reason: string | null
  }>
}

// ==================== 工具函数 ====================

/**
 * Function: buildRequestBody
 *
 * Description: 构建 MiniMax API 请求体（OpenAI 兼容格式）
 *
 * Parameters:
 *   options(MinimaxRequestOptions): 请求参数
 *   stream(boolean): 是否流式
 *
 * Returns:
 *   body(ChatCompletionRequest): 请求体
 */
function buildRequestBody(
  options: MinimaxRequestOptions,
  stream: boolean
): ChatCompletionRequest {
  return {
    model: options.model,
    messages: options.messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream,
  }
}

/**
 * Function: parseSSELines
 *
 * Description: 从 ReadableStream 中逐行解析 SSE 事件
 *   每个 SSE 事件格式为 "data: {json}\n\n"
 *   结束标志为 "data: [DONE]"
 *
 * Parameters:
 *   body(ReadableStream<Uint8Array>): 原始响应流
 *
 * Returns:
 *   lines(AsyncIterable<string>): 解析出的每行 data 内容
 */
async function* parseSSELines(
  body: ReadableStream<Uint8Array>
): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 按换行符拆分，保留最后一个不完整行
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim()
          if (data === '[DONE]') return
          if (data) yield data
        }
      }
    }

    // 处理缓冲区中剩余的数据
    const remaining = buffer.trim()
    if (remaining && remaining.startsWith('data: ')) {
      const data = remaining.slice(6).trim()
      if (data && data !== '[DONE]') yield data
    }
  } finally {
    reader.releaseLock()
  }
}

// ==================== 非流式文本生成 ====================

/**
 * Function: generateText
 *
 * Description: 非流式文本生成，调用 MiniMax chat completion 端点
 *
 * Parameters:
 *   options(MinimaxRequestOptions): 请求参数（含 apiKey, baseUrl 等）
 *
 * Returns:
 *   result(TextGenerationResult): 生成结果（含内容和 token 用量）
 */
export async function generateText(
  options: MinimaxRequestOptions
): Promise<TextGenerationResult> {
  const url = `${options.baseUrl}/chat/completions`
  const requestBody = buildRequestBody(options, false)

  const response = await aiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `MiniMax API error (${response.status}): ${errorText}`
    )
  }

  const data = (await response.json()) as ChatCompletionResponse

  const content = data.choices[0]?.message?.content ?? ''
  const usage: TokenUsage = {
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
  }

  return {
    content,
    usage,
    model: options.model,
  }
}

// ==================== 流式文本生成 ====================

/**
 * Function: streamText
 *
 * Description: 流式文本生成，通过 SSE 逐 token 返回增量内容
 *   收到 [DONE] 时发送 done: true 信号
 *
 * Parameters:
 *   options(MinimaxRequestOptions): 请求参数（含 apiKey, baseUrl 等）
 *
 * Returns:
 *   stream(AsyncIterable<TextDelta>): 文本增量流
 */
export async function* streamText(
  options: MinimaxRequestOptions
): AsyncIterable<TextDelta> {
  const url = `${options.baseUrl}/chat/completions`
  const requestBody = buildRequestBody(options, true)

  const response = await aiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `MiniMax API error (${response.status}): ${errorText}`
    )
  }

  const body = response.body
  if (!body) {
    throw new Error('MiniMax API returned no stream body')
  }

  for await (const line of parseSSELines(body)) {
    try {
      const chunk = JSON.parse(line) as ChatCompletionChunk
      const delta = chunk.choices[0]?.delta

      if (delta?.content) {
        yield { content: delta.content, done: false }
      }

      // finish_reason 表示流结束
      if (chunk.choices[0]?.finish_reason) {
        yield { content: '', done: true }
        return
      }
    } catch {
      // 跳过无法解析的行（如心跳等）
      continue
    }
  }

  // 流自然结束时也发送 done 信号
  yield { content: '', done: true }
}
