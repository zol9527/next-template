/**
 * Storage 模块错误类型定义
 */

/**
 * Storage 错误代码
 */
export type StorageErrorCode =
  | 'INVALID_CONFIG'
  | 'CREDENTIALS_MISSING'
  | 'UPLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'SIGNATURE_FAILED'
  | 'FILE_NOT_FOUND'

/**
 * Storage 错误类
 */
export class StorageError extends Error {
  constructor(
    public code: StorageErrorCode,
    message: string,
    public provider?: string
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * 创建配置错误
 */
export function createConfigError(message: string): StorageError {
  const error = new StorageError('INVALID_CONFIG', message)
  return error
}

/**
 * 创建凭证缺失错误
 */
export function createCredentialsError(provider: string): StorageError {
  return new StorageError(
    'CREDENTIALS_MISSING',
    `${provider} credentials are not configured`,
    provider
  )
}
