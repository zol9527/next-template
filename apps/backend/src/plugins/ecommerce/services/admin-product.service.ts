import type { AdminProduct, AdminProductKind, AdminProductListResponse, AdminProductStatus, AdminProductStatusUpdateResponse } from '@/plugins/ecommerce/contracts/admin-products.dto'
import { env } from '@/config'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ImageProcessingOptions } from '@/lib/storage/types/image-processing'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

function mapAttachments(params: {
  attachments: Array<{ asset_id: string; usage: string }>
}): { coverAssetId: string | null; mediaAssetIds: string[] } {
  const cover = params.attachments.find((a) => a.usage === 'cover')?.asset_id ?? null

  const mediaAssetIds = params.attachments
    .filter((a) => a.usage !== 'cover')
    .map((a) => a.asset_id)

  return { coverAssetId: cover, mediaAssetIds }
}

function mapProduct(params: {
  record: AdminProduct
  categoryIds: string[]
  coverAssetId: string | null
  mediaAssetIds: string[]
}): AdminProduct {
  return {
    ...params.record,
    categoryIds: params.categoryIds,
    coverAssetId: params.coverAssetId,
    mediaAssetIds: params.mediaAssetIds,
  }
}

/**
Function: createAdminProductService

Description: 创建管理员商品服务（US1），负责商品 CRUD 与上下架编排；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps(object): 依赖注入
      products(ProductRepository): 商品仓储
      media(MediaAssetRepository, optional): 媒体资产仓储（用于获取媒体 URL）
      storage(ObjectStorageProvider, optional): 对象存储 provider（用于生成 URL）
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 list/get/create/update/publish/unpublish 的服务对象
*/
export function createAdminProductService(
  deps: {
    products: ProductRepository
    media?: MediaAssetRepository
    storage?: ObjectStorageProvider
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  /**
   * Helper to generate URL from asset object
   */
  async function generateUrlFromAsset(asset: AdminMediaAsset): Promise<string> {
    if (!deps.storage) return ''

    // 定义后台管理界面图片处理选项（比小程序稍大，保证清晰度）
    const adminImageOptions: ImageProcessingOptions = {
      size: 'medium',       // 600x600，适合后台大屏幕
      format: 'webp',     // WebP 格式，节省流量
      quality: 90,        // 质量 90%，保证管理员查看清晰度
    }

    try {
      // 尝试生成优化后的图片 URL
      const optimizedUrl = await deps.storage.getImageProcessingUrl(
        asset.objectKey,
        adminImageOptions
      )

      // 如果返回的 URL 包含 x-oss-process，说明图片处理成功
      if (optimizedUrl.includes('x-oss-process')) {
        logger.debug(
          { assetId: asset.id, originalSize: asset.sizeBytes },
          'Generated optimized image URL for admin'
        )
        return optimizedUrl
      } else {
        // 图片处理不支持，使用普通签名 URL
        return deps.storage.getSignedUrl(asset.objectKey)
      }
    } catch (error) {
      // 图片处理失败，降级到普通签名 URL
      logger.warn(
        { assetId: asset.id, error },
        'Image processing failed for admin, fallback to signed URL'
      )
      return deps.storage.getSignedUrl(asset.objectKey)
    }
  }

  /**
  Function: enrichProductWithMediaUrls

  Description: 为商品数据填充媒体 URL

  Parameters:
      product(AdminProduct): 商品数据
      coverAssetId(string | null): 封面媒体 ID
      mediaAssetIds(string[]): 媒体资源 ID 列表

  Returns:
      product(AdminProduct): 包含 coverUrl 和 mediaUrls 的商品数据
  */
  async function enrichProductWithMediaUrls(
    product: AdminProduct,
    coverAssetId: string | null,
    mediaAssetIds: string[],
  ): Promise<AdminProduct> {
    if (!deps.media || !deps.storage) {
      return { ...product, coverUrl: null, mediaUrls: [] }
    }

    const allAssetIds = new Set<string>()
    if (coverAssetId) allAssetIds.add(coverAssetId)
    mediaAssetIds.forEach((id) => allAssetIds.add(id))

    const uniqueIds = Array.from(allAssetIds)
    if (uniqueIds.length === 0) {
      return { ...product, coverUrl: null, mediaUrls: [] }
    }

    let assets: AdminMediaAsset[] = []
    try {
      // 批量获取媒体资源，避免 N+1 查询
      assets = await deps.media.getMediaAssetsByIds(repoCtx, { assetIds: uniqueIds })
    } catch (error) {
      logger.warn({ error }, 'Failed to batch fetch media assets')
    }

    const assetsMap = new Map(assets.map((a) => [a.id, a]))

    // Helper to resolve URL (async because generateUrlFromAsset is async)
    const resolveUrl = async (id: string | null) => {
      if (!id) return null
      const asset = assetsMap.get(id)
      if (!asset) return null
      return generateUrlFromAsset(asset)
    }

    const coverUrl = await resolveUrl(coverAssetId)

    // 并行生成 URL
    const mediaUrlsPromise = Promise.all(
      mediaAssetIds.map(async (id) => {
        return await resolveUrl(id)
      }),
    )

    const resolvedMediaUrls = await mediaUrlsPromise
    const mediaUrls = resolvedMediaUrls.filter((u): u is string => u !== null)

    return {
      ...product,
      coverUrl,
      mediaUrls,
    }
  }

  return {
    async listProducts(params?: {
      limit?: number
      cursor?: string | null
      keyword?: string
      status?: AdminProductStatus
      kind?: AdminProductKind
      categoryIds?: string[]
    }): Promise<AdminProductListResponse> {
      const limit = Math.max(1, Math.min(params?.limit ?? 50, 50))
      const cursor = params?.cursor ?? null

      const page = await deps.products.listProducts(repoCtx, {
        limit,
        cursor,
        keyword: params?.keyword,
        status: params?.status,
        kind: params?.kind,
        categoryIds: params?.categoryIds,
      })

      const productIds = page.items.map((p) => p.id)
      const categoriesMap = await deps.products.listCategoriesForProducts(repoCtx, { productIds })
      const attachmentsMap = await deps.products.listAttachmentsForProducts(repoCtx, { productIds })

      // 构建基础商品数据
      const baseProducts = page.items.map((p) => {
        const categoryIds = categoriesMap.get(p.id) ?? []
        const attachments = attachmentsMap.get(p.id) ?? []
        const { coverAssetId, mediaAssetIds } = mapAttachments({ attachments })
        return { product: mapProduct({ record: p, categoryIds, coverAssetId, mediaAssetIds }), coverAssetId }
      })

      // 批量获取封面资源，避免 N+1 查询
      const coverAssetIds = baseProducts
        .map((p) => p.coverAssetId)
        .filter((id): id is string => id !== null)

      const assetsMap = new Map<string, AdminMediaAsset>()

      if (coverAssetIds.length > 0 && deps.media) {
        try {
          // 使用 Set 去重
          const uniqueIds = Array.from(new Set(coverAssetIds))
          const assets = await deps.media.getMediaAssetsByIds(repoCtx, { assetIds: uniqueIds })
          for (const asset of assets) {
            assetsMap.set(asset.id, asset)
          }
        } catch (error) {
          logger.warn({ error }, 'Failed to batch fetch media assets')
        }
      }

      // 并行生成 URL
      const enrichedProducts = await Promise.all(
        baseProducts.map(async ({ product, coverAssetId }) => {
          let coverUrl: string | null = null

          if (coverAssetId && deps.storage) {
             const asset = assetsMap.get(coverAssetId)
             if (asset) {
               coverUrl = await generateUrlFromAsset(asset)
             }
          }

          return {
            ...product,
            coverUrl,
            mediaUrls: [],
          }
        })
      )

      return { items: enrichedProducts, nextCursor: page.nextCursor, totalCount: page.totalCount }
    },

    async getProductById(productId: string): Promise<AdminProduct | null> {
      const p = await deps.products.getProductById(repoCtx, { productId })
      if (!p) return null

      const categoryIds = await deps.products.listProductCategoryIds(repoCtx, { productId: p.id })
      const attachments = await deps.products.listProductMediaAttachments(repoCtx, { productId: p.id })
      const { coverAssetId, mediaAssetIds } = mapAttachments({ attachments })

      const product = mapProduct({ record: p, categoryIds, coverAssetId, mediaAssetIds })

      // 填充媒体 URL
      return enrichProductWithMediaUrls(product, coverAssetId, mediaAssetIds)
    },

    async createProduct(params: {
      name: string
      slug?: string | null
      kind: AdminProductKind
      summary?: string | null
      description?: string | null
      priceAmount: string
      originalPriceAmount?: string | null
      stockQuantity?: number | null
      isFeatured?: boolean
      tags?: string[]
      categoryIds?: string[]
      coverAssetId?: string | null
      mediaAssetIds?: string[]
      serviceGuarantees?: string[]
      createdBy: string
    }): Promise<AdminProduct> {
      const currencyCode = env.SITE_CURRENCY_CODE

      const created = await deps.products.createProduct(repoCtx, {
        name: params.name,
        slug: params.slug ?? null,
        summary: params.summary ?? null,
        description: params.description ?? null,
        productKind: params.kind,
        status: 'draft',
        price: params.priceAmount,
        originalPrice: params.originalPriceAmount ?? null,
        stockQuantity: params.stockQuantity ?? null,
        isFeatured: params.isFeatured ?? false,
        tags: params.tags ?? [],
        serviceGuarantees: params.serviceGuarantees,
        currencyCode,
        createdBy: params.createdBy,
      })

      const categoryIds = params.categoryIds ?? []
      if (categoryIds.length > 0) {
        await deps.products.setProductCategories(repoCtx, { productId: created.id, categoryIds })
      }

      const coverAssetId = params.coverAssetId ?? null
      const mediaAssetIds = params.mediaAssetIds ?? []
      const uniqueMediaAssetIds = Array.from(new Set(mediaAssetIds)).filter(Boolean)

      if (coverAssetId || uniqueMediaAssetIds.length > 0) {
        const attachments = [
          ...(coverAssetId ? [{ assetId: coverAssetId, usage: 'cover', sortOrder: 0 }] : []),
          ...uniqueMediaAssetIds.map((assetId, idx) => ({ assetId, usage: 'gallery', sortOrder: idx })),
        ]

        await deps.products.setProductMediaAttachments(repoCtx, { productId: created.id, attachments })
      }

      logger.info({
        action: 'admin_product.create',
        userId: params.createdBy,
        productId: created.id,
        categoryCount: categoryIds.length,
        hasCover: Boolean(coverAssetId),
        mediaCount: uniqueMediaAssetIds.length,
      })

      return mapProduct({ record: created, categoryIds, coverAssetId, mediaAssetIds: uniqueMediaAssetIds })
    },

    async updateProduct(params: {
      productId: string
      name?: string
      slug?: string | null
      summary?: string | null
      description?: string | null
      priceAmount?: string
      originalPriceAmount?: string | null
      stockQuantity?: number | null
      isFeatured?: boolean
      tags?: string[]
      categoryIds?: string[]
      coverAssetId?: string | null
      mediaAssetIds?: string[]
      serviceGuarantees?: string[]
      updatedBy: string
    }): Promise<AdminProduct | null> {
      const updated = await deps.products.updateProduct(repoCtx, {
        productId: params.productId,
        name: params.name,
        slug: params.slug,
        summary: params.summary,
        description: params.description,
        price: params.priceAmount,
        originalPrice: params.originalPriceAmount,
        stockQuantity: params.stockQuantity,
        isFeatured: params.isFeatured,
        tags: params.tags,
        serviceGuarantees: params.serviceGuarantees,
        updatedBy: params.updatedBy,
      })

      if (!updated) return null

      if (params.categoryIds) {
        await deps.products.setProductCategories(repoCtx, { productId: updated.id, categoryIds: params.categoryIds })
      }

      if (params.coverAssetId !== undefined || params.mediaAssetIds !== undefined) {
        const coverAssetId = params.coverAssetId ?? null
        const uniqueMediaAssetIds = Array.from(new Set(params.mediaAssetIds ?? [])).filter(Boolean)

        const attachments = [
          ...(coverAssetId ? [{ assetId: coverAssetId, usage: 'cover', sortOrder: 0 }] : []),
          ...uniqueMediaAssetIds.map((assetId, idx) => ({ assetId, usage: 'gallery', sortOrder: idx })),
        ]

        await deps.products.setProductMediaAttachments(repoCtx, { productId: updated.id, attachments })
      }

      logger.info({
        action: 'admin_product.update',
        userId: params.updatedBy,
        productId: updated.id,
        categoryUpdated: params.categoryIds !== undefined,
        mediaUpdated: params.coverAssetId !== undefined || params.mediaAssetIds !== undefined,
      })

      const categoryIds = await deps.products.listProductCategoryIds(repoCtx, { productId: updated.id })
      const attachments = await deps.products.listProductMediaAttachments(repoCtx, { productId: updated.id })
      const { coverAssetId, mediaAssetIds } = mapAttachments({ attachments })

      const product = mapProduct({ record: updated, categoryIds, coverAssetId, mediaAssetIds })

      // 填充媒体 URL
      return enrichProductWithMediaUrls(product, coverAssetId, mediaAssetIds)
    },

    async publishProduct(productId: string, updatedBy: string): Promise<AdminProductStatusUpdateResponse | null> {
      const updated = await deps.products.setProductStatus(repoCtx, { productId, status: 'published', updatedBy })
      if (!updated) return null

      logger.info({ action: 'admin_product.publish', userId: updatedBy, productId })
      return { id: updated.id, status: updated.status as AdminProductStatus }
    },

    async unpublishProduct(productId: string, updatedBy: string): Promise<AdminProductStatusUpdateResponse | null> {
      const updated = await deps.products.setProductStatus(repoCtx, { productId, status: 'unpublished', updatedBy })
      if (!updated) return null

      logger.info({ action: 'admin_product.unpublish', userId: updatedBy, productId })
      return { id: updated.id, status: updated.status as AdminProductStatus }
    },

    async deleteProduct(params: { productId: string; deletedBy: string }): Promise<{ deleted: true } | null> {
      const product = await deps.products.getProductById(repoCtx, { productId: params.productId })
      if (!product) return null

      if (product.status === 'published') {
        const error = new Error('Invalid state') as Error & { code?: string }
        error.code = 'INVALID_STATE'
        throw error
      }

      const referenced = await deps.products.isProductReferenced(repoCtx, { productId: params.productId })
      if (referenced) {
        const error = new Error('Conflict') as Error & { code?: string }
        error.code = 'CONFLICT'
        throw error
      }

      const deletedAt = new Date().toISOString()
      const deleted = await deps.products.deleteProduct(repoCtx, {
        productId: params.productId,
        deletedAt,
        deletedBy: params.deletedBy,
      })

      if (!deleted) return null

      logger.info({
        action: 'admin_product.delete',
        userId: params.deletedBy,
        productId: params.productId,
      })

      return { deleted: true }
    },

    async getProductStats() {
      const stats = await deps.products.getProductStats(repoCtx)

      logger.info({
        action: 'admin_product.get_stats',
        stats,
      })

      return stats
    },

    async batchUpdateProductStatus(params: {
      productIds: string[]
      status: 'draft' | 'published' | 'unpublished' | 'archived'
      updatedBy: string
    }) {
      const { productIds, status, updatedBy } = params

      logger.info({
        action: 'admin_product.batch_update_status',
        count: productIds.length,
        status,
        updatedBy,
      })

      // 使用 Promise.all 并行更新所有商品状态
      const updatePromises = productIds.map(async (productId) => {
        try {
          const result = await deps.products.setProductStatus(repoCtx, {
            productId,
            status,
            updatedBy,
          })

          if (!result) {
            return { success: false, productId, error: new Error('Product not found') }
          }

          return { success: true, productId, result }
        } catch (error) {
          logger.warn({ productId, error }, '批量更新状态失败')
          return { success: false, productId, error }
        }
      })

      const results = await Promise.all(updatePromises)

      const updatedCount = results.filter((r) => r.success).length
      const failedIds = results.filter((r) => !r.success).map((r) => r.productId)

      logger.info({
        action: 'admin_product.batch_update_status_completed',
        totalCount: productIds.length,
        updatedCount,
        failedCount: failedIds.length,
      })

      return {
        updatedCount,
        failedIds,
      }
    },

    async batchDeleteProducts(params: { productIds: string[]; deletedBy: string }) {
      const { productIds, deletedBy } = params

      logger.info({
        action: 'admin_product.batch_delete',
        count: productIds.length,
        deletedBy,
      })

      const deletedAt = new Date().toISOString()

      // 使用 Promise.all 并行删除所有商品
      const deletePromises = productIds.map(async (productId) => {
        try {
          const result = await deps.products.deleteProduct(repoCtx, {
            productId,
            deletedAt,
            deletedBy,
          })

          if (!result) {
            return { success: false, productId, error: new Error('Product not found') }
          }

          return { success: true, productId, result }
        } catch (error) {
          logger.warn({ productId, error }, '批量删除失败')
          return { success: false, productId, error }
        }
      })

      const results = await Promise.all(deletePromises)

      const deletedCount = results.filter((r) => r.success).length
      const failedIds = results.filter((r) => !r.success).map((r) => r.productId)

      logger.info({
        action: 'admin_product.batch_delete_completed',
        totalCount: productIds.length,
        deletedCount,
        failedCount: failedIds.length,
      })

      return {
        deletedCount,
        failedIds,
      }
    },
  }
}
