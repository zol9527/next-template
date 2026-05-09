/**
 * Storage Provider 接口定义
 *
 * 职责：定义所有 Storage Provider 必须实现的方法
 */

import type {
  UploadPolicyRequest,
  UploadPolicyResponse,
  ListFilesRequest,
  ListFilesResponse,
  SearchFilesRequest,
  SearchFilesResponse,
} from '@/lib/storage/schema'
import type { Readable } from 'node:stream'
import type {
  ImageProcessingOptions,
  ImageProcessingResult,
} from '@/lib/storage/types/image-processing'

/**
 * 文件上传参数
 */
export interface UploadFileParams {
  /** 文件内容（Buffer） */
  file: Buffer
  /** 对象键（存储路径） */
  key: string
  /** 内容类型（MIME） */
  contentType: string
}

/**
 * 文件上传结果
 */
export interface UploadFileResult {
  /** 文件访问 URL */
  url: string
  /** 对象键（存储路径） */
  key: string
}

/**
 * 对象存储提供者接口
 *
 * 所有 OSS 提供者（阿里云、腾讯云、本地）必须实现此接口
 */
export interface ObjectStorageProvider {
  /**
   * 获取上传策略（用于客户端直传）
   */
  issueUploadPolicy(params: UploadPolicyRequest): Promise<UploadPolicyResponse>

  /**
   * 服务端上传文件
   */
  uploadFile(params: UploadFileParams): Promise<UploadFileResult>

  /**
   * 删除文件
   */
  deleteFile(key: string): Promise<void>

  /**
   * 获取文件访问 URL（公共 URL 或永久 URL）
   */
  getFileUrl(key: string): Promise<string>

  /**
   * 获取签名 URL（用于私有 Bucket 访问，带过期时间）
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>

  /**
   * 列出文件
   */
  listFiles(params: ListFilesRequest): Promise<ListFilesResponse>

  /**
   * 搜索文件
   */
  searchFiles(params: SearchFilesRequest): Promise<SearchFilesResponse>

  /**
   * 下载文件，返回完整 Buffer
   */
  downloadFile(key: string): Promise<Buffer>

  /**
   * 下载文件，返回流式 Readable
   */
  downloadFileStream(key: string): Promise<Readable>

  /**
   * 获取带图片处理参数的签名 URL
   *
   * @param key - 对象键
   * @param options - 图片处理选项
   * @param expiresIn - URL 过期时间（秒），默认 3600
   * @returns 带图片处理参数的签名 URL
   *
   * @example
   * ```ts
   * // 获取缩略图 URL（WebP 格式，质量 85%）
   * const url = await provider.getImageProcessingUrl('product.jpg', {
   *   size: 'thumbnail',
   *   format: 'webp',
   *   quality: 85
   * })
   * ```
   */
  getImageProcessingUrl(
    key: string,
    options: ImageProcessingOptions,
    expiresIn?: number
  ): Promise<string>

  /**
   * 获取多个尺寸的图片 URL（用于响应式图片）
   *
   * @param key - 对象键
   * @param sizes - 尺寸配置数组
   * @param expiresIn - URL 过期时间（秒），默认 3600
   * @returns 图片处理结果数组
   *
   * @example
   * ```ts
   * const results = await provider.getImageProcessingUrls('product.jpg', [
   *   { size: 'thumbnail', format: 'webp' },
   *   { size: 'medium', format: 'webp' }
   * ])
   * ```
   */
  getImageProcessingUrls(
    key: string,
    sizes: ImageProcessingOptions[],
    expiresIn?: number
  ): Promise<ImageProcessingResult[]>
}
