/**
 * File: test/unit/lib/ai/sse-parser.test.ts
 * Description: SSE 解析器单元测试
 *   测试 SSE 帧解析、分片缓冲、事件类型分发、注释行忽略等场景
 */

import { describe, it, expect, vi } from 'vitest'
import { SSEParser } from '@/lib/ai/core/sse-parser'

describe('Unit: SSEParser', () => {
  // ==================== 基本帧解析 ====================

  describe('基本帧解析', () => {
    it('应解析 data: {...}\\n\\n 格式的 SSE 事件', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('data: {"content":"hello"}\n\n')

      expect(deltas).toEqual(['{"content":"hello"}'])
    })

    it('应解析多个连续 SSE 事件', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('data: first\n\ndata: second\n\ndata: third\n\n')

      expect(deltas).toEqual(['first', 'second', 'third'])
    })

    it('应解析多行 SSE 事件', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      // 多行 data 会用最后一个 data 行的值
      parser.feed('data: line1\ndata: line2\n\n')

      expect(deltas).toEqual(['line2'])
    })
  })

  // ==================== 事件类型 ====================

  describe('事件类型', () => {
    it('应解析带 event: 类型的 SSE 帧', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('event: message\ndata: {"role":"assistant"}\n\n')

      expect(deltas).toEqual(['{"role":"assistant"}'])
    })

    it('应在收到 [DONE] 信号时触发 onDone 回调', () => {
      const onDone = vi.fn()
      const parser = new SSEParser({
        onDelta: vi.fn(),
        onDone,
        onError: vi.fn(),
      })

      parser.feed('data: [DONE]\n\n')

      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('应在收到 error 事件类型时触发 onError 回调', () => {
      const onError = vi.fn()
      const parser = new SSEParser({
        onDelta: vi.fn(),
        onDone: vi.fn(),
        onError,
      })

      parser.feed('event: error\ndata: rate limit exceeded\n\n')

      expect(onError).toHaveBeenCalledWith('rate limit exceeded')
    })

    it('正常数据帧不应触发 onDone 或 onError', () => {
      const onDone = vi.fn()
      const onError = vi.fn()
      const parser = new SSEParser({
        onDelta: vi.fn(),
        onDone,
        onError,
      })

      parser.feed('data: normal content\n\n')

      expect(onDone).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })

  // ==================== 注释行和特殊处理 ====================

  describe('注释行和特殊处理', () => {
    it('应忽略以 : 开头的注释行', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed(': this is a comment\ndata: actual data\n\n')

      expect(deltas).toEqual(['actual data'])
    })

    it('应忽略空数据帧（无 data 行）', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('event: ping\n\n')

      expect(deltas).toEqual([])
    })
  })

  // ==================== 分片缓冲 ====================

  describe('分片缓冲', () => {
    it('应处理不完整的数据（分片拼接）', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      // 第一个分片不完整
      parser.feed('data: hel')
      expect(deltas).toEqual([])

      // 第二个分片补全帧
      parser.feed('lo\n\n')
      expect(deltas).toEqual(['hello'])
    })

    it('应处理跨多个分片的大型帧', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('data: part1')
      parser.feed('_part2')
      parser.feed('_part3\n\n')

      expect(deltas).toEqual(['part1_part2_part3'])
    })

    it('应正确处理空字符串输入', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      parser.feed('')

      expect(deltas).toEqual([])
    })
  })

  // ==================== reset ====================

  describe('reset', () => {
    it('应清空缓冲区中未处理的数据', () => {
      const deltas: string[] = []
      const parser = new SSEParser({
        onDelta: (data) => deltas.push(data),
        onDone: vi.fn(),
        onError: vi.fn(),
      })

      // 写入不完整帧
      parser.feed('data: incomplete')
      expect(deltas).toEqual([])

      // 重置后缓冲区清空
      parser.reset()

      // 新的完整帧应正常解析
      parser.feed('data: new-frame\n\n')
      expect(deltas).toEqual(['new-frame'])
    })
  })
})
