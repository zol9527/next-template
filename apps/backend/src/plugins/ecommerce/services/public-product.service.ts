import type { PublicProduct, PublicProductListResponse, PublicProductListQuery } from '@/plugins/ecommerce/contracts/public-products.dto'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ImageProcessingOptions } from '@/lib/storage/types/image-processing'

function mapAttachments(params: {
  attachments: Array<{ asset_id: string; usage: string }>
}): { coverAssetId: string | null; mediaAssetIds: string[] } {
  const cover = params.attachments.find((a) => a.usage === 'cover')?.asset_id ?? null
  const mediaAssetIds = params.attachments.filter((a) => a.usage !== 'cover').map((a) => a.asset_id)
  return { coverAssetId: cover, mediaAssetIds }
}

function mapPublicProduct(params: {
  record: {
    id: string
    name: string
    slug: string | null
    summary: string | null
    description: string | null
    kind: string
    price: { amount: string; currencyCode: string }
    originalPrice: { amount: string; currencyCode: string } | null
    stockQuantity: number | null
    isFeatured: boolean
    tags: string[]
    serviceGuarantees: string[]
    createdAt: string
    currencyCode: string
  }
  categoryIds: string[]
  coverAssetId: string | null
  mediaAssetIds: string[]
}): PublicProduct {
  const { record, categoryIds, coverAssetId, mediaAssetIds } = params
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    summary: record.summary,
    description: record.description,
    kind: record.kind,
    price: record.price,
    originalPrice: record.originalPrice,
    isFeatured: record.isFeatured,
    categoryId: categoryIds[0] ?? null,
    categoryIds,
    tags: record.tags,
    serviceGuarantees: record.serviceGuarantees,
    coverAssetId,
    mediaAssetIds,
    createdAt: record.createdAt,
  }
}

