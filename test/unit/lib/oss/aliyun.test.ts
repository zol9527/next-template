/**
 * Unit: 阿里云 OSS Provider 测试
 *
 * Description: 测试阿里云对象存储 Provider 的功能
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
// Mock ali-oss SDK
// ============================================================

const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockList = vi.fn()
const mockSignatureUrl = vi.fn()
const mockGet = vi.fn()

vi.mock('ali-oss', () => ({
  default: vi.fn(() => ({
    put: mockPut,
    delete: mockDelete,
    list: mockList,
    signatureUrl: mockSignatureUrl,
    get: mockGet,
  })),
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

    provider = createAliyun({
      provider: 'aliyun_oss',
      accessKeyId: mockEnv.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: mockEnv.ALIYUN_OSS_ACCESS_KEY_SECRET,
      bucket: mockEnv.ALIYUN_OSS_BUCKET,
      region: 'oss-cn-chengdu',
      endpoint: mockEnv.ALIYUN_OSS_UPLOAD_HOST,
      dirPrefix: mockEnv.ALIYUN_OSS_DIR_PREFIX,
      ttlSeconds: mockEnv.ALIYUN_OSS_POLICY_TTL_SECONDS,
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
     * Description: 测试获取上传策略（用于客户端直传）
     *
     * Parameters:
     *   params(object): 包含 contentType, sizeBytes, purpose 的参数
     *
     * Returns:
     *   policy(UploadPolicyResponse): 上传策略响应
     */
    it('应该生成有效的上传策略', async () => {
      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024 * 1024, // 1MB
        purpose: 'avatar',
      })

      expect(policy).toBeDefined()
      expect(policy.provider).toBe('aliyun_oss')
      expect(policy.uploadUrl).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/`)
      expect(policy.formFields).toBeDefined()
      expect(policy.formFields.bucket).toBe('test-bucket')
      expect(policy.formFields.key).toBeDefined()
      expect(policy.formFields.policy).toBeDefined()
      expect(policy.formFields.OSSAccessKeyId).toBe('test-access-key-id')
      expect(policy.formFields.Signature).toBeDefined()
      expect(policy.formFields['Content-Type']).toBe('image/jpeg')
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
     * Description: 测试服务端上传文件到阿里云 OSS
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

      mockPut.mockResolvedValue({
        name: key,
        url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`,
        res: {
          status: 200,
          statusCode: 200,
          headers: {},
        },
      })

      const result = await provider.uploadFile({
        file: fileContent,
        key,
        contentType: 'image/jpeg',
      })

      expect(result).toBeDefined()
      expect(result.key).toBe(key)
      expect(result.url).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`)
      expect(mockPut).toHaveBeenCalledWith(key, fileContent, {
        headers: { 'Content-Type': 'image/jpeg' },
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

      mockPut.mockResolvedValue({
        name: key,
        url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`,
        res: { status: 200, statusCode: 200, headers: {} },
      })

      const result = await provider.uploadFile({
        file: binaryContent,
        key,
        contentType: 'application/octet-stream',
      })

      expect(result.key).toBe(key)
      expect(mockPut).toHaveBeenCalledWith(key, binaryContent, {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    })

    /**
     * Function: uploadFile (缺少配置)
     *
     * Description: 测试缺少 ALIYUN_OSS_UPLOAD_HOST 时抛出错误
     */
    it('应该在缺少 ALIYUN_OSS_UPLOAD_HOST 时抛出错误', async () => {
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
     * Description: 测试删除 OSS 上的文件
     *
     * Parameters:
     *   key(string): 文件的对象键
     */
    it('应该成功删除已存在的文件', async () => {
      const key = 'uploads/test/test-file.jpg'

      mockDelete.mockResolvedValue({})

      await provider.deleteFile(key)

      expect(mockDelete).toHaveBeenCalledWith(key)
    })

    /**
     * Function: deleteFile (包含特殊字符)
     *
     * Description: 测试删除包含特殊字符路径的文件
     */
    it('应该正确处理包含特殊字符的路径', async () => {
      const key = 'uploads/test folder/image with spaces.jpg'

      mockDelete.mockResolvedValue({})

      await provider.deleteFile(key)

      expect(mockDelete).toHaveBeenCalledWith(key)
    })

    /**
     * Function: deleteFile (网络错误)
     *
     * Description: 测试删除时遇到网络错误
     */
    it('应该在删除失败时抛出错误', async () => {
      const key = 'uploads/nonexistent/file.jpg'

      mockDelete.mockRejectedValue(new Error('Network error'))

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
     * Description: 测试覆盖已存在的文件
     *
     * Parameters:
     *   params(object): 包含 file (Buffer), key, contentType 的参数
     */
    it('应该支持覆盖已存在的文件', async () => {
      const key = 'uploads/existing/file.jpg'
      const originalContent = Buffer.from('original content')
      const newContent = Buffer.from('new content')

      // 第一次上传
      mockPut.mockResolvedValueOnce({
        name: key,
        url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`,
        res: { status: 200, statusCode: 200, headers: {} },
      })

      await provider.uploadFile({
        file: originalContent,
        key,
        contentType: 'image/jpeg',
      })

      // 覆盖上传
      mockPut.mockResolvedValueOnce({
        name: key,
        url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`,
        res: { status: 200, statusCode: 200, headers: {} },
      })

      const result = await provider.uploadFile({
        file: newContent,
        key,
        contentType: 'image/jpeg',
      })

      expect(result.key).toBe(key)
      expect(mockPut).toHaveBeenCalledTimes(2)
      expect(mockPut).toHaveBeenLastCalledWith(key, newContent, {
        headers: { 'Content-Type': 'image/jpeg' },
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
     * Description: 测试列出目录下的文件
     *
     * Parameters:
     *   params(object): 包含 prefix, maxKeys 的参数
     *
     * Returns:
     *   result(ListFilesResponse): 包含文件列表的响应
     */
    it('应该列出指定前缀的文件', async () => {
      const mockObjects = [
        {
          name: 'uploads/images/photo1.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/images/photo1.jpg`,
          lastModified: new Date('2025-01-15T10:00:00Z'),
          size: 1024,
          etag: '"abc123"',
          type: 'image/jpeg',
        },
        {
          name: 'uploads/images/photo2.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/images/photo2.jpg`,
          lastModified: new Date('2025-01-15T11:00:00Z'),
          size: 2048,
          etag: '"def456"',
          type: 'image/jpeg',
        },
      ]

      mockList.mockResolvedValue({
        objects: mockObjects,
        prefixes: [],
        isTruncated: false,
      })

      const result = await provider.listFiles({ prefix: 'uploads/images', maxKeys: 100 })

      expect(result).toBeDefined()
      expect(result.files).toHaveLength(2)
      expect(result.files[0].key).toBe('uploads/images/photo1.jpg')
      expect(result.files[0].size).toBe(1024)
      expect(result.files[0].contentType).toBe('image/jpeg')
      expect(result.files[0].etag).toBe('abc123')
      expect(result.isTruncated).toBe(false)
      expect(result.nextContinuationToken).toBeNull()
      expect(result.prefix).toBe('uploads/images')
      expect(mockList).toHaveBeenCalledWith(
        { prefix: 'uploads/images', 'max-keys': 100, marker: undefined },
        {}
      )
    })

    /**
     * Function: listFiles (空列表)
     *
     * Description: 测试列出空目录
     */
    it('应该返回空列表当没有文件', async () => {
      mockList.mockResolvedValue({
        objects: [],
        prefixes: [],
        isTruncated: false,
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
      const page1Objects = [
        {
          name: 'uploads/page/file1.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/page/file1.jpg`,
          lastModified: new Date(),
          size: 1024,
          etag: '"1"',
          type: 'image/jpeg',
        },
        {
          name: 'uploads/page/file2.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/page/file2.jpg`,
          lastModified: new Date(),
          size: 2048,
          etag: '"2"',
          type: 'image/jpeg',
        },
      ]

      mockList.mockResolvedValueOnce({
        objects: page1Objects,
        prefixes: [],
        isTruncated: true,
        nextMarker: 'marker-123',
      })

      const page1 = await provider.listFiles({ prefix: 'uploads/page', maxKeys: 2 })

      expect(page1.files.length).toBe(2)
      expect(page1.isTruncated).toBe(true)
      expect(page1.nextContinuationToken).toBe('marker-123')

      // 第二页数据
      const page2Objects = [
        {
          name: 'uploads/page/file3.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/page/file3.jpg`,
          lastModified: new Date(),
          size: 3072,
          etag: '"3"',
          type: 'image/jpeg',
        },
      ]

      mockList.mockResolvedValueOnce({
        objects: page2Objects,
        prefixes: [],
        isTruncated: false,
      })

      const page2 = await provider.listFiles({
        prefix: 'uploads/page',
        maxKeys: 2,
        continuationToken: 'marker-123',
      })

      expect(page2.files.length).toBe(1)
      expect(page2.isTruncated).toBe(false)
      expect(page2.nextContinuationToken).toBeNull()
      expect(mockList).toHaveBeenLastCalledWith(
        { prefix: 'uploads/page', 'max-keys': 2, marker: 'marker-123' },
        {}
      )
    })

    /**
     * Function: listFiles (缺少 etag)
     *
     * Description: 测试处理缺少 etag 的文件对象
     */
    it('应该正确处理缺少 etag 的文件对象', async () => {
      const mockObjects = [
        {
          name: 'uploads/test/file.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/test/file.jpg`,
          lastModified: new Date(),
          size: 1024,
          // 没有 etag
          type: 'image/jpeg',
        },
      ]

      mockList.mockResolvedValue({
        objects: mockObjects,
        prefixes: [],
        isTruncated: false,
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
     * Description: 测试搜索文件
     *
     * Parameters:
     *   params(object): 包含 query, maxResults 的参数
     *
     * Returns:
     *   result(SearchFilesResponse): 包含匹配文件的响应
     */
    it('应该根据关键字搜索文件', async () => {
      const mockObjects = [
        {
          name: 'uploads/images/avatar-1.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/images/avatar-1.jpg`,
          lastModified: new Date(),
          size: 1024,
          etag: '"1"',
          type: 'image/jpeg',
        },
        {
          name: 'uploads/images/avatar-2.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/images/avatar-2.jpg`,
          lastModified: new Date(),
          size: 2048,
          etag: '"2"',
          type: 'image/jpeg',
        },
        {
          name: 'uploads/images/other.png',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/images/other.png`,
          lastModified: new Date(),
          size: 512,
          etag: '"3"',
          type: 'image/png',
        },
      ]

      mockList.mockResolvedValue({
        objects: mockObjects,
        prefixes: [],
        isTruncated: false,
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
      mockList.mockResolvedValue({
        objects: [],
        prefixes: [],
        isTruncated: false,
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
      const mockObjects = []
      for (let i = 1; i <= 5; i++) {
        mockObjects.push({
          name: `uploads/test/match${i}.txt`,
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/test/match${i}.txt`,
          lastModified: new Date(),
          size: 1024,
          etag: `"${i}"`,
          type: 'text/plain',
        })
      }

      mockList.mockResolvedValue({
        objects: mockObjects,
        prefixes: [],
        isTruncated: false,
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
      const mockObjects = [
        {
          name: 'uploads/test/FOO.jpg',
          url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/uploads/test/FOO.jpg`,
          lastModified: new Date(),
          size: 1024,
          etag: '"1"',
          type: 'image/jpeg',
        },
      ]

      mockList.mockResolvedValue({
        objects: mockObjects,
        prefixes: [],
        isTruncated: false,
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
     * Description: 测试获取文件访问 URL
     *
     * Parameters:
     *   key(string): 文件的对象键
     *
     * Returns:
     *   url(string): 文件访问 URL
     */
    it('应该返回正确的文件 URL', async () => {
      const key = 'uploads/test/image.jpg'
      mockSignatureUrl.mockResolvedValue(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}?signature=xxx`)

      const url = await provider.getFileUrl(key)

      expect(url).toBe(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}`)
    })

    /**
     * Function: getFileUrl (文件不存在)
     *
     * Description: 测试文件不存在时仍然返回 URL
     */
    it('应该在文件不存在时仍然返回 URL', async () => {
      const key = 'uploads/nonexistent/file.jpg'
      mockSignatureUrl.mockRejectedValue(new Error('File not found'))

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
      mockSignatureUrl.mockResolvedValue(`${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${key}?signature=xxx`)

      const url = await provider.getFileUrl(key)

      expect(url).toContain('uploads/test folder/image with spaces.jpg')
    })

    /**
     * Function: getFileUrl (缺少配置)
     *
     * Description: 测试缺少 ALIYUN_OSS_UPLOAD_HOST 时抛出错误
     */
    it('应该在缺少 ALIYUN_OSS_UPLOAD_HOST 时抛出错误', async () => {
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
      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        purpose: 'lifecycle-test',
      })

      expect(policy.objectKey).toBeDefined()

      // 2. 上传文件
      const fileContent = Buffer.from('lifecycle test content')
      mockPut.mockResolvedValue({
        name: policy.objectKey!,
        url: `${mockEnv.ALIYUN_OSS_UPLOAD_HOST}/${policy.objectKey}`,
        res: { status: 200, statusCode: 200, headers: {} },
      })

      const uploadResult = await provider.uploadFile({
        file: fileContent,
        key: policy.objectKey!,
        contentType: 'image/jpeg',
      })

      expect(uploadResult.key).toBe(policy.objectKey)

      // 3. 获取文件 URL
      mockSignatureUrl.mockResolvedValue(uploadResult.url)
      const fileUrl = await provider.getFileUrl(uploadResult.key)
      expect(fileUrl).toBe(uploadResult.url)

      // 4. 列出文件
      mockList.mockResolvedValue({
        objects: [
          {
            name: uploadResult.key,
            url: uploadResult.url,
            lastModified: new Date(),
            size: fileContent.length,
            etag: '"abc123"',
            type: 'image/jpeg',
          },
        ],
        prefixes: [],
        isTruncated: false,
      })

      const listResult = await provider.listFiles({ prefix: 'uploads/lifecycle-test', maxKeys: 10 })
      expect(listResult.files.length).toBe(1)
      expect(listResult.files[0].key).toBe(uploadResult.key)

      // 5. 删除文件
      mockDelete.mockResolvedValue({})
      await provider.deleteFile(uploadResult.key)

      expect(mockDelete).toHaveBeenCalledWith(uploadResult.key)
    })
  })

  // ============================================================
  // getSignedUrl 测试（签名 URL 生成）
  // ============================================================

  describe('getSignedUrl', () => {
    /**
     * Function: getSignedUrl
     *
     * Description: 测试生成签名 URL（支持私有 Bucket 访问）
     *
     * Parameters:
     *   key(string): 对象键
     *   expiresIn(number): 签名有效期（秒）
     *
     * Returns:
     *   url(string): 签名 URL
     */
    it('应该生成包含签名参数的 URL', async () => {
      const signedUrl = 'https://test-bucket.oss-cn-chengdu.aliyuncs.com/uploads/test.jpg?OSSAccessKeyId=test&Expires=1234567890&Signature=abc123'
      mockSignatureUrl.mockReturnValue(signedUrl)

      const url = await provider.getSignedUrl('uploads/test.jpg')

      expect(mockSignatureUrl).toHaveBeenCalledWith('uploads/test.jpg', { expires: 3600 })
      expect(url).toBe(signedUrl)
      expect(url).toContain('OSSAccessKeyId=')
      expect(url).toContain('Expires=')
      expect(url).toContain('Signature=')
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
      const signedUrl = 'https://test-bucket.oss-cn-chengdu.aliyuncs.com/test.jpg?Expires=1734567890'
      mockSignatureUrl.mockReturnValue(signedUrl)

      const url = await provider.getSignedUrl('test.jpg', 7200)

      expect(mockSignatureUrl).toHaveBeenCalledWith('test.jpg', { expires: 7200 })
      expect(url).toBe(signedUrl)
    })

    /**
     * Function: getSignedUrl (默认过期时间)
     *
     * Description: 测试使用默认过期时间（3600 秒）
     */
    it('应该使用默认过期时间 3600 秒', async () => {
      mockSignatureUrl.mockReturnValue('signed-url')

      await provider.getSignedUrl('test.jpg')

      expect(mockSignatureUrl).toHaveBeenCalledWith('test.jpg', { expires: 3600 })
    })
  })
})
