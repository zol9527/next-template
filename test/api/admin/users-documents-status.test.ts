/**
 * API: 管理员更新文档状态
 *
 * Description: 测试 PATCH /api/v1/admin/users/[id]/documents/[documentId]/status
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/v1/admin/users/[id]/documents/[documentId]/status/route'
import type { UserDocumentRepository } from '@/repositories/interfaces/user-document.interface'
import type { DocumentVersionRepository } from '@/repositories/interfaces/document-version.interface'
import type { UserDocument } from '@/contracts/dtos/user-document.dto'
import { useApiAuth } from '@/app/api/v1/_shared/use-api-auth'

// Mock logger to avoid file system issues
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return mockLogger }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext to provide a valid context
vi.mock('@/types/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return mockLogger }),
  }
  return {
    createServiceContext: vi.fn(() => ({
      traceId: 'test-trace-id',
      logger: mockLogger,
      userAgent: null,
      clientIp: null,
    })),
  }
})

// Mock 文件存储
vi.mock('@/lib/file-storage', () => ({
  fileStorage: {
    validateMimeType: vi.fn(),
    validateFileSize: vi.fn(),
    saveFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}))

// Mock 仓储工厂
vi.mock('@/repositories/factory', () => ({
  createUserDocumentRepository: vi.fn(),
  createDocumentVersionRepository: vi.fn(),
  createUserRepository: vi.fn(),
}))

// Mock 服务工厂
vi.mock('@/services/user-document.service', () => ({
  createUserDocumentService: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

const { createUserDocumentRepository } = await import('@/repositories/factory')
const { createDocumentVersionRepository } = await import('@/repositories/factory')
const { createUserRepository } = await import('@/repositories/factory')
const { createUserDocumentService } = await import('@/services/user-document.service')

describe('API: PATCH /api/v1/admin/users/[id]/documents/[documentId]/status', () => {
  // 使用 Partial 类型来模拟仓储接口，仅包含测试所需的必要方法
  const userDocsRepo: Partial<UserDocumentRepository> = {
    findById: vi.fn(),
    update: vi.fn(),
  }

  const docVersionsRepo: Partial<DocumentVersionRepository> = {
    findByUserDocumentId: vi.fn(),
    create: vi.fn(),
  }

  const usersRepo = {
    getUserById: vi.fn(),
  }

  // 模拟 UserDocumentService，仅包含测试所需的方法
  type UserDocServiceMock = {
    updateDocumentStatusByAdmin: (
      documentId: string,
      status: string,
      rejectionReason?: string
    ) => Promise<UserDocument>
  }
  const userDocService: UserDocServiceMock = {
    updateDocumentStatusByAdmin: vi.fn(),
  }

  // Mock 认证上下文
  const mockAuthContext = {
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn().mockReturnValue(true),
    assertPermission: vi.fn().mockResolvedValue(undefined),
    assertRole: vi.fn().mockReturnValue(undefined),
    access: {
      has: vi.fn().mockReturnValue(true),
      assert: vi.fn(),
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canExecute: vi.fn().mockReturnValue(true),
      grants: [],
      scopesFor: vi.fn().mockReturnValue([]),
      hasAny: vi.fn().mockReturnValue(true),
      hasAll: vi.fn().mockReturnValue(true),
    },
    getMe: vi.fn().mockResolvedValue({
      id: 'admin-id',
      nickname: 'Admin',
      roles: ['admin'],
      permissions: ['users.write', 'user-documents.write'],
    }),
  }

  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
  const MOCK_DOC_ID = '123e4567-e89b-12d3-a456-426614174000'
  const MOCK_DOC_ID_NOT_FOUND = '123e4567-e89b-12d3-a456-426614179999'

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(createUserDocumentRepository).mockResolvedValue(userDocsRepo)
    vi.mocked(createDocumentVersionRepository).mockResolvedValue(docVersionsRepo)
    vi.mocked(createUserRepository).mockResolvedValue(usersRepo as any)
    vi.mocked(createUserDocumentService).mockReturnValue(userDocService)
    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
    vi.mocked(mockAuthContext.hasRole).mockReturnValue(true)
    vi.mocked(useApiAuth).mockResolvedValue(mockAuthContext as any)
// TODO: 适配 grant-based 权限系统     vi.mocked(useApiAdminAuth).mockResolvedValue(mockAuthContext as any)
  })

  /**
   * API Route: PATCH
   *
   * Description: 测试管理员通过文档
   *
   * Parameters:
   *   documentId(string): 文档 ID
   *   body.status(DocumentStatus): 通过状态
   *
   * Returns:
   *   response(object): 200 OK 和更新后的文档
   */
  it('应该成功通过文档', async () => {
    const mockUpdatedDoc = {
      id: MOCK_DOC_ID,
      status: 'approved',
      note: null,
    }

    userDocsRepo.findById.mockResolvedValue({
      id: MOCK_DOC_ID,
      userId: MOCK_USER_ID,
      documentType: 'id_card',
    })
    userDocsRepo.update.mockResolvedValue(mockUpdatedDoc)
    userDocService.updateDocumentStatusByAdmin.mockResolvedValue(mockUpdatedDoc)

    const body = { status: 'approved' }
    const req = new NextRequest(`http://localhost/api/v1/admin/users/${MOCK_USER_ID}/documents/${MOCK_DOC_ID}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
      const response = await PATCH(req, { params: Promise.resolve({ id: MOCK_USER_ID, documentId: MOCK_DOC_ID }) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(mockUpdatedDoc)
    expect(userDocService.updateDocumentStatusByAdmin).toHaveBeenCalledWith(MOCK_DOC_ID, 'approved', undefined)
  })

  /**
   * API Route: PATCH
   *
   * Description: 测试管理员拒绝文档并附带原因
   *
   * Parameters:
   *   documentId(string): 文档 ID
   *   body.status(DocumentStatus): 拒绝状态
   *   body.rejectionReason(string): 拒绝原因
   *
   * Returns:
   *   response(object): 200 OK 和更新后的文档（包含拒绝原因）
   */
  it('应该成功拒绝文档并附带原因', async () => {
    const mockUpdatedDoc = {
      id: MOCK_DOC_ID,
      status: 'rejected',
      note: '用户备注\n\n管理员拒绝原因: 图片不清晰，请重新上传',
    }

    userDocsRepo.findById.mockResolvedValue({
      id: MOCK_DOC_ID,
      userId: MOCK_USER_ID,
      documentType: 'id_card',
    })
    userDocsRepo.update.mockResolvedValue(mockUpdatedDoc)
    userDocService.updateDocumentStatusByAdmin.mockResolvedValue(mockUpdatedDoc)

    const body = {
      status: 'rejected',
      rejectionReason: '图片不清晰，请重新上传',
    }
    const req = new NextRequest(`http://localhost/api/v1/admin/users/${MOCK_USER_ID}/documents/${MOCK_DOC_ID}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
      const response = await PATCH(req, { params: Promise.resolve({ id: MOCK_USER_ID, documentId: MOCK_DOC_ID }) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(mockUpdatedDoc)
    expect(json.data.note).toContain('管理员拒绝原因: 图片不清晰，请重新上传')
    expect(userDocService.updateDocumentStatusByAdmin).toHaveBeenCalledWith(MOCK_DOC_ID, 'rejected', '图片不清晰，请重新上传')
  })

  /**
   * API Route: PATCH
   *
   * Description: 测试当文档不存在时返回错误
   *
   * Parameters:
   *   documentId(string): 不存在的文档 ID
   *
   * Returns:
   *   error(Error): 抛出的错误
   */
  it('应该在文档不存在时返回 500 错误', async () => {
    userDocsRepo.findById.mockResolvedValue(null)
    userDocService.updateDocumentStatusByAdmin.mockRejectedValue(new Error('Document not found'))

    const body = { status: 'approved' }
    const req = new NextRequest(`http://localhost/api/v1/admin/users/${MOCK_USER_ID}/documents/${MOCK_DOC_ID_NOT_FOUND}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
      const response = await PATCH(req, { params: Promise.resolve({ id: MOCK_USER_ID, documentId: MOCK_DOC_ID_NOT_FOUND }) })

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.message).toBe('Internal error')
  })

  /**
   * API Route: PATCH
   *
   * Description: 测试 Schema 验证
   *
   * Parameters:
   *   body(object): 无效的请求体
   *
   * Returns:
   *   response(object): 400 Bad Request 当 Schema 验证失败时
   */
  it('应该拒绝无效的状态', async () => {
    const body = { status: 'invalid_status' }
    const req = new NextRequest(`http://localhost/api/v1/admin/users/${MOCK_USER_ID}/documents/${MOCK_DOC_ID}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
      const response = await PATCH(req, { params: Promise.resolve({ id: MOCK_USER_ID, documentId: MOCK_DOC_ID }) })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.success).toBe(false)
  })
})
