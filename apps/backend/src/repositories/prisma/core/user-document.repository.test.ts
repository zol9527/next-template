/**
 * Unit: 用户文档 Repository 测试
 *
 * Description: 测试用户文档数据访问层的所有方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPrismaUserDocumentRepository } from '@/repositories/prisma/core/user-document.repo'
import type { UserDocumentRepository } from '@/repositories/interfaces/core/user-document.interface'
import type { RepoContext } from '@/types/repo/repo-context'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

const { prisma } = vi.mocked(await import('@/lib/prisma'), { deep: true })

// Mock logger
const mockLogger = {
  level: 'debug',
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  silent: vi.fn(),
  msgPrefix: undefined,
  child: vi.fn(() => mockLogger),
}

// Mock RepoContext
const mockCtx: RepoContext = {
  traceId: 'test-trace-id',
  logger: mockLogger as any,
}

describe('PrismaUserDocumentRepository', () => {
  let repository: UserDocumentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = createPrismaUserDocumentRepository()
  })

  describe('findByUserIdAndDocumentType', () => {
    /**
     * Function: findByUserIdAndDocumentType
     *
     * Description: 测试根据用户 ID 和证件类型查找文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.documentType(DocumentType): 证件类型
     *
     * Returns:
     *   doc(UserDocument | null): 找到的文档或 null
     */
    it('应该成功找到用户证件', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '我的身份证',
        filePath: '/uploads/file.jpg',
        fileName: 'id_card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
        status: 'pending',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(mockDoc)

      const result = await repository.findByUserIdAndDocumentType(mockCtx, {
        userId: 'user-123',
        documentType: 'id_card',
      })

      expect(result).toBeDefined()
      expect(result?.id).toBe('doc-123')
      expect(result?.documentType).toBe('id_card')
      expect(result?.documentName).toBe('我的身份证')
      expect(result?.hasFile).toBe(true)
      expect(result?.fileUrl).toBe('/api/v1/user/documents/doc-123/file')
      expect(result?.fileSize).toBe(1024000)
      expect(prisma.userDocument.findUnique).toHaveBeenCalledWith({
        where: {
          userId_documentType: {
            userId: 'user-123',
            documentType: 'id_card',
          },
        },
      })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { userId: 'user-123', documentType: 'id_card' },
        'Finding user document by type'
      )
    })

    /**
     * Function: findByUserIdAndDocumentType
     *
     * Description: 测试当文档不存在时返回 null
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.documentType(DocumentType): 证件类型
     *
     * Returns:
     *   null: 文档不存在
     */
    it('应该在文档不存在时返回 null', async () => {
      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(null)

      const result = await repository.findByUserIdAndDocumentType(mockCtx, {
        userId: 'user-123',
        documentType: 'id_card',
      })

      expect(result).toBeNull()
      expect(prisma.userDocument.findUnique).toHaveBeenCalledWith({
        where: {
          userId_documentType: {
            userId: 'user-123',
            documentType: 'id_card',
          },
        },
      })
    })
  })

  describe('findByUserId', () => {
    /**
     * Function: findByUserId
     *
     * Description: 测试获取用户的所有证件
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   docs(UserDocument[]): 用户的所有证件列表
     */
    it('应该成功获取用户的所有证件', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          userId: 'user-123',
          documentType: 'id_card',
          documentName: '身份证',
          filePath: '/uploads/id_card.jpg',
          fileName: 'id_card.jpg',
          fileSize: 1024000n,
          mimeType: 'image/jpeg',
          status: 'pending',
          note: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 'doc-2',
          userId: 'user-123',
          documentType: 'unemployment_proof',
          documentName: '失业证明',
          filePath: '/uploads/unemployment.pdf',
          fileName: 'unemployment.pdf',
          fileSize: 2048000n,
          mimeType: 'application/pdf',
          status: 'approved',
          note: null,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ]

      vi.mocked(prisma.userDocument.findMany).mockResolvedValue(mockDocs)

      const result = await repository.findByUserId(mockCtx, { userId: 'user-123' })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('doc-1')
      expect(result[0].documentType).toBe('id_card')
      expect(result[1].id).toBe('doc-2')
      expect(result[1].documentType).toBe('unemployment_proof')
      expect(prisma.userDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'asc' },
      })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { userId: 'user-123' },
        'Finding all user documents'
      )
    })

    /**
     * Function: findByUserId
     *
     * Description: 测试当用户没有证件时返回空数组
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   docs(UserDocument[]): 空数组
     */
    it('应该在用户没有证件时返回空数组', async () => {
      vi.mocked(prisma.userDocument.findMany).mockResolvedValue([])

      const result = await repository.findByUserId(mockCtx, { userId: 'user-123' })

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
      expect(prisma.userDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'asc' },
      })
    })
  })

  describe('findById', () => {
    /**
     * Function: findById
     *
     * Description: 测试根据 ID 查找文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *
     * Returns:
     *   doc(UserDocument | null): 找到的文档或 null
     */
    it('应该成功找到文档', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'medical_insurance',
        documentName: '医疗保险',
        filePath: '/uploads/medical.pdf',
        fileName: 'medical.pdf',
        fileSize: 5120000n,
        mimeType: 'application/pdf',
        status: 'approved',
        note: '审核通过',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(mockDoc)

      const result = await repository.findById(mockCtx, { id: 'doc-123' })

      expect(result).toBeDefined()
      expect(result?.id).toBe('doc-123')
      expect(result?.documentType).toBe('medical_insurance')
      expect(result?.status).toBe('approved')
      expect(result?.note).toBe('审核通过')
      expect(prisma.userDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { id: 'doc-123' },
        'Finding user document by id'
      )
    })

    /**
     * Function: findById
     *
     * Description: 测试当文档不存在时返回 null
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *
     * Returns:
     *   null: 文档不存在
     */
    it('应该在文档不存在时返回 null', async () => {
      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(null)

      const result = await repository.findById(mockCtx, { id: 'non-existent' })

      expect(result).toBeNull()
      expect(prisma.userDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      })
    })
  })

  describe('create', () => {
    /**
     * Function: create
     *
     * Description: 测试创建新的用户文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.documentType(DocumentType): 证件类型
     *   params.filePath(string): 文件路径
     *   params.fileName(string): 文件名
     *   params.fileSize(bigint): 文件大小
     *   params.mimeType(string): MIME 类型
     *
     * Returns:
     *   doc(UserDocument): 创建的文档
     */
    it('应该成功创建用户文档', async () => {
      const inputDoc = {
        id: 'new-doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '我的身份证',
        filePath: '/uploads/new-id-card.jpg',
        fileName: 'new-id-card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
        status: 'pending',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.create).mockResolvedValue(inputDoc)

      const result = await repository.create(mockCtx, {
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '我的身份证',
        filePath: '/uploads/new-id-card.jpg',
        fileName: 'new-id-card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('new-doc-123')
      expect(result.userId).toBe('user-123')
      expect(result.documentType).toBe('id_card')
      expect(result.hasFile).toBe(true)
      expect(result.fileUrl).toBe('/api/v1/user/documents/new-doc-123/file')
      expect(prisma.userDocument.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          documentType: 'id_card',
          documentName: '我的身份证',
          filePath: '/uploads/new-id-card.jpg',
          fileName: 'new-id-card.jpg',
          fileSize: 1024000n,
          mimeType: 'image/jpeg',
          status: 'pending',
          note: null,
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          documentType: 'id_card',
          filePath: '/uploads/new-id-card.jpg',
        },
        'Creating user document'
      )
    })

    /**
     * Function: create
     *
     * Description: 测试创建不包含文件路径的文档（未上传）
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.documentType(DocumentType): 证件类型
     *
     * Returns:
     *   doc(UserDocument): 创建的空文档
     */
    it('应该成功创建未上传的文档', async () => {
      const inputDoc = {
        id: 'new-doc-456',
        userId: 'user-456',
        documentType: 'unemployment_proof',
        documentName: null,
        filePath: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        status: 'pending',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.create).mockResolvedValue(inputDoc)

      const result = await repository.create(mockCtx, {
        userId: 'user-456',
        documentType: 'unemployment_proof',
      })

      expect(result).toBeDefined()
      expect(result.hasFile).toBe(false)
      expect(result.fileUrl).toBeNull()
      expect(prisma.userDocument.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          documentType: 'unemployment_proof',
          documentName: null,
          filePath: null,
          fileName: null,
          fileSize: null,
          mimeType: null,
          status: 'pending',
          note: null,
        },
      })
    })
  })

  describe('update', () => {
    /**
     * Function: update
     *
     * Description: 测试更新用户文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *   params.filePath(string): 新的文件路径
     *   params.fileName(string): 新的文件名
     *   params.fileSize(bigint): 新的文件大小
     *   params.status(string): 新的文档状态
     *   params.note(string): 新的备注
     *
     * Returns:
     *   doc(UserDocument): 更新后的文档
     */
    it('应该成功更新文档的所有字段', async () => {
      const updatedDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '身份证',
        filePath: '/uploads/updated-id-card.jpg',
        fileName: 'updated-id-card.jpg',
        fileSize: 2048000n,
        mimeType: 'image/jpeg',
        status: 'approved',
        note: '审核通过',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.update).mockResolvedValue(updatedDoc)

      const result = await repository.update(mockCtx, {
        id: 'doc-123',
        filePath: '/uploads/updated-id-card.jpg',
        fileName: 'updated-id-card.jpg',
        fileSize: 2048000n,
        status: 'approved',
        note: '审核通过',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('doc-123')
      expect(result.filePath).toBe('/uploads/updated-id-card.jpg')
      expect(result.status).toBe('approved')
      expect(result.note).toBe('审核通过')
      expect(prisma.userDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          filePath: '/uploads/updated-id-card.jpg',
          fileName: 'updated-id-card.jpg',
          fileSize: 2048000n,
          status: 'approved',
          note: '审核通过',
          updatedAt: expect.any(Date),
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { id: 'doc-123', filePath: '/uploads/updated-id-card.jpg' },
        'Updating user document'
      )
    })

    /**
     * Function: update
     *
     * Description: 测试仅更新文档状态
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *   params.status(string): 新的文档状态
     *
     * Returns:
     *   doc(UserDocument): 更新后的文档
     */
    it('应该成功更新文档状态', async () => {
      const updatedDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '身份证',
        filePath: '/uploads/id-card.jpg',
        fileName: 'id-card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
        status: 'rejected',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.update).mockResolvedValue(updatedDoc)

      const result = await repository.update(mockCtx, {
        id: 'doc-123',
        status: 'rejected',
      })

      expect(result).toBeDefined()
      expect(result.status).toBe('rejected')
      expect(prisma.userDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          status: 'rejected',
          updatedAt: expect.any(Date),
        },
      })
    })

    /**
     * Function: update
     *
     * Description: 测试仅更新文档备注
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *   params.note(string): 新的备注
     *
     * Returns:
     *   doc(UserDocument): 更新后的文档
     */
    it('应该成功更新文档备注', async () => {
      const updatedDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '身份证',
        filePath: '/uploads/id-card.jpg',
        fileName: 'id-card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
        status: 'pending',
        note: '这是新的备注',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.update).mockResolvedValue(updatedDoc)

      const result = await repository.update(mockCtx, {
        id: 'doc-123',
        note: '这是新的备注',
      })

      expect(result).toBeDefined()
      expect(result.note).toBe('这是新的备注')
      expect(prisma.userDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          note: '这是新的备注',
          updatedAt: expect.any(Date),
        },
      })
    })
  })

  describe('delete', () => {
    /**
     * Function: delete
     *
     * Description: 测试删除用户文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *
     * Returns:
     *   void: 无返回值
     */
    it('应该成功删除文档', async () => {
      vi.mocked(prisma.userDocument.delete).mockResolvedValue(undefined as any)

      await repository.delete(mockCtx, { id: 'doc-123' })

      expect(prisma.userDocument.delete).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { id: 'doc-123' },
        'Deleting user document'
      )
    })

    /**
     * Function: delete
     *
     * Description: 测试数据库删除失败时的错误处理
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.id(string): 文档 ID
     *
     * Returns:
     *   error(Error): 抛出的错误
     */
    it('应该在数据库删除失败时抛出错误', async () => {
      const dbError = new Error('Database connection failed')
      vi.mocked(prisma.userDocument.delete).mockRejectedValue(dbError)

      await expect(repository.delete(mockCtx, { id: 'doc-123' })).rejects.toThrow(
        'Database connection failed'
      )
    })
  })

  describe('deleteByUserId', () => {
    /**
     * Function: deleteByUserId
     *
     * Description: 测试删除用户的所有文档
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   void: 无返回值
     */
    it('应该成功删除用户的所有文档', async () => {
      vi.mocked(prisma.userDocument.deleteMany).mockResolvedValue({ count: 3 })

      await repository.deleteByUserId(mockCtx, { userId: 'user-123' })

      expect(prisma.userDocument.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-123' },
        'Deleting all user documents'
      )
    })

    /**
     * Function: deleteByUserId
     *
     * Description: 测试当用户没有文档时也能正常执行
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   void: 无返回值
     */
    it('应该在用户没有文档时也能正常执行', async () => {
      vi.mocked(prisma.userDocument.deleteMany).mockResolvedValue({ count: 0 })

      await repository.deleteByUserId(mockCtx, { userId: 'user-456' })

      expect(prisma.userDocument.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
      })
    })
  })

  describe('文件 URL 生成', () => {
    /**
     * Feature: 文件 URL 生成
     *
     * Description: 测试文件 URL 的正确生成
     *
     * Parameters:
     *   filePath(string): 文件路径
     *   id(string): 文档 ID
     *
     * Returns:
     *   fileUrl(string): 生成的文件访问 URL
     */
    it('应该为有文件的文档生成正确的 URL', async () => {
      const mockDoc = {
        id: 'doc-123',
        userId: 'user-123',
        documentType: 'id_card',
        documentName: '身份证',
        filePath: '/uploads/id-card.jpg',
        fileName: 'id-card.jpg',
        fileSize: 1024000n,
        mimeType: 'image/jpeg',
        status: 'pending',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(mockDoc)

      const result = await repository.findById(mockCtx, { id: 'doc-123' })

      expect(result?.fileUrl).toBe('/api/v1/user/documents/doc-123/file')
      expect(result?.hasFile).toBe(true)
    })

    /**
     * Feature: 文件 URL 生成
     *
     * Description: 测试没有文件的文档的 URL 为 null
     *
     * Parameters:
     *   filePath(string | null): 文件路径
     *   id(string): 文档 ID
     *
     * Returns:
     *   fileUrl(string | null): null
     */
    it('应该为没有文件的文档返回 null URL', async () => {
      const mockDoc = {
        id: 'doc-456',
        userId: 'user-456',
        documentType: 'unemployment_proof',
        documentName: '失业证明',
        filePath: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        status: 'pending',
        note: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.userDocument.findUnique).mockResolvedValue(mockDoc)

      const result = await repository.findById(mockCtx, { id: 'doc-456' })

      expect(result?.fileUrl).toBeNull()
      expect(result?.hasFile).toBe(false)
    })
  })
})
