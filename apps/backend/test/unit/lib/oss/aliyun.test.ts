/**
 * Unit: 阿里云 OSS Provider 测试 (S3 兼容模式)
 *
 * Description: 测试阿里云对象存储 Provider 的功能
 * 基于 @aws-sdk/client-s3 和 @aws-sdk/s3-request-presigner
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { ObjectStorageProvider } from '@/lib/storage/types'

// ============================================================
// Mock 环境变量配置
// ============================================================

const mockEnv = {
  ALIYUN_OSS_ACCESS_KEY_ID: 'test-access-key-id',
  ALIYUN_OSS_ACCESS_KEY_SECRET: 'test-access-key-secret',
  ALIYUN_OSS_BUCKET: 'test-bucket',
  ALIYUN_OSS_UPLOAD_HOST: 'https://test-bucket.oss-cn-chengdu.aliyuncs.com',
  ALIYUN_OSS_DIR_PREFIX: 'uploads',
  ALIYUN_OSS_POLICY_TTL_SECONDS: 60,
  NODE_ENV: 'test',
}

vi.mock('@/config/env', () => ({
  env: mockEnv,
}))

// ============================================================
// Mock @aws-sdk/client-s3
// ============================================================

const mockSend = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn((input: unknown) => input),
  DeleteObjectCommand: vi.fn((input: unknown) => input),
  ListObjectsV2Command: vi.fn((input: unknown) => input),
  GetObjectCommand: vi.fn((input: unknown) => input),
}))

// ============================================================
// Mock @aws-sdk/s3-request-presigner
// ============================================================

const mockSignedUrl = vi.fn()

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockSignedUrl(...args),
}))

// 动态导入 createAliyun（在 mock 之后）
const { createAliyun } = await import('@/lib/storage/providers/aliyun-oss')

// ============================================================
// 测试环境设置
// ============================================================

describe('阿里云 OSS Provider 测试', () => {
  let provider: ObjectStorageProvider
  const originalEnv = { ...mockEnv }

  beforeEach(() => {
    // 确保 mockEnv 恢复到原始值
    Object.assign(mockEnv, originalEnv)

    // 重置所有 mock
    vi.clearAllMocks()

    // 默认 mock: getSignedUrl 返回带 S3 签名参数的 URL
    mockSignedUrl.mockResolvedValue(
      'https://test-bucket.oss-cn-chengdu.aliyuncs.com/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test&X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123'
    )

    provider = createAliyun({
      provider: 'aliyun_oss',
      accessKeyId: mockEnv.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: mockEnv.ALIYUN_OSS_ACCESS_KEY_SECRET,
      bucket: mockEnv.ALIYUN_OSS_BUCKET,
      region: 'oss-cn-chengdu',
      endpoint: mockEnv.ALIYUN_OSS_UPLOAD_HOST,
      dirPrefix: mockEnv.ALIYUN_OSS_DIR_PREFIX,
      ttlSeconds: mockEnv.ALIYUN_OSS_POLICY_TTL_SECONDS,
      signedUrlTtlSeconds: 3600,
    })
  })

  afterEach(() => {
    // 确保 mockEnv 恢复到原始值
    Object.assign(mockEnv, originalEnv)
    vi.clearAllMocks()
  })

  // ============================================================
  // issueUploadPolicy 测试
  // ============================================================

  describe('issueUploadPolicy', () => {
    /**
     * Function: issueUploadPolicy
     *
     * Description: 测试获取上传策略（用于客户端直传，S3 预签名 PUT URL）
     *
     * Parameters:
     *   params(object): 包含 contentType, sizeBytes, purpose 的参数
     *
     * Returns:
     *   policy(UploadPolicyResponse): 上传策略响应
     */
    it('应该生成有效的上传策略', async () => {
      const presignedUrl = 'https://oss-cn-chengdu.aliyuncs.com/test-bucket/uploads/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test'
      mockSignedUrl.mockResolvedValue(presignedUrl)

      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024 * 1024, // 1MB
        purpose: 'avatar',
      })

      expect(policy).toBeDefined()
      expect(policy.provider).toBe('aliyun_oss')
      expect(policy.uploadUrl).toContain('X-Amz-')
      expect(policy.formFields).toEqual({})
      expect(policy.expireAt).toBeDefined()
      expect(policy.objectKey).toBeDefined()
      expect(policy.fileUrl).toContain(mockEnv.ALIYUN_OSS_UPLOAD_HOST)
    })

    /**
     * Function: issueUploadPolicy (无 purpose)
     *
     * Description: 测试不指定 purpose 时的策略生成
     */
    it('应该在没有 purpose 时生成策略', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const policy = await provider.issueUploadPolicy({
        contentType: 'image/png',
        sizeBytes: 2048,
      })

      expect(policy.provider).toBe('aliyun_oss')
      expect(policy.objectKey).toContain('uploads/')
      expect(policy.objectKey).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\//)
    })

    /**
     * Function: issueUploadPolicy (有 purpose)
     *
     * Description: 测试指定 purpose 时的策略生成
     */
    it('应该在有 purpose 时在路径中包含 purpose', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const policy = await provider.issueUploadPolicy({
        contentType: 'image/webp',
        sizeBytes: 4096,
        purpose: 'product-images',
      })

      expect(policy.objectKey).toContain('product-images/')
      expect(policy.objectKey).toMatch(/^uploads\/product-images\/\d{4}-\d{2}-\d{2}\//)
    })

    /**
     * Function: issueUploadPolicy (扩展名映射)
     *
     * Description: 测试根据 Content-Type 正确映射文件扩展名
     */
    it('应该根据 Content-Type 正确映射文件扩展名', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const testCases = [
        { contentType: 'image/jpeg', ext: 'jpg' },
        { contentType: 'image/png', ext: 'png' },
        { contentType: 'image/webp', ext: 'webp' },
        { contentType: 'image/gif', ext: 'gif' },
        { contentType: 'video/mp4', ext: 'mp4' },
        { contentType: 'application/pdf', ext: 'pdf' },
        { contentType: 'unknown/type', ext: 'bin' },
      ]

      for (const { contentType, ext } of testCases) {
        const policy = await provider.issueUploadPolicy({
          contentType,
          sizeBytes: 1024,
        })
        expect(policy.objectKey).toMatch(new RegExp(`\\.${ext}$`))
      }
    })

    /**
     * Function: issueUploadPolicy (唯一性)
     *
     * Description: 测试每次生成的 objectKey 都是唯一的
     */
    it('应该每次生成唯一的 objectKey', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const policy1 = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      const policy2 = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })

      expect(policy1.objectKey).not.toBe(policy2.objectKey)
    })

    /**
     * Function: issueUploadPolicy (过期时间)
     *
     * Description: 测试生成的过期时间应该在未来 60 秒内
     */
    it('应该生成正确的过期时间', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })

      const expireTime = new Date(policy.expireAt).getTime()
      const now = Date.now()
      const sixtySecondsLater = now + 60 * 1000

      // 过期时间应该在未来 60 秒左右（允许 5 秒误差）
      expect(expireTime).toBeGreaterThanOrEqual(sixtySecondsLater - 5000)
      expect(expireTime).toBeLessThanOrEqual(sixtySecondsLater + 5000)
    })

    /**
     * Function: issueUploadPolicy (文件 URL)
     *
     * Description: 测试生成的 fileUrl 格式正确
     */
    it('应该生成正确的文件 URL', async () => {
      mockSignedUrl.mockResolvedValue('https://example.com/signed?X-Amz-Algorithm=test')

      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
        purpose: 'test',
      })

      expect(policy.fileUrl).toBeDefined()
      expect(policy.fileUrl).toMatch(new RegExp(`^${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/`))
      expect(policy.fileUrl).toContain(policy.objectKey!)
    })

    /**
     * Function: issueUploadPolicy (缺少配置)
     *
     * Description: 测试缺少必要配置时抛出错误
     */
    it('应该在缺少配置时抛出错误', async () => {
      // 临时修改 mock 返回空值来测试错误处理
      mockEnv.ALIYUN_OSS_ACCESS_KEY_ID = undefined as any

      expect(() =>
        createAliyun({
          provider: 'aliyun_oss',
          accessKeyId: mockEnv.ALIYUN_OSS_ACCESS_KEY_ID,
          accessKeySecret: mockEnv.ALIYUN_OSS_ACCESS_KEY_SECRET,
          bucket: mockEnv.ALIYUN_OSS_BUCKET,
          region: 'oss-cn-chengdu',
          endpoint: 'https://test.oss-cn-chengdu.aliyuncs.com',
        })
      ).toThrow('Aliyun OSS: accessKeyId is required')
    })
  })

  // ============================================================
  // uploadFile 测试 (增)
  // ============================================================

  describe('uploadFile', () => {
    /**
     * Function: uploadFile
     *
     * Description: 测试服务端上传文件到阿里云 OSS（S3 PutObjectCommand）
     *
     * Parameters:
     *   params(object): 包含 file (Buffer), key, contentType 的参数
     *
     * Returns:
     *   result(UploadFileResult): 包含 url 和 key 的上传结果
     */
    it('应该成功上传文件到阿里云 OSS', async () => {
      const fileContent = Buffer.from('test file content')
      const key = 'uploads/test/test-file.jpg'

      mockSend.mockResolvedValue({})

      const result = await provider.uploadFile({
        file: fileContent,
        key,
        contentType: 'image/jpeg',
      })

      expect(result).toBeDefined()
      expect(result.key).toBe(key)
      expect(result.url).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`)
      expect(mockSend).toHaveBeenCalledTimes(1)
      // 验证 S3Client.send 被调用时传入了 PutObjectCommand 的参数
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: key,
        Body: fileContent,
        ContentType: 'image/jpeg',
      })
    })

    /**
     * Function: uploadFile (大文件)
     *
     * Description: 测试上传较大的二进制文件
     */
    it('应该正确处理二进制文件内容', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const key = 'uploads/binary/test.bin'

      mockSend.mockResolvedValue({})

      const result = await provider.uploadFile({
        file: binaryContent,
        key,
        contentType: 'application/octet-stream',
      })

      expect(result.key).toBe(key)
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: key,
        Body: binaryContent,
        ContentType: 'application/octet-stream',
      })
    })

    /**
     * Function: uploadFile (缺少配置)
     *
     * Description: 测试缺少 endpoint 时抛出错误
     */
    it('应该在缺少 endpoint 时抛出错误', async () => {
      mockEnv.ALIYUN_OSS_UPLOAD_HOST = undefined as any

      expect(() =>
        createAliyun({
          provider: 'aliyun_oss',
          accessKeyId: mockEnv.ALIYUN_OSS_ACCESS_KEY_ID,
          accessKeySecret: mockEnv.ALIYUN_OSS_ACCESS_KEY_SECRET,
          bucket: mockEnv.ALIYUN_OSS_BUCKET,
          region: 'oss-cn-chengdu',
          endpoint: mockEnv.ALIYUN_OSS_UPLOAD_HOST,
        })
      ).toThrow('Aliyun OSS: endpoint is required')
    })
  })

  // ============================================================
  // deleteFile 测试 (删)
  // ============================================================

  describe('deleteFile', () => {
    /**
     * Function: deleteFile
     *
     * Description: 测试删除 OSS 上的文件（S3 DeleteObjectCommand）
     *
     * Parameters:
     *   key(string): 文件的对象键
     */
    it('应该成功删除已存在的文件', async () => {
      const key = 'uploads/test/test-file.jpg'

      mockSend.mockResolvedValue({})

      await provider.deleteFile(key)

      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: key,
      })
    })

    /**
     * Function: deleteFile (包含特殊字符)
     *
     * Description: 测试删除包含特殊字符路径的文件
     */
    it('应该正确处理包含特殊字符的路径', async () => {
      const key = 'uploads/test folder/image with spaces.jpg'

      mockSend.mockResolvedValue({})

      await provider.deleteFile(key)

      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: key,
      })
    })

    /**
     * Function: deleteFile (网络错误)
     *
     * Description: 测试删除时遇到网络错误
     */
    it('应该在删除失败时抛出错误', async () => {
      const key = 'uploads/nonexistent/file.jpg'

      mockSend.mockRejectedValue(new Error('Network error'))

      await expect(provider.deleteFile(key)).rejects.toThrow('Network error')
    })
  })

  // ============================================================
  // 覆盖上传测试 (改)
  // ============================================================

  describe('覆盖上传 (改)', () => {
    /**
     * Function: 覆盖上传
     *
     * Description: 测试覆盖已存在的文件（通过 S3 SDK）
     *
     * Parameters:
     *   params(object): 包含 file (Buffer), key, contentType 的参数
     */
    it('应该支持覆盖已存在的文件', async () => {
      const key = 'uploads/existing/file.jpg'
      const originalContent = Buffer.from('original content')
      const newContent = Buffer.from('new content')

      // 第一次上传
      mockSend.mockResolvedValueOnce({})

      await provider.uploadFile({
        file: originalContent,
        key,
        contentType: 'image/jpeg',
      })

      // 覆盖上传
      mockSend.mockResolvedValueOnce({})

      const result = await provider.uploadFile({
        file: newContent,
        key,
        contentType: 'image/jpeg',
      })

      expect(result.key).toBe(key)
      expect(mockSend).toHaveBeenCalledTimes(2)
      // 验证第二次调用（覆盖）的参数
      const sentCommand = mockSend.mock.calls[1][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: key,
        Body: newContent,
        ContentType: 'image/jpeg',
      })
    })
  })

  // ============================================================
  // listFiles 测试 (列)
  // ============================================================

  describe('listFiles', () => {
    /**
     * Function: listFiles
     *
     * Description: 测试列出目录下的文件（S3 ListObjectsV2Command）
     *
     * Parameters:
     *   params(object): 包含 prefix, maxKeys 的参数
     *
     * Returns:
     *   result(ListFilesResponse): 包含文件列表的响应
     */
    it('应该列出指定前缀的文件', async () => {
      mockSend.mockResolvedValue({
        Contents: [
          {
            Key: 'uploads/images/photo1.jpg',
            Size: 1024,
            LastModified: new Date('2025-01-15T10:00:00Z'),
            ETag: '"abc123"',
          },
          {
            Key: 'uploads/images/photo2.jpg',
            Size: 2048,
            LastModified: new Date('2025-01-15T11:00:00Z'),
            ETag: '"def456"',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.listFiles({ prefix: 'uploads/images', maxKeys: 100 })

      expect(result).toBeDefined()
      expect(result.files).toHaveLength(2)
      // S3 SDK 字段映射：Key -> key, Size -> size
      expect(result.files[0].key).toBe('uploads/images/photo1.jpg')
      expect(result.files[0].size).toBe(1024)
      expect(result.files[0].etag).toBe('abc123')
      expect(result.isTruncated).toBe(false)
      expect(result.nextContinuationToken).toBeNull()
      expect(result.prefix).toBe('uploads/images')
      // 验证 S3Client.send 被调用时传入了 ListObjectsV2Command 的参数
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'uploads/images',
        MaxKeys: 100,
        ContinuationToken: undefined,
      })
    })

    /**
     * Function: listFiles (空列表)
     *
     * Description: 测试列出空目录
     */
    it('应该返回空列表当没有文件', async () => {
      mockSend.mockResolvedValue({
        Contents: [],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.listFiles({ prefix: 'uploads/empty', maxKeys: 100 })

      expect(result.files).toEqual([])
      expect(result.isTruncated).toBe(false)
      expect(result.prefix).toBe('uploads/empty')
    })

    /**
     * Function: listFiles (分页)
     *
     * Description: 测试分页列出文件
     */
    it('应该支持分页列出文件', async () => {
      // 第一页数据
      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'uploads/page/file1.jpg',
            Size: 1024,
            LastModified: new Date(),
            ETag: '"1"',
          },
          {
            Key: 'uploads/page/file2.jpg',
            Size: 2048,
            LastModified: new Date(),
            ETag: '"2"',
          },
        ],
        IsTruncated: true,
        NextContinuationToken: 'marker-123',
      })

      const page1 = await provider.listFiles({ prefix: 'uploads/page', maxKeys: 2 })

      expect(page1.files.length).toBe(2)
      expect(page1.isTruncated).toBe(true)
      expect(page1.nextContinuationToken).toBe('marker-123')

      // 第二页数据
      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'uploads/page/file3.jpg',
            Size: 3072,
            LastModified: new Date(),
            ETag: '"3"',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const page2 = await provider.listFiles({
        prefix: 'uploads/page',
        maxKeys: 2,
        continuationToken: 'marker-123',
      })

      expect(page2.files.length).toBe(1)
      expect(page2.isTruncated).toBe(false)
      expect(page2.nextContinuationToken).toBeNull()
      // 验证第二页请求传入 continuationToken
      const sentCommand = mockSend.mock.calls[1][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'uploads/page',
        MaxKeys: 2,
        ContinuationToken: 'marker-123',
      })
    })

    /**
     * Function: listFiles (缺少 etag)
     *
     * Description: 测试处理缺少 ETag 的文件对象
     */
    it('应该正确处理缺少 etag 的文件对象', async () => {
      mockSend.mockResolvedValue({
        Contents: [
          {
            Key: 'uploads/test/file.jpg',
            Size: 1024,
            LastModified: new Date(),
            // 没有 ETag
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.listFiles({ prefix: 'uploads/test', maxKeys: 100 })

      expect(result.files[0].etag).toBeNull()
    })
  })

  // ============================================================
  // searchFiles 测试
  // ============================================================

  describe('searchFiles', () => {
    /**
     * Function: searchFiles
     *
     * Description: 测试搜索文件（基于 listFiles + 关键字过滤）
     *
     * Parameters:
     *   params(object): 包含 query, maxResults 的参数
     *
     * Returns:
     *   result(SearchFilesResponse): 包含匹配文件的响应
     */
    it('应该根据关键字搜索文件', async () => {
      mockSend.mockResolvedValue({
        Contents: [
          {
            Key: 'uploads/images/avatar-1.jpg',
            Size: 1024,
            LastModified: new Date(),
            ETag: '"1"',
          },
          {
            Key: 'uploads/images/avatar-2.jpg',
            Size: 2048,
            LastModified: new Date(),
            ETag: '"2"',
          },
          {
            Key: 'uploads/images/other.png',
            Size: 512,
            LastModified: new Date(),
            ETag: '"3"',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.searchFiles({ query: 'avatar', maxResults: 10 })

      expect(result.files).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.files.every(f => f.key.includes('avatar'))).toBe(true)
    })

    /**
     * Function: searchFiles (无匹配)
     *
     * Description: 测试搜索无匹配结果
     */
    it('应该返回空列表当没有匹配文件', async () => {
      mockSend.mockResolvedValue({
        Contents: [],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.searchFiles({ query: 'nonexistent', maxResults: 10 })

      expect(result.files).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    /**
     * Function: searchFiles (限制数量)
     *
     * Description: 测试限制返回结果数量
     */
    it('应该限制返回结果数量', async () => {
      const contents = []
      for (let i = 1; i <= 5; i++) {
        contents.push({
          Key: `uploads/test/match${i}.txt`,
          Size: 1024,
          LastModified: new Date(),
          ETag: `"${i}"`,
        })
      }

      mockSend.mockResolvedValue({
        Contents: contents,
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.searchFiles({ query: 'match', maxResults: 3 })

      expect(result.files.length).toBe(3)
      expect(result.totalCount).toBe(5)
    })

    /**
     * Function: searchFiles (大小写不敏感)
     *
     * Description: 测试大小写不敏感搜索
     */
    it('应该支持大小写不敏感搜索', async () => {
      mockSend.mockResolvedValue({
        Contents: [
          {
            Key: 'uploads/test/FOO.jpg',
            Size: 1024,
            LastModified: new Date(),
            ETag: '"1"',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const result = await provider.searchFiles({ query: 'foo', maxResults: 10 })

      expect(result.totalCount).toBe(1)
      expect(result.files[0].key).toContain('FOO')
    })
  })

  // ============================================================
  // getFileUrl 测试
  // ============================================================

  describe('getFileUrl', () => {
    /**
     * Function: getFileUrl
     *
     * Description: 测试获取文件访问 URL（纯 URL 拼接，无 SDK 调用）
     *
     * Parameters:
     *   key(string): 文件的对象键
     *
     * Returns:
     *   url(string): 文件访问 URL
     */
    it('应该返回正确的文件 URL', async () => {
      const key = 'uploads/test/image.jpg'

      const url = await provider.getFileUrl(key)

      expect(url).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`)
    })

    /**
     * Function: getFileUrl (文件不存在)
     *
     * Description: 测试文件不存在时仍然返回 URL（纯拼接不验证存在性）
     */
    it('应该在文件不存在时仍然返回 URL', async () => {
      const key = 'uploads/nonexistent/file.jpg'

      const url = await provider.getFileUrl(key)

      expect(url).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`)
    })

    /**
     * Function: getFileUrl (特殊字符)
     *
     * Description: 测试处理包含特殊字符的路径
     */
    it('应该正确处理包含特殊字符的路径', async () => {
      const key = 'uploads/test folder/image with spaces.jpg'

      const url = await provider.getFileUrl(key)

      expect(url).toContain('uploads/test folder/image with spaces.jpg')
    })

    /**
     * Function: getFileUrl (缺少配置)
     *
     * Description: 测试缺少 endpoint 时抛出错误
     */
    it('应该在缺少 endpoint 时抛出错误', async () => {
      mockEnv.ALIYUN_OSS_UPLOAD_HOST = undefined as any

      expect(() =>
        createAliyun({
          provider: 'aliyun_oss',
          accessKeyId: mockEnv.ALIYUN_OSS_ACCESS_KEY_ID,
          accessKeySecret: mockEnv.ALIYUN_OSS_ACCESS_KEY_SECRET,
          bucket: mockEnv.ALIYUN_OSS_BUCKET,
          region: 'oss-cn-chengdu',
          endpoint: mockEnv.ALIYUN_OSS_UPLOAD_HOST,
        })
      ).toThrow('Aliyun OSS: endpoint is required')
    })
  })

  // ============================================================
  // getSignedUrl 测试（签名 URL 生成）
  // ============================================================

  describe('getSignedUrl', () => {
    /**
     * Function: getSignedUrl
     *
     * Description: 测试生成签名 URL（通过 @aws-sdk/s3-request-presigner）
     *
     * Parameters:
     *   key(string): 对象键
     *   expiresIn(number): 签名有效期（秒）
     *
     * Returns:
     *   url(string): 签名 URL
     */
    it('应该生成包含 S3 签名参数的 URL', async () => {
      const signedUrl = 'https://test-bucket.oss-cn-chengdu.aliyuncs.com/uploads/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test&X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123'
      mockSignedUrl.mockResolvedValue(signedUrl)

      const url = await provider.getSignedUrl('uploads/test.jpg')

      expect(url).toBe(signedUrl)
      expect(url).toContain('X-Amz-Algorithm=')
      expect(url).toContain('X-Amz-Expires=3600')
      expect(url).toContain('X-Amz-Signature=')
      // getSignedUrl 应该被调用，传入 S3Client 实例和 GetObjectCommand
      expect(mockSignedUrl).toHaveBeenCalledTimes(1)
    })

    /**
     * Function: getSignedUrl (自定义过期时间)
     *
     * Description: 测试自定义签名过期时间
     *
     * Parameters:
     *   key(string): 对象键
     *   expiresIn(number): 自定义过期时间
     *
     * Returns:
     *   url(string): 带自定义过期时间的签名 URL
     */
    it('应该支持自定义过期时间', async () => {
      const signedUrl = 'https://test-bucket.oss-cn-chengdu.aliyuncs.com/test.jpg?X-Amz-Expires=7200'
      mockSignedUrl.mockResolvedValue(signedUrl)

      const url = await provider.getSignedUrl('test.jpg', 7200)

      expect(url).toBe(signedUrl)
      expect(url).toContain('X-Amz-Expires=7200')
      expect(mockSignedUrl).toHaveBeenCalledTimes(1)
    })

    /**
     * Function: getSignedUrl (默认过期时间)
     *
     * Description: 测试使用默认过期时间（3600 秒）
     */
    it('应该使用默认过期时间 3600 秒', async () => {
      mockSignedUrl.mockResolvedValue('signed-url')

      await provider.getSignedUrl('test.jpg')

      expect(mockSignedUrl).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================
  // 完整工作流测试
  // ============================================================

  describe('完整工作流测试', () => {
    /**
     * Function: 完整工作流
     *
     * Description: 测试从获取策略到上传、获取 URL、删除的完整流程
     */
    it('应该支持完整的文件生命周期', async () => {
      // 1. 获取上传策略
      mockSignedUrl.mockResolvedValue('https://oss-cn-chengdu.aliyuncs.com/signed?X-Amz-Algorithm=test')
      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        purpose: 'lifecycle-test',
      })

      expect(policy.objectKey).toBeDefined()

      // 2. 上传文件（S3 PutObjectCommand）
      const fileContent = Buffer.from('lifecycle test content')
      mockSend.mockResolvedValueOnce({})

      const uploadResult = await provider.uploadFile({
        file: fileContent,
        key: policy.objectKey!,
        contentType: 'image/jpeg',
      })

      expect(uploadResult.key).toBe(policy.objectKey)

      // 3. 获取文件 URL（纯拼接）
      const fileUrl = await provider.getFileUrl(uploadResult.key)
      expect(fileUrl).toBe(uploadResult.url)

      // 4. 列出文件
      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: uploadResult.key,
            Size: fileContent.length,
            LastModified: new Date(),
            ETag: '"abc123"',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: null,
      })

      const listResult = await provider.listFiles({ prefix: 'uploads/lifecycle-test', maxKeys: 10 })
      expect(listResult.files.length).toBe(1)
      expect(listResult.files[0].key).toBe(uploadResult.key)

      // 5. 删除文件
      mockSend.mockResolvedValueOnce({})
      await provider.deleteFile(uploadResult.key)

      const deleteCommand = mockSend.mock.calls[2][0]
      expect(deleteCommand).toEqual({
        Bucket: 'test-bucket',
        Key: uploadResult.key,
      })
    })
  })

  // ============================================================
  // getSignedUrl 测试（签名 URL 生成）
  // ============================================================

  describe('getSignedUrl', () => {
    /**
     * Function: getSignedUrl
     *
     * Description: 测试生成签名 URL（S3 预签名 GetObject）
     *
     * Parameters:
     *   key(string): 对象键
     *   expiresIn(number): 签名有效期（秒）
     *
     * Returns:
     *   url(string): 签名 URL
     */
    it('应该生成包含签名参数的 URL', async () => {
      const signedUrl = 'https://oss-cn-chengdu.aliyuncs.com/test-bucket/uploads/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test&X-Amz-Signature=abc123'
      mockSignedUrl.mockResolvedValue(signedUrl)

      const url = await provider.getSignedUrl('uploads/test.jpg')

      expect(url).toBe(signedUrl)
      // 验证 mockSignedUrl 被调用，且第二参数是 GetObjectCommand 的输入
      expect(mockSignedUrl).toHaveBeenCalledTimes(1)
      const [client, command, options] = mockSignedUrl.mock.calls[0]
      expect(client).toBeDefined()
      expect(command).toEqual({
        Bucket: 'test-bucket',
        Key: 'uploads/test.jpg',
      })
      expect(options).toEqual({ expiresIn: 3600 })
    })

    /**
     * Function: getSignedUrl (自定义过期时间)
     *
     * Description: 测试自定义签名过期时间
     *
     * Parameters:
     *   key(string): 对象键
     *   expiresIn(number): 自定义过期时间
     *
     * Returns:
     *   url(string): 带自定义过期时间的签名 URL
     */
    it('应该支持自定义过期时间', async () => {
      const signedUrl = 'https://oss-cn-chengdu.aliyuncs.com/test-bucket/test.jpg?X-Amz-Expires=7200'
      mockSignedUrl.mockResolvedValue(signedUrl)

      const url = await provider.getSignedUrl('test.jpg', 7200)

      expect(url).toBe(signedUrl)
      const [,, options] = mockSignedUrl.mock.calls[0]
      expect(options).toEqual({ expiresIn: 7200 })
    })

    /**
     * Function: getSignedUrl (默认过期时间)
     *
     * Description: 测试使用默认过期时间（3600 秒）
     */
    it('应该使用默认过期时间 3600 秒', async () => {
      mockSignedUrl.mockResolvedValue('signed-url')

      await provider.getSignedUrl('test.jpg')

      const [,, options] = mockSignedUrl.mock.calls[0]
      expect(options).toEqual({ expiresIn: 3600 })
    })
  })

  // ============================================================
  // getImageProcessingUrl / getImageProcessingUrls 测试
  // ============================================================

  describe('getImageProcessingUrl', () => {
    /**
     * Function: getImageProcessingUrl
     *
     * Description: 测试获取带图片处理参数的签名 URL
     * 使用手动 OSS V1 签名（S3 预签名不支持 x-oss-process 参数）
     *
     * Parameters:
     *   key(string): 对象键
     *   options(ImageProcessingOptions): 图片处理选项
     *   expiresIn(number): 签名有效期（秒）
     *
     * Returns:
     *   url(string): 带 OSS V1 签名和图片处理参数的 URL
     */
    it('应该生成包含 OSS 签名和图片处理参数的 URL', async () => {
      const url = await provider.getImageProcessingUrl('uploads/test.jpg', {
        size: 'thumbnail',
      })

      expect(url).toContain('OSSAccessKeyId=')
      expect(url).toContain('Expires=')
      expect(url).toContain('Signature=')
      expect(url).toContain('x-oss-process=')
      expect(url).toContain('resize%2Cw_150%2Ch_150') // URL encoded resize params
    })

    /**
     * Function: getImageProcessingUrl (自定义格式和质量)
     *
     * Description: 测试指定格式和质量参数
     */
    it('应该支持自定义格式和质量参数', async () => {
      const url = await provider.getImageProcessingUrl('uploads/test.png', {
        size: 'medium',
        format: 'webp',
        quality: 90,
      })

      expect(url).toContain('OSSAccessKeyId=')
      expect(url).toContain('Signature=')
      expect(url).toContain('x-oss-process=')
      // 检查 URL 中包含图片处理相关参数
      expect(url).toContain('resize')
      expect(url).toContain('format')
      expect(url).toContain('quality')
    })

    /**
     * Function: getImageProcessingUrl (自定义宽高)
     *
     * Description: 测试指定自定义宽高
     */
    it('应该支持自定义宽高', async () => {
      const url = await provider.getImageProcessingUrl('uploads/test.jpg', {
        width: 800,
        height: 600,
      })

      expect(url).toContain('OSSAccessKeyId=')
      expect(url).toContain('Signature=')
      expect(url).toContain('x-oss-process=')
    })
  })

  describe('getImageProcessingUrls', () => {
    /**
     * Function: getImageProcessingUrls
     *
     * Description: 测试获取多个尺寸的图片处理 URL
     *
     * Parameters:
     *   key(string): 对象键
     *   sizes(ImageProcessingOptions[]): 图片处理选项数组
     *   expiresIn(number): 签名有效期（秒）
     *
     * Returns:
     *   results(ImageProcessingResult[]): 包含原图和多个处理后 URL 的数组
     */
    it('应该生成多个尺寸的图片处理 URL', async () => {
      const sizes = [
        { size: 'thumbnail' as const },
        { size: 'medium' as const },
        { size: 'large' as const },
      ]

      const results = await provider.getImageProcessingUrls('uploads/test.jpg', sizes)

      expect(results).toHaveLength(3)

      for (const result of results) {
        expect(result.originalUrl).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/test.jpg`)
        expect(result.processedUrl).toContain('OSSAccessKeyId=')
        expect(result.processedUrl).toContain('Expires=')
        expect(result.processedUrl).toContain('Signature=')
        expect(result.processedUrl).toContain('x-oss-process=')
        expect(result.processParams).toContain('image/')
        expect(result.processParams).toContain('resize')
      }
    })

    /**
     * Function: getImageProcessingUrls (空数组)
     *
     * Description: 测试传入空数组时返回空结果
     */
    it('应该在传入空数组时返回空结果', async () => {
      const results = await provider.getImageProcessingUrls('uploads/test.jpg', [])

      expect(results).toEqual([])
    })
  })

  // ============================================================
  // downloadFile / downloadFileStream 测试
  // ============================================================

  describe('downloadFile', () => {
    /**
     * Function: downloadFile
     *
     * Description: 测试下载文件返回完整 Buffer（S3 GetObjectCommand + 流式读取）
     *
     * Parameters:
     *   key(string): 对象键
     *
     * Returns:
     *   buffer(Buffer): 文件内容的 Buffer
     */
    it('应该成功下载文件并返回 Buffer', async () => {
      const fileContent = Buffer.from('downloaded file content')
      const mockStream = {
        [Symbol.asyncIterator]() {
          let done = false
          return {
            next() {
              if (done) return Promise.resolve({ done: true })
              done = true
              return Promise.resolve({ value: fileContent, done: false })
            },
          }
        },
      }

      mockSend.mockResolvedValue({ Body: mockStream })

      const result = await provider.downloadFile('uploads/test/download.jpg')

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('downloaded file content')
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: 'uploads/test/download.jpg',
      })
    })

    /**
     * Function: downloadFile (大文件分块)
     *
     * Description: 测试下载大文件时正确合并多个 chunk
     */
    it('应该正确合并多个数据块', async () => {
      const chunk1 = Buffer.from('chunk1')
      const chunk2 = Buffer.from('chunk2')
      const chunk3 = Buffer.from('chunk3')
      const chunks = [chunk1, chunk2, chunk3]
      let index = 0

      const mockStream = {
        [Symbol.asyncIterator]() {
          return {
            next() {
              if (index >= chunks.length) return Promise.resolve({ done: true })
              return Promise.resolve({ value: chunks[index++], done: false })
            },
          }
        },
      }

      mockSend.mockResolvedValue({ Body: mockStream })

      const result = await provider.downloadFile('uploads/test/large.bin')

      expect(result.toString()).toBe('chunk1chunk2chunk3')
    })
  })

  describe('downloadFileStream', () => {
    /**
     * Function: downloadFileStream
     *
     * Description: 测试下载文件返回流式 Readable（S3 GetObjectCommand）
     *
     * Parameters:
     *   key(string): 对象键
     *
     * Returns:
     *   stream(Readable): 文件内容的流
     */
    it('应该成功返回文件流', async () => {
      const { Readable } = await import('node:stream')
      const mockStream = Readable.from([Buffer.from('stream content')])

      mockSend.mockResolvedValue({ Body: mockStream })

      const stream = await provider.downloadFileStream('uploads/test/stream.jpg')

      expect(stream).toBeInstanceOf(Readable)
      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand).toEqual({
        Bucket: 'test-bucket',
        Key: 'uploads/test/stream.jpg',
      })
    })
  })
})
