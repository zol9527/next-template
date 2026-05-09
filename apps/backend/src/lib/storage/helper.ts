/**
 * Storage Provider 辅助函数
 *
 * 提供从环境变量创建 Provider 实例的便捷方法
 * 使用单例模式缓存实例，避免重复创建
 */

import { createStorage } from './factory'
import { env } from '@/config/env.mjs'
import type { ObjectStorageProvider } from './types'

/**
 * 单例缓存
 * 在模块生命周期内保持，避免重复创建 provider 实例
 */
let cachedProvider: ObjectStorageProvider | null = null
let cachedProviderType: string | null = null

/**
 * 根据类型创建 Provider 实例
 *
 * @param providerType - Provider 类型
 * @returns ObjectStorageProvider 实例
 * @throws {Error} 当 provider 类型不支持时抛出错误
 */
function createProviderByType(providerType: string): ObjectStorageProvider {
  switch (providerType) {
    case 'aliyun_oss': {
      return createStorage({
        provider: 'aliyun_oss',
        accessKeyId: env.ALIYUN_OSS_ACCESS_KEY_ID ?? '',
        accessKeySecret: env.ALIYUN_OSS_ACCESS_KEY_SECRET ?? '',
        bucket: env.ALIYUN_OSS_BUCKET ?? '',
        region: env.ALIYUN_OSS_REGION ?? 'cn-hangzhou',
        endpoint: env.ALIYUN_OSS_UPLOAD_HOST ?? '',
        dirPrefix: env.ALIYUN_OSS_DIR_PREFIX,
        ttlSeconds: env.ALIYUN_OSS_POLICY_TTL_SECONDS,
        signedUrlTtlSeconds: env.OSS_SIGNED_URL_TTL_SECONDS,
      })
    }
    case 'tencent_cos':
      return createStorage({
        provider: 'tencent_cos',
        secretId: env.TENCENT_COS_SECRET_ID ?? '',
        secretKey: env.TENCENT_COS_SECRET_KEY ?? '',
        bucket: env.TENCENT_COS_BUCKET ?? '',
        region: env.TENCENT_COS_REGION ?? '',
        cdnHost: env.TENCENT_COS_CDN_HOST,
        signedUrlTtlSeconds: env.OSS_SIGNED_URL_TTL_SECONDS,
      })
    case 'local':
      return createStorage({
        provider: 'local',
        uploadDir: env.LOCAL_UPLOAD_DIR,
        uploadHost: env.LOCAL_UPLOAD_HOST,
      })
    default:
      throw new Error(`Unsupported OSS provider: ${providerType}`)
  }
}

/**
 * 获取当前配置的 Storage Provider 实例（单例模式）
 *
 * 根据环境变量 OSS_PROVIDER 自动选择并创建对应的 Provider
 * 使用单例模式缓存实例，避免重复创建 OSS 客户端
 *
 * @returns ObjectStorageProvider 实例
 *
 * @example
 * ```ts
 * // 第一次调用：创建实例
 * const provider1 = getStorageProvider()
 *
 * // 第二次调用：返回缓存的实例（同一个引用）
 * const provider2 = getStorageProvider()
 * console.log(provider1 === provider2) // true
 * ```
 */
export function getStorageProvider(): ObjectStorageProvider {
  const providerType = env.OSS_PROVIDER

  // 如果已缓存且 provider 类型未变，返回缓存的实例
  if (cachedProvider && cachedProviderType === providerType) {
    return cachedProvider
  }

  // 创建新实例并缓存
  const provider = createProviderByType(providerType)
  cachedProvider = provider
  cachedProviderType = providerType

  return provider
}

/**
 * 重置缓存的 Storage Provider 实例
 *
 * @remarks
 * 主要用于测试场景，在测试间重置状态
 * 生产环境一般不需要调用此函数
 *
 * @example
 * ```ts
 * import { resetStorageProviderCache } from '@/lib/storage/helper'
 *
 * afterEach(() => {
 *   resetStorageProviderCache()
 * })
 * ```
 */
export function resetStorageProviderCache(): void {
  cachedProvider = null
  cachedProviderType = null
}
