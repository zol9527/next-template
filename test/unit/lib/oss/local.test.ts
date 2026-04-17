/**
 * Unit: 本地对象存储 Provider 测试
 *
 * Description: 测试本地文件系统对象存储 Provider 的功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLocal } from '@/lib/storage/providers/local'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

describe('本地 OSS Provider 测试', () => {
  let provider: ObjectStorageProvider
  const testUploadDir = 'test-uploads'
  const testFiles: string[] = []

  beforeEach(async () => {
    // 确保测试目录存在
    const dirPath = path.join(process.cwd(), testUploadDir)
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch {
      // 目录可能已存在
    }
    process.env.LOCAL_UPLOAD_DIR = testUploadDir

    provider = createLocal({
      provider: 'local',
      uploadDir: testUploadDir,
    })
  })

  afterEach(async () => {
    // 清理测试文件
    for (const filePath of testFiles) {
      try {
        await fs.unlink(filePath)
      } catch {
        // 忽略删除错误
      }
    }
    testFiles.length = 0

    // 清理测试目录
    try {
      const dirPath = path.join(process.cwd(), testUploadDir)
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dirPath, entry.name)
          await fs.rm(fullPath, { recursive: true, force: true })
        }
      }
    } catch {
      // 忽略目录清理错误
    }
  })

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
      expect(policy.provider).toBe('local')
      // 当没有设置 LOCAL_UPLOAD_HOST 时，使用相对路径
      expect(policy.uploadUrl).toBe('/api/v1/admin/upload/local')
      expect(policy.formFields).toBeDefined()
      expect(policy.formFields.contentType).toBe('image/jpeg')
      expect(policy.expireAt).toBeDefined()
      expect(policy.objectKey).toBeDefined()
      expect(policy.fileUrl).toBeDefined()
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

      expect(policy.provider).toBe('local')
      expect(policy.objectKey).toContain('uploads/')
      // 不应该包含 purpose 前缀（因为没提供）
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
        // 使用 toMatch 而不是 endsWith
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
     * Description: 测试生成的过期时间应该在未来 1 小时内
     */
    it('应该生成正确的过期时间', async () => {
      const policy = await provider.issueUploadPolicy({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })

      const expireTime = new Date(policy.expireAt).getTime()
      const now = Date.now()
      const oneHourLater = now + 3600 * 1000

      // 过期时间应该在未来 1 小时左右（允许 5 秒误差）
      expect(expireTime).toBeGreaterThanOrEqual(oneHourLater - 5000)
      expect(expireTime).toBeLessThanOrEqual(oneHourLater + 5000)
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
      // 当没有设置 LOCAL_UPLOAD_HOST 时，使用相对路径
      expect(policy.fileUrl).toMatch(/^\/api\/v1\/public\/files\//)
      expect(policy.fileUrl).toContain(policy.objectKey!)
    })
  })

  describe('uploadFile', () => {
    /**
     * Function: uploadFile
     *
     * Description: 测试服务端上传文件到本地文件系统
     *
     * Parameters:
     *   params(object): 包含 file (Buffer), key, contentType 的参数
     *
     * Returns:
     *   result(UploadFileResult): 包含 url 和 key 的上传结果
     */
    it('应该成功上传文件到本地文件系统', async () => {
      const fileContent = Buffer.from('test file content')
      const key = 'uploads/test/test-file.txt'

      const result = await provider.uploadFile({
        file: fileContent,
        key,
        contentType: 'text/plain',
      })

      expect(result).toBeDefined()
      expect(result.key).toBe(key)
      // 当没有设置 LOCAL_UPLOAD_HOST 时，使用相对路径
      expect(result.url).toBe(`/api/v1/public/files/${key}`)

      // 验证文件已写入（路径不包含 uploads 前缀，因为 key 已经包含了）
      const filePath = path.join(process.cwd(), testUploadDir, 'test/test-file.txt')
      testFiles.push(filePath)
      const writtenContent = await fs.readFile(filePath)
      expect(writtenContent).toEqual(fileContent)
    })

    /**
     * Function: uploadFile (自动创建目录)
     *
     * Description: 测试上传到不存在的目录时自动创建目录
     */
    it('应该在上传到不存在的目录时自动创建目录', async () => {
      const fileContent = Buffer.from('nested file content')
      const key = 'uploads/nested/deep/path/file.txt'

      const result = await provider.uploadFile({
        file: fileContent,
        key,
        contentType: 'text/plain',
      })

      expect(result.key).toBe(key)

      // 验证文件存在
      const filePath = path.join(process.cwd(), testUploadDir, 'nested/deep/path/file.txt')
      testFiles.push(filePath)
      const exists = await fs.access(filePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    /**
     * Function: uploadFile (二进制文件)
     *
     * Description: 测试上传二进制文件内容
     */
    it('应该正确处理二进制文件内容', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const key = 'uploads/binary/test.bin'

      const result = await provider.uploadFile({
        file: binaryContent,
        key,
        contentType: 'application/octet-stream',
      })

      expect(result.key).toBe(key)

      // 验证二进制内容
      const filePath = path.join(process.cwd(), testUploadDir, 'binary/test.bin')
      testFiles.push(filePath)
      const writtenContent = await fs.readFile(filePath)
      expect(writtenContent).toEqual(binaryContent)
    })
  })

  describe('deleteFile', () => {
    /**
     * Function: deleteFile
     *
     * Description: 测试删除已存在的文件
     *
     * Parameters:
     *   key(string): 文件的对象键
     */
    it('应该成功删除已存在的文件', async () => {
      // 先创建文件
      const fileContent = Buffer.from('to be deleted')
      const key = 'uploads/delete/test-file.txt'
      const filePath = path.join(process.cwd(), testUploadDir, 'delete/test-file.txt')

      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, fileContent)

      // 删除文件
      await provider.deleteFile(key)

      // 验证文件已删除
      const exists = await fs.access(filePath).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })

    /**
     * Function: deleteFile (不存在的文件)
     *
     * Description: 测试删除不存在的文件时不抛出错误
     */
    it('应该在删除不存在的文件时不抛出错误', async () => {
      const nonExistentKey = 'uploads/nonexistent/file.txt'

      // 不应该抛出错误
      await expect(provider.deleteFile(nonExistentKey)).resolves.toBeUndefined()
    })
  })

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
      const url = await provider.getFileUrl(key)

      // 当没有设置 LOCAL_UPLOAD_HOST 时，使用相对路径
      expect(url).toBe(`/api/v1/public/files/${key}`)
    })

    /**
     * Function: getFileUrl (路径编码)
     *
     * Description: 测试处理包含特殊字符的路径
     */
    it('应该正确处理包含特殊字符的路径', async () => {
      const key = 'uploads/test folder/image with spaces.jpg'
      const url = await provider.getFileUrl(key)

      expect(url).toContain('uploads/test folder/image with spaces.jpg')
    })
  })

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
    it('应该列出目录下的文件', async () => {
      // 先创建一些测试文件
      // 注意：key 是相对于 uploadDir 的路径
      const files = [
        { key: 'list-test/file1.txt', content: 'file1' },
        { key: 'list-test/file2.txt', content: 'file2' },
        { key: 'list-test/nested/file3.txt', content: 'file3' },
      ]

      for (const f of files) {
        const filePath = path.join(process.cwd(), testUploadDir, f.key)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, f.content)
        testFiles.push(filePath)
      }

      const result = await provider.listFiles({ prefix: 'list-test', maxKeys: 10 })

      expect(result).toBeDefined()
      expect(result.files).toBeDefined()
      expect(result.prefix).toBe('list-test')
      // 递归搜索会包含 nested 子目录的文件
      expect(result.files.length).toBe(3)
      expect(result.files.map(f => f.key)).toContain('uploads/list-test/file1.txt')
      expect(result.files.map(f => f.key)).toContain('uploads/list-test/file2.txt')
      expect(result.files.map(f => f.key)).toContain('uploads/list-test/nested/file3.txt')
      expect(result.isTruncated).toBe(false)
      expect(result.nextContinuationToken).toBeNull()
    })

    /**
     * Function: listFiles (空目录)
     *
     * Description: 测试列出空目录
     */
    it('应该返回空列表当目录为空', async () => {
      const result = await provider.listFiles({ prefix: 'non-existent-dir', maxKeys: 10 })

      expect(result.files).toEqual([])
      expect(result.isTruncated).toBe(false)
      expect(result.prefix).toBe('non-existent-dir')
    })

    /**
     * Function: listFiles (分页)
     *
     * Description: 测试分页功能
     */
    it('应该支持分页列出文件', async () => {
      // 创建 3 个文件
      for (let i = 1; i <= 3; i++) {
        const key = `pagination-test/file${i}.txt`
        const filePath = path.join(process.cwd(), testUploadDir, key)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, `content${i}`)
        testFiles.push(filePath)
      }

      // 第一次列出 2 个文件
      const page1 = await provider.listFiles({ prefix: 'pagination-test', maxKeys: 2 })

      expect(page1.files.length).toBe(2)
      expect(page1.isTruncated).toBe(true)
      expect(page1.nextContinuationToken).not.toBeNull()

      // 使用 continuationToken 获取下一页
      const page2 = await provider.listFiles({
        prefix: 'pagination-test',
        maxKeys: 2,
        continuationToken: page1.nextContinuationToken!,
      })

      expect(page2.files.length).toBe(1)
      expect(page2.isTruncated).toBe(false)
      expect(page2.nextContinuationToken).toBeNull()
    })
  })

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
      // 创建测试文件
      const files = [
        { key: 'search-test/product-avatar-1.jpg', content: 'avatar1' },
        { key: 'search-test/product-avatar-2.jpg', content: 'avatar2' },
        { key: 'search-test/other-image.png', content: 'other' },
      ]

      for (const f of files) {
        const filePath = path.join(process.cwd(), testUploadDir, f.key)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, f.content)
        testFiles.push(filePath)
      }

      const result = await provider.searchFiles({ query: 'avatar', maxResults: 10 })

      expect(result).toBeDefined()
      expect(result.files).toBeDefined()
      expect(result.totalCount).toBe(2)
      expect(result.files.length).toBe(2)
      expect(result.files.every(f => f.key.includes('avatar'))).toBe(true)
    })

    /**
     * Function: searchFiles (无匹配)
     *
     * Description: 测试搜索无匹配结果
     */
    it('应该返回空列表当没有匹配文件', async () => {
      const result = await provider.searchFiles({ query: 'nonexistent', maxResults: 10 })

      expect(result.files).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    /**
     * Function: searchFiles (限制数量)
     *
     * Description: 测试限制返回数量
     */
    it('应该限制返回结果数量', async () => {
      // 创建 5 个匹配文件
      for (let i = 1; i <= 5; i++) {
        const key = `search-limit-test/match${i}.txt`
        const filePath = path.join(process.cwd(), testUploadDir, key)
        const dirPath = path.dirname(filePath)
        await fs.mkdir(dirPath, { recursive: true })
        await fs.writeFile(filePath, `match${i}`)
        testFiles.push(filePath)
      }

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
      // 使用唯一目录避免测试间干扰
      const testDir = `sc-test-${Date.now()}`
      const files = [
        { key: `${testDir}/foo.txt`, content: 'test' },
      ]

      // 先创建测试文件
      for (const f of files) {
        const filePath = path.join(process.cwd(), testUploadDir, f.key)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, f.content)
        testFiles.push(filePath)
      }

      // 验证大小写不敏感搜索 - 搜索 "FOO" 应该能找到 "foo.txt"
      const result = await provider.searchFiles({ query: 'FOO', maxResults: 10 })

      expect(result.totalCount).toBe(1)
      expect(result.files.length).toBe(1)
      expect(result.files[0].key).toContain('foo.txt')
    })
  })

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
      const uploadResult = await provider.uploadFile({
        file: fileContent,
        key: policy.objectKey!,
        contentType: 'image/jpeg',
      })

      // 3. 获取文件 URL
      const fileUrl = await provider.getFileUrl(uploadResult.key)
      expect(fileUrl).toBe(uploadResult.url)

      // 4. 删除文件
      await provider.deleteFile(uploadResult.key)

      // 5. 验证文件已删除
      const filePath = path.join(process.cwd(), testUploadDir, uploadResult.key)
      const exists = await fs.access(filePath).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })
  })
})
