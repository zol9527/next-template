import { prisma } from '@/lib/prisma'
import type { ProductRepository, ProductMediaAttachmentRecord } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { AdminProduct } from '@/plugins/ecommerce/contracts/admin-products.dto'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 从 extensions JSON 中提取 serviceGuarantees 数组
 * Prisma 存储为 String (JSON)，Supabase 存储为 JSONB
 * 此函数统一处理两种格式
 */
function extractServiceGuarantees(extensions: unknown): string[] {
  const defaults = ['正品保障']
  // 先解析 JSON 字符串（Prisma 情况）
  let parsed = extensions
  if (typeof extensions === 'string') {
    try {
      parsed = JSON.parse(extensions)
    } catch {
      return defaults
    }
  }
  if (!parsed || typeof parsed !== 'object') return defaults
  const ext = parsed as Record<string, unknown>
  const sg = ext.serviceGuarantees
  if (!Array.isArray(sg) || sg.length === 0) return defaults
  // 过滤确保所有元素都是字符串
  const filtered = sg.filter((v): v is string => typeof v === 'string')
  return filtered.length > 0 ? filtered : defaults
}

function mapProduct(product: {
  id: string
  name: string
  slug: string | null
  summary: string | null
  description: string | null
  productKind: string
  status: string
  price: unknown
  originalPrice: unknown
  stockQuantity: number | null
  isFeatured: boolean
  tags: unknown
  currencyCode: string
  extensions: unknown
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}): AdminProduct {
  const priceAmount = typeof product.price === 'string'
    ? product.price
    : product.price?.toString() ?? '0'

  const originalPriceAmount = typeof product.originalPrice === 'string'
    ? product.originalPrice
    : product.originalPrice?.toString() ?? null

  const allowedKinds: readonly string[] = ['course', 'certificate']
  const allowedStatuses: readonly string[] = ['draft', 'published', 'unpublished', 'archived']

  return {
    id: product.id,
    name: product.name,
    slug: product.slug ?? null,
    summary: product.summary ?? null,
    description: product.description ?? null,
    kind: (allowedKinds.includes(product.productKind) ? product.productKind : 'course') as AdminProduct['kind'],
    status: (allowedStatuses.includes(product.status) ? product.status : 'draft') as AdminProduct['status'],
    price: { amount: priceAmount, currencyCode: product.currencyCode },
    originalPrice: originalPriceAmount ? { amount: originalPriceAmount, currencyCode: product.currencyCode } : null,
    stockQuantity: product.stockQuantity,
    isFeatured: product.isFeatured,
    // 修复：从数据库读取的 tags 是 JSON 字符串，需要解析
    tags: typeof product.tags === 'string'
      ? (JSON.parse(product.tags || '[]') as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    categoryIds: [],
    coverAssetId: null,
    mediaAssetIds: [],
    extensions: typeof product.extensions === 'string'
      ? (() => { try { return JSON.parse(product.extensions) } catch { return null } })()
      : product.extensions as Record<string, unknown> ?? null,
    // 从 extensions 中提取 serviceGuarantees，默认 ['正品保障']
    serviceGuarantees: extractServiceGuarantees(product.extensions),
    createdBy: product.createdById,
    updatedBy: product.updatedById,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt?.toISOString() ?? null,
  }
}

function mapAttachment(attachment: {
  id: string
  productId: string
  assetId: string
  usage: string
  sortOrder: number
  createdAt: Date
}): ProductMediaAttachmentRecord {
  return {
    id: attachment.id,
    product_id: attachment.productId,
    asset_id: attachment.assetId,
    usage: attachment.usage,
    sort_order: attachment.sortOrder,
    created_at: attachment.createdAt.toISOString(),
  }
}

export function createPrismaProductRepository(): ProductRepository {
  return {
    async listProducts(ctx: RepoContext, params: { limit: number; cursor?: string | null; keyword?: string; status?: string; kind?: string; categoryIds?: string[]; isFeatured?: boolean }) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit, 50))

      logger.info({ action: 'list_products', limit: safeLimit, keyword: params.keyword, isFeatured: params.isFeatured })

      const where: Record<string, unknown> = {
        deletedAt: null,
      }

      if (params.keyword) {
        where.name = { contains: params.keyword }
      }
      if (params.status) where.status = params.status
      if (params.kind) where.productKind = params.kind
      if (params.isFeatured !== undefined) where.isFeatured = params.isFeatured

      if (params.categoryIds && params.categoryIds.length > 0) {
        const productCategories = await prisma.productCategory.findMany({
          where: { categoryId: { in: params.categoryIds } },
          select: { productId: true },
        })
        const productIds = [...new Set(productCategories.map((pc: { productId: string }) => pc.productId))]
        if (productIds.length === 0) {
          return { items: [], nextCursor: null, totalCount: 0 }
        }
        where.id = { in: productIds }
      }

      const cursorWhere: Record<string, unknown> = { ...where }
      if (params.cursor) {
        cursorWhere.createdAt = { lt: new Date(params.cursor) }
      }

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: cursorWhere,
          orderBy: { createdAt: 'desc' },
          take: safeLimit + 1,
        }),
        prisma.product.count({ where }),
      ])

      const hasMore = products.length > safeLimit
      const items = hasMore ? products.slice(0, safeLimit) : products
      const nextCursor = hasMore && items.length > 0
        ? items[items.length - 1]?.createdAt.toISOString() ?? null
        : null

      return {
        items: items.map(mapProduct),
        nextCursor,
        totalCount,
      }
    },

    async getProductById(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_product_by_id', productId: params.productId })

      const product = await prisma.product.findUnique({
        where: { id: params.productId },
      })
      if (!product) return null
      return mapProduct(product)
    },

    /**
    Function: listProductsByIds

    Description: 根据商品 ID 列表批量获取商品数据

    Parameters:
      ctx(RepoContext): 仓储上下文
      params({ productIds: string[] }): 商品 ID 列表

    Returns:
      products(AdminProduct[]): 商品列表
    */
    async listProductsByIds(ctx: RepoContext, params: { productIds: string[] }) {
      const { logger } = ctx
      const productIds = Array.from(new Set(params.productIds)).filter(Boolean)
      if (productIds.length === 0) return []

      logger.info({ action: 'list_products_by_ids', count: productIds.length })

      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          deletedAt: null,
        },
      })

      return products.map(mapProduct)
    },

    async createProduct(ctx: RepoContext, params: {
      name: string
      slug?: string | null
      summary?: string | null
      description?: string | null
      productKind: string
      status: string
      price: string
      originalPrice?: string | null
      stockQuantity?: number | null
      isFeatured?: boolean
      tags?: string[]
      serviceGuarantees?: string[]
      currencyCode: string
      createdBy: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'create_product', name: params.name })

      const product = await prisma.product.create({
        data: {
          name: params.name,
          slug: params.slug ?? null,
          summary: params.summary ?? null,
          description: params.description ?? null,
          productKind: params.productKind,
          status: params.status,
          price: params.price,
          originalPrice: params.originalPrice ?? null,
          stockQuantity: params.stockQuantity ?? null,
          isFeatured: params.isFeatured ?? false,
          tags: JSON.stringify(params.tags ?? []),
          currencyCode: params.currencyCode,
          // 将 serviceGuarantees 存入 extensions JSON 字段（数据库中为 String 类型）
          extensions: JSON.stringify({ serviceGuarantees: params.serviceGuarantees ?? ['正品保障'] }),
          createdById: params.createdBy,
          updatedById: params.createdBy,
        },
      })
      return mapProduct(product)
    },

    async updateProduct(ctx: RepoContext, params: {
      productId: string
      name?: string
      slug?: string | null
      summary?: string | null
      description?: string | null
      price?: string
      originalPrice?: string | null
      stockQuantity?: number | null
      isFeatured?: boolean
      tags?: string[]
      serviceGuarantees?: string[]
      updatedBy: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_product', productId: params.productId })

      const updates: Record<string, unknown> = { updatedById: params.updatedBy }
      if (params.name !== undefined) updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.summary !== undefined) updates.summary = params.summary
      if (params.description !== undefined) updates.description = params.description
      if (params.price !== undefined) updates.price = params.price
      if (params.originalPrice !== undefined) updates.originalPrice = params.originalPrice
      if (params.stockQuantity !== undefined) updates.stockQuantity = params.stockQuantity
      if (params.isFeatured !== undefined) updates.isFeatured = params.isFeatured
      if (params.tags !== undefined) updates.tags = JSON.stringify(params.tags)
      // 如果传入了 serviceGuarantees，更新 extensions 字段（数据库中为 String 类型）
      if (params.serviceGuarantees !== undefined) {
        updates.extensions = JSON.stringify({ serviceGuarantees: params.serviceGuarantees })
      }

      const product = await prisma.product.update({
        where: { id: params.productId },
        data: updates,
      })
      return mapProduct(product)
    },

    async setProductStatus(ctx: RepoContext, params: { productId: string; status: string; updatedBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_status', productId: params.productId, status: params.status })

      const product = await prisma.product.update({
        where: { id: params.productId },
        data: { status: params.status, updatedById: params.updatedBy },
      })
      return mapProduct(product)
    },

    async deleteProduct(ctx: RepoContext, params: { productId: string; deletedAt?: string; deletedBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_product', productId: params.productId })

      const product = await prisma.product.update({
        where: { id: params.productId },
        data: {
          deletedAt: params.deletedAt ? new Date(params.deletedAt) : new Date(),
          updatedById: params.deletedBy,
        },
      })
      return mapProduct(product)
    },

    async isProductReferenced(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'is_product_referenced', productId: params.productId })

      const orderCount = await prisma.order.count({ where: { productId: params.productId } })
      return orderCount > 0
    },

    async setProductCategories(ctx: RepoContext, params: { productId: string; categoryIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_categories', productId: params.productId, count: params.categoryIds.length })

      await prisma.productCategory.deleteMany({ where: { productId: params.productId } })
      if (params.categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: params.categoryIds.map((categoryId) => ({ productId: params.productId, categoryId })),
        })
      }
    },

    async listProductCategoryIds(ctx: RepoContext, params: { productId: string }) {
      const categories = await prisma.productCategory.findMany({
        where: { productId: params.productId },
        select: { categoryId: true },
      })
      return categories.map((c: { categoryId: string }) => c.categoryId)
    },

    async listCategoriesForProducts(ctx: RepoContext, params: { productIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_categories_for_products', count: params.productIds.length })

      const categories = await prisma.productCategory.findMany({
        where: { productId: { in: params.productIds } },
      })
      const result = new Map<string, string[]>()
      params.productIds.forEach((id) => result.set(id, []))
      categories.forEach((c: { productId: string; categoryId: string }) => {
        if (result.has(c.productId)) {
          result.get(c.productId)?.push(c.categoryId)
        }
      })
      return result
    },

    async setProductMediaAttachments(ctx: RepoContext, params: { productId: string; attachments: Array<{ assetId: string; usage: string; sortOrder?: number }> }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_media_attachments', productId: params.productId, count: params.attachments.length })

      await prisma.productMediaAttachment.deleteMany({ where: { productId: params.productId } })
      if (params.attachments.length > 0) {
        await prisma.productMediaAttachment.createMany({
          data: params.attachments.map((a) => ({
            productId: params.productId,
            assetId: a.assetId,
            usage: a.usage,
            sortOrder: a.sortOrder ?? 0,
          })),
        })
      }
    },

    async listProductMediaAttachments(ctx: RepoContext, params: { productId: string }) {
      const attachments = await prisma.productMediaAttachment.findMany({
        where: { productId: params.productId },
        orderBy: { sortOrder: 'asc' },
      })
      return attachments.map(mapAttachment)
    },

    async listAttachmentsForProducts(ctx: RepoContext, params: { productIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_attachments_for_products', count: params.productIds.length })

      const attachments = await prisma.productMediaAttachment.findMany({
        where: { productId: { in: params.productIds } },
        orderBy: { sortOrder: 'asc' },
      })
      const result = new Map<string, ProductMediaAttachmentRecord[]>()
      params.productIds.forEach((id) => result.set(id, []))
      attachments.forEach((a: { id: string; productId: string; assetId: string; usage: string; sortOrder: number; createdAt: Date }) => {
        const mapped = mapAttachment(a)
        if (result.has(mapped.product_id)) {
          result.get(mapped.product_id)?.push(mapped)
        }
      })
      return result
    },

    async getGlobalStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_global_stats' })

      const totalProducts = await prisma.product.count({ where: { deletedAt: null } })
      return { totalProducts }
    },

    async getProductStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_product_stats' })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const tomorrowStart = new Date(todayStart)
      tomorrowStart.setDate(tomorrowStart.getDate() + 1)

      // 使用聚合查询一次性获取所有统计数据，避免 N+1 问题
      const [
        totalProducts,
        publishedCount,
        draftCount,
        featuredCount,
        todayAdded,
        lowStockCount,
      ] = await Promise.all([
        // 总商品数
        prisma.product.count({ where: { deletedAt: null } }),

        // 已上架商品数
        prisma.product.count({ where: { deletedAt: null, status: 'published' } }),

        // 草稿商品数
        prisma.product.count({ where: { deletedAt: null, status: 'draft' } }),

        // 精选商品数
        prisma.product.count({ where: { deletedAt: null, isFeatured: true } }),

        // 今日新增商品数
        prisma.product.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
        }),

        // 库存预警商品数（库存 < 10 且不为 null）
        prisma.product.count({
          where: {
            deletedAt: null,
            stockQuantity: {
              not: null,
              lt: 10,
            },
          },
        }),
      ])

      return {
        totalProducts,
        publishedCount,
        draftCount,
        featuredCount,
        todayAdded,
        lowStockCount,
      }
    },
  }
}
