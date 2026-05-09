/**
 * Storage Provider 注册表
 *
 * 统一管理所有 Provider 的创建函数，提供类型安全的工厂方法
 */

import { createAliyun } from './aliyun-oss'
import { createTencent } from './tencent-cos'
import { createLocal } from './local'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { AliyunOssConfig, TencentCosConfig, LocalStorageConfig } from '@/lib/storage/types/config'

/**
 * 根据 Provider 类型创建实例（函数重载）
 */
export function createProvider(
  providerType: 'aliyun_oss',
  config: Omit<AliyunOssConfig, 'provider'>
): ObjectStorageProvider

export function createProvider(
  providerType: 'tencent_cos',
  config: Omit<TencentCosConfig, 'provider'>
): ObjectStorageProvider

export function createProvider(
  providerType: 'local',
  config: Omit<LocalStorageConfig, 'provider'>
): ObjectStorageProvider

export function createProvider(
  providerType: 'aliyun_oss' | 'tencent_cos' | 'local',
  config: Omit<AliyunOssConfig, 'provider'> | Omit<TencentCosConfig, 'provider'> | Omit<LocalStorageConfig, 'provider'>
): ObjectStorageProvider {
  switch (providerType) {
    case 'aliyun_oss':
      return createAliyun({
        provider: 'aliyun_oss',
        ...config,
      } as AliyunOssConfig)
    case 'tencent_cos':
      return createTencent({
        provider: 'tencent_cos',
        ...config,
      } as TencentCosConfig)
    case 'local':
      return createLocal({
        provider: 'local',
        ...config,
      } as LocalStorageConfig)
  }
}

// 导出所有 Provider 创建函数，供外部直接使用
export { createAliyun } from './aliyun-oss'
export { createTencent } from './tencent-cos'
export { createLocal } from './local'
