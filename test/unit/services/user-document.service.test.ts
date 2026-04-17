/**
 * Unit: 用户文档 Service 测试
 *
 * Description: 测试用户文档业务逻辑的所有方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUserDocumentService } from '@/services/user-document.service'
import type { UserDocumentRepository } from '@/repositories/interfaces/user-document.interface'
import type { DocumentVersionRepository } from '@/repositories/interfaces/document-version.interface'
import type { UserRepository } from '@/repositories/interfaces/user.interface'

// Mock 文件存储
vi.mock('@/lib/file-storage', () => ({
  fileStorage: {
    validateMimeType: vi.fn(),
    validateFileSize: vi.fn(),
    saveFile: vi.fn(),
    deleteFile: vi.fn(),
    readFile: vi.fn(),
    getMaxFileSize: vi.fn(() => 10 * 1024 * 1024),
    getAllowedMimeTypes: vi.fn(() => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  },
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
}

// Mock ServiceContext
const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

describe('用户文档 Service 测试', () => {
  // 使用 Partial 类型来模拟仓储接口
  const userDocsRepo: Partial<UserDocumentRepository> = {
    findByUserIdAndDocumentType: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByUserId: vi.fn(),
    findByIdForFileAccess: vi.fn(),
  }

  const docVersionsRepo: Partial<DocumentVersionRepository> = {
    findByUserDocumentId: vi.fn(),
    create: vi.fn(),
    deleteByUserDocumentId: vi.fn(),
  }

  const usersRepo: Partial<UserRepository> = {
    getUserById: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersRepo.getUserById!).mockResolvedValue({ id: 'user-123', canUpload: true } as any)
  })

  describe('uploadUserDocument - 上传用户文档', () => {
    it('应该成功上传新文档', async () => {
      const file = new File(['content'], 'id-card.jpg', {
        type: 'image/jpeg',
      })

      const mockSavedFile = {
        filePath: 'uploads/user-123/id_card/file.jpg',
        fileName: 'file.jpg',
        fileSize: 1024000,
      }

      vi.mocked(userDocsRepo.findByUserIdAndDocumentType).mockResolvedValue(null)
      userDocsRepo.create.mockResolvedValue({
        id: 'new-doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        filePath: mockSavedFile.filePath,
        fileName: mockSavedFile.fileName,
        fileSize: BigInt(mockSavedFile.fileSize),
        mimeType: 'image/jpeg',
        hasFile: true,
        fileUrl: '/api/v1/user/documents/new-doc-123/file',
        status: 'pending',
        note: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      docVersionsRepo.create.mockResolvedValue({
        id: 'version-123',
        userDocumentId: 'new-doc-123',
        createdAt: new Date().toISOString(),
      })

      const { fileStorage } = await import('@/lib/file-storage')
      vi.mocked(fileStorage.saveFile).mockResolvedValue(mockSavedFile)
      vi.mocked(fileStorage.validateMimeType).mockReturnValue(true)
      vi.mocked(fileStorage.validateFileSize).mockReturnValue(true)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      const result = await service.uploadUserDocument('user-123', {
        documentType: 'id_card',
        documentName: '我的身份证',
        file,
        mimeType: 'image/jpeg',
        fileSize: 1024000,
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('new-doc-123')
      expect(result.hasFile).toBe(true)
    })

    it('应该拒绝不支持的文件类型', async () => {
      const file = new File(['content'], 'file.gif', { type: 'image/gif' })

      const { fileStorage } = await import('@/lib/file-storage')
      vi.mocked(fileStorage.validateMimeType).mockReturnValue(false)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      await expect(
        service.uploadUserDocument('user-123', {
          documentType: 'id_card',
          file,
          mimeType: 'image/gif',
          fileSize: 1024000,
        })
      ).rejects.toThrow('不支持的文件类型，仅支持 JPEG、PNG、WebP 格式')
    })
  })

  describe('updateDocumentStatusByAdmin - 殡理员更新文档状态', () => {
    it('应该成功通过文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        filePath: '/uploads/id-card.jpg',
        fileName: 'id-card.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        hasFile: true,
        fileUrl: '/api/v1/user/documents/doc-123/file',
        status: 'pending',
        note: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      userDocsRepo.findById.mockResolvedValue(mockDoc)
      userDocsRepo.update.mockResolvedValue({
        ...mockDoc,
        status: 'approved',
      })

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      const result = await service.updateDocumentStatusByAdmin('doc-123', 'approved')

      expect(result).toBeDefined()
      expect(result.status).toBe('approved')
    })

    it('应该成功拒绝文档并附带原因', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        filePath: '/uploads/id-card.jpg',
        fileName: 'id-card.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        hasFile: true,
        fileUrl: '/api/v1/user/documents/doc-123/file',
        status: 'pending',
        note: '用户备注',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      userDocsRepo.findById.mockResolvedValue(mockDoc)
      userDocsRepo.update.mockResolvedValue({
        ...mockDoc,
        status: 'rejected',
        note: '用户备注\n\n管理员拒绝原因: 图片不清晰，请重新上传',
      })

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      const result = await service.updateDocumentStatusByAdmin(
        'doc-123',
        'rejected',
        '图片不清晰，请重新上传'
      )

      expect(result).toBeDefined()
      expect(result.status).toBe('rejected')
      expect(result.note).toBe('用户备注\n\n管理员拒绝原因: 图片不清晰，请重新上传')
    })
  })

  describe('getDocumentFile - 获取文档文件', () => {
    it('应该允许用户访问自己的文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        filePath: 'uploads/user-123/id_card/file.jpg',
        mimeType: 'image/jpeg',
        status: 'pending',
      }

      const mockFileBuffer = Buffer.from('test image content')

      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(mockDoc)
      const { fileStorage } = await import('@/lib/file-storage')
      vi.mocked(fileStorage.readFile).mockResolvedValue(mockFileBuffer)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      const result = await service.getDocumentFile('doc-123', 'user-123', false, false)

      expect(result).toBeDefined()
      expect(result.buffer).toEqual(mockFileBuffer)
      expect(result.mimeType).toBe('image/jpeg')
    })

    it('应该拒绝普通用户访问他人文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        filePath: 'uploads/user-123/id_card/file.jpg',
        mimeType: 'image/jpeg',
        status: 'pending',
      }

      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(mockDoc)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      await expect(
        service.getDocumentFile('doc-123', 'user-456', false, false)
      ).rejects.toThrow('Forbidden')
    })

    it('应该允许有权限的管理员访问任何文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        filePath: 'uploads/user-123/id_card/file.jpg',
        mimeType: 'image/png',
        status: 'approved',
      }

      const mockFileBuffer = Buffer.from('admin test image')

      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(mockDoc)
      const { fileStorage } = await import('@/lib/file-storage')
      vi.mocked(fileStorage.readFile).mockResolvedValue(mockFileBuffer)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      const result = await service.getDocumentFile('doc-123', 'admin-1', true, true)

      expect(result).toBeDefined()
      expect(result.buffer).toEqual(mockFileBuffer)
      expect(result.mimeType).toBe('image/png')
    })

    it('应该拒绝没有权限的管理员访问文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        filePath: 'uploads/user-123/id_card/file.jpg',
        mimeType: 'image/jpeg',
        status: 'pending',
      }

      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(mockDoc)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      // 管理员但没有 user_document:read 权限
      await expect(
        service.getDocumentFile('doc-123', 'admin-1', true, false)
      ).rejects.toThrow('Forbidden')
    })

    it('应该处理文档不存在的情况', async () => {
      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(null)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      await expect(
        service.getDocumentFile('non-existent', 'user-123', false, false)
      ).rejects.toThrow('Document not found')
    })

    it('应该处理没有文件的情况', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        filePath: null,
        mimeType: 'image/jpeg',
        status: 'pending',
      }

      userDocsRepo.findByIdForFileAccess?.mockResolvedValue(mockDoc)

      const service = createUserDocumentService(
        { userDocuments: userDocsRepo as UserDocumentRepository, documentVersions: docVersionsRepo as DocumentVersionRepository, users: usersRepo as UserRepository },
        mockServiceContext
      )

      await expect(
        service.getDocumentFile('doc-123', 'user-123', false, false)
      ).rejects.toThrow('Document has no file')
    })
  })
})
