/**
 * Storage Provider 配置类型定义
 *
 * 职责：定义各 Provider 的初始化配置选项
 */

/**
 * 基础配置类型
 */
export interface StorageProviderConfig {
  /** 存储提供商类型 */
  provider: 'aliyun_oss' | 'tencent_cos' | 'local'
  /** 签名 URL 过期时间（秒） */
  signedUrlTtlSeconds?: number
}

/**
 * 阿里云 OSS 配置选项
 */
export interface AliyunOssConfig extends StorageProviderConfig {
  provider: 'aliyun_oss'
  /** Access Key ID */
  accessKeyId: string
  /** Access Key Secret */
  accessKeySecret: string
  /** Bucket 名称 */
  bucket: string
  /** Region，如 oss-cn-hangzhou 或 cn-hangzhou */
  region: string
  /** 自定义 endpoint（可选，如 oss-cn-hangzhou.aliyuncs.com） */
  endpoint: string
  /** 是否使用 HTTPS */
  secure?: boolean
  /** 上传目录前缀 */
  dirPrefix?: string
  /** 策略过期时间（秒） */
  ttlSeconds?: number
}

/**
 * 腾讯云 COS 配置选项
 */
export interface TencentCosConfig extends StorageProviderConfig {
  provider: 'tencent_cos'
  /** Secret ID */
  secretId: string
  /** Secret Key */
  secretKey: string
  /** Bucket 名称 */
  bucket: string
  /** Region，如 ap-guangzhou */
  region: string
  /** CDN 域名（可选） */
  cdnHost?: string
  /** 上传目录前缀 */
  dirPrefix?: string
}

/**
 * 本地存储配置选项
 */
export interface LocalStorageConfig extends StorageProviderConfig {
  provider: 'local'
  /** 上传目录路径 */
  uploadDir?: string
  /** 访问主机地址 */
  uploadHost?: string
  /** 目录前缀（用于生成 objectKey） */
  dirPrefix?: string
}

/** 所有 Provider 配置的联合类型 */
export type StorageConfig =
  | AliyunOssConfig
  | TencentCosConfig
  | LocalStorageConfig
