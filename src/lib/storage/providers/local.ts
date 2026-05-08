/**
 * 本地文件系统存储提供者
 *
 * 使用本地文件系统存储文件，适用于开发环境或单服务器部署
 * 文件存储在指定的 uploadDir 目录中
 *
 * 注意：对于 user-documents 目录下的文件，返回内部 API 路径
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { LocalStorageConfig } from '@/lib/storage/types/config'
import type { UploadPolicyRequest } from '@/lib/storage/schema'
import type { FileMetadata } from '@/lib/storage/schema'

// ============================================================
// 工具函数
// ============================================================

/**
 * 检查是否是用户文档路径（需要通过内部 API 访问）
 */
function isUserDocumentPath(key: string): boolean {
  return key.startsWith('user-documents/')
}

/**
 * 获取文件访问 URL（根据路径类型返回不同 URL）
 */
function getFileUrl(key: string): string {
  if (isUserDocumentPath(key)) {
    return `/api/v1/internal/user-documents/${key.replace(/^user-documents\//, '')}/file`
  }
  return `/api/v1/public/files/${key}`
}

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
 * 验证路径安全性（防止路径遍历）
 *
 * @param baseDir - 基础目录（绝对路径）
 * @param relativePath - 相对路径
 * @returns 安全的绝对路径
 * @throws {Error} 当检测到路径遍历尝试时
 */
function getSafePath(baseDir: string, relativePath: string): string {
  // 解析绝对路径
  const resolvedPath = path.resolve(baseDir, relativePath)

  // 确保解析后的路径仍然在 baseDir 内 (避免 sibling directory 攻击)
  // 必须以 baseDir + path.sep 开头，或者是 baseDir 本身
  const baseDirWithSep = baseDir.endsWith(path.sep) ? baseDir : `${baseDir}${path.sep}`

  if (resolvedPath !== baseDir && !resolvedPath.startsWith(baseDirWithSep)) {
    throw new Error('Invalid file path: Access denied')
  }

  return resolvedPath
}

/**
 * 创建本地存储 Provider
 *
 * @param options - 配置选项
 * @returns ObjectStorageProvider 实例
 * @throws {Error} 当必需参数缺失时抛出错误
 */
