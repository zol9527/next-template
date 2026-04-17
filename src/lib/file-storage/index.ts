import { promises as fs } from 'fs'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import { env } from '@/config'

/**
 * 文件存储工具类
 * 负责处理用户证件的本地文件存储操作
 */
export class FileStorage {
  private storageDir: string

  constructor() {
    this.storageDir = env.USER_DOCUMENTS_STORAGE_DIR
  }

  /**
   * 生成唯一的文件名
   * @param userId 用户 ID
   * @param documentType 证件类型
   * @param originalFileName 原始文件名
   * @returns 生成的文件名
   */
  generateFileName(userId: string, documentType: string, originalFileName: string): string {
    const timestamp = Date.now()
    const ext = path.extname(originalFileName)
    return `${userId}_${documentType}_${timestamp}${ext}`
  }

  /**
   * 生成文件存储路径（相对路径）
   * @param userId 用户 ID
   * @param documentType 证件类型
   * @returns 相对文件路径
   */
  generateFilePath(userId: string, documentType: string): string {
    return path.join(this.storageDir, userId, documentType)
  }

  /**
   * 保存文件到本地存储
   * @param userId 用户 ID
   * @param documentType 证件类型
   * @param file 文件内容（File 对象或 Buffer）
   * @param originalFileName 原始文件名
   * @param mimeType MIME 类型
   * @returns 文件存储信息
   */
  async saveFile(
    userId: string,
    documentType: string,
    file: File | Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<{
    filePath: string
    fileName: string
    fileSize: number
  }> {
    const fileName = this.generateFileName(userId, documentType, originalFileName)
    const relativeDir = this.generateFilePath(userId, documentType)
    const absoluteDir = path.resolve(process.cwd(), relativeDir)
    const absolutePath = path.resolve(absoluteDir, fileName)

    const resolvedStorageDir = path.resolve(process.cwd(), this.storageDir)

    // Ensure the path is within the storage directory
    if (!absolutePath.startsWith(resolvedStorageDir)) {
      throw new Error('Access denied: path outside storage directory')
    }

    await fs.mkdir(absoluteDir, { recursive: true })

    let buffer: Buffer
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer())
    } else {
      buffer = file
    }

    // 验证文件内容（防止 MIME 类型伪造攻击）
    const isValidContent = await this.validateFileContent(buffer, mimeType)
    if (!isValidContent) {
      throw new Error('文件内容与声明的类型不匹配')
    }

    await fs.writeFile(absolutePath, buffer)

    return {
      filePath: path.join(relativeDir, fileName),
      fileName,
      fileSize: buffer.length,
    }
  }

  /**
   * 删除文件
   * @param relativePath 相对文件路径
   */
  async deleteFile(relativePath: string): Promise<void> {
    // 防止路径遍历攻击
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw new Error('Invalid file path: path traversal detected')
    }

    const absolutePath = path.resolve(process.cwd(), relativePath)
    const resolvedStorageDir = path.resolve(process.cwd(), this.storageDir)

    // 确保路径在存储目录内
    if (!absolutePath.startsWith(resolvedStorageDir)) {
      throw new Error('Access denied: path outside storage directory')
    }

    try {
      await fs.unlink(absolutePath)
    } catch (error) {
      console.warn(`Failed to delete file: ${relativePath}`, error)
    }
  }

  /**
   * 读取文件
   * @param relativePath 相对文件路径
   * @returns 文件内容 Buffer
   */
  async readFile(relativePath: string): Promise<Buffer> {
    // 防止路径遍历攻击
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw new Error('Invalid file path: path traversal detected')
    }

    const absolutePath = path.resolve(process.cwd(), relativePath)
    const resolvedStorageDir = path.resolve(process.cwd(), this.storageDir)

    // 确保路径在存储目录内
    if (!absolutePath.startsWith(resolvedStorageDir)) {
      throw new Error('Access denied: path outside storage directory')
    }

    return await fs.readFile(absolutePath)
  }

  /**
   * 验证文件类型
   * @param mimeType MIME 类型
   * @returns 是否允许
   */
  validateMimeType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return allowedTypes.includes(mimeType)
  }

  /**
   * 验证文件内容（通过 Magic Bytes）
   * Function: validateFileContent
   * Description: 使用文件魔数验证实际文件内容是否与声明的 MIME 类型匹配
   * Parameters:
   *   buffer(Buffer): 文件内容缓冲区
   *   declaredMimeType(string): 声明的 MIME 类型
   * Returns:
   *   boolean: 是否验证通过
   */
  async validateFileContent(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
    // 首先检查声明的 MIME 类型是否在白名单中
    if (!this.validateMimeType(declaredMimeType)) {
      return false
    }

    // 使用 file-type 库检测实际文件类型
    const detection = await fileTypeFromBuffer(buffer)

    if (!detection) {
      return false
    }

    // 标准化 MIME 类型（处理 image/jpg 和 image/jpeg）
    const normalizeMimeType = (mime: string): string => {
      return mime === 'image/jpg' ? 'image/jpeg' : mime
    }

    const normalizedDeclared = normalizeMimeType(declaredMimeType)
    const normalizedDetected = normalizeMimeType(detection.mime)

    // 验证声明的类型与实际检测的类型是否匹配
    return normalizedDeclared === normalizedDetected
  }

  /**
   * 验证文件大小
   * @param fileSize 文件大小（字节）
   * @returns 是否允许
   */
  validateFileSize(fileSize: number): boolean {
    return fileSize <= env.USER_DOCUMENTS_MAX_FILE_SIZE
  }

  /**
   * 获取最大文件大小（字节）
   * @returns 最大文件大小
   */
  getMaxFileSize(): number {
    return env.USER_DOCUMENTS_MAX_FILE_SIZE
  }

  /**
   * 获取允许的文件类型列表
   * @returns 允许的 MIME 类型列表
   */
  getAllowedMimeTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
}

export const fileStorage = new FileStorage()
