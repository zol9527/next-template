/**
 * 阿里云 OSS 对象存储提供者 - 基于 AWS S3 SDK (S3 兼容模式)
 *
 * 阿里云 OSS 兼容 S3 协议，使用 @aws-sdk/client-s3 进行标准操作
 * 图片处理 (x-oss-process) 使用手动 OSS V1 签名（S3 协议不覆盖此功能）
 * S3 兼容文档: https://help.aliyun.com/document_detail/64919.html
 */

import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3'
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { AliyunOssConfig } from '@/lib/storage/types/config'
import type { UploadPolicyRequest } from '@/lib/storage/schema'
import type {
  ImageProcessingOptions,
  ImageProcessingResult,
} from '@/lib/storage/types/image-processing'
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
 * Function: buildOssSignedUrl
 *
 * Description: 手动构建阿里云 OSS V1 签名 URL
 * 用于图片处理等 OSS 专有功能（S3 预签名不支持 x-oss-process 参数）
 *
 * Parameters:
 *   method(string): HTTP 方法（GET、PUT 等）
 *   bucket(string): Bucket 名称
 *   objectKey(string): 对象键
 *   accessKeyId(string): AccessKey ID
 *   accessKeySecret(string): AccessKey Secret
 *   baseUrl(string): 已处理的访问基础 URL（含协议、尾部 /）
 *   expiresInSeconds(number): URL 过期时间（秒）
 *   process(string | undefined): OSS 图片处理参数（如 "image/resize,w_200"）
 *
 * Returns:
 *   string: 带 OSS V1 签名的完整 URL
 */
function buildOssSignedUrl(
  method: string,
  bucket: string,
  objectKey: string,
  accessKeyId: string,
  accessKeySecret: string,
  baseUrl: string,
  expiresInSeconds: number,
  process?: string
): string {
  // 构建 Expires 时间戳（Unix 秒级时间戳）
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  // CanonicalizedResource：签名中的资源路径
  const canonicalizedResource = `/${bucket}/${objectKey}`

  // StringToSign: METHOD\nContent-MD5\nContent-Type\nExpires\nCanonicalizedResource
  const stringToSign = [
    method,
    '', // Content-MD5（可选，此处留空）
    '', // Content-Type（可选，此处留空）
    String(expires),
    canonicalizedResource,
  ].join('\n')

  // HMAC-SHA1 签名
  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  // 构建完整 URL
  const params = new URLSearchParams({
    OSSAccessKeyId: accessKeyId,
    Expires: String(expires),
    Signature: signature,
  })

  if (process) {
    params.set('x-oss-process', process)
  }

  return `${baseUrl}${objectKey}?${params.toString()}`
}

/**
 * 创建阿里云 OSS Provider（S3 兼容模式）
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
    secure = true,
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
   * 获取或初始化 S3 客户端（S3 兼容模式）
   *
   * 使用阿里云 OSS S3 兼容 endpoint，从 region 构建
   */
  const getClient = (): S3Client => {
    if (s3Client) return s3Client

    // 规范化 region（去除可能的 oss- 前缀）
    const normalizedRegion = region.replace(/^oss-/, '')
    // S3 兼容 endpoint 格式
    const s3Endpoint = `https://oss-${normalizedRegion}.aliyuncs.com`

    const config: S3ClientConfig = {
      region: normalizedRegion,
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey: accessKeySecret,
      },
      forcePathStyle: false, // 使用虚拟托管风格
    }

    s3Client = new S3Client(config)
    return s3Client
  }

  /**
   * 获取文件访问基础 URL
   * 使用用户配置的 endpoint（可能是自定义域名），用于构建公共文件 URL
   */
  const getBaseUrl = (): string => {
    const base = endpoint.startsWith('http') ? endpoint : `${secure ? 'https' : 'http'}://${endpoint}`
    return base.endsWith('/') ? base : `${base}/`
  }

  return {
    /**
     * 签发上传策略（预签名 PUT URL）
     *
     * 使用 S3 预签名生成 PUT URL，前端直接 PUT 上传
     */
    async issueUploadPolicy({ contentType, sizeBytes, purpose }: UploadPolicyRequest) {
      const client = getClient()

      // 构建对象键路径
      const purposePrefix = purpose ? sanitizePrefix(purpose) : ''
      const ext = extensionFromContentType(contentType)
      const prefix = sanitizePrefix(dirPrefix)
      const objectKey = `${prefix}${purposePrefix}${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

      const expireAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

      // 使用 S3 预签名生成 PUT URL
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: sizeBytes,
      })

      const uploadUrl = await s3GetSignedUrl(client, command, {
        expiresIn: ttlSeconds,
      })

      const fileUrl = `${getBaseUrl()}${objectKey}`

      return {
        provider: 'aliyun_oss',
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

      return {
        url: `${getBaseUrl()}${key}`,
        key,
      }
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
     * 获取文件访问 URL（公共 URL）
     */
    async getFileUrl(key: string): Promise<string> {
      return `${getBaseUrl()}${key}`
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
     * 列出文件
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
     * 搜索文件（基于前缀 + 内容匹配）
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
     * 获取带图片处理参数的签名 URL
     *
     * 使用手动 OSS V1 签名（S3 预签名不支持 x-oss-process 参数）
     */
    async getImageProcessingUrl(
      key: string,
      options: ImageProcessingOptions,
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<string> {
      const processParams = buildImageProcessingParams(options)
      const imageProcess = `image/${processParams}`

      return buildOssSignedUrl(
        'GET',
        bucket,
        key,
        accessKeyId,
        accessKeySecret,
        getBaseUrl(),
        expiresIn,
        imageProcess
      )
    },

    /**
     * 获取多个尺寸的图片处理 URL
     */
    async getImageProcessingUrls(
      key: string,
      sizes: ImageProcessingOptions[],
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<ImageProcessingResult[]> {
      const originalUrl = `${getBaseUrl()}${key}`

      return sizes.map((options) => {
        const processParams = buildImageProcessingParams(options)
        const imageProcess = `image/${processParams}`

        const processedUrl = buildOssSignedUrl(
          'GET',
          bucket,
          key,
          accessKeyId,
          accessKeySecret,
          getBaseUrl(),
          expiresIn,
          imageProcess
        )

        return {
          originalUrl,
          processedUrl,
          processParams: imageProcess,
        }
      })
    },
  }
}
