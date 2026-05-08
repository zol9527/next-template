/**
 * 腾讯云 COS 对象存储提供者 - 基于 AWS S3 SDK
 *
 * 腾讯云 COS 兼容 S3 协议，因此可以使用 @aws-sdk/client-s3 进行操作
 * 文档: https://cloud.tencent.com/document/product/436/31995
 */

import { Readable } from 'node:stream'
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { TencentCosConfig } from '@/lib/storage/types/config'
import type { UploadPolicyRequest } from '@/lib/storage/schema'

// ============================================================
// 工具函数
// ============================================================

/**
 * 清理并规范化前缀路径
 */
function sanitizePrefix(prefix: string): string {
  const p = prefix.trim()
  if (p === '') return ''
  return p.endsWith('/') ? p : `${p}/`
}

/**
 * 根据内容类型获取文件扩展名
 */
function extensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase().trim()
  if (normalized === 'image/jpeg') return 'jpg'
  if (normalized === 'image/png') return 'png'
  if (normalized === 'image/webp') return 'webp'
  if (normalized === 'image/gif') return 'gif'
  if (normalized === 'video/mp4') return 'mp4'
  if (normalized === 'application/pdf') return 'pdf'
  return 'bin'
}

/**
 * 创建腾讯云 COS Provider
 *
 * @param options - 配置选项
 * @returns ObjectStorageProvider 实例
 * @throws {Error} 当必需参数缺失时抛出错误
 */
export function createTencent(options: TencentCosConfig): ObjectStorageProvider {
  const {
    secretId,
    secretKey,
    bucket,
    region,
    cdnHost,
    dirPrefix = 'uploads',
    signedUrlTtlSeconds = 3600,
  } = options

  // 参数验证
  if (!secretId?.trim()) {
    throw new Error('Tencent COS: secretId is required')
  }
  if (!secretKey?.trim()) {
    throw new Error('Tencent COS: secretKey is required')
  }
  if (!bucket?.trim()) {
    throw new Error('Tencent COS: bucket is required')
  }
  if (!region?.trim()) {
    throw new Error('Tencent COS: region is required (e.g., "ap-guangzhou")')
  }

  // Lazy initialization of S3 client
  let s3Client: S3Client | null = null

  /**
   * 获取或初始化 S3 客户端
   */
  const getClient = (): S3Client => {
    if (s3Client) return s3Client

    // 腾讯云 COS S3 协议 endpoint 格式
    const endpoint = `https://cos.${region}.myqcloud.com`

    const config: S3ClientConfig = {
      region,
      endpoint,
      credentials: {
        accessKeyId: secretId,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // 使用路径样式
    }

    s3Client = new S3Client(config)
    return s3Client
  }

  return {
    /**
     * 签发上传策略（预签名 PUT URL）
     */
    async issueUploadPolicy({ contentType, sizeBytes, purpose }: UploadPolicyRequest) {
      const client = getClient()

      // 构建对象键路径
      const purposePrefix = purpose ? sanitizePrefix(purpose) : ''
      const ext = extensionFromContentType(contentType)
      const objectKey = `${dirPrefix}${purposePrefix}${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

      // 过期时间：30 分钟
      const ttlSeconds = 1800
      const expireAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

      // 创建 PutObject 命令
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: sizeBytes,
      })

      // 生成预签名 URL
      const uploadUrl = await s3GetSignedUrl(client, command, {
        expiresIn: ttlSeconds,
      })

      // 构建最终文件访问 URL（优先使用 CDN）
      const fileUrl = cdnHost
        ? `${sanitizePrefix(cdnHost)}${objectKey}`
        : `https://${bucket}.cos.${region}.myqcloud.com/${objectKey}`

      return {
        provider: 'tencent_cos',
        uploadUrl,
        formFields: {}, // 空对象表示使用 PUT 请求
        expireAt,
        objectKey,
        fileUrl,
      }
    },

    /**
     * 服务端直接上传文件
     */
    async uploadFile({ file, key, contentType }) {
      const client = getClient()

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })

      await client.send(command)

      const url = cdnHost
        ? `${sanitizePrefix(cdnHost)}${key}`
        : `https://${bucket}.cos.${region}.myqcloud.com/${key}`

      return { url, key }
    },

    /**
     * 删除文件
     */
    async deleteFile(key: string) {
      const client = getClient()

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      await client.send(command)
    },

    /**
     * 下载文件，返回完整 Buffer
     */
    async downloadFile(key: string): Promise<Buffer> {
      const client = getClient()

      const command = new GetObjectCommand({ Bucket: bucket, Key: key })
      const response = await client.send(command)

      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }

      return Buffer.concat(chunks)
    },

    /**
     * 下载文件，返回流式 Readable
     */
    async downloadFileStream(key: string): Promise<Readable> {
      const client = getClient()

      const command = new GetObjectCommand({ Bucket: bucket, Key: key })
      const response = await client.send(command)

      return response.Body as Readable
    },

    /**
     * 获取文件访问 URL
     */
    async getFileUrl(key: string) {
      if (cdnHost) {
        return `${sanitizePrefix(cdnHost)}${key}`
      }
      return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
    },

    /**
     * 获取签名 URL（用于私有 Bucket 访问，带过期时间）
     */
    async getSignedUrl(key: string, expiresIn: number = signedUrlTtlSeconds) {
      const client = getClient()

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      return s3GetSignedUrl(client, command, { expiresIn })
    },

    /**
     * 列出文件列表
     */
    async listFiles({ prefix, maxKeys = 100, continuationToken }) {
      const client = getClient()

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      })

      const response = await client.send(command)

      const files = (response.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified?.toISOString() || '',
        etag: item.ETag?.replace(/"/g, '') || null,
        contentType: 'application/octet-stream',
      }))

      return {
        files,
        nextContinuationToken: response.NextContinuationToken || null,
        isTruncated: response.IsTruncated || false,
        prefix: prefix ?? null,
      }
    },

    /**
     * 搜索文件（基于前缀匹配）
     */
    async searchFiles({ query, maxResults = 20 }) {
      const listResult = await this.listFiles({ maxKeys: 100 })

      const normalizedQuery = query.toLowerCase()
      const matched = listResult.files.filter((file) =>
        file.key.toLowerCase().includes(normalizedQuery)
      )

      return {
        files: matched.slice(0, maxResults),
        totalCount: matched.length,
      }
    },

    /**
     * 获取图片处理 URL（腾讯云 COS 暂不支持，返回签名 URL）
     */
    async getImageProcessingUrl(key: string, options: { size?: string }, expiresIn: number = signedUrlTtlSeconds): Promise<string> {
      // 腾讯云 COS 暂不支持图片处理参数，忽略 options，返回普通签名 URL
      return this.getSignedUrl(key, expiresIn)
    },

    /**
     * 获取多个图片处理 URL（腾讯云 COS 暂不支持，返回签名 URL）
     */
    async getImageProcessingUrls(key: string, sizes: { size?: string }[], expiresIn: number = signedUrlTtlSeconds): Promise<Array<{ originalUrl: string; processedUrl: string; processParams: string }>> {
      const originalUrl = await this.getFileUrl(key)
      // 腾讯云 COS 暂不支持图片处理，返回包含 processParams: 'unsupported' 的结果
      return [{
        originalUrl,
        processedUrl: await this.getSignedUrl(key, expiresIn),
        processParams: 'unsupported',
      }]
    },
  }
}
