/**
 * Structured Output — LLM 结构化输出解析器
 *
 * Description: 从 LLM 生成文本中提取结构化 JSON 数据
 *   支持多种格式：纯 JSON、Markdown code block 包裹
 *   最多 2 次重试（总共 3 次尝试），第 3 次失败返回原始文本
 */

import { z } from 'zod'

// ==================== 类型定义 ====================

/** 结构化输出解析结果 */
export interface StructuredOutputResult<T> {
  /** 是否解析成功 */
  success: boolean
  /** 解析后的结构化数据（成功时存在） */
  data?: T
  /** 错误标识码（失败时存在） */
  error?: 'STRUCTURED_OUTPUT_FAILED'
  /** 原始 LLM 文本（失败时存在，用于调试） */
  rawText?: string
}

// ==================== JSON 提取 ====================

/**
 * Function: extractJSON
 *
 * Description: 从 LLM 生成文本中提取 JSON 字符串
 *   按优先级依次尝试：markdown code block → JSON 对象 → JSON 数组
 *
 * Parameters:
 *   text(string): LLM 生成的原始文本
 *
 * Returns:
 *   json(string | null): 提取到的 JSON 字符串，未找到返回 null
 */
export function extractJSON(text: string): string | null {
  // 1. 尝试提取 markdown code block 中的 JSON（```json ... ``` 或 ``` ... ```）
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 2. 尝试提取 {} 包裹的 JSON 对象（贪婪匹配最外层大括号）
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    return jsonObjectMatch[0]
  }

  // 3. 尝试提取 [] 包裹的 JSON 数组
  const jsonArrayMatch = text.match(/\[[\s\S]*\]/)
  if (jsonArrayMatch) {
    return jsonArrayMatch[0]
  }

  return null
}

// ==================== 结构化解析 ====================

/** 最大尝试次数（初始 1 次 + 重试 2 次） */
const MAX_ATTEMPTS = 3

/**
 * Function: parseStructuredOutput
 *
 * Description: 解析 LLM 文本为结构化 JSON，支持 Zod schema 验证
 *   解析失败时调用 regenerate 获取新文本重试
 *   第 3 次失败返回 { success: false, error: 'STRUCTURED_OUTPUT_FAILED', rawText }
 *
 * Parameters:
 *   text(string): LLM 生成的文本
 *   schema(ZodSchema<T> | undefined): 可选的 Zod schema 校验
 *   regenerate(() => Promise<string> | undefined): 重试时重新生成文本的函数
 *
 * Returns:
 *   result(StructuredOutputResult<T>): 解析结果
 */
export async function parseStructuredOutput<T = unknown>(
  text: string,
  schema?: z.ZodSchema<T>,
  regenerate?: () => Promise<string>,
): Promise<StructuredOutputResult<T>> {
  let currentText = text

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const jsonStr = extractJSON(currentText)

    // 提取 JSON 失败
    if (!jsonStr) {
      if (attempt < MAX_ATTEMPTS - 1 && regenerate) {
        currentText = await regenerate()
        continue
      }
      return { success: false, error: 'STRUCTURED_OUTPUT_FAILED', rawText: currentText }
    }

    // JSON.parse + 可选 schema 校验
    try {
      const parsed = JSON.parse(jsonStr)

      if (schema) {
        const validated = schema.parse(parsed)
        return { success: true, data: validated }
      }

      return { success: true, data: parsed as T }
    } catch {
      // JSON 解析或 schema 校验失败，重试
      if (attempt < MAX_ATTEMPTS - 1 && regenerate) {
        currentText = await regenerate()
        continue
      }

      return { success: false, error: 'STRUCTURED_OUTPUT_FAILED', rawText: currentText }
    }
  }

  // 兜底（理论上不会走到这里）
  return { success: false, error: 'STRUCTURED_OUTPUT_FAILED', rawText: currentText }
}
