import type { UserDocumentRepository } from '@/repositories/interfaces/core/user-document.interface'
import type { DocumentVersionRepository } from '@/repositories/interfaces/core/document-version.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  UserDocument,
  DocumentType,
  DocumentVersion,
  DocumentStatus,
} from '@/contracts/dtos/user-document.dto'
import { DocumentTypeLabels } from '@/contracts/dtos/user-document.dto'
import { fileStorage } from '@/lib/file-storage'
import { ForbiddenError } from '@/lib/errors/app-error'

export function createUserDocumentService(
  deps: {
    userDocuments: UserDocumentRepository
    documentVersions: DocumentVersionRepository
    users: UserRepository
  },
  ctx: ServiceContext
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async getAllDocuments(params?: {
      status?: DocumentStatus | null
      documentType?: DocumentType | null
      limit?: number
      offset?: number
    }): Promise<{ documents: UserDocument[]; total: number }> {
      logger.info({ params }, 'Fetching all documents for admin')

      const result = await deps.userDocuments.findAll(repoCtx, {
        status: params?.status,
        documentType: params?.documentType,
        limit: params?.limit || 20,
        offset: params?.offset || 0,
      })

      const documents = result.documents.map((doc) => ({
        ...doc,
        documentTypeName: DocumentTypeLabels[doc.documentType],
      }))

      return {
        documents,
        total: result.total,
      }
    },

    async getUserDocuments(userId: string): Promise<UserDocument[]> {
      logger.info({ userId }, 'Fetching user documents')

      const documents = await deps.userDocuments.findByUserId(repoCtx, { userId })

      return documents.map((doc) => ({
        ...doc,
        documentTypeName: DocumentTypeLabels[doc.documentType],
      }))
    },

    async uploadUserDocument(
      userId: string,
      params: {
        documentType: DocumentType
        documentName?: string | null
        file: File
        mimeType: string
        fileSize: number
      }
    ): Promise<UserDocument> {
      logger.info({ userId, documentType: params.documentType }, 'Uploading user document')

      // ============ 安全检查：验证用户上传权限 ============
      const user = await deps.users.getUserById(repoCtx, { userId })
      if (!user) {
        logger.warn({ userId }, 'User not found for upload')
        throw new ForbiddenError('用户不存在')
      }

      if (!user.canUpload) {
        logger.warn({ userId }, 'Upload attempt without permission')
        throw new ForbiddenError('您暂无上传权限，请联系管理员开通')
      }
      // ============ 权限检查结束 ============

      if (!fileStorage.validateMimeType(params.mimeType)) {
        throw new Error('不支持的文件类型，仅支持 JPEG、PNG、WebP 格式')
      }

      if (!fileStorage.validateFileSize(params.fileSize)) {
        const maxSizeMB = fileStorage.getMaxFileSize() / 1024 / 1024
        throw new Error(`文件大小超过限制，最大支持 ${maxSizeMB} MB`)
      }

      const existingDoc = await deps.userDocuments.findByUserIdAndDocumentType(repoCtx, {
        userId,
        documentType: params.documentType,
      })

      const { filePath, fileName, fileSize } = await fileStorage.saveFile(
        userId,
        params.documentType,
        params.file,
        `file.${params.mimeType.split('/')[1]}`,
        params.mimeType
      )

      let doc: UserDocument

      if (existingDoc) {
        doc = await deps.userDocuments.update(repoCtx, {
          id: existingDoc.id,
          filePath,
          fileName,
          fileSize: BigInt(fileSize),
          mimeType: params.mimeType,
          documentName: params.documentName,
          status: existingDoc.status,
          note: existingDoc.note,
        })
      } else {
        doc = await deps.userDocuments.create(repoCtx, {
          userId,
          documentType: params.documentType,
          documentName: params.documentName,
          filePath,
          fileName,
          fileSize: BigInt(fileSize),
          mimeType: params.mimeType,
        })
      }

      await deps.documentVersions.create(repoCtx, {
        userDocumentId: doc.id,
        documentName: doc.documentName || null,
        filePath: doc.filePath || null,
        fileName: doc.fileName || null,
        fileSize: BigInt(fileSize),
        mimeType: params.mimeType,
      })

      logger.info({ documentId: doc.id }, 'User document uploaded successfully')

      return doc
    },

    async deleteUserDocument(documentId: string, userId: string): Promise<void> {
      logger.info({ documentId, userId }, 'Deleting user document')

      const doc = await deps.userDocuments.findById(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      if (doc.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own documents')
      }

      if (doc.filePath) {
        try {
          await fileStorage.deleteFile(doc.filePath)
          logger.info({ filePath: doc.filePath }, 'Deleted document file')
        } catch (error) {
          logger.warn({ error }, 'Failed to delete document file')
        }
      }

      await deps.userDocuments.delete(repoCtx, { id: documentId })
      await deps.documentVersions.deleteByUserDocumentId(repoCtx, { userDocumentId: documentId })
    },

    async getUserDocumentByType(
      userId: string,
      documentType: DocumentType
    ): Promise<UserDocument | null> {
      logger.info({ userId, documentType }, 'Fetching user document by type')

      return await deps.userDocuments.findByUserIdAndDocumentType(repoCtx, {
        userId,
        documentType,
      })
    },

    async updateDocumentStatus(
      documentId: string,
      userId: string,
      status: DocumentStatus
    ): Promise<UserDocument> {
      logger.info({ documentId, userId, status }, 'Updating document status')

      const doc = await deps.userDocuments.findById(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      if (doc.userId !== userId) {
        throw new Error('Unauthorized: You can only view your own documents')
      }

      throw new Error('Unauthorized: Document status can only be updated by admin')
    },

    async updateDocumentStatusByAdmin(
      documentId: string,
      status: DocumentStatus,
      rejectionReason?: string
    ): Promise<UserDocument> {
      logger.info({ documentId, status, rejectionReason }, 'Admin updating document status')

      const doc = await deps.userDocuments.findById(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      const note = rejectionReason ? `${doc.note || ''}\n\n管理员拒绝原因: ${rejectionReason}`.trim() : doc.note

      const updatedDoc = await deps.userDocuments.update(repoCtx, {
        id: documentId,
        status,
        note,
      })

      logger.info({ documentId, status }, 'Document status updated successfully by admin')

      return updatedDoc
    },

    async updateDocumentNote(
      documentId: string,
      userId: string,
      note: string
    ): Promise<UserDocument> {
      logger.info({ documentId, userId, note }, 'Updating document note')

      const doc = await deps.userDocuments.findById(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      if (doc.userId !== userId) {
        throw new Error('Unauthorized: You can only update your own documents')
      }

      const updatedDoc = await deps.userDocuments.update(repoCtx, {
        id: documentId,
        note,
      })

      logger.info({ documentId, note }, 'Document note updated successfully')

      return updatedDoc
    },

    async getDocumentHistory(
      documentId: string,
      userId: string
    ): Promise<DocumentVersion[]> {
      logger.info({ documentId, userId }, 'Fetching document history')

      const doc = await deps.userDocuments.findById(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      if (doc.userId !== userId) {
        throw new Error('Unauthorized: You can only view your own documents')
      }

      const versions = await deps.documentVersions.findByUserDocumentId(repoCtx, {
        userDocumentId: documentId,
      })

      return versions
    },

    /**
     * 获取文档文件（带权限校验）
     *
     * @param documentId - 文档 ID
     * @param requestingUserId - 请求用户 ID
     * @param isAdmin - 是否为管理员
     * @param hasPermission - 是否有 user_document:read 权限
     * @returns 文件 Buffer 和 MIME 类型
     * @throws Error - 无权限访问或文档不存在
     */
    async getDocumentFile(
      documentId: string,
      requestingUserId: string,
      isAdmin: boolean,
      hasPermission: boolean
    ): Promise<{ buffer: Buffer; mimeType: string | null }> {
      logger.info({ documentId, requestingUserId, isAdmin }, 'Getting document file')

      const doc = await deps.userDocuments.findByIdForFileAccess(repoCtx, { id: documentId })

      if (!doc) {
        throw new Error('Document not found')
      }

      // 权限校验：本人或管理员（有权限）
      // 注意：管理员应通过 seed 脚本自动获得 user_document:read 权限
      const isOwner = doc.userId === requestingUserId
      const canAccess = isOwner || (isAdmin && hasPermission)

      if (!canAccess) {
        logger.warn({
          documentId,
          requestingUserId,
          documentOwnerId: doc.userId,
          isAdmin,
          hasPermission,
        }, 'Unauthorized access attempt to user document')
        throw new Error('Forbidden: You do not have permission to access this document')
      }

      // 记录访问类型，便于审计
      if (isOwner) {
        logger.debug({ documentId, userId: requestingUserId }, 'Document access granted (owner)')
      } else {
        logger.info({ documentId, userId: requestingUserId }, 'Document access granted (admin with permission)')
      }

      if (!doc.filePath) {
        throw new Error('Document has no file')
      }

      // 读取文件内容
      const buffer = await fileStorage.readFile(doc.filePath)

      logger.info({ documentId, size: buffer.length }, 'Document file access granted')

      return { buffer, mimeType: doc.mimeType }
    },
  }
}