/**
Function: createPublicProductService

Description: 创建公开商品服务，面向小程序用户，支持商品搜索和列表查询

Parameters:
    deps(object): 依赖注入
      products(ProductRepository): 商品仓储
      media(MediaAssetRepository, optional): 媒体资产仓储（用于获取媒体 URL）
      storage(ObjectStorageProvider, optional): 对象存储 provider（用于生成 URL）
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 listProducts/getProductById 的服务对象
*/
export function createPublicProductService(
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
  Function: enrichProductsWithMediaUrls

  Description: 批量为商品数据填充媒体 URL

  Parameters:
      items(Array): 商品及关联的媒体 ID 列表

  Returns:
      products(PublicProduct[]): 包含 coverUrl 和 mediaUrls 的商品数据列表
  */
  async function enrichProductsWithMediaUrls(
    items: Array<{
      product: PublicProduct
      coverAssetId: string | null
      mediaAssetIds: string[]
    }>,
  ): Promise<PublicProduct[]> {
    if (!deps.media || !deps.storage || items.length === 0) {
      return items.map((i) => i.product)
    }

    // 1. 收集所有需要查询的 assetId
    const allAssetIds = new Set<string>()
    for (const item of items) {
      if (item.coverAssetId) allAssetIds.add(item.coverAssetId)
      for (const id of item.mediaAssetIds) allAssetIds.add(id)
    }

    if (allAssetIds.size === 0) {
      return items.map((i) => i.product)
    }

    try {
      // 2. 批量获取媒体资源信息
      const assets = await deps.media.getMediaAssetsByIds(repoCtx, {
        assetIds: Array.from(allAssetIds),
      })

      // 3. 定义列表页图片处理选项（针对小程序卡片优化）
      const listImageOptions: ImageProcessingOptions = {
        size: 'small',         // 300x300，适合卡片展示
        format: 'webp',       // WebP 格式，节省 70% 流量
        quality: 85,          // 质量 85%，视觉质量与体积平衡
      }

      // 4. 构建 ID -> URL 映射（应用图片处理）
      const urlMap = new Map<string, string>()
      await Promise.all(
        assets.map(async (asset) => {
          if (deps.storage) {
            try {
              // 尝试生成优化后的图片 URL
              const optimizedUrl = await deps.storage.getImageProcessingUrl(
                asset.objectKey,
                listImageOptions
              )

              // 如果返回的 URL 包含 x-oss-process，说明图片处理成功
              if (optimizedUrl.includes('x-oss-process')) {
                urlMap.set(asset.id, optimizedUrl)
                logger.debug(
                  { assetId: asset.id, originalSize: asset.sizeBytes },
                  'Generated optimized image URL with OSS processing'
                )
              } else {
                // 图片处理不支持，使用普通签名 URL
                const signedUrl = await deps.storage.getSignedUrl(asset.objectKey)
                urlMap.set(asset.id, signedUrl)
              }
            } catch (error) {
              // 图片处理失败，降级到普通签名 URL
              logger.warn(
                { assetId: asset.id, error },
                'Image processing failed, fallback to signed URL'
              )
              const signedUrl = await deps.storage.getSignedUrl(asset.objectKey)
              urlMap.set(asset.id, signedUrl)
            }
          }
        })
      )

      // 4. 填充到商品对象（移除内部字段 coverAssetId 和 mediaAssetIds）
      return items.map((item) => {
        const coverUrl = item.coverAssetId ? urlMap.get(item.coverAssetId) ?? null : null
        const mediaUrls = item.mediaAssetIds
          .map((id) => urlMap.get(id))
          .filter((url): url is string => !!url)

        const { coverAssetId: _coverAssetId, mediaAssetIds: _mediaAssetIds, ...publicProduct } = item.product
        return {
          ...publicProduct,
          coverUrl,
          mediaUrls,
        }
      })
    } catch (error) {
      logger.error({ action: 'enrich_products_media', error }, '批量获取媒体资源失败')
      // 降级：如果不抛出错误，则返回没有图片的商品
      return items.map((i) => i.product)
    }
  }

  return {
    async listProducts(params?: PublicProductListQuery): Promise<PublicProductListResponse> {
      const limit = Math.max(1, Math.min(params?.limit ?? 20, 50))
      const cursor = params?.cursor ?? null

      const page = await deps.products.listProducts(repoCtx, {
        limit,
        cursor,
        keyword: params?.keyword,
        status: 'published',
        categoryIds: params?.categoryId ? [params.categoryId] : undefined,
        isFeatured: params?.featured,
      })

      const visibleItems = params?.featured === undefined
        ? page.items
        : page.items.filter((item) => item.isFeatured === params.featured)

      const productIds = visibleItems.map((p) => p.id)
      const categoriesMap = await deps.products.listCategoriesForProducts(repoCtx, { productIds })
      const attachmentsMap = await deps.products.listAttachmentsForProducts(repoCtx, { productIds })

      const items: Array<{ product: PublicProduct; coverAssetId: string | null; mediaAssetIds: string[] }> = visibleItems.map((p) => {
        const categoryIds = categoriesMap.get(p.id) ?? []
        const attachments = attachmentsMap.get(p.id) ?? []
        const { coverAssetId, mediaAssetIds } = mapAttachments({ attachments })
        return {
          product: mapPublicProduct({
            record: {
              id: p.id,
              name: p.name,
              slug: p.slug,
              summary: p.summary,
              description: p.description,
              kind: p.kind,
              price: p.price,
              originalPrice: p.originalPrice,
              stockQuantity: p.stockQuantity,
              isFeatured: p.isFeatured,
              tags: p.tags,
              serviceGuarantees: p.serviceGuarantees,
              createdAt: p.createdAt,
              currencyCode: 'CNY'
            },
            categoryIds,
            coverAssetId,
            mediaAssetIds,
          }),
          coverAssetId,
          mediaAssetIds,
        }
      })

      // 批量填充媒体 URL
      const enrichedItems = await enrichProductsWithMediaUrls(items)

      return {
        items: enrichedItems,
        nextCursor: page.nextCursor,
        total: visibleItems.length,
      }
    },

    async getProductById(productId: string): Promise<PublicProduct | null> {
      const p = await deps.products.getProductById(repoCtx, { productId })
      if (!p || p.status !== 'published') return null

      const categoryIds = await deps.products.listProductCategoryIds(repoCtx, { productId: p.id })
      const attachments = await deps.products.listProductMediaAttachments(repoCtx, { productId: p.id })
      const { coverAssetId, mediaAssetIds } = mapAttachments({ attachments })

      const product = mapPublicProduct({
        record: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          summary: p.summary,
          description: p.description,
          kind: p.kind,
          price: p.price,
          originalPrice: p.originalPrice,
          stockQuantity: p.stockQuantity,
          isFeatured: p.isFeatured,
          tags: p.tags,
          serviceGuarantees: p.serviceGuarantees,
          createdAt: p.createdAt,
          currencyCode: 'CNY'
        },
        categoryIds,
        coverAssetId,
        mediaAssetIds,
      })

      // 填充媒体 URL
      const [enrichedProduct] = await enrichProductsWithMediaUrls([{
        product,
        coverAssetId,
        mediaAssetIds
      }])

      return enrichedProduct
    },
  }
}
