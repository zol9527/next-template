import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/prisma/generated/prisma'
import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import type {
  AdminMediaAsset,
  AdminMediaProvider,
  AdminMediaAssetReference,
  AdminMediaAssetType,
} from '@/contracts/dtos/admin/media-assets.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function buildTypeWhere(type: AdminMediaAssetType[]) {
  const normalized = Array.from(new Set(type)).sort()
  const conditions: Prisma.MediaAssetWhereInput[] = []

  if (normalized.includes('image')) {
    conditions.push({ contentType: { startsWith: 'image/' } })
  }

  if (normalized.includes('video')) {
    conditions.push({ contentType: { startsWith: 'video/' } })
  }

  if (conditions.length === 0) return null
  return { OR: conditions } satisfies Prisma.MediaAssetWhereInput
}

function buildSearchWhere(search: string) {
  const q = search.trim()
  if (q === '') return null

  return {
    OR: [
      { objectKey: { contains: q } },
      { url: { contains: q } },
    ],
  } satisfies Prisma.MediaAssetWhereInput
}

/**
 * Function: mapAsset
 *
 * Description: 将数据库返回的原始 MediaAsset 对象映射为符合管理后台规范的 AdminMediaAsset DTO
 *              处理类型转换、枚举值映射、日期格式化以及 JSON 序列化兼容性
 *
 * Parameters:
 * 	a(Record<string, unknown>): 数据库查询返回的原始媒体资源对象
 *
 * Returns:
 * 	AdminMediaAsset: 符合管理后台规范的媒体资源数据传输对象
 */
function mapAsset(a: Record<string, unknown>): AdminMediaAsset {
  return {
    id: a.id as string,
    provider: a.provider as AdminMediaAsset['provider'],
    bucket: a.bucket as string,
    objectKey: a.objectKey as string,
    url: a.url as string | null,
    contentType: a.contentType as string,
    // BigInt 转为 number 以支持 JSON 序列化
    sizeBytes: Number(a.sizeBytes ?? 0),
    // 状态枚举值映射: 仅保留 'active' 和 'archived' 两种状态
    status: (a.status as string) === 'active' ? 'active' : 'archived',
    etag: a.etag as string | null,
    // 元数据：存储图片分辨率、视频时长等信息（Json 字段，可为 null）
    metadata: (a.metadata as Record<string, unknown> | null) ?? undefined,
    createdBy: a.createdById as string | null,
    // 日期时间字段转为 ISO 8601 格式字符串
    createdAt: (a.createdAt as Date)?.toISOString() ?? '',
    updatedAt: (a.updatedAt as Date)?.toISOString() ?? '',
  }
}

