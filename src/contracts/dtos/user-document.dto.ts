import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const DocumentTypeEnum = z.enum([
  'id_card',
  'unemployment_proof',
  'medical_insurance',
])

export type DocumentType = z.infer<typeof DocumentTypeEnum>

export const DocumentTypeLabels: Record<DocumentType, string> = {
  id_card: '身份证',
  unemployment_proof: '失业证明',
  medical_insurance: '医疗保险',
}

// 文档状态枚举
export const DocumentStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
])

export type DocumentStatus = z.infer<typeof DocumentStatusEnum>

export const DocumentStatusLabels: Record<DocumentStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

export type UserDocument = {
  id: string
  userId: string
  documentType: DocumentType
  documentName: string | null
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  hasFile: boolean
  fileUrl: string | null
  status: DocumentStatus | null
  note: string | null
  createdAt: string
  updatedAt: string
}

// 文档版本类型
export type DocumentVersion = {
  id: string
  userDocumentId: string
  documentName: string | null
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
}

export const UserDocumentListResponseSchema = z
  .object({
    documents: z.array(
      z.object({
        id: z.string().uuid().openapi({ description: '证件 ID' }),
        documentType: DocumentTypeEnum.openapi({ description: '证件类型' }),
        documentName: z.string().nullable().optional().openapi({ description: '证件名称' }),
        hasFile: z.boolean().openapi({ description: '是否已上传文件' }),
        fileUrl: z.string().nullable().optional().openapi({ description: '文件访问 URL' }),
        fileName: z.string().nullable().optional().openapi({ description: '文件名' }),
        fileSize: z.number().nullable().optional().openapi({ description: '文件大小（字节）' }),
        mimeType: z.string().nullable().optional().openapi({ description: 'MIME 类型' }),
        status: DocumentStatusEnum.nullable().optional().openapi({ description: '证件状态' }),
        note: z.string().nullable().optional().openapi({ description: '备注' }),
        createdAt: z.string().openapi({ description: '创建时间' }),
        updatedAt: z.string().openapi({ description: '更新时间' }),
      })
    ).openapi({ description: '证件列表' }),
  })
  .openapi({ description: '用户证件列表响应' })

export type UserDocumentListResponse = z.infer<typeof UserDocumentListResponseSchema>

export const UserDocumentResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '证件 ID' }),
    documentType: DocumentTypeEnum.openapi({ description: '证件类型' }),
    documentName: z.string().nullable().optional().openapi({ description: '证件名称' }),
    fileUrl: z.string().nullable().optional().openapi({ description: '文件访问 URL' }),
    fileName: z.string().nullable().optional().openapi({ description: '文件名' }),
    fileSize: z.number().nullable().optional().openapi({ description: '文件大小（字节）' }),
    mimeType: z.string().nullable().optional().openapi({ description: 'MIME 类型' }),
    status: DocumentStatusEnum.nullable().optional().openapi({ description: '证件状态' }),
    note: z.string().nullable().optional().openapi({ description: '备注' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
    updatedAt: z.string().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '用户证件详情响应' })

export type UserDocumentResponse = z.infer<typeof UserDocumentResponseSchema>

export const AdminUserDocumentListResponseSchema = UserDocumentListResponseSchema.openapi({
  description: '管理员获取用户证件列表响应',
})

export type AdminUserDocumentListResponse = z.infer<typeof AdminUserDocumentListResponseSchema>

export const UploadUserDocumentRequestSchema = z
  .object({
    documentType: DocumentTypeEnum.openapi({ description: '证件类型' }),
    documentName: z.string().optional().openapi({ description: '证件名称（可选）' }),
  })
  .openapi({ description: '上传用户证件请求' })

export type UploadUserDocumentRequest = z.infer<typeof UploadUserDocumentRequestSchema>

// 更新文档状态请求
export const UpdateDocumentStatusRequestSchema = z
  .object({
    status: DocumentStatusEnum.openapi({ description: '文档状态：pending/approved/rejected' }),
    rejectionReason: z.string().optional().openapi({ description: '拒绝原因（仅当 status 为 rejected 时）' }),
  })
  .openapi({ description: '更新文档状态请求' })

export type UpdateDocumentStatusRequest = z.infer<typeof UpdateDocumentStatusRequestSchema>

// 更新文档备注请求
export const UpdateDocumentNoteRequestSchema = z
  .object({
    note: z.string().min(1).max(500).openapi({ description: '备注内容（1-500 字符）' }),
  })
  .openapi({ description: '更新文档备注请求' })

export type UpdateDocumentNoteRequest = z.infer<typeof UpdateDocumentNoteRequestSchema>

// 文档版本列表响应
export const DocumentVersionListResponseSchema = z
  .object({
    versions: z.array(
      z.object({
        id: z.string().uuid().openapi({ description: '版本 ID' }),
        documentName: z.string().nullable().optional().openapi({ description: '证件名称' }),
        fileUrl: z.string().nullable().optional().openapi({ description: '文件访问 URL' }),
        fileName: z.string().nullable().optional().openapi({ description: '文件名' }),
        fileSize: z.number().nullable().optional().openapi({ description: '文件大小（字节）' }),
        mimeType: z.string().nullable().optional().openapi({ description: 'MIME 类型' }),
        createdAt: z.string().openapi({ description: '创建时间' }),
      })
    ).openapi({ description: '文档版本列表' }),
  })
  .openapi({ description: '文档版本列表响应' })

export type DocumentVersionListResponse = z.infer<typeof DocumentVersionListResponseSchema>
