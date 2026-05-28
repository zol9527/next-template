/**
 * File: parse-response.ts
 * Description: 通用 API 响应解析工具函数
 *              从多个组件中提取的共享逻辑，统一处理 API 响应格式校验和错误处理
 */

import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Function: parseApiResponse
 *
 * Description: 解析统一 API 响应格式，可选使用 Zod schema 校验 data 字段。
 *              所有 admin 前端组件应使用此函数处理 fetch 响应，
 *              以确保统一的错误处理和数据校验。
 *
 * Parameters:
 *   response(Response): fetch 返回的 Response 对象
 *   schema(object): 可选的 Zod schema，用于校验 json.data 的格式
 *
 * Returns:
 *   data(T): 校验通过后的响应数据
 *
 * Throws:
 *   Error: 当 HTTP 状态码非 2xx、success 为 false、或 schema 校验失败时
 */
export async function parseApiResponse<T>(
  response: Response,
  schema?: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } },
): Promise<T> {
  const json = (await response.json()) as ApiResponse<unknown>

  // 检查 HTTP 状态码
  if (!response.ok) {
    throw new Error(json.success === false ? json.error.message : response.statusText)
  }

  // 检查业务状态码
  if (!json.success) {
    throw new Error(json.error.message)
  }

  // 无 schema 时直接返回 data
  if (!schema) {
    return json.data as T
  }

  // 使用 schema 校验数据格式
  const parsed = schema.safeParse(json.data)
  if (!parsed.success) {
    throw new Error('响应数据格式不符合预期')
  }

  return parsed.data
}
