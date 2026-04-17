import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============ Zod Schema ============

export const ApiErrorCodeSchema = z
  .enum([
    'INVALID_INPUT', // 无效输入
    'UNAUTHORIZED', // 未授权
    'FORBIDDEN', // 禁止访问
    'CONFLICT', // 冲突
    'IDEMPOTENCY_CONFLICT', // 幂等冲突
    'IDEMPOTENCY_KEY_EXPIRED', // 幂等键过期
    'NOT_FOUND', // 未找到
    'INVALID_CREDENTIALS', // 无效凭证
    'ACCOUNT_DISABLED', // 账户已禁用
    'LOCKED', // 已锁定
    'SESSION_REUSE_DETECTED', // 检测到会话重用
    'TOO_MANY_REQUESTS', // 请求过多
    'MAINTENANCE_MODE', // 维护模式
    'CANNOT_DISABLE_SELF', // 不能禁用自己
    'INTERNAL_ERROR', // 内部错误
    'INVALID_CLIENT_IP', // 无效的客户端 IP
    // ==================== MFA 相关错误码 ====================
    'MFA_REQUIRED', // 需要 MFA 验证
    'MFA_NOT_ENABLED', // MFA 未启用
    'INVALID_MFA_TOKEN', // 无效的 MFA 验证码
  ])
  .openapi({ description: '统一错误码' })

export const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string().openapi({ description: '错误信息' }),
  })
  .openapi({ description: '统一错误结构' })

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      success: z.literal(true).openapi({ description: '是否成功' }),
      data: dataSchema,
    })
    .openapi({ description: '统一成功响应体' })

export const ApiFailureResponseSchema = z
  .object({
    success: z.literal(false).openapi({ description: '是否成功' }),
    error: ApiErrorSchema,
  })
  .openapi({ description: '统一失败响应体' })

// ============ TypeScript 类型定义 ============

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export type ApiError = z.infer<typeof ApiErrorSchema>

export type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type ApiFailureResponse = z.infer<typeof ApiFailureResponseSchema>

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse

// ============ 错误元数据 ============

/** 错误码到 HTTP 状态码和默认消息的映射 */
export const ERROR_META: Record<ApiErrorCode, { status: number; message: string }> = {
  INVALID_INPUT: { status: 400, message: 'Invalid input' },
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Not found' },
  CONFLICT: { status: 409, message: 'Conflict' },
  IDEMPOTENCY_CONFLICT: { status: 409, message: 'Idempotency conflict' },
  IDEMPOTENCY_KEY_EXPIRED: { status: 409, message: 'Idempotency key expired' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid credentials' },
  ACCOUNT_DISABLED: { status: 401, message: 'Account disabled' },
  LOCKED: { status: 401, message: 'Locked' },
  SESSION_REUSE_DETECTED: { status: 401, message: 'Session reuse detected' },
  TOO_MANY_REQUESTS: { status: 429, message: 'Too many requests' },
  MAINTENANCE_MODE: { status: 503, message: 'Service maintenance' },
  CANNOT_DISABLE_SELF: { status: 409, message: 'Cannot disable yourself' },
  INTERNAL_ERROR: { status: 500, message: 'Internal error' },
  INVALID_CLIENT_IP: { status: 400, message: 'Invalid client IP address' },
  // ==================== MFA 相关错误元数据 ====================
  MFA_REQUIRED: { status: 403, message: 'MFA verification required' },
  MFA_NOT_ENABLED: { status: 403, message: 'MFA is not enabled' },
  INVALID_MFA_TOKEN: { status: 401, message: 'Invalid MFA token' },
}

/**
Function: getStatusByCode

Description: 通过错误码获取 HTTP 状态码

Parameters:
    code(ApiErrorCode): 错误码

Returns:
    status(number): HTTP 状态码
*/
export function getStatusByCode(code: ApiErrorCode): number {
  return ERROR_META[code].status
}

// ============ 辅助函数 ============

/**
Function: ok

Description: 构造统一的成功响应体

Parameters:
    data(T): 成功数据

Returns:
    response(ApiSuccessResponse<T>): success=true 的响应体
*/
export function ok<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data }
}

/**
Function: fail

Description: 构造统一的失败响应体

Parameters:
    code(ApiErrorCode): 错误码
    message(string): 错误信息

Returns:
    response(ApiFailureResponse): success=false 的响应体
*/
export function fail(code: ApiErrorCode, message: string): ApiFailureResponse {
  return { success: false, error: { code, message } }
}


