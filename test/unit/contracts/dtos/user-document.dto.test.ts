/**
 * Unit: 用户文档 DTO 测试
 *
 * Description: 测试用户文档相关的 Zod Schema 验证和类型推断
 */

import { describe, it, expect } from 'vitest'
import {
  DocumentTypeEnum,
  DocumentType,
  DocumentTypeLabels,
  DocumentStatusEnum,
  DocumentStatus,
  DocumentStatusLabels,
  UserDocumentListResponseSchema,
  UserDocumentResponseSchema,
  AdminUserDocumentListResponseSchema,
  UploadUserDocumentRequestSchema,
  UpdateDocumentStatusRequestSchema,
  UpdateDocumentNoteRequestSchema,
  DocumentVersionListResponseSchema,
} from '@/contracts/dtos/user-document.dto'

describe('用户文档 DTO 测试', () => {
  describe('DocumentTypeEnum', () => {
    it('应该接受有效的证件类型', () => {
      const validTypes: DocumentType[] = ['id_card', 'unemployment_proof', 'medical_insurance']

      validTypes.forEach((type) => {
        const result = DocumentTypeEnum.safeParse(type)
        expect(result.success).toBe(true)
        expect(result.data).toBe(type)
      })
    })

    it('应该拒绝无效的证件类型', () => {
      const invalidTypes = ['passport', 'driver_license', 'residence_permit', null, undefined, 123, {}]

      invalidTypes.forEach((type) => {
        const result = DocumentTypeEnum.safeParse(type)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('DocumentTypeLabels', () => {
    it('应该提供正确的中文标签', () => {
      expect(DocumentTypeLabels.id_card).toBe('身份证')
      expect(DocumentTypeLabels.unemployment_proof).toBe('失业证明')
      expect(DocumentTypeLabels.medical_insurance).toBe('医疗保险')
    })
  })

  describe('DocumentStatusEnum', () => {
    it('应该接受有效的文档状态', () => {
      const validStatuses: DocumentStatus[] = ['pending', 'approved', 'rejected']

      validStatuses.forEach((status) => {
        const result = DocumentStatusEnum.safeParse(status)
        expect(result.success).toBe(true)
        expect(result.data).toBe(status)
      })
    })

    it('应该拒绝无效的文档状态', () => {
      const invalidStatuses = ['draft', 'published', 'archived', null, undefined, 123, {}]

      invalidStatuses.forEach((status) => {
        const result = DocumentStatusEnum.safeParse(status)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('DocumentStatusLabels', () => {
    it('应该提供正确的中文标签', () => {
      expect(DocumentStatusLabels.pending).toBe('待审核')
      expect(DocumentStatusLabels.approved).toBe('已通过')
      expect(DocumentStatusLabels.rejected).toBe('已拒绝')
    })
  })

  describe('UserDocumentListResponseSchema', () => {
    it('应该接受有效的用户文档列表响应', () => {
      const validData = {
        documents: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            documentType: 'id_card',
            documentName: '我的身份证',
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'pending',
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = UserDocumentListResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该接受空的文档列表', () => {
      const validData = { documents: [] }
      const result = UserDocumentListResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝缺少 documents 字段的响应', () => {
      const invalidData = {} as Record<string, unknown>
      const result = UserDocumentListResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的证件类型', () => {
      const invalidData = {
        documents: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            documentType: 'invalid_type' as unknown,
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'pending',
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = UserDocumentListResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的 UUID 格式', () => {
      const invalidData = {
        documents: [
          {
            id: 'not-a-uuid',
            documentType: 'id_card',
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'pending',
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = UserDocumentListResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的文档状态', () => {
      const invalidData = {
        documents: [
          {
            id: 'doc-123',
            documentType: 'id_card',
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'invalid_status' as unknown,
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = UserDocumentListResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('UserDocumentResponseSchema', () => {
    it('应该接受有效的用户文档详情响应', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        documentType: 'id_card',
        documentName: '我的身份证',
        fileUrl: 'https://example.com/file.jpg',
        fileName: 'id_card.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        hasFile: true,
        status: 'pending',
        note: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = UserDocumentResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该允许 null 可选字段', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        documentType: 'id_card',
        documentName: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        hasFile: false,
        status: null,
        note: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = UserDocumentResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝缺少必需字段', () => {
      const invalidData = {
        id: 'doc-123',
        documentType: 'id_card',
      } as Record<string, unknown>

      const result = UserDocumentResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('AdminUserDocumentListResponseSchema', () => {
    it('应该接受管理员文档列表响应', () => {
      const validData = {
        documents: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            documentType: 'id_card',
            documentName: '我的身份证',
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'approved',
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = AdminUserDocumentListResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('UploadUserDocumentRequestSchema', () => {
    it('应该接受有效的上传请求', () => {
      const validData = {
        documentType: 'id_card',
        documentName: '我的身份证',
      }

      const result = UploadUserDocumentRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该允许省略 documentName', () => {
      const validData = {
        documentType: 'id_card',
      }

      const result = UploadUserDocumentRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝缺少 documentType', () => {
      const invalidData = {
        documentName: '我的身份证',
      }

      const result = UploadUserDocumentRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的 documentType', () => {
      const invalidData = {
        documentType: 'invalid_type',
        documentName: '我的身份证',
      }

      const result = UploadUserDocumentRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateDocumentStatusRequestSchema', () => {
    it('应该接受有效的状态更新请求', () => {
      const validData = { status: 'approved' }
      const result = UpdateDocumentStatusRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该接受拒绝状态并附带原因', () => {
      const validData = {
        status: 'rejected',
        rejectionReason: '图片不清晰',
      }
      const result = UpdateDocumentStatusRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该允许省略 rejectionReason', () => {
      const validData = { status: 'rejected' }
      const result = UpdateDocumentStatusRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝缺少 status', () => {
      const invalidData = {} as Record<string, unknown>
      const result = UpdateDocumentStatusRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的 status', () => {
      const invalidData = { status: 'invalid_status' }
      const result = UpdateDocumentStatusRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateDocumentNoteRequestSchema', () => {
    it('应该接受有效的备注更新请求', () => {
      const validData = { note: '这是我的备注' }
      const result = UpdateDocumentNoteRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝空字符串', () => {
      const invalidData = { note: '' }
      const result = UpdateDocumentNoteRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝过长的备注', () => {
      const invalidData = { note: 'a'.repeat(501) }
      const result = UpdateDocumentNoteRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝缺少 note 字段', () => {
      const invalidData = {} as Record<string, unknown>
      const result = UpdateDocumentNoteRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('DocumentVersionListResponseSchema', () => {
    it('应该接受有效的文档版本列表响应', () => {
      const validData = {
        versions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userDocumentId: '223e4567-e89b-12d3-a456-426614174000',
            documentName: '身份证 v1',
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id-card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      const result = DocumentVersionListResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该接受空的版本列表', () => {
      const validData = { versions: [] }
      const result = DocumentVersionListResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝缺少 versions 字段', () => {
      const invalidData = {} as Record<string, unknown>
      const result = DocumentVersionListResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('类型推断', () => {
    it('应该正确推断 UserDocumentListResponse 类型', () => {
      const data = UserDocumentListResponseSchema.parse({
        documents: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            documentType: 'id_card',
            documentName: '我的身份证',
            hasFile: true,
            fileUrl: 'https://example.com/file.jpg',
            fileName: 'id_card.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            status: 'pending',
            note: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      })

      expect(data).toBeDefined()
      expect(data.documents).toHaveLength(1)
      expect(data.documents[0].documentType).toBe('id_card')
    })

    it('应该正确推断 UploadUserDocumentRequest 类型', () => {
      const data = UploadUserDocumentRequestSchema.parse({
        documentType: 'id_card',
        documentName: '我的身份证',
      })

      expect(data).toBeDefined()
      expect(data.documentType).toBe('id_card')
    })

    it('应该正确推断 UpdateDocumentStatusRequest 类型', () => {
      const data = UpdateDocumentStatusRequestSchema.parse({
        status: 'approved',
        rejectionReason: '原因',
      })

      expect(data).toBeDefined()
      expect(data.status).toBe('approved')
    })
  })
})
