/**
 * Storage 模块统一导出
 *
 * 使用方式：
 * ```ts
 * import { createStorage, ObjectStorageProvider } from '@/lib/storage'
 * ```
 */

// 工厂函数
export { createStorage } from './factory'

// 类型
export * from './types'

// Schema
export * from './schema'

// DTO
export * from './dto'

// Provider 创建函数
export { createAliyun, createTencent, createLocal } from './providers'
