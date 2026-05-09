import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileStorage } from '@/lib/file-storage'
import { promises as fs } from 'fs'
import path from 'path'

describe('FileStorage Security', () => {
  const testStorageDir = 'test-user-docs'
  let fileStorage: FileStorage
  let originalEnv: any

  beforeEach(async () => {
    originalEnv = process.env
    process.env.USER_DOCUMENTS_STORAGE_DIR = testStorageDir
    process.env.USER_DOCUMENTS_MAX_FILE_SIZE = String(1024 * 1024 * 5)

    fileStorage = new FileStorage()
    await fs.mkdir(testStorageDir, { recursive: true })
  })

  afterEach(async () => {
    process.env = originalEnv
    await fs.rm(testStorageDir, { recursive: true, force: true }).catch(() => {})
  })

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal in deleteFile', async () => {
      const maliciousPath = '../malicious.txt'
      await expect(fileStorage.deleteFile(maliciousPath)).rejects.toThrow('Invalid file path: path traversal detected')
    })

    it('should prevent path traversal in readFile', async () => {
      const maliciousPath = '/etc/passwd'
      await expect(fileStorage.readFile(maliciousPath)).rejects.toThrow('Invalid file path: path traversal detected')
    })

    it('should prevent path traversal when saving file with malicious documentType', async () => {
      const mockFile = Buffer.from('test')
      const userId = 'user-123'
      const documentType = '../../../../../etc/passwd' // Attempt to write to arbitrary path

      await expect(
        fileStorage.saveFile(userId, documentType, mockFile, 'test.jpg', 'image/jpeg')
      ).rejects.toThrow('Access denied: path outside storage directory')
    })

    it('should prevent path traversal when saving file with malicious userId', async () => {
        const mockFile = Buffer.from('test')
        const userId = '../../../../../etc/passwd'
        const documentType = 'id_card'

        await expect(
          fileStorage.saveFile(userId, documentType, mockFile, 'test.jpg', 'image/jpeg')
        ).rejects.toThrow('Access denied: path outside storage directory')
      })
  })
})
