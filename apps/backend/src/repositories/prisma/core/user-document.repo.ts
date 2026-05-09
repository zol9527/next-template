import type { UserDocumentRepository } from '@/repositories/interfaces/core/user-document.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { UserDocument, DocumentType, DocumentStatus } from '@/contracts/dtos/user-document.dto'
import type { Prisma } from '@/lib/prisma/generated/prisma'
import { prisma } from '@/lib/prisma'

/**
 * Function: transformToDto
 *
 * Description: 将 Prisma UserDocument 模型转换为 UserDocument DTO
 *
 * Parameters:
 *   doc(PrismaUserDocument): Prisma 返回的原始数据
 *
 * Returns:
 *   UserDocument: 转换后的 DTO
 */
function transformToDto(doc: {
  id: string
  userId: string
  documentType: string
  documentName: string | null
  filePath: string | null
  fileName: string | null
  fileSize: bigint | null
  mimeType: string | null
  status: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}): UserDocument {
  return {
    id: doc.id,
    userId: doc.userId,
    documentType: doc.documentType as DocumentType,
    documentName: doc.documentName,
    filePath: doc.filePath,
    fileName: doc.fileName,
    fileSize: doc.fileSize ? Number(doc.fileSize) : null,
    mimeType: doc.mimeType,
    hasFile: !!doc.filePath,
    status: doc.status as DocumentStatus | null,
    note: doc.note,
    fileUrl: doc.filePath ? `/api/v1/user/documents/${doc.id}/file` : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function createPrismaUserDocumentRepository(): UserDocumentRepository {
  return {
    async findByUserIdAndDocumentType(
      ctx: RepoContext,
      params: { userId: string; documentType: DocumentType }
    ): Promise<UserDocument | null> {
      ctx.logger.debug({ userId: params.userId, documentType: params.documentType }, 'Finding user document by type')

      const doc = await prisma.userDocument.findUnique({
        where: {
          userId_documentType: {
            userId: params.userId,
            documentType: params.documentType,
          },
        },
      })

      return doc ? transformToDto(doc) : null
    },

    async findAll(
      ctx: RepoContext,
      params?: {
        status?: DocumentStatus | null
        documentType?: DocumentType | null
        limit?: number
        offset?: number
      }
    ): Promise<{ documents: UserDocument[]; total: number }> {
      ctx.logger.debug({ params }, 'Finding all documents')

      const where: Prisma.UserDocumentWhereInput = {}
      if (params?.status) where.status = params.status
      if (params?.documentType) where.documentType = params.documentType

      const [documents, total] = await Promise.all([
        prisma.userDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: params?.limit || 20,
          skip: params?.offset || 0,
        }),
        prisma.userDocument.count({ where }),
      ])

      return {
        documents: documents.map((doc) => transformToDto(doc)),
        total,
      }
    },

    async findByUserId(ctx: RepoContext, params: { userId: string }): Promise<UserDocument[]> {
      ctx.logger.debug({ userId: params.userId }, 'Finding all user documents')

      const docs = await prisma.userDocument.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'asc' },
      })

      return docs.map((doc) => transformToDto(doc))
    },

    async findById(ctx: RepoContext, params: { id: string }): Promise<UserDocument | null> {
      ctx.logger.debug({ id: params.id }, 'Finding user document by id')

      const doc = await prisma.userDocument.findUnique({
        where: { id: params.id },
      })

      return doc ? transformToDto(doc) : null
    },

    async create(
      ctx: RepoContext,
      params: {
        userId: string
        documentType: DocumentType
        documentName?: string | null
        filePath?: string | null
        fileName?: string | null
        fileSize?: bigint | null
        mimeType?: string | null
      }
    ): Promise<UserDocument> {
      ctx.logger.info(
        { userId: params.userId, documentType: params.documentType, filePath: params.filePath },
        'Creating user document'
      )

      const doc = await prisma.userDocument.create({
        data: {
          userId: params.userId,
          documentType: params.documentType,
          documentName: params.documentName ?? null,
          filePath: params.filePath ?? null,
          fileName: params.fileName ?? null,
          fileSize: params.fileSize ?? null,
          mimeType: params.mimeType ?? null,
          status: 'pending',
          note: null,
        },
      })

      return transformToDto(doc)
    },

    async update(
      ctx: RepoContext,
      params: {
        id: string
        filePath?: string | null
        fileName?: string | null
        fileSize?: bigint | null
        mimeType?: string | null
        documentName?: string | null
        status?: string | null
        note?: string | null
      }
    ): Promise<UserDocument> {
      ctx.logger.info({ id: params.id, filePath: params.filePath }, 'Updating user document')

      const doc = await prisma.userDocument.update({
        where: { id: params.id },
        data: {
          filePath: params.filePath,
          fileName: params.fileName,
          fileSize: params.fileSize,
          mimeType: params.mimeType,
          documentName: params.documentName,
          status: params.status,
          note: params.note,
          updatedAt: new Date(),
        },
      })

      return transformToDto(doc)
    },

    async delete(ctx: RepoContext, params: { id: string }): Promise<void> {
      ctx.logger.info({ id: params.id }, 'Deleting user document')

      await prisma.userDocument.delete({
        where: { id: params.id },
      })
    },

    async deleteByUserId(ctx: RepoContext, params: { userId: string }): Promise<void> {
      ctx.logger.info({ userId: params.userId }, 'Deleting all user documents')

      await prisma.userDocument.deleteMany({
        where: { userId: params.userId },
      })
    },

    async findByIdForFileAccess(
      ctx: RepoContext,
      params: { id: string }
    ): Promise<{
      id: string
      userId: string
      filePath: string | null
      mimeType: string | null
      status: string
    } | null> {
      ctx.logger.debug({ id: params.id }, 'Finding user document for file access')

      const doc = await prisma.userDocument.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          userId: true,
          filePath: true,
          mimeType: true,
          status: true,
        },
      })

      if (!doc || !doc.status) return null

      return {
        id: doc.id,
        userId: doc.userId,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        status: doc.status,
      }
    },
  }
}