export function createLocal(options: LocalStorageConfig): ObjectStorageProvider {
  const {
    uploadDir = 'uploads',
    uploadHost,
    dirPrefix = 'uploads',
  } = options

  // 参数验证（本地存储只需要可选的 uploadDir）
  if (!uploadDir?.trim()) {
    throw new Error('Local Storage: uploadDir is required')
  }

  // 计算绝对基础路径
  const absoluteBaseDir = path.resolve(process.cwd(), uploadDir)

  /**
   * 获取目录前缀（用于生成 objectKey）
   */
  const getDirPrefix = (): string => {
    const normalized = dirPrefix.replace(/^\.\/|^\/+/, '').replace(/\/+$/, '')
    return normalized ? `${normalized}/` : ''
  }

  /**
   * 从 key 中移除目录前缀，获取相对于 uploadDir 的路径
   */
  const stripDirPrefix = (key: string): string => {
    const prefix = getDirPrefix()
    if (prefix && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  return {
    /**
     * 签发上传策略（返回本地 API 上传地址）
     */
    async issueUploadPolicy({ contentType, purpose }: UploadPolicyRequest) {
      const directoryPrefix = getDirPrefix()
      const purposePrefix = purpose ? sanitizePrefix(purpose) : ''
      const ext = extensionFromContentType(contentType)
      const objectKey = `${directoryPrefix}${purposePrefix}${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

      const uploadUrl = uploadHost
        ? `${uploadHost}/api/v1/admin/upload/local`
        : '/api/v1/admin/upload/local'

      return {
        provider: 'local',
        uploadUrl,
        formFields: {
          bucket: 'local',
          key: objectKey,
          contentType,
        },
        expireAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        objectKey,
        fileUrl: getFileUrl(objectKey),
      }
    },

    /**
     * 服务端直接上传文件
     */
    async uploadFile({ file, key }) {
      const relativeKey = stripDirPrefix(key)

      // 使用安全路径解析
      const filePath = getSafePath(absoluteBaseDir, relativeKey)

      // 确保目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, file)

      return {
        url: getFileUrl(key),
        key,
      }
    },

    /**
     * 删除文件
     */
    async deleteFile(key: string) {
      const relativeKey = stripDirPrefix(key)

      try {
        // 使用安全路径解析
        const filePath = getSafePath(absoluteBaseDir, relativeKey)
        await fs.unlink(filePath)
      } catch (error) {
        // 如果是路径安全错误，我们可能应该抛出，或者为了隐蔽性而忽略？
        // 这里选择抛出，因为这是一个明确的错误操作（通常是攻击）
        if ((error as Error).message === 'Invalid file path: Access denied') {
          throw error
        }

        // 文件不存在时忽略错误
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error
        }
      }
    },

    /**
     * 下载文件，返回完整 Buffer
     */
    async downloadFile(key: string): Promise<Buffer> {
      const relativeKey = stripDirPrefix(key)
      const filePath = getSafePath(absoluteBaseDir, relativeKey)
      return fs.readFile(filePath)
    },

    /**
     * 下载文件，返回流式 Readable
     */
    async downloadFileStream(key: string): Promise<Readable> {
      const relativeKey = stripDirPrefix(key)
      const filePath = getSafePath(absoluteBaseDir, relativeKey)
      return createReadStream(filePath)
    },

    /**
     * 获取文件访问 URL
     */
    async getFileUrl(key: string) {
      return getFileUrl(key)
    },

    /**
     * 获取签名 URL（本地存储根据路径类型返回不同 URL）
     */
    async getSignedUrl(key: string) {
      return getFileUrl(key)
    },

    /**
     * 列出文件列表
     */
    async listFiles({ prefix, maxKeys = 100, continuationToken }) {
      const directoryPrefix = getDirPrefix()

      // 将 prefix（可能包含 dirPrefix）转换为文件系统路径
      // 注意：这里也要防止 searchPrefix 逃逸出 baseDir
      let searchPrefix = absoluteBaseDir
      if (prefix) {
         const relPrefix = stripDirPrefix(prefix)
         // searchPrefix 可以是一个目录或文件前缀，不一定是完整的文件路径
         // 但它必须在 baseDir 下
         const potentialPath = path.resolve(absoluteBaseDir, relPrefix)
         const baseDirWithSep = absoluteBaseDir.endsWith(path.sep) ? absoluteBaseDir : `${absoluteBaseDir}${path.sep}`

         if (potentialPath === absoluteBaseDir || potentialPath.startsWith(baseDirWithSep)) {
            searchPrefix = potentialPath
         } else {
             // 如果前缀尝试跳出目录，我们可以抛错，或者视为空结果
             // 为了安全，抛错或者返回空
             // 返回空比较好，避免报错泄露信息
             return {
                files: [],
                isTruncated: false,
                prefix: prefix ?? null,
                nextContinuationToken: null
             }
         }
      }

      const entries: FileMetadata[] = []
      const allEntries: string[] = []

      /**
       * 递归扫描目录
       */
      async function scanDirectory(dir: string) {
        try {
          // 再次确保 dir 安全（虽然 searchPrefix 已经检查过）
          const baseDirWithSep = absoluteBaseDir.endsWith(path.sep) ? absoluteBaseDir : `${absoluteBaseDir}${path.sep}`
          if (dir !== absoluteBaseDir && !dir.startsWith(baseDirWithSep)) return

          const dirents = await fs.readdir(dir, { withFileTypes: true })
          for (const dirent of dirents) {
            const fullPath = path.join(dir, dirent.name)
            if (dirent.isFile()) {
              const relativePath = path.relative(absoluteBaseDir, fullPath)
              allEntries.push(relativePath)
            } else if (dirent.isDirectory()) {
              await scanDirectory(fullPath)
            }
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
          }
        }
      }

      await scanDirectory(searchPrefix)
      allEntries.sort()

      // 处理分页
      let startIndex = 0
      if (continuationToken) {
        const tokenDecoded = Buffer.from(continuationToken, 'base64').toString('utf8')
        startIndex = allEntries.indexOf(tokenDecoded)
        if (startIndex === -1) startIndex = 0
      }

      const paginatedEntries = allEntries.slice(startIndex, startIndex + maxKeys)

      // 获取文件元数据
      for (const entry of paginatedEntries) {
        const fullPath = path.join(absoluteBaseDir, entry)
        try {
          const stat = await fs.stat(fullPath)
          entries.push({
            key: `${directoryPrefix}${entry.replace(/\\/g, '/')}`,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            etag: null,
            contentType: 'application/octet-stream',
          })
        } catch {
          // 跳过无法读取的文件
        }
      }

      const nextToken = startIndex + maxKeys < allEntries.length
        ? Buffer.from(allEntries[startIndex + maxKeys]).toString('base64')
        : null

      return {
        files: entries,
        nextContinuationToken: nextToken,
        isTruncated: startIndex + maxKeys < allEntries.length,
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
     * 获取图片处理 URL（本地存储不支持，返回原图 URL）
     */
    async getImageProcessingUrl(key: string): Promise<string> {
      // 本地存储不支持图片处理，返回原图 URL
      return getFileUrl(key)
    },

    /**
     * 获取多个图片处理 URL（本地存储不支持，返回原图 URL）
     */
    async getImageProcessingUrls(key: string): Promise<Array<{ originalUrl: string; processedUrl: string; processParams: string }>> {
      const originalUrl = getFileUrl(key)
      // 本地存储不支持图片处理，返回包含 processParams: 'unsupported' 的结果
      return [{
        originalUrl,
        processedUrl: originalUrl,
        processParams: 'unsupported',
      }]
    },
  }
}
