/**
 * 文件流式上传工具
 *
 * 将 Web API File 对象流式写入本地文件系统，
 * 在流式传输过程中完成文件头校验和大小限制检查，
 * 避免全量加载到内存。
 */

import fs from 'node:fs'
import path from 'node:path'
import stream from 'node:stream'
import { fileTypeFromBuffer } from 'file-type'
import { isAllowedMediaType } from '@/lib/constants/file-types'
import type { FileValidationResult } from '@/lib/utils/file-validation'

/**
 * 流式上传需要读取的文件头大小
 *
 * file-type 库通常只需要前 4KB 即可识别文件类型
 */
const HEADER_SIZE_BYTES = 4096

/**
 * 流式上传结果
 */
export interface StreamUploadResult {
  /** 文件校验结果 */
  validation: FileValidationResult
  /** 写入的总字节数 */
  bytesWritten: number
}

/**
 * 从 Web ReadableStream 中读取指定大小的头部数据
 *
 * @param webStream - Web API ReadableStream<Uint8Array>
 * @param size - 需要读取的字节数
 * @returns 头部数据和剩余的 reader（已消耗部分数据）
 */
async function readHeaderFromStream(
  webStream: ReadableStream<Uint8Array>,
  size: number
): Promise<{ header: Buffer; reader: ReadableStreamDefaultReader<Uint8Array>; firstChunkRemainder: Buffer | null }> {
  const reader = webStream.getReader()
  const chunks: Uint8Array[] = []
  let accumulated = 0

  while (accumulated < size) {
    const { value, done } = await reader.read()
    if (done) break

    chunks.push(value)
    accumulated += value.length
  }

  // 合并已读数据并切分出头部
  const fullData = Buffer.concat(chunks.map(c => Buffer.from(c)))
  const header = fullData.subarray(0, Math.min(size, fullData.length))
  const remainder = fullData.length > size ? fullData.subarray(size) : null

  return { header: Buffer.from(header), reader, firstChunkRemainder: remainder }
}

/**
 * 仅基于文件头部进行 magic bytes 校验
 *
 * Function: validateFileHeader
 * Description: 使用文件头部数据（前 4KB）进行类型检测，避免加载整个文件到内存
 * Parameters:
 *   header(Buffer): 文件头部数据
 *   maxSizeBytes(number): 最大允许文件大小（字节）
 *   fileSizeHint(number): 文件声明大小（来自 File.size），用于提前拦截超大文件
 * Returns:
 *   FileValidationResult: 校验结果
 */
export async function validateFileHeader(
  header: Buffer,
  maxSizeBytes: number,
  fileSizeHint: number
): Promise<FileValidationResult> {
  // 检查空文件
  if (header.length === 0 && fileSizeHint === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '上传的文件为空',
      },
    }
  }

  // 利用 File.size 提前拦截超大文件（避免开始流式传输）
  if (fileSizeHint > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024)
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `文件大小超过限制 (${maxSizeMB}MB)`,
      },
    }
  }

  // 使用头部 buffer 检测文件类型
  const detection = await fileTypeFromBuffer(header)

  if (!detection) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '无法识别文件类型',
      },
    }
  }

  const isAllowed = isAllowedMediaType(detection.mime)

  if (!isAllowed) {
    return {
      isValid: false,
      detectedMime: detection.mime,
      detectedExtension: detection.ext,
      error: {
        code: 'INVALID_INPUT',
        message: `不支持的文件类型: ${detection.mime}`,
      },
    }
  }

  return {
    isValid: true,
    detectedMime: detection.mime,
    detectedExtension: detection.ext,
  }
}

/**
 * 将 File 对象流式写入目标路径
 *
 * Function: streamFileToPath
 * Description: 先读取文件头部进行类型校验，校验通过后流式写入目标文件，
 *              同时在流式过程中检查累计大小是否超过限制
 * Parameters:
 *   file(File): Web API File 对象
 *   destinationPath(string): 目标文件绝对路径
 *   maxSizeBytes(number): 最大允许文件大小（字节）
 * Returns:
 *   StreamUploadResult: 校验结果和写入字节数
 *
 * @example
 * ```ts
 * const file = formData.get('file') as File
 * const result = await streamFileToPath(file, '/data/uploads/test.jpg', 200 * 1024 * 1024)
 * if (!result.validation.isValid) {
 *   // 校验失败
 * }
 * ```
 */
export async function streamFileToPath(
  file: File,
  destinationPath: string,
  maxSizeBytes: number
): Promise<StreamUploadResult> {
  // 确保目标目录存在
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true })

  const webStream = file.stream()

  // 1. 读取头部用于类型检测
  const { header, reader, firstChunkRemainder } = await readHeaderFromStream(
    webStream,
    HEADER_SIZE_BYTES
  )

  // 2. 使用 File.size 做提前大小拦截 + 头部做类型校验
  const validation = await validateFileHeader(header, maxSizeBytes, file.size)

  if (!validation.isValid) {
    reader.releaseLock()
    await webStream.cancel()
    return { validation, bytesWritten: 0 }
  }

  // 3. 校验通过，创建写入流
  const writeStream = fs.createWriteStream(destinationPath, { autoClose: true })
  let totalBytes = 0

  try {
    await new Promise<void>((resolve, reject) => {
      writeStream.on('error', reject)

      // 写入头部数据
      writeStream.write(header)
      totalBytes += header.length

      // 写入第一个 chunk 剩余部分
      if (firstChunkRemainder) {
        writeStream.write(firstChunkRemainder)
        totalBytes += firstChunkRemainder.length
      }

      // 将剩余的 Web ReadableStream 适配为 Node.js Readable，然后 pipe 到 writeStream
      const remainingNodeStream = new stream.Readable({
        async read() {
          try {
            const { value, done } = await reader.read()
            if (done) {
              this.push(null)
              return
            }

            const chunk = Buffer.from(value)
            totalBytes += chunk.length

            // 流式大小检查
            if (totalBytes > maxSizeBytes) {
              const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024)
              reject(new Error(`文件大小超过限制 (${maxSizeMB}MB)`))
              this.destroy()
              return
            }

            this.push(chunk)
          } catch (error) {
            this.destroy(error instanceof Error ? error : new Error(String(error)))
          }
        },
      })

      stream.pipeline(remainingNodeStream, writeStream, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  } catch (error) {
    // 写入失败时清理：关闭 reader、删除不完整文件
    try {
      reader.releaseLock()
    } catch {
      // reader 可能已经被释放
    }
    try {
      await fs.promises.unlink(destinationPath)
    } catch {
      // 文件可能不存在
    }
    throw error
  }

  return { validation, bytesWritten: totalBytes }
}
