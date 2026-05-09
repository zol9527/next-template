/**
 * File: test/unit/lib/ai/structured-output.test.ts
 * Description: 结构化输出解析器单元测试
 *   测试 JSON 提取（Markdown code block、纯文本）、Zod schema 验证、重试机制
 */

import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { extractJSON, parseStructuredOutput } from '@/lib/ai/core/structured-output'

// ==================== extractJSON ====================

describe('Unit: extractJSON', () => {
  describe('Markdown 代码块提取', () => {
    it('应从 ```json 代码块中提取 JSON', () => {
      const text = '结果如下：\n```json\n{"name": "test", "value": 42}\n```\n完毕'

      const result = extractJSON(text)

      expect(result).toBe('{"name": "test", "value": 42}')
    })

    it('应从 ``` 代码块（无语言标记）中提取 JSON', () => {
      const text = '```\n{"key": "val"}\n```'

      const result = extractJSON(text)

      expect(result).toBe('{"key": "val"}')
    })

    it('应从 ```json 代码块中提取嵌套 JSON', () => {
      const text = '```json\n{"outer": {"inner": [1, 2, 3]}}\n```'

      const result = extractJSON(text)

      expect(result).toBe('{"outer": {"inner": [1, 2, 3]}}')
    })
  })

  describe('纯文本 JSON 提取', () => {
    it('应从纯文本中提取 JSON 对象', () => {
      const text = 'Here is the result: {"status": "ok", "count": 5} end'

      const result = extractJSON(text)

      expect(result).toBe('{"status": "ok", "count": 5}')
    })

    it('应从纯文本中提取 JSON 数组', () => {
      const text = '列表如下：[1, 2, 3, 4, 5] 结束'

      const result = extractJSON(text)

      expect(result).toBe('[1, 2, 3, 4, 5]')
    })

    it('应从混合文本中提取嵌套 JSON', () => {
      const text = '输出：{"user": {"name": "张三", "tags": ["a", "b"]}} 完成'

      const result = extractJSON(text)

      expect(result).toBe('{"user": {"name": "张三", "tags": ["a", "b"]}}')
    })
  })

  describe('无 JSON 场景', () => {
    it('纯文本无 JSON 时应返回 null', () => {
      const text = '这是一段普通文本，没有任何 JSON 数据'

      const result = extractJSON(text)

      expect(result).toBeNull()
    })

    it('空字符串应返回 null', () => {
      const result = extractJSON('')

      expect(result).toBeNull()
    })
  })

  describe('优先级', () => {
    it('Markdown code block 优先于纯文本中的 JSON', () => {
      const text = '这里有 {"a": 1} 然后 ```json\n{"b": 2}\n``` 还有 {"c": 3}'

      const result = extractJSON(text)

      // code block 优先
      expect(result).toBe('{"b": 2}')
    })
  })
})

// ==================== parseStructuredOutput ====================

describe('Unit: parseStructuredOutput', () => {
  const simpleSchema = z.object({
    name: z.string(),
    age: z.number(),
  })

  describe('基本解析', () => {
    it('应解析纯 JSON 文本并返回数据', async () => {
      const text = '{"name": "Alice", "age": 30}'

      const result = await parseStructuredOutput(text)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'Alice', age: 30 })
    })

    it('应解析 Markdown 包裹的 JSON', async () => {
      const text = '```json\n{"name": "Bob", "age": 25}\n```'

      const result = await parseStructuredOutput(text)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'Bob', age: 25 })
    })

    it('无 JSON 时应返回失败结果', async () => {
      const text = '这是一段不含 JSON 的文本'

      const result = await parseStructuredOutput(text)

      expect(result.success).toBe(false)
      expect(result.error).toBe('STRUCTURED_OUTPUT_FAILED')
      expect(result.rawText).toBe(text)
    })
  })

  describe('Zod schema 验证', () => {
    it('应使用 Zod schema 验证有效数据', async () => {
      const text = '{"name": "Charlie", "age": 28}'

      const result = await parseStructuredOutput(text, simpleSchema)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'Charlie', age: 28 })
    })

    it('无效 JSON 结构应返回错误（schema 校验失败）', async () => {
      // age 是字符串，不符合 number schema
      const text = '{"name": "Charlie", "age": "not-a-number"}'

      const result = await parseStructuredOutput(text, simpleSchema)

      expect(result.success).toBe(false)
      expect(result.error).toBe('STRUCTURED_OUTPUT_FAILED')
    })

    it('缺少必填字段应返回错误', async () => {
      const text = '{"name": "Dave"}'

      const result = await parseStructuredOutput(text, simpleSchema)

      expect(result.success).toBe(false)
      expect(result.error).toBe('STRUCTURED_OUTPUT_FAILED')
    })

    it('无 schema 时应跳过验证直接返回解析数据', async () => {
      const text = '{"anything": "goes", "number": 42}'

      const result = await parseStructuredOutput(text)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ anything: 'goes', number: 42 })
    })
  })

  describe('重试机制', () => {
    it('首次失败时应调用 regenerate 重试', async () => {
      const badText = 'no json here'
      const goodText = '{"name": "Retry", "age": 1}'
      const regenerate = vi.fn().mockResolvedValue(goodText)

      const result = await parseStructuredOutput(badText, simpleSchema, regenerate)

      expect(regenerate).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'Retry', age: 1 })
    })

    it('连续失败 3 次后应返回失败结果', async () => {
      const badText = 'still no json'
      const regenerate = vi.fn().mockResolvedValue(badText)

      const result = await parseStructuredOutput(badText, undefined, regenerate)

      // 初始 1 次 + 重试 2 次 = regenerate 调用 2 次
      expect(regenerate).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(false)
      expect(result.error).toBe('STRUCTURED_OUTPUT_FAILED')
    })

    it('无 regenerate 函数时不应重试', async () => {
      const badText = 'no json at all'

      const result = await parseStructuredOutput(badText)

      expect(result.success).toBe(false)
      expect(result.error).toBe('STRUCTURED_OUTPUT_FAILED')
    })
  })
})
