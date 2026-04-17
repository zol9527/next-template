import type { DocumentVersionRepository } from '@/repositories/interfaces/core/document-version.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { DocumentVersion } from '@/contracts/dtos/user-document.dto'
import { prisma } from '@/lib/prisma'

/**
 * Function: transformToDto
 *
 * Description: 将 Prisma DocumentVersion 模型转换为 DocumentVersion DTO
 *
 * Parameters:
 *   doc(PrismaDocumentVersion): Prisma 返回的原始数据
 *
 * Returns:
 *   DocumentVersion: 转换后的 DTO
 */
function transformToDto(doc: {
  id: string
  userDocumentId: string
  documentName: string | null
  filePath: string | null
  fileName: string | null
  fileSize: bigint | null
  mimeType: string | null
  createdAt: Date
}): DocumentVersion {
  return {
    id: doc.id,
    userDocumentId: doc.userDocumentId,
    documentName: doc.documentName,
    filePath: doc.filePath,
    fileName: doc.fileName,
    fileSize: doc.fileSize ? Number(doc.fileSize) : null,
    mimeType: doc.mimeType,
    createdAt: doc.createdAt.toISOString(),
  }
}

export function createPrismaDocumentVersionRepository(): DocumentVersionRepository {
  return {
    async findByUserDocumentId(
      ctx: RepoContext,
      params: { userDocumentId: string }
    ): Promise<DocumentVersion[]> {
      ctx.logger.debug({ userDocumentId: params.userDocumentId }, 'Finding document versions')

      const versions = await prisma.documentVersion.findMany({
        where: { userDocumentId: params.userDocumentId },
        orderBy: { createdAt: 'desc' },
      })

      return versions.map((doc) => transformToDto(doc))
    },

    async create(
      ctx: RepoContext,
      params: {
        userDocumentId: string
        documentName?: string | null
        filePath?: string | null
        fileName?: string | null
        fileSize?: bigint
        mimeType: string
      }
    ): Promise<DocumentVersion> {
      ctx.logger.info({ userDocumentId: params.userDocumentId, filePath: params.filePath }, 'Creating document version')

      const version = await prisma.documentVersion.create({
        data: {
          userDocumentId: params.userDocumentId,
          documentName: params.documentName,
          filePath: params.filePath,
          fileName: params.fileName,
          fileSize: params.fileSize,
          mimeType: params.mimeType,
        },
      })

      return transformToDto(version)
    },

    async deleteByUserDocumentId(ctx: RepoContext, params: { userDocumentId: string }): Promise<void> {
      ctx.logger.info({ userDocumentId: params.userDocumentId }, 'Deleting document versions')

      await prisma.documentVersion.deleteMany({
        where: { userDocumentId: params.userDocumentId },
      })
    },
  }
}
