import type {
  AdminCreateMediaAssetRequest,
  AdminMediaAsset,
  AdminMediaAssetListQuery,
  AdminMediaAssetListResponse,
  AdminMediaProvider,
  AdminMediaAssetType,
} from '@/contracts/dtos/admin/media-assets.dto'
import type {
  AdminOssUploadPolicyRequest,
  AdminOssUploadPolicyResponse,
} from '@/contracts/dtos/admin/oss-upload-policy.dto'
import { env } from '@/config'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ImageProcessingOptions } from '@/lib/storage/types/image-processing'

function makeInvalidInputError(message: string): Error & { code: 'INVALID_INPUT' } {
  const error = new Error(message) as Error & { code: 'INVALID_INPUT' }
  error.code = 'INVALID_INPUT'
  return error
}

function makeInternalError(message: string): Error & { code: 'INTERNAL_ERROR' } {
  const error = new Error(message) as Error & { code: 'INTERNAL_ERROR' }
  error.code = 'INTERNAL_ERROR'
  return error
}

function sanitizePrefix(prefix: string) {
  const p = prefix.trim()
  if (p === '') return ''
  return p.endsWith('/') ? p : `${p}/`
}

function validateObjectKey(objectKey: string) {
  if (objectKey.length > 1024) throw makeInvalidInputError('objectKey 太长')
  if (objectKey.startsWith('/')) throw makeInvalidInputError('objectKey 不能以 / 开头')
  if (objectKey.includes('..')) throw makeInvalidInputError('objectKey 不能包含 ..')
  if (objectKey.includes('\\')) throw makeInvalidInputError('objectKey 不能包含 \\')
  // 控制字符
  if (/\p{Cc}/u.test(objectKey)) throw makeInvalidInputError('objectKey 包含非法控制字符')

  const expectedPrefix = sanitizePrefix(env.ALIYUN_OSS_DIR_PREFIX ?? 'uploads')
  if (expectedPrefix && !objectKey.startsWith(expectedPrefix)) {
    throw makeInvalidInputError(`objectKey 必须以 ${expectedPrefix} 开头`)
  }
}

function validateRegisterParams(params: {
  provider: string
  bucket: string
  objectKey: string
  contentType: string
  sizeBytes: number
}) {
  // 验证 provider
  const validProviders = ['aliyun_oss', 'tencent_cos', 'local']
  if (!validProviders.includes(params.provider)) {
    throw makeInvalidInputError(`不支持的 provider: ${params.provider}`)
  }

  // 根据 provider 验证 bucket
  let expectedBucket: string | undefined
  switch (params.provider) {
    case 'aliyun_oss':
      expectedBucket = env.ALIYUN_OSS_BUCKET
      if (!expectedBucket) throw makeInternalError('Aliyun OSS bucket 未配置')
      break
    case 'tencent_cos':
      expectedBucket = env.TENCENT_COS_BUCKET
      if (!expectedBucket) throw makeInternalError('Tencent COS bucket 未配置')
      break
    case 'local':
      expectedBucket = 'local'
      break
    default:
      throw makeInvalidInputError(`不支持的 provider: ${params.provider}`)
  }

  if (params.bucket !== expectedBucket) throw makeInvalidInputError('bucket 不匹配')

  // 验证 objectKey 前缀
  const expectedPrefix = params.provider === 'local'
    ? 'uploads'
    : sanitizePrefix(env.ALIYUN_OSS_DIR_PREFIX ?? 'uploads')
  if (!params.objectKey.startsWith(expectedPrefix)) {
    throw makeInvalidInputError(`objectKey 必须以 ${expectedPrefix} 开头`)
  }

  validateObjectKey(params.objectKey)

  const contentType = params.contentType.trim()
  if (contentType.length === 0) throw makeInvalidInputError('contentType 不能为空')
  if (contentType.length > 255) throw makeInvalidInputError('contentType 太长')

  const maxRegisterBytes = 200 * 1024 * 1024
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes < 0) throw makeInvalidInputError('sizeBytes 非法')
  if (params.sizeBytes > maxRegisterBytes) throw makeInvalidInputError('sizeBytes 超过限制')
}

