/**
 * SSE Parser — Server-Sent Events 解析器
 *
 * Description: 解析 SSE 格式数据流
 *   处理分片、完整帧、[DONE] 信号和错误帧
 */

// ==================== 回调接口 ====================

/** SSE 解析器回调接口 */
export interface SSEParserCallbacks {
  /** 收到 delta 数据 */
  onDelta: (data: string) => void
  /** 收到 [DONE] 信号 */
  onDone: () => void
  /** 收到错误 */
  onError: (error: string) => void
}

// ==================== SSE Parser 类 ====================

/**
 * SSE Parser
 *
 * Description: 流式 SSE 数据解析器，支持分片拼接
 *   维护内部 buffer 按 \n\n 分割帧边界
 *   逐帧解析 event: 和 data: 行
 */
export class SSEParser {
  /** 分片拼接缓冲区 */
  private buffer = ''

  constructor(private callbacks: SSEParserCallbacks) {}

  /**
   * Function: feed
   *
   * Description: 向解析器输入数据块，自动触发帧解析
   *
   * Parameters:
   *   chunk(string): SSE 原始数据块（可能包含不完整的帧）
   */
  feed(chunk: string): void {
    this.buffer += chunk
    this.processBuffer()
  }

  /**
   * Function: processBuffer
   *
   * Description: 按双换行符分割缓冲区中的完整帧并逐帧处理
   *   未完成的帧保留在 buffer 中等待后续数据
   */
  private processBuffer(): void {
    // SSE 协议规定帧以 \n\n 分隔
    while (this.buffer.includes('\n\n')) {
      const frameEnd = this.buffer.indexOf('\n\n')
      const frame = this.buffer.substring(0, frameEnd)
      this.buffer = this.buffer.substring(frameEnd + 2)

      this.processFrame(frame)
    }
  }

  /**
   * Function: processFrame
   *
   * Description: 解析单个 SSE 帧内容
   *   提取 event: 和 data: 行，按类型分发回调
   *
   * Parameters:
   *   frame(string): 单个 SSE 帧原始文本
   */
  private processFrame(frame: string): void {
    const lines = frame.split('\n')
    let eventType = 'message'
    let data = ''

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim()
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim()
      }
      // 忽略 id:、retry: 及注释行（以 : 开头）
    }

    // [DONE] 信号表示流结束
    if (data === '[DONE]') {
      this.callbacks.onDone()
      return
    }

    // 错误事件类型
    if (eventType === 'error') {
      this.callbacks.onError(data)
      return
    }

    // 正常数据帧，透传给回调
    if (data) {
      this.callbacks.onDelta(data)
    }
  }

  /**
   * Function: reset
   *
   * Description: 重置解析器内部状态，清空缓冲区
   */
  reset(): void {
    this.buffer = ''
  }
}

// ==================== 便捷函数 ====================

/** OpenAI 兼容的 SSE 响应体结构（仅提取 delta content） */
interface OpenAISSEDelta {
  choices?: Array<{
    delta?: { content?: string }
  }>
}

/**
 * Function: parseSSEStream
 *
 * Description: 从 ReadableStream 中解析 SSE 事件并收集所有文本增量
 *   兼容 OpenAI 格式（choices[0].delta.content）
 *   非 JSON 数据直接作为纯文本拼接
 *
 * Parameters:
 *   body(ReadableStream<Uint8Array>): SSE 响应体流
 *
 * Returns:
 *   text(string): 收集的完整文本
 */
export async function parseSSEStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  const parser = new SSEParser({
    onDelta(data) {
      try {
        const parsed = JSON.parse(data) as OpenAISSEDelta
        const content = parsed.choices?.[0]?.delta?.content
        if (content) {
          fullText += content
        }
      } catch {
        // 非 JSON 数据，直接作为文本拼接
        fullText += data
      }
    },
    onDone() {
      // 流正常结束
    },
    onError(error) {
      console.error('[SSE] stream error:', error)
    },
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.feed(decoder.decode(value, { stream: true }))
    }
  } finally {
    reader.releaseLock()
  }

  return fullText
}
