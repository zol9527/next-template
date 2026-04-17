/**
 * Storage 模块工厂函数
 *
 * 提供统一的 Provider 创建接口，支持多种存储后端
 */

import type { StorageConfig } from '@/lib/storage/types/config'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import { createAliyun } from './providers/aliyun-oss'
import { createTencent } from './providers/tencent-cos'
import { createLocal } from './providers/local'

/**
 * 创建 Storage Provider 实例
 *
 * @param config - 配置选项（包含 provider 类型）
 * @returns ObjectStorageProvider 实例
 *
 * @example
 * ```ts
 * // 阿里云 OSS
 * const storage = createStorage({
 *   provider: 'aliyun_oss',
 *   accessKeyId: 'xxx',
 *   accessKeySecret: 'xxx',
 *   bucket: 'my-bucket',
 *   region: 'cn-hangzhou',
 * })
 *
 * // 腾讯云 COS
 * const storage = createStorage({
 *   provider: 'tencent_cos',
 *   secretId: 'xxx',
 *   secretKey: 'xxx',
 *   bucket: 'my-bucket',
 *   region: 'ap-guangzhou',
 * })
 *
 * // 本地存储
 * const storage = createStorage({
 *   provider: 'local',
 *   uploadDir: './uploads',
 * })
 * ```
 */
export function createStorage(config: StorageConfig): ObjectStorageProvider {
  switch (config.provider) {
    case 'aliyun_oss':
      return createAliyun(config)
    case 'tencent_cos':
      return createTencent(config)
    case 'local':
      return createLocal(config)
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = config
      throw new Error(`Unknown provider: ${_exhaustive}`)
  }
}
