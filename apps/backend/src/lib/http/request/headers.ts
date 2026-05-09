import type { NextRequest } from 'next/server'
import { extractClientIpSafe } from '../ip-extractor'

/**
 * Module: headers
 *
 * Description: HTTP 请求头处理
 *
 * 提供请求头的提取和验证功能
 */

// ==================== TraceId ====================

/** TraceId 请求头名称 */
export const TRACE_ID_HEADER = 'x-trace-id' as const

/**
 * Function: generateTraceId
 *
 * Description: 生成新的 traceId（用于请求链路追踪）
 *
 * Parameters: 无
 *
 * Returns:
 *     traceId(string): 新生成的 traceId
 */
export function generateTraceId(): string {
  return crypto.randomUUID()
}

/**
 * Function: isValidTraceId
 *
 * Description: 校验 traceId 字符串是否符合允许格式（避免日志注入与异常值传播）
 *
 * Parameters:
 *     value(string): 待校验的 traceId
 *
 * Returns:
 *     ok(boolean): 是否合法
 */
export function isValidTraceId(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  // 兼容 UUID（默认生成）以及"短链路 id"（字母/数字/下划线/中划线）
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true
  return /^[A-Za-z0-9_-]{8,64}$/.test(trimmed)
}

/**
 * Function: normalizeTraceId
 *
 * Description: 从输入中提取合法 traceId；若缺失或非法则自动生成
 *
 * Parameters:
 *     input(string | null | undefined): 原始 traceId 输入
 *
 * Returns:
 *     traceId(string): 可用的 traceId
 */
export function normalizeTraceId(input: string | null | undefined): string {
  if (typeof input !== 'string') return generateTraceId()
  const value = input.trim()
  if (!value) return generateTraceId()
  return isValidTraceId(value) ? value : generateTraceId()
}

/**
 * Function: extractTraceId
 *
 * Description: 从请求中提取 traceId，若缺失则生成新的
 *
 * Parameters:
 *     headers(Headers): HTTP 请求头
 *
 * Returns:
 *     traceId(string): 可用的 traceId
 */
export function extractTraceId(headers: Headers): string {
  return normalizeTraceId(headers.get(TRACE_ID_HEADER))
}

/**
 * Function: extractTraceIdFromRequest
 *
 * Description: 从 NextRequest 中提取 traceId
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *     traceId(string): 可用的 traceId
 */
export function extractTraceIdFromRequest(req: NextRequest): string {
  return extractTraceId(req.headers)
}

// ==================== Idempotency Key ====================

/** 幂等键请求头名称 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key' as const

function normalizeIdempotencyKey(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > 200) return null
  return trimmed
}

/**
 * Function: extractIdempotencyKey
 *
 * Description: 从请求头中提取并规范化 Idempotency-Key（为空/过长返回 null）
 *
 * Parameters:
 *     headers(Headers): HTTP 请求头
 *
 * Returns:
 *     key(string | null): 幂等键（合法时返回，否则为 null）
 */
export function extractIdempotencyKey(headers: Headers): string | null {
  return normalizeIdempotencyKey(headers.get(IDEMPOTENCY_KEY_HEADER))
}

/**
 * Function: extractIdempotencyKeyFromRequest
 *
 * Description: 从 NextRequest 中提取 Idempotency-Key
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *
 * Returns:
 *     key(string | null): 幂等键（合法时返回，否则为 null）
 */
export function extractIdempotencyKeyFromRequest(req: NextRequest): string | null {
  return extractIdempotencyKey(req.headers)
}

// ==================== Client IP ====================

/**
 * Function: extractClientIp
 *
 * Description: 从请求头中解析客户端 IP，使用安全的 extractClientIpSafe 方法
 *
 * Parameters:
 *     req(NextRequest): Next.js 的请求对象
 *
 * Returns:
 *     ip(string): 解析得到的客户端 IP，若无法解析则返回 'unknown'
 */
export function extractClientIp(req: NextRequest): string {
  return extractClientIpSafe(req).ip || 'unknown'
}
