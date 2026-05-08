/**
 * 阿里云 OSS 对象存储提供者 - 基于 AWS S3 SDK
 *
 * 阿里云 OSS 兼容 S3 协议，使用 @aws-sdk/client-s3 替代 ali-oss SDK
 * 解决 ali-oss 的 proxy-agent 依赖链安全漏洞问题
 *
 * S3 兼容文档: https://help.aliyun.com/document_detail/64919.html
 */

import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { AliyunOssConfig } from '@/lib/storage/types/config'
import type { UploadPolicyRequest } from '@/lib/storage/schema'
import type { ImageProcessingOptions, ImageProcessingResult } from '@/lib/storage/types/image-processing'
import { buildImageProcessingParams } from '@/lib/storage/utils/image-processing-builder'

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
 * 创建阿里云 OSS Provider
 *
 * 使用 S3 兼容协议，无需 ali-oss SDK
 *
 * @param options - 配置选项
 * @returns ObjectStorageProvider 实例
 * @throws {Error} 当必需参数缺失时抛出错误
 */
export function createAliyun(options: AliyunOssConfig): ObjectStorageProvider {
  const {
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
    endpoint,
    dirPrefix = 'uploads',
    ttlSeconds = 3600,
    signedUrlTtlSeconds = 3600,
  } = options

  // 参数验证
  if (!accessKeyId?.trim()) {
    throw new Error('Aliyun OSS: accessKeyId is required')
  }
  if (!accessKeySecret?.trim()) {
    throw new Error('Aliyun OSS: accessKeySecret is required')
  }
  if (!bucket?.trim()) {
    throw new Error('Aliyun OSS: bucket is required')
  }
  if (!region?.trim()) {
    throw new Error('Aliyun OSS: region is required (e.g., "cn-chengdu")')
  }
  if (!endpoint?.trim()) {
    throw new Error('Aliyun OSS: endpoint is required (e.g., "oss-cn-chengdu.aliyuncs.com")')
  }

  // Lazy initialization of S3 client
  let s3Client: S3Client | null = null

  /**
   * 获取或初始化 S3 客户端（使用阿里云 OSS S3 兼容 endpoint）
   */
  const getClient = (): S3Client => {
    if (s3Client) return s3Client

    // 阿里云 OSS S3 兼容 endpoint 格式
    const s3Endpoint = `https://oss.${region}.aliyuncs.com`

    const config: S3ClientConfig = {
      region,
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey: accessKeySecret,
      },
      // 阿里云 OSS 使用虚拟主机样式寻址
      forcePathStyle: false,
    }

    s3Client = new S3Client(config)
    return s3Client
  }

  /**
   * 获取用户配置的访问 endpoint（可能是自定义域名）
   */
  const getAccessUrl = (): string => {
    return endpoint.endsWith('/') ? endpoint : `${endpoint}/`
  }

  // 保留: PostObject 签名辅助函数（纯 crypto，不依赖 ali-oss SDK）
  const base64 = (input: string): string => {
    return Buffer.from(input, 'utf8').toString('base64')
  }

  const hmacSha1Base64 = (secret: string, payload: string): string => {
    return crypto.createHmac('sha1', secret).update(payload).digest('base64')
  }

  return {
    /**
     * 签发上传策略（阿里云 OSS PostObject 签名方式）
     *
     * 使用 HMAC-SHA1 签名，不依赖 S3 SDK
     * PostObject 文档: https://help.aliyun.com/document_detail/31988.html
     */
    async issueUploadPolicy({ contentType, sizeBytes, purpose }: UploadPolicyRequest) {
      const expireAtDate = new Date(Date.now() + ttlSeconds * 1000)
      const expireAt = expireAtDate.toISOString()

      const purposePrefix = purpose ? sanitizePrefix(purpose) : ''
      const ext = extensionFromContentType(contentType)
      const prefix = sanitizePrefix(dirPrefix)
      const objectKey = `${prefix}${purposePrefix}${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

      const policy = {
        expiration: expireAt,
        conditions: [
          ['content-length-range', 0, sizeBytes],
          ['eq', '$key', objectKey],
          ['eq', '$Content-Type', contentType],
          { bucket },
        ],
      }

      const policyBase64 = base64(JSON.stringify(policy))
      const signature = hmacSha1Base64(accessKeySecret, policyBase64)

      const uploadUrl = getAccessUrl()

      return {
        provider: 'aliyun_oss',
        uploadUrl,
        formFields: {
          bucket,
          key: objectKey,
          policy: policyBase64,
          OSSAccessKeyId: accessKeyId,
          Signature: signature,
          'Content-Type': contentType,
          success_action_status: '200',
        },
        expireAt,
        objectKey,
        fileUrl: `${uploadUrl}${objectKey}`,
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

      const uploadUrl = getAccessUrl()

      return {
        url: `${uploadUrl}${key}`,
        key,
      }
    },

    /**
     * 删除文件
     */
    async deleteFile(key: string): Promise<void> {
      const client = getClient()

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      await client.send(command)
    },

    /**
     * 获取文件访问 URL（使用自定义 endpoint）
     */
    async getFileUrl(key: string): Promise<string> {
      const uploadUrl = getAccessUrl()
      return `${uploadUrl}${key}`
    },

    /**
     * 获取签名 URL（用于私有 Bucket 访问，带过期时间）
     */
    async getSignedUrl(key: string, expiresIn: number = signedUrlTtlSeconds): Promise<string> {
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
      const listResult = await this.listFiles({ prefix: query, maxKeys: 100 })

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
     * 获取带图片处理参数的签名 URL
     *
     * 阿里云 OSS 通过 x-oss-process 查询参数实现图片处理
     * 在预签名 URL 后追加处理参数
     */
    async getImageProcessingUrl(
      key: string,
      options: ImageProcessingOptions,
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<string> {
      const client = getClient()

      // 构建图片处理参数
      const processParams = buildImageProcessingParams(options)
      const imageProcess = `image/${processParams}`

      // 生成预签名 URL
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      const signedUrl = await s3GetSignedUrl(client, command, { expiresIn })

      // 在签名 URL 后追加 OSS 图片处理参数
      // x-oss-process 参数不参与签名计算，直接追加即可
      const separator = signedUrl.includes('?') ? '&' : '?'
      return `${signedUrl}${separator}x-oss-process=${imageProcess}`
    },

    /**
     * 获取多个尺寸的图片 URL（用于响应式图片）
     */
    async getImageProcessingUrls(
      key: string,
      sizes: ImageProcessingOptions[],
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<ImageProcessingResult[]> {
      const client = getClient()
      const results: ImageProcessingResult[] = []
      const uploadUrl = getAccessUrl()

      for (const options of sizes) {
        const processParams = buildImageProcessingParams(options)
        const imageProcess = `image/${processParams}`

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })

        const signedUrl = await s3GetSignedUrl(client, command, { expiresIn })

        // 追加图片处理参数
        const separator = signedUrl.includes('?') ? '&' : '?'
        const processedUrl = `${signedUrl}${separator}x-oss-process=${imageProcess}`

        results.push({
          originalUrl: `${uploadUrl}${key}`,
          processedUrl,
          processParams: imageProcess,
        })
      }

      return results
    },
  }
}
