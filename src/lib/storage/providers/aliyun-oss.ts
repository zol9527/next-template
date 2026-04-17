import crypto from 'node:crypto'
import OSS from 'ali-oss'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { AliyunOssConfig } from '@/lib/storage/types/config'
import type { UploadPolicyRequest } from '@/lib/storage/schema'
import type { ObjectMeta } from 'ali-oss'
import type { ImageProcessingOptions, ImageProcessingResult } from '@/lib/storage/types/image-processing'
import { buildImageProcessingParams } from '@/lib/storage/utils/image-processing-builder'

/**
 * 创建阿里云 OSS Provider
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

  // 保留: lazy initialization
  let ossClient: OSS | null = null

  // 保留: 辅助函数
  const base64 = (input: string): string => {
    return Buffer.from(input, 'utf8').toString('base64')
  }

  const hmacSha1Base64 = (secret: string, payload: string): string => {
    return crypto.createHmac('sha1', secret).update(payload).digest('base64')
  }

  const sanitizePrefix = (prefix: string): string => {
    const p = prefix.trim()
    if (p === '') return ''
    return p.endsWith('/') ? p : `${p}/`
  }

  const extensionFromContentType = (contentType: string): string => {
    const normalized = contentType.toLowerCase().trim()
    if (normalized === 'image/jpeg') return 'jpg'
    if (normalized === 'image/png') return 'png'
    if (normalized === 'image/webp') return 'webp'
    if (normalized === 'image/gif') return 'gif'
    if (normalized === 'video/mp4') return 'mp4'
    if (normalized === 'application/pdf') return 'pdf'
    return 'bin'
  }

  const getClient = (): OSS => {
    if (ossClient) return ossClient

    // 使用 cname 模式，SDK 不会拼接 bucket，直接使用传入的 endpoint
    ossClient = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure,
      endpoint,
      cname: true,
    })

    return ossClient
  }

  return {
    // 保留: 所有方法实现，使用 options 而不是 env
    async issueUploadPolicy({ contentType, sizeBytes, purpose }: UploadPolicyRequest) {
      const expireAtDate = new Date(Date.now() + ttlSeconds * 1000)
      const expireAt = expireAtDate.toISOString()

      const purposePrefix = purpose ? sanitizePrefix(purpose) : ''
      const ext = extensionFromContentType(contentType)
      // 统一使用 sanitizePrefix 处理 dirPrefix，确保前缀格式一致
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

      // 直接使用传入的完整 endpoint 作为上传 URL（用户可能使用自定义域名）
      const uploadUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`

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

    async uploadFile({ file, key, contentType }) {
      const client = getClient()
      const result = await client.put(key, file, {
        headers: { 'Content-Type': contentType },
      })

      // 直接使用传入的完整 endpoint 作为上传 URL
      const uploadUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`

      return {
        url: result.url || `${uploadUrl}${key}`,
        key: result.name,
      }
    },

    async deleteFile(key: string): Promise<void> {
      const client = getClient()
      await client.delete(key)
    },

    async getFileUrl(key: string): Promise<string> {
      // 直接使用传入的完整 endpoint
      const uploadUrl = endpoint.endsWith('/') ? endpoint : `${endpoint}/`
      return `${uploadUrl}${key}`
    },

    async getSignedUrl(key: string, expiresIn: number = signedUrlTtlSeconds): Promise<string> {
      const client = getClient()
      return client.signatureUrl(key, { expires: expiresIn })
    },

    async listFiles({ prefix, maxKeys = 100, continuationToken }) {
      const client = getClient()

      const result = await client.list(
        {
          prefix,
          'max-keys': maxKeys,
          marker: continuationToken,
        },
        {}
      )

      const files = (result?.objects || []).map((obj: ObjectMeta) => ({
        key: obj.name,
        size: obj.size,
        lastModified: obj.lastModified || new Date().toISOString(),
        etag: obj.etag?.replace(/"/g, '') || null,
        contentType: obj.type || 'application/octet-stream',
      }))

      return {
        files,
        nextContinuationToken: result?.nextMarker || null,
        isTruncated: result?.isTruncated || false,
        prefix: prefix ?? null,
      }
    },

    async searchFiles({ query, maxResults = 20 }) {
      const client = getClient()

      const result = await client.list(
        {
          prefix: query,
          'max-keys': 100,
        },
        {}
      )

      const files = (result?.objects || [])
        .filter((obj: ObjectMeta) => obj.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, maxResults)
        .map((obj: ObjectMeta) => ({
          key: obj.name,
          size: obj.size,
          lastModified: obj.lastModified || new Date().toISOString(),
          etag: obj.etag?.replace(/"/g, '') || null,
          contentType: obj.type || 'application/octet-stream',
        }))

      const totalMatched = (result?.objects || []).filter((obj: ObjectMeta) =>
        obj.name.toLowerCase().includes(query.toLowerCase())
      ).length

      return {
        files,
        totalCount: totalMatched,
      }
    },

    async getImageProcessingUrl(
      key: string,
      options: ImageProcessingOptions,
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<string> {
      const client = getClient()

      // 构建图片处理参数
      const processParams = buildImageProcessingParams(options)
      const imageProcess = `image/${processParams}`

      // 使用 ali-oss SDK 生成带处理参数的签名 URL
      return client.signatureUrl(key, {
        expires: expiresIn,
        process: imageProcess,
      })
    },

    async getImageProcessingUrls(
      key: string,
      sizes: ImageProcessingOptions[],
      expiresIn: number = signedUrlTtlSeconds
    ): Promise<ImageProcessingResult[]> {
      const results: ImageProcessingResult[] = []

      for (const options of sizes) {
        const processParams = buildImageProcessingParams(options)
        const imageProcess = `image/${processParams}`
        const processedUrl = await getClient().signatureUrl(key, {
          expires: expiresIn,
          process: imageProcess,
        })

        results.push({
          originalUrl: `${endpoint.endsWith('/') ? endpoint : `${endpoint}/`}${key}`,
          processedUrl,
          processParams: imageProcess,
        })
      }

      return results
    },
  }
}
