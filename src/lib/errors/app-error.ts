/**
 * File: src/lib/errors/app-error.ts
 * Description: 统一的应用错误类体系，所有自定义错误都应继承此类
 */

/**
 * Class: AppError
 *
 * Description: 应用错误基类，包含 status、code、message
 *              可在任何层（API/Service/Repository）抛出，route handler 自动处理
 *
 * Properties:
 *     status(number): HTTP 状态码
 *     code(string): 错误码（对应 ApiErrorCode）
 *     message(string): 错误消息
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Class: UnauthorizedError
 *
 * Description: 认证错误 (401)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Unauthorized"
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Class: ForbiddenError
 *
 * Description: 权限错误 (403)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Forbidden"
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Class: NotFoundError
 *
 * Description: 资源未找到错误 (404)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Resource not found"
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message)
    this.name = 'NotFoundError'
  }
}

/**
 * Class: ValidationError
 *
 * Description: 验证错误 (400)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Validation failed"
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(400, 'VALIDATION_ERROR', message)
    this.name = 'ValidationError'
  }
}

/**
 * Class: ConflictError
 *
 * Description: 冲突错误 (409)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Resource conflict"
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, 'CONFLICT', message)
    this.name = 'ConflictError'
  }
}

// ==================== MFA 相关错误类 ====================

/**
 * Class: MfaRequiredError
 *
 * Description: 需要 MFA 验证 (403)
 *
 * Properties:
 *     message(string): 错误消息，默认 "MFA verification required"
 */
export class MfaRequiredError extends AppError {
  constructor(message: string = 'MFA verification required') {
    super(403, 'MFA_REQUIRED', message)
    this.name = 'MfaRequiredError'
  }
}

/**
 * Class: MfaNotEnabledError
 *
 * Description: MFA 未启用 (403)
 *
 * Properties:
 *     message(string): 错误消息，默认 "MFA is not enabled"
 */
export class MfaNotEnabledError extends AppError {
  constructor(message: string = 'MFA is not enabled') {
    super(403, 'MFA_NOT_ENABLED', message)
    this.name = 'MfaNotEnabledError'
  }
}

/**
 * Class: InvalidMfaTokenError
 *
 * Description: 无效的 MFA 验证码 (401)
 *
 * Properties:
 *     message(string): 错误消息，默认 "Invalid MFA token"
 */
export class InvalidMfaTokenError extends AppError {
  constructor(message: string = 'Invalid MFA token') {
    super(401, 'INVALID_MFA_TOKEN', message)
    this.name = 'InvalidMfaTokenError'
  }
}
