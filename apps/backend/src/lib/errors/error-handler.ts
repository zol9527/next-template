/**
 * File: src/lib/errors/error-handler.ts
 * Description: 错误处理模块，将任意错误转换为统一的 API 错误响应格式
 */

import { z } from 'zod'
import type { ApiErrorCode } from '@/contracts/api-response.schema'
import { ERROR_META } from '@/contracts/api-response.schema'
import { AppError } from './app-error'

/**
 * Interface: ApiErrorResponse
 *
 * Description: API 错误响应格式
 *
 * Properties:
 *     status(number): HTTP 状态码
 *     code(ApiErrorCode): 错误码
 *     message(string): 错误消息
 */
export interface ApiErrorResponse {
  status: number
  code: ApiErrorCode
  message: string
}

/**
 * Function: useApiError
 *
 * Description: 将任意错误转换为统一的 API 错误响应格式
 *              命名为 useApiError 以提供类似 Hook 的语义化调用体验
 *
 * Parameters:
 *     error(unknown): 捕获的未知错误
 *
 * Returns:
 *     ApiErrorResponse: 标准化的 API 错误响应
 *
 * Example:
 *     catch (error: unknown) {
 *       const { status, code, message } = useApiError(error)
 *     }
 */
export function useApiError(error: unknown): ApiErrorResponse {
  // 优先处理 AppError 及其子类（应用自定义错误）
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code as ApiErrorCode,
      message: error.message,
    }
  }

  // Zod 验证错误
  if (error instanceof z.ZodError) {
    const cfg = ERROR_META.INVALID_INPUT

    // 测试环境下输出更具体的校验失败信息，便于 E2E/集成测试定位问题
    const isTest = process.env.E2E_ALLOW_INTERNAL_TEST_ROUTES === 'true'
    const firstIssue = error.issues[0]
    const detailedMessage = firstIssue
      ? `${firstIssue.path.join('.') || '(root)'}: ${firstIssue.message}`
      : cfg.message

    return {
      status: cfg.status,
      code: 'INVALID_INPUT',
      message: isTest ? detailedMessage : cfg.message,
    }
  }

  // JSON 解析错误
  if (error instanceof SyntaxError) {
    const cfg = ERROR_META.INVALID_INPUT
    return {
      status: cfg.status,
      code: 'INVALID_INPUT',
      message: cfg.message,
    }
  }

  // 标准错误对象（包含 code 字段）
  if (error instanceof Error) {
    const e = error as Error & { code?: string; status?: number }

    // JWT 过期 / 无效：jose 会抛出 JWTExpired / JWTInvalid 等错误
    // 这些错误默认没有落到 AppError，需在这里兜底映射为 401
    if (
      e.name === 'JWTExpired' ||
      e.name === 'JWTInvalid' ||
      e.code === 'ERR_JWT_EXPIRED' ||
      e.code === 'ERR_JWT_INVALID'
    ) {
      const cfg = ERROR_META.UNAUTHORIZED
      return {
        status: cfg.status,
        code: 'UNAUTHORIZED',
        message: '登录已过期，请重新登录',
      }
    }

    // 尝试提取 ApiErrorCode
    const code = typeof e.code === 'string' && e.code in ERROR_META
      ? (e.code as ApiErrorCode)
      : undefined

    if (code) {
      const cfg = ERROR_META[code]
      return {
        status: e.status ?? cfg.status,
        code,
        message: e.message || cfg.message,
      }
    }

    // 领域错误码映射
    if (e.code === 'INVALID_STATE') {
      const cfg = ERROR_META.CONFLICT
      return {
        status: cfg.status,
        code: 'CONFLICT',
        message: cfg.message,
      }
    }
  }

  // 默认内部错误
  const cfg = ERROR_META.INTERNAL_ERROR
  return {
    status: cfg.status,
    code: 'INTERNAL_ERROR',
    message: cfg.message,
  }
}