export function createPrismaMediaAssetRepository(): MediaAssetRepository {
  return {
    /**
     * Function: listMediaAssetsCursor
     *
     * Description: 游标分页查询媒体资源列表，支持多条件筛选、排序
     *              使用 createdAt 作为游标字段
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 查询参数对象
     * 		cursor(string, optional): 游标值（上一页最后一条记录的 createdAt）
     * 		limit(number): 每页返回数量
     * 		status(string, optional): 资源状态筛选
     * 		provider(AdminMediaProvider, optional): 存储提供商筛选
     * 		contentType(string, optional): 内容类型筛选（支持模糊匹配）
     * 		sortBy(string, optional): 排序字段，默认为 'createdAt'
     * 		sortOrder('asc' | 'desc', optional): 排序方向，默认为 'desc'
     *
     * Returns:
     * 	items(AdminMediaAsset[]): 媒体资源列表
     * 	nextCursor(string | null): 下一页游标，无更多数据时为 null
     * 	total(number): 总记录数
     */
    async listMediaAssetsCursor(ctx: RepoContext, params: {
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
      const { logger } = ctx
      logger.info({ action: 'list_media_assets_cursor', limit: params.limit, cursor: params.cursor })

      // 构建 Prisma 查询条件
      const where: Prisma.MediaAssetWhereInput = {}
      if (params.status) where.status = params.status
      if (params.provider) where.provider = params.provider

      const and: Prisma.MediaAssetWhereInput[] = []
      if (params.contentType) and.push({ contentType: { contains: params.contentType } })
      if (params.type && params.type.length > 0) {
        const typeWhere = buildTypeWhere(params.type)
        if (typeWhere) and.push(typeWhere)
      }
      if (params.search) {
        const searchWhere = buildSearchWhere(params.search)
        if (searchWhere) and.push(searchWhere)
      }
      if (and.length > 0) where.AND = and

      // 游标过滤条件
      const cursorWhere: Prisma.MediaAssetWhereInput = { ...where }
      if (params.cursor) {
        const cursorDate = new Date(params.cursor)
        cursorWhere.createdAt = params.sortOrder === 'asc' ? { gt: cursorDate } : { lt: cursorDate }
      }

      // 并发执行查询和计数
      const [items, total] = await Promise.all([
        prisma.mediaAsset.findMany({
          where: cursorWhere,
          orderBy: { [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc' },
          take: params.limit,
        }),
        prisma.mediaAsset.count({ where }),
      ])

      // 计算下一页游标
      let nextCursor: string | null = null
      if (items.length === params.limit) {
        const lastItem = items[items.length - 1]
        nextCursor = lastItem.createdAt.toISOString()
      }

      return {
        items: items.map(mapAsset),
        nextCursor,
        total,
      }
    },

    /**
     * Function: listMediaAssets
     *
     * Description: 传统分页查询媒体资源列表，支持多条件筛选、排序和模糊搜索
     *              并发查询数据和总数以提升性能
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 查询参数对象
     * 		limit(number): 每页返回数量
     * 		offset(number): 偏移量（用于分页）
     * 		status(string, optional): 资源状态筛选
     * 		provider(AdminMediaProvider, optional): 存储提供商筛选
     * 		contentType(string, optional): 内容类型筛选（支持模糊匹配）
     * 		sortBy(string, optional): 排序字段，默认为 'createdAt'
     * 		sortOrder('asc' | 'desc', optional): 排序方向，默认为 'desc'
     *
     * Returns:
     * 	items(AdminMediaAsset[]): 媒体资源列表
     * 	total(number): 符合条件的资源总数
     */
    async listMediaAssets(ctx: RepoContext, params: {
      limit: number
      offset: number
      status?: string
      provider?: AdminMediaProvider
      contentType?: string
      search?: string
      type?: AdminMediaAssetType[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_media_assets', limit: params.limit, offset: params.offset })

      // 构建 Prisma 查询条件
      const where: Prisma.MediaAssetWhereInput = {}
      if (params.status) where.status = params.status
      if (params.provider) where.provider = params.provider

      const and: Prisma.MediaAssetWhereInput[] = []
      if (params.contentType) and.push({ contentType: { contains: params.contentType } })
      if (params.type && params.type.length > 0) {
        const typeWhere = buildTypeWhere(params.type)
        if (typeWhere) and.push(typeWhere)
      }
      if (params.search) {
        const searchWhere = buildSearchWhere(params.search)
        if (searchWhere) and.push(searchWhere)
      }
      if (and.length > 0) where.AND = and

      // 并发执行查询和计数，提升性能
      const [items, total] = await Promise.all([
        prisma.mediaAsset.findMany({
          where,
          // 动态排序字段，默认按创建时间倒序
          orderBy: { [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc' },
          take: params.limit,
          skip: params.offset,
        }),
        prisma.mediaAsset.count({ where }),
      ])

      // 将数据库原始对象映射为 DTO 格式
      return { items: items.map(mapAsset), total }
    },

    /**
     * Function: getMediaAssetById
     *
     * Description: 根据 ID 查询单个媒体资源的详细信息
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 查询参数对象
     * 		assetId(string): 媒体资源的唯一标识符
     *
     * Returns:
     * 	AdminMediaAsset | null: 找到的媒体资源对象，若不存在则返回 null
     */
    async getMediaAssetById(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_asset_by_id', assetId: params.assetId })

      const asset = await prisma.mediaAsset.findUnique({ where: { id: params.assetId } })
      // 若资源不存在返回 null，存在则映射为 DTO 格式
      return asset ? mapAsset(asset) : null
    },

    /**
     * Function: getMediaAssetsByIds
     *
     * Description: 批量查询媒体资源
     */
    async getMediaAssetsByIds(ctx: RepoContext, params: { assetIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_assets_by_ids', count: params.assetIds.length })

      if (params.assetIds.length === 0) return []

      const assets = await prisma.mediaAsset.findMany({
        where: { id: { in: params.assetIds } },
      })
      return assets.map(mapAsset)
    },

    /**
     * Function: createMediaAsset
     *
     * Description: 在数据库中创建新的媒体资源记录
     *              通常用于文件上传成功后记录元数据
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 创建参数对象
     * 		provider(AdminMediaProvider): 存储提供商（如 aliyun_oss）
     * 		bucket(string): 存储桶名称
     * 		objectKey(string): 对象在存储桶中的唯一键
     * 		url(string, optional): 资源的完整访问 URL
     * 		contentType(string): MIME 类型（如 image/jpeg）
     * 		sizeBytes(number): 文件大小（字节）
     * 		etag(string, optional): 对象的 ETag 值（用于校验）
     * 		createdBy(string): 创建者的用户 ID
     *
     * Returns:
     * 	AdminMediaAsset: 新创建的媒体资源对象（DTO 格式）
     */
    async createMediaAsset(ctx: RepoContext, params: { provider: AdminMediaProvider; bucket: string; objectKey: string; url?: string | null; contentType: string; sizeBytes: number; etag?: string | null; metadata?: Record<string, unknown>; createdBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_media_asset', provider: params.provider, objectKey: params.objectKey })

      const asset = await prisma.mediaAsset.create({
        data: {
          provider: params.provider,
          bucket: params.bucket,
          objectKey: params.objectKey,
          url: params.url,
          contentType: params.contentType,
          sizeBytes: params.sizeBytes,
          etag: params.etag,
          metadata: params.metadata as Prisma.InputJsonValue | undefined,
          createdById: params.createdBy,
          // 新创建的资源默认状态为 active
          status: 'active',
        },
      })
      return mapAsset(asset)
    },

    /**
     * Function: updateMediaAsset
     *
     * Description: 更新媒体资源记录（部分字段）
     *              仅更新传入的字段，未传入的字段保持不变
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 更新参数对象
     * 		assetId(string): 待更新的媒体资源 ID
     * 		objectKey(string, optional): 新的对象键
     * 		url(string | null, optional): 新的访问 URL
     * 		contentType(string, optional): 新的 MIME 类型
     * 		sizeBytes(number, optional): 新的文件大小
     * 		status(string, optional): 新的状态
     *
     * Returns:
     * 	AdminMediaAsset: 更新后的媒体资源对象（DTO 格式）
     */
    async updateMediaAsset(ctx: RepoContext, params: {
      assetId: string
      objectKey?: string
      url?: string | null
      contentType?: string
      sizeBytes?: number
      status?: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_media_asset', assetId: params.assetId })

      // 构建动态更新数据对象，仅包含传入的字段
      const data: Prisma.MediaAssetUpdateInput = {}
      if (params.objectKey !== undefined) data.objectKey = params.objectKey
      if (params.url !== undefined) data.url = params.url
      if (params.contentType !== undefined) data.contentType = params.contentType
      if (params.sizeBytes !== undefined) data.sizeBytes = params.sizeBytes
      if (params.status !== undefined) data.status = params.status

      const asset = await prisma.mediaAsset.update({
        where: { id: params.assetId },
        data,
      })
      return mapAsset(asset)
    },

    /**
     * Function: getStorageBreakdown
     *
     * Description: 按 contentType 前缀分组统计存储空间使用量
     *              仅统计状态为 active 的资源
     *              将 contentType 按前缀归类为 image/video/audio/document 四大类
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     *
     * Returns:
     * 	Record<string, number>: 按类型分组的字节数（key 为 image/video/document/audio）
     */
    async getStorageBreakdown(ctx: RepoContext): Promise<Record<string, number>> {
      const { logger } = ctx
      logger.info({ action: 'get_storage_breakdown' })

      // 使用 Prisma 聚合查询，按 contentType 分组求和
      const result = await prisma.mediaAsset.groupBy({
        by: ['contentType'],
        where: { status: 'active' },
        _sum: { sizeBytes: true },
      })

      const breakdown: Record<string, number> = {}
      for (const row of result) {
        const ct = row.contentType ?? ''
        let category: string
        if (ct.startsWith('image/')) category = 'image'
        else if (ct.startsWith('video/')) category = 'video'
        else if (ct.startsWith('audio/')) category = 'audio'
        else category = 'document'

        // sizeBytes 是 BigInt 类型，需要转换为 number
        const bytes = Number(row._sum.sizeBytes ?? 0n)
        breakdown[category] = (breakdown[category] ?? 0) + bytes
      }

      return breakdown
    },

    /**
     * Function: deleteMediaAsset
     *
     * Description: 删除指定的媒体资源记录
     *              从数据库中删除媒体资产元数据
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 删除参数对象
     * 		assetId(string): 待删除的媒体资源 ID
     *
     * Returns:
     * 	void: 无返回值
     */
    async deleteMediaAsset(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_media_asset', assetId: params.assetId })

      await prisma.mediaAsset.delete({ where: { id: params.assetId } })
    },

    /**
     * Function: getMediaReferences
     *
     * Description: 查询指定媒体资产的所有引用关系
     *              目前检查产品表的引用（通过 ProductMediaAttachment 关联表）
     *
     * Parameters:
     * 	ctx(RepoContext): Repository 上下文，包含 logger 等依赖
     * 	params(object): 查询参数对象
     * 		assetId(string): 媒体资源的唯一标识符
     *
     * Returns:
     * 	references(AdminMediaAssetReference[]): 引用列表，包含引用资源的 ID、类型和标题
     */
    async getMediaReferences(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_references', assetId: params.assetId })

      // 查询产品媒体关联表中引用该媒体的产品
      const productAttachments = await prisma.productMediaAttachment.findMany({
        where: {
          assetId: params.assetId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // 去重并转换为统一的引用格式
      const uniqueProducts = new Map<string, { id: string; name: string }>()
      for (const attachment of productAttachments) {
        const productId = attachment.product.id
        if (!uniqueProducts.has(productId)) {
          uniqueProducts.set(productId, {
            id: productId,
            name: attachment.product.name,
          })
        }
      }

      const references: AdminMediaAssetReference[] = Array.from(uniqueProducts.values()).map((p) => ({
        id: p.id,
        type: 'product',
        title: p.name,
      }))

      return references
    },
  }
}
