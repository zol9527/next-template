import type { RepoContext } from '@/types/repo/repo-context'
import type { DocumentVersion } from '@/contracts/dtos/user-document.dto'

export interface DocumentVersionRepository {
  findByUserDocumentId(
    ctx: RepoContext,
    params: { userDocumentId: string }
  ): Promise<DocumentVersion[]>

  create(
    ctx: RepoContext,
    params: {
      userDocumentId: string
      documentName?: string | null
      filePath?: string | null
      fileName?: string | null
      fileSize?: bigint
      mimeType: string
    }
  ): Promise<DocumentVersion>

  deleteByUserDocumentId(ctx: RepoContext, params: { userDocumentId: string }): Promise<void>
}