function makeNotFoundError(message: string): Error & { code: 'NOT_FOUND' } {
  const error = new Error(message) as Error & { code: 'NOT_FOUND' }
  error.code = 'NOT_FOUND'
  return error
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeConflictError(message: string): Error & { code: 'CONFLICT' } {
  const error = new Error(message) as Error & { code: 'CONFLICT' }
  error.code = 'CONFLICT'
  return error
}

/**
Function: createAdminMediaAssetService

Description: 创建管理员媒体资源服务（US3），负责直传签名下发、媒体入库登记、媒体列表与删除编排

Parameters:
    deps({ media: MediaAssetRepository, storage: ObjectStorageProvider }): 依赖注入的媒体仓储与对象存储 Provider
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 issueUploadPolicy/create/list/deleteMediaAsset 的服务对象
*/
export function createAdminMediaAssetService(
  deps: {
    media: MediaAssetRepository
    storage: ObjectStorageProvider
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * Function: issueUploadPolicy
     *
     * Description: 签发对象存储直传上传策略（签名）
     *              客户端使用返回的 uploadUrl 和 formFields 直接上传文件到对象存储，减轻服务器压力
     *              支持阿里云 OSS、腾讯云 COS 等多种存储提供商
     *
     * Parameters:
     * 	params(AdminOssUploadPolicyRequest): 上传策略请求参数
     * 		provider(AdminMediaProvider): 存储提供商（aliyun_oss / tencent_cos / local）
     * 		contentType(string): 文件 MIME 类型
     * 		sizeBytes(number): 文件大小（字节）
     * 		purpose(string, optional): 上传用途标识
     *
     * Returns:
     * 	AdminOssUploadPolicyResponse: 上传策略响应对象
     * 		provider(AdminMediaProvider): 存储提供商
     * 		uploadUrl(string): 直传上传地址
     * 		formFields(Record<string, string>): 表单字段（包含签名、策略等）
     * 		expireAt(number): 策略过期时间戳（毫秒）
     * 		objectKey(string): 对象在存储桶中的唯一键
     * 		fileUrl(string): 文件访问 URL
     */
    async issueUploadPolicy(params: AdminOssUploadPolicyRequest): Promise<AdminOssUploadPolicyResponse> {
      // 调用底层存储 Provider 签发上传策略
      const policy = await deps.storage.issueUploadPolicy(params)

      // 记录策略签发日志（用于审计和监控）
      logger.info({
        action: 'admin_media.issue_upload_policy',
        provider: policy.provider,
        purpose: params.purpose ?? null,
        contentType: params.contentType,
        sizeBytes: params.sizeBytes,
      })

      // 底层 Provider 已返回正确的 AdminMediaProvider 枚举值，直接传递
      return {
        provider: policy.provider as AdminMediaProvider,
        uploadUrl: policy.uploadUrl,
        formFields: policy.formFields,
        expireAt: policy.expireAt,
        objectKey: policy.objectKey,
        fileUrl: policy.fileUrl,
      }
    },

    /**
     * Function: listMediaAssets
     *
     * Description: 分页查询媒体资源列表（传统分页，向后兼容）
     *              支持按状态、提供商、内容类型筛选，并支持自定义排序
     *
     * Parameters:
     * 	params(AdminMediaAssetListQuery, optional): 查询参数对象
     * 		page(number, optional): 页码，默认为 1
     * 		pageSize(number, optional): 每页数量，默认为 20，最大 50
     * 		status(string, optional): 资源状态筛选
     * 		provider(AdminMediaProvider, optional): 存储提供商筛选
     * 		contentType(string, optional): 内容类型筛选
     * 		sortBy(string, optional): 排序字段，支持 sizeBytes 或 createdAt，默认为 createdAt
     * 		sortOrder('asc' | 'desc', optional): 排序方向，默认为 desc
     *
     * Returns:
     * 	AdminMediaAssetListResponse: 媒体资源列表响应
     * 		items(AdminMediaAsset[]): 媒体资源数组
     * 		total(number): 符合条件的资源总数
     * 		page(number): 当前页码
     * 		pageSize(number): 每页数量
     */
    async listMediaAssets(params?: Partial<AdminMediaAssetListQuery>): Promise<AdminMediaAssetListResponse> {
      // 分页参数校验与规范化：页码至少为 1
      const page = Math.max(1, Math.floor(params?.page ?? 1))
      // 页大小限制在 1-50 之间，防止查询过多数据
      const pageSize = Math.max(1, Math.min(Math.floor(params?.pageSize ?? 20), 50))
      // 计算数据库查询的偏移量
      const offset = (page - 1) * pageSize

      // 排序参数白名单校验，防止 SQL 注入
      const safeSortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc'
      const safeSortBy = params?.sortBy === 'sizeBytes' ? 'sizeBytes' : 'createdAt'

      // 调用 Repository 层执行分页查询
      const { items, total } = await deps.media.listMediaAssets(repoCtx, {
        limit: pageSize,
        offset,
        status: params?.status,
        provider: params?.provider as AdminMediaProvider | undefined,
        contentType: params?.contentType,
        search: params?.search,
        type: (params?.type ?? []) as AdminMediaAssetType[],
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
      })

      // 为云存储资源生成签名 URL（支持私有 Bucket 访问）
      // 应用图片处理优化（缩略图 150x150，适合媒体资源列表展示）
      const thumbnailOptions: ImageProcessingOptions = {
        size: 'thumbnail',   // 150x150，适合媒体资源列表缩略图
        format: 'webp',     // WebP 格式，节省流量
        quality: 85,        // 质量 85%，列表页快速加载
      }

      const itemsWithUrls = await Promise.all(
        items.map(async (item) => {
          // 对于云存储资源，始终重新生成签名 URL（因为签名会过期）
          if (item.provider === 'aliyun_oss' || item.provider === 'tencent_cos') {
            try {
              // 尝试生成优化后的图片 URL
              const optimizedUrl = await deps.storage.getImageProcessingUrl(
                item.objectKey,
                thumbnailOptions
              )

              // 如果返回的 URL 包含 x-oss-process，说明图片处理成功
              if (optimizedUrl.includes('x-oss-process')) {
                logger.debug(
                  { assetId: item.id, originalSize: item.sizeBytes },
                  'Generated optimized thumbnail URL for admin media list'
                )
                return { ...item, url: optimizedUrl }
              } else {
                // 图片处理不支持，使用普通签名 URL
                const signedUrl = await deps.storage.getSignedUrl(item.objectKey)
                return { ...item, url: signedUrl }
              }
            } catch (error) {
              // 签名 URL 生成失败时，记录警告但继续返回原始数据
              logger.warn({
                action: 'admin_media.generate_signed_url_failed',
                assetId: item.id,
                provider: item.provider,
                objectKey: item.objectKey,
                error: error instanceof Error ? error.message : String(error),
              })
              // 失败时回退到数据库中的 URL（如果有）
              return item
            }
          }

          // 本地存储或其他情况，直接返回原始数据
          return item
        })
      )

      return {
        items: itemsWithUrls,
        total,
        page,
        pageSize,
      }
    },

    /**
     * Function: listMediaAssetsCursor
     *
     * Description: 游标分页查询媒体资源列表
     *              支持按状态、提供商、内容类型筛选，并支持自定义排序
     *
     * Parameters:
     * 	params(object): 查询参数对象
     * 		cursor(string, optional): 游标值（上一页最后一条记录的 createdAt）
     * 		limit(number): 每页数量，默认为 12，最大 50
     * 		status(string, optional): 资源状态筛选
     * 		provider(AdminMediaProvider, optional): 存储提供商筛选
     * 		contentType(string, optional): 内容类型筛选
     * 		sortBy(string, optional): 排序字段，支持 sizeBytes 或 createdAt，默认为 createdAt
     * 		sortOrder('asc' | 'desc', optional): 排序方向，默认为 desc
     *
     * Returns:
     * 	object: 游标分页响应对象
     * 		items(AdminMediaAsset[]): 媒体资源数组
     * 		nextCursor(string | null): 下一页游标，无更多数据时为 null
     * 		total(number): 符合条件的资源总数
     */
    async listMediaAssetsCursor(params: {
      cursor?: string | null
      limit: number
      status?: string
      provider?: AdminMediaProvider
      contentType?: string
      search?: string
      type?: AdminMediaAssetType[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }) {
      // 页大小限制在 1-50 之间，防止查询过多数据
      const limit = Math.max(1, Math.min(Math.floor(params.limit), 50))

      // 排序参数白名单校验，防止 SQL 注入
      const safeSortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'
      const safeSortBy = params.sortBy === 'sizeBytes' ? 'sizeBytes' : 'createdAt'

      // 调用 Repository 层执行游标分页查询
      const { items, nextCursor, total } = await deps.media.listMediaAssetsCursor(repoCtx, {
        cursor: params.cursor ?? null,
        limit,
        status: params.status,
        provider: params.provider,
        contentType: params.contentType,
        search: params.search,
        type: params.type,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
      })

      // 为云存储资源生成签名 URL（支持私有 Bucket 访问）
      // 应用图片处理优化（缩略图 150x150，适合媒体资源列表展示）
      const thumbnailOptions: ImageProcessingOptions = {
        size: 'thumbnail',   // 150x150，适合媒体资源列表缩略图
        format: 'webp',     // WebP 格式，节省流量
        quality: 85,        // 质量 85%，列表页快速加载
      }

      const itemsWithUrls = await Promise.all(
        items.map(async (item) => {
          // 对于云存储资源，始终重新生成签名 URL（因为签名会过期）
          if (item.provider === 'aliyun_oss' || item.provider === 'tencent_cos') {
            try {
              // 尝试生成优化后的图片 URL
              const optimizedUrl = await deps.storage.getImageProcessingUrl(
                item.objectKey,
                thumbnailOptions
              )

              // 如果返回的 URL 包含 x-oss-process，说明图片处理成功
              if (optimizedUrl.includes('x-oss-process')) {
                logger.debug(
                  { assetId: item.id, originalSize: item.sizeBytes },
                  'Generated optimized thumbnail URL for admin media list'
                )
                return { ...item, url: optimizedUrl }
              } else {
                // 图片处理不支持，使用普通签名 URL
                const signedUrl = await deps.storage.getSignedUrl(item.objectKey)
                return { ...item, url: signedUrl }
              }
            } catch (error) {
              // 签名 URL 生成失败时，记录警告但继续返回原始数据
              logger.warn({
                action: 'admin_media.generate_signed_url_failed',
                assetId: item.id,
                provider: item.provider,
                objectKey: item.objectKey,
                error: error instanceof Error ? error.message : String(error),
              })
              // 失败时回退到数据库中的 URL（如果有）
              return item
            }
          }

          // 本地存储或其他情况，直接返回原始数据
          return item
        })
      )

      return {
        items: itemsWithUrls,
        nextCursor,
        total,
      }
    },

    /**
     * Function: createMediaAsset
     *
     * Description: 创建新媒体资源记录
     *              通常在客户端完成直传后调用，用于登记文件元数据到数据库
     *              执行严格的安全校验，包括 provider 匹配、objectKey 前缀、文件大小等
     *
     * Parameters:
     * 	params(AdminCreateMediaAssetRequest & { createdBy: string }): 创建参数对象
     * 		provider(AdminMediaProvider): 存储提供商
     * 		bucket(string): 存储桶名称
     * 		objectKey(string): 对象在存储桶中的唯一键
     * 		url(string, optional): 文件访问 URL
     * 		contentType(string): MIME 类型
     * 		sizeBytes(number): 文件大小（字节）
     * 		etag(string, optional): 对象的 ETag 值（用于完整性校验）
     * 		createdBy(string): 创建者的用户 ID
     *
     * Returns:
     * 	AdminMediaAsset: 新创建的媒体资源对象
     *
     * Throws:
     * 	Error(code: 'INVALID_INPUT'): 参数校验失败（provider 不支持、bucket 不匹配、objectKey 非法等）
     */
    async createMediaAsset(params: AdminCreateMediaAssetRequest & { createdBy: string }): Promise<AdminMediaAsset> {
      // 清理 contentType 首尾空格
      const sanitizedContentType = params.contentType.trim()
      // 执行严格的参数校验（provider、bucket、objectKey、contentType、sizeBytes）
      validateRegisterParams({
        provider: params.provider,
        bucket: params.bucket,
        objectKey: params.objectKey,
        contentType: sanitizedContentType,
        sizeBytes: params.sizeBytes,
      })

      // 调用 Repository 层创建媒体资源记录
      const created = await deps.media.createMediaAsset(repoCtx, {
        provider: params.provider,
        bucket: params.bucket,
        objectKey: params.objectKey,
        url: params.url ?? null,
        contentType: sanitizedContentType,
        sizeBytes: params.sizeBytes,
        etag: params.etag ?? null,
        metadata: params.metadata ?? undefined,
        createdBy: params.createdBy,
      })

      // 记录媒体资源创建审计日志
      logger.info({
        action: 'admin_media.create',
        userId: params.createdBy,
        mediaAssetId: created.id,
        provider: created.provider,
        bucket: created.bucket,
        contentType: created.contentType,
        sizeBytes: created.sizeBytes,
      })

      return created
    },

    /**
     * Function: deleteMediaAsset
     *
     * Description: 删除指定的媒体资源（包括 OSS 文件和数据库记录）
     *              先查询媒体信息，然后删除 OSS 文件，最后删除数据库记录
     *
     * Parameters:
     * 	params(object): 删除参数对象
     * 		assetId(string): 待删除的媒体资源 ID
     *
     * Returns:
     * 	id(string): 被删除的资源 ID
     *
     * Throws:
     * 	Error(code: 'NOT_FOUND'): 媒体资源不存在
     */
    async deleteMediaAsset(params: { assetId: string }): Promise<{ id: string }> {
      // 查询媒体资源信息
      const asset = await deps.media.getMediaAssetById(repoCtx, { assetId: params.assetId })
      if (!asset) throw makeNotFoundError('媒体不存在')

      // 先删除 OSS 文件
      try {
        await deps.storage.deleteFile(asset.objectKey)
        logger.info({
          action: 'admin_media.delete_oss_file',
          assetId: params.assetId,
          provider: asset.provider,
          objectKey: asset.objectKey,
        })
      } catch (error) {
        // OSS 删除失败时记录警告，但继续删除数据库记录
        logger.warn({
          action: 'admin_media.delete_oss_file_failed',
          assetId: params.assetId,
          provider: asset.provider,
          objectKey: asset.objectKey,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // 删除数据库记录
      await deps.media.deleteMediaAsset(repoCtx, { assetId: params.assetId })

      // 记录删除审计日志
      logger.info({
        action: 'admin_media.delete',
        assetId: params.assetId,
        provider: asset.provider,
        bucket: asset.bucket,
        objectKey: asset.objectKey,
      })

      return { id: params.assetId }
    },

    /**
     * Function: renameMediaAsset
     *
     * Description: 重命名指定的媒体资源（更新 objectKey 的文件名部分）
     *              保留原有的目录前缀，仅替换最后一个 / 之后的文件名部分
     *
     * Parameters:
     * 	params(object): 参数对象
     * 		assetId(string): 媒体资源 ID
     * 		name(string): 新文件名
     *
     * Returns:
     * 	AdminMediaAsset: 更新后的媒体资源对象
     *
     * Throws:
     * 	Error(code: 'NOT_FOUND'): 媒体资源不存在
     * 	Error(code: 'INVALID_INPUT'): 文件名为空或包含非法字符
     */
    async renameMediaAsset(params: { assetId: string; name: string }): Promise<AdminMediaAsset> {
      // 参数校验
      const nameTrimmed = params.name.trim()
      if (!nameTrimmed || nameTrimmed.length > 255) {
        throw makeInvalidInputError('文件名不能为空且不超过 255 个字符')
      }
      // 简单安全校验：不允许路径分隔符
      if (nameTrimmed.includes('/') || nameTrimmed.includes('\\') || nameTrimmed.includes('..')) {
        throw makeInvalidInputError('文件名包含非法字符')
      }

      // 查询现有资产
      const asset = await deps.media.getMediaAssetById(repoCtx, { assetId: params.assetId })
      if (!asset) throw makeNotFoundError('媒体不存在')

      // 构造新的 objectKey：保留目录前缀，替换文件名
      const lastSlash = asset.objectKey.lastIndexOf('/')
      const prefix = lastSlash >= 0 ? asset.objectKey.substring(0, lastSlash + 1) : ''
      const newObjectKey = `${prefix}${nameTrimmed}`

      // 调用 Repository 更新
      const updated = await deps.media.updateMediaAsset(repoCtx, {
        assetId: params.assetId,
        objectKey: newObjectKey,
      })

      logger.info({
        action: 'admin_media.rename',
        assetId: params.assetId,
        oldObjectKey: asset.objectKey,
        newObjectKey,
      })

      return updated
    },

    /**
     * Function: getStorageUsage
     *
     * Description: 获取存储空间使用情况统计
     *              按 contentType 前缀分组统计已用空间，返回总量、配额及各类型占比
     *
     * Returns:
     * 	object: 存储使用情况统计
     * 		used(number): 已用空间（字节）
     * 		total(number): 总配额（字节），通过环境变量 STORAGE_LIMIT_BYTES 配置，默认 10 GB
     * 		breakdown(Record<string, number>): 按类型分组的已用空间（image/video/document/audio）
     */
    async getStorageUsage(): Promise<{ used: number; total: number; breakdown: Record<string, number> }> {
      // 总配额通过环境变量配置，默认 10 GB
      const totalBytes = parseInt(process.env.STORAGE_LIMIT_BYTES ?? String(10 * 1024 * 1024 * 1024), 10)

      // 调用 Repository 聚合查询
      const breakdown = await deps.media.getStorageBreakdown(repoCtx)

      const used = Object.values(breakdown).reduce((sum, bytes) => sum + bytes, 0)

      return { used, total: totalBytes, breakdown }
    },
  }
}
