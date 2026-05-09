import type { RepoContext } from '@/types/repo/repo-context'
import type { UserDocument, DocumentType, DocumentStatus } from '@/contracts/dtos/user-document.dto'

export interface UserDocumentRepository {
  findByUserIdAndDocumentType(
    ctx: RepoContext,
    params: { userId: string; documentType: DocumentType }
  ): Promise<UserDocument | null>

  findByUserId(ctx: RepoContext, params: { userId: string }): Promise<UserDocument[]>

  findById(ctx: RepoContext, params: { id: string }): Promise<UserDocument | null>

  findAll(ctx: RepoContext, params?: {
    status?: DocumentStatus | null
    documentType?: DocumentType | null
    limit?: number
    offset?: number
  }): Promise<{ documents: UserDocument[]; total: number }>

  create(ctx: RepoContext, params: {
    userId: string
    documentType: DocumentType
    documentName?: string | null
    filePath?: string | null
    fileName?: string | null
    fileSize?: bigint | null
    mimeType?: string | null
  }): Promise<UserDocument>

  update(ctx: RepoContext, params: {
    id: string
    filePath?: string | null
    fileName?: string | null
    fileSize?: bigint | null
    mimeType?: string | null
    documentName?: string | null
    status?: string | null
    note?: string | null
  }): Promise<UserDocument>

  delete(ctx: RepoContext, params: { id: string }): Promise<void>

  deleteByUserId(ctx: RepoContext, params: { userId: string }): Promise<void>

  /**
   * 根据 ID 查找文档（用于文件访问）
   * 只返回文件访问所需的字段
   */
  findByIdForFileAccess(
    ctx: RepoContext,
    params: { id: string }
  ): Promise<{
    id: string
    userId: string
    filePath: string | null
    mimeType: string | null
    status: string
  } | null>
}
