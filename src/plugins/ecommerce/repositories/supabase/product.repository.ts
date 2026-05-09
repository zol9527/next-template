import type { ProductRepository, ProductMediaAttachmentRecord } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { AdminProduct } from '@/plugins/ecommerce/contracts/admin-products.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const PRODUCT_SELECT =
  'id,name,slug,summary,description,product_kind,status,price,original_price,currency_code,stock_quantity,is_featured,tags,extensions,created_by,updated_by,created_at,updated_at,deleted_at'

const ATTACHMENT_SELECT = 'id,product_id,asset_id,usage,sort_order,created_at'

/**
 * 从 extensions JSON 中提取 serviceGuarantees 数组
 * 存储格式: { serviceGuarantees: ['正品保障', '7天无理由'] }
 */
function extractServiceGuarantees(extensions: unknown): string[] {
  const defaults = ['正品保障']
  if (!extensions || typeof extensions !== 'object') return defaults
  const ext = extensions as Record<string, unknown>
  const sg = ext.serviceGuarantees
  if (!Array.isArray(sg) || sg.length === 0) return defaults
  const filtered = sg.filter((v): v is string => typeof v === 'string')
  return filtered.length > 0 ? filtered : defaults
}

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

function getBoolean(row: Record<string, unknown>, key: string): boolean | null {
  const value = row[key]
  return typeof value === 'boolean' ? value : null
}

/**
Function: getStringArray

Description: 从数据库行中提取字符串数组，如果值不是数组则返回空数组

Parameters:
	row(Record<string, unknown>): 数据库行数据
	key(string): 要提取的字段名

Returns:
	string[]: 字符串数组（永不返回 null）
*/
function getStringArray(row: Record<string, unknown>, key: string): string[] {
  const value = row[key]
  if (Array.isArray(value)) {
    const items = value.filter((v): v is string => typeof v === 'string')
    return items.length === value.length ? items : []
  }
  return []
}

function getStringOrNumberAsString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function mapProduct(row: Record<string, unknown>): AdminProduct {
  const id = getString(row, 'id')
  const name = getString(row, 'name')
  const slug = getString(row, 'slug')
  const productKind = getString(row, 'product_kind')
  const status = getString(row, 'status')
  const price = getStringOrNumberAsString(row, 'price')
  const originalPrice = getStringOrNumberAsString(row, 'original_price')
  const currencyCode = getString(row, 'currency_code')
  const stockQuantity = getNumber(row, 'stock_quantity')
  const isFeatured = getBoolean(row, 'is_featured')
  const tags = getStringArray(row, 'tags')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')
  const deletedAt = getString(row, 'deleted_at')

  if (!id || !name || !productKind || !status || !price || !currencyCode || isFeatured === null || !tags || !createdAt || !updatedAt) {
    throw new Error('Invalid product row')
  }

  const allowedKinds: readonly string[] = ['course', 'certificate']
  const allowedStatuses: readonly string[] = ['draft', 'published', 'unpublished', 'archived']

  return {
    id,
    name,
    slug,
    summary: getString(row, 'summary'),
    description: getString(row, 'description'),
    kind: (allowedKinds.includes(productKind) ? productKind : 'course') as AdminProduct['kind'],
    status: (allowedStatuses.includes(status) ? status : 'draft') as AdminProduct['status'],
    price: { amount: price, currencyCode },
    originalPrice: originalPrice ? { amount: originalPrice, currencyCode } : null,
    stockQuantity,
    isFeatured,
    tags,
    categoryIds: [],
    coverAssetId: null,
    mediaAssetIds: [],
    extensions: (row as { extensions?: unknown }).extensions ?? null,
    // 从 extensions 中提取 serviceGuarantees，默认 ['正品保障']
    serviceGuarantees: extractServiceGuarantees((row as { extensions?: unknown }).extensions),
    createdBy: getString(row, 'created_by'),
    updatedBy: getString(row, 'updated_by'),
    createdAt,
    updatedAt,
    deletedAt,
  }
}

function mapAttachment(row: Record<string, unknown>): ProductMediaAttachmentRecord {
  const id = getString(row, 'id')
  const productId = getString(row, 'product_id')
  const assetId = getString(row, 'asset_id')
  const usage = getString(row, 'usage')
  const sortOrder = getNumber(row, 'sort_order')
  const createdAt = getString(row, 'created_at')

  if (!id || !productId || !assetId || !usage || sortOrder === null || !createdAt) {
    throw new Error('Invalid product_media_attachments row')
  }

  return {
    id,
    product_id: productId,
    asset_id: assetId,
    usage,
    sort_order: sortOrder,
    created_at: createdAt,
  }
}

/**
Function: createSupabaseProductRepository

Description: 创建基于 Supabase（Service Role）的商品数据仓储实现，负责 products/product_categories/product_media_attachments 的读写

Parameters:

Returns:
    repository(ProductRepository): ProductRepository 的 Supabase 实现
*/
export function createSupabaseProductRepository(): ProductRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async listProducts(ctx: RepoContext, params: { limit: number; cursor?: string | null; keyword?: string; status?: string; kind?: string; categoryIds?: string[] }) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit, 50))

      logger.info({ action: 'list_products', limit: safeLimit, keyword: params.keyword })

      let query = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .is('deleted_at', null)

      if (params.keyword) {
        query = query.ilike('name', `%${params.keyword}%`)
      }

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.kind) {
        query = query.eq('product_kind', params.kind)
      }

      if (params.categoryIds && params.categoryIds.length > 0) {
        const { data: productIds, error: categoryError } = await supabase
          .from('product_categories')
          .select('product_id')
          .in('category_id', params.categoryIds)

        if (categoryError) throw categoryError

        const ids = Array.from(new Set((productIds ?? []).map(r => r.product_id)))
        if (ids.length === 0) {
          return { items: [], nextCursor: null, totalCount: 0 }
        }
        query = query.in('id', ids)
      }

      query = query.order('created_at', { ascending: false })

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query.limit(safeLimit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapProduct(r as unknown as Record<string, unknown>))
      const nextCursor = items.length === safeLimit ? items[items.length - 1]?.createdAt ?? null : null

      let countQuery = supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)

      if (params.keyword) countQuery = countQuery.ilike('name', `%${params.keyword}%`)
      if (params.status) countQuery = countQuery.eq('status', params.status)
      if (params.kind) countQuery = countQuery.eq('product_kind', params.kind)
      if (params.categoryIds && params.categoryIds.length > 0) {
        const { data: productIds, error: categoryError } = await supabase
          .from('product_categories')
          .select('product_id')
          .in('category_id', params.categoryIds)
        if (categoryError) throw categoryError
        const ids = Array.from(new Set((productIds ?? []).map(r => r.product_id)))
        if (ids.length === 0) {
          return { items, nextCursor, totalCount: 0 }
        }
        countQuery = countQuery.in('id', ids)
      }

      const { count, error: countError } = await countQuery
      if (countError) throw countError

      return { items, nextCursor, totalCount: count ?? 0 }
    },

    async getProductById(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_product', productId: params.productId })

      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', params.productId)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapProduct(data as unknown as Record<string, unknown>)
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

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: params.name,
          slug: params.slug ?? null,
          summary: params.summary ?? null,
          description: params.description ?? null,
          product_kind: params.productKind,
          status: params.status,
          price: params.price,
          original_price: params.originalPrice ?? null,
          stock_quantity: params.stockQuantity ?? null,
          is_featured: params.isFeatured ?? false,
          // 修复：Supabase text[] 类型直接存储数组，不需要 JSON.stringify
          tags: params.tags ?? [],
          // 将 serviceGuarantees 存入 extensions JSON 字段
          extensions: { serviceGuarantees: params.serviceGuarantees ?? ['正品保障'] },
          currency_code: params.currencyCode,
          created_by: params.createdBy,
          updated_by: params.createdBy,
        })
        .select(PRODUCT_SELECT)
        .single()

      if (error) throw error
      return mapProduct(data as unknown as Record<string, unknown>)
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

      const updates: Record<string, unknown> = {
        updated_by: params.updatedBy,
        updated_at: new Date().toISOString(),
      }

      if (typeof params.name === 'string') updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.summary !== undefined) updates.summary = params.summary
      if (params.description !== undefined) updates.description = params.description
      if (typeof params.price === 'string') updates.price = params.price
      if (params.originalPrice !== undefined) updates.original_price = params.originalPrice
      if (params.stockQuantity !== undefined) updates.stock_quantity = params.stockQuantity
      if (params.isFeatured !== undefined) updates.is_featured = params.isFeatured
      // 修复：Supabase text[] 类型直接存储数组，不需要 JSON.stringify
      if (params.tags !== undefined) updates.tags = params.tags
      // 如果传入了 serviceGuarantees，更新 extensions 字段
      if (params.serviceGuarantees !== undefined) {
        updates.extensions = { serviceGuarantees: params.serviceGuarantees }
      }

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', params.productId)
        .is('deleted_at', null)
        .select(PRODUCT_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapProduct(data as unknown as Record<string, unknown>)
    },

    async setProductStatus(ctx: RepoContext, params: { productId: string; status: string; updatedBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_status', productId: params.productId, status: params.status })

      const { data, error } = await supabase
        .from('products')
        .update({ status: params.status, updated_by: params.updatedBy, updated_at: new Date().toISOString() })
        .eq('id', params.productId)
        .is('deleted_at', null)
        .select(PRODUCT_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapProduct(data as unknown as Record<string, unknown>)
    },

    async deleteProduct(ctx: RepoContext, params: { productId: string; deletedAt?: string; deletedBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_product', productId: params.productId })

      const deletedAt = params.deletedAt ?? new Date().toISOString()
      const { data, error } = await supabase
        .from('products')
        .update({
          deleted_at: deletedAt,
          updated_by: params.deletedBy,
          updated_at: deletedAt,
        })
        .eq('id', params.productId)
        .is('deleted_at', null)
        .select(PRODUCT_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapProduct(data as unknown as Record<string, unknown>)
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

      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .is('deleted_at', null)
        .in('id', productIds)

      if (error) throw error

      return (data ?? []).map((row) => mapProduct(row as unknown as Record<string, unknown>))
    },

    async isProductReferenced(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'is_product_referenced', productId: params.productId })

      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', params.productId)
        .limit(1)

      if (ordersError) throw ordersError
      if ((ordersCount ?? 0) > 0) return true

      const { count: entitlementsCount, error: entitlementsError } = await supabase
        .from('course_entitlements')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', params.productId)
        .limit(1)

      if (entitlementsError) throw entitlementsError
      return (entitlementsCount ?? 0) > 0
    },

    async setProductCategories(ctx: RepoContext, params: { productId: string; categoryIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_categories', productId: params.productId, categoryCount: params.categoryIds.length })

      const { error: deleteError } = await supabase.from('product_categories').delete().eq('product_id', params.productId)
      if (deleteError) throw deleteError

      const uniqueCategoryIds = Array.from(new Set(params.categoryIds)).filter(Boolean)
      if (uniqueCategoryIds.length === 0) return

      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(uniqueCategoryIds.map((categoryId) => ({ product_id: params.productId, category_id: categoryId })))

      if (insertError) throw insertError
    },

    async listProductCategoryIds(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_product_category_ids', productId: params.productId })

      const { data, error } = await supabase.from('product_categories').select('category_id').eq('product_id', params.productId)
      if (error) throw error
      return (data ?? [])
        .map((r) => (r as { category_id?: unknown }).category_id)
        .filter((v): v is string => typeof v === 'string')
    },

    async listCategoriesForProducts(ctx: RepoContext, params: { productIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_categories_for_products', productCount: params.productIds.length })

      if (params.productIds.length === 0) return new Map()

      const { data, error } = await supabase
        .from('product_categories')
        .select('product_id, category_id')
        .in('product_id', params.productIds)

      if (error) throw error

      const result = new Map<string, string[]>()
      params.productIds.forEach(id => result.set(id, []))

      data?.forEach((row: { product_id: string; category_id: string }) => {
        const pid = row.product_id
        const cid = row.category_id
        if (result.has(pid)) {
          result.get(pid)?.push(cid)
        }
      })

      return result
    },

    async setProductMediaAttachments(ctx: RepoContext, params: { productId: string; attachments: Array<{ assetId: string; usage: string; sortOrder?: number }> }) {
      const { logger } = ctx
      logger.info({ action: 'set_product_media_attachments', productId: params.productId, attachmentCount: params.attachments.length })

      const { error: deleteError } = await supabase.from('product_media_attachments').delete().eq('product_id', params.productId)
      if (deleteError) throw deleteError

      if (params.attachments.length === 0) return

      const rows = params.attachments.map((a) => ({
        product_id: params.productId,
        asset_id: a.assetId,
        usage: a.usage,
        sort_order: a.sortOrder ?? 0,
      }))

      const { error: insertError } = await supabase.from('product_media_attachments').insert(rows)
      if (insertError) throw insertError
    },

    async listProductMediaAttachments(ctx: RepoContext, params: { productId: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_product_media_attachments', productId: params.productId })

      const { data, error } = await supabase
        .from('product_media_attachments')
        .select(ATTACHMENT_SELECT)
        .eq('product_id', params.productId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data ?? []).map((r) => mapAttachment(r as unknown as Record<string, unknown>))
    },

    async listAttachmentsForProducts(ctx: RepoContext, params: { productIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_attachments_for_products', productCount: params.productIds.length })

      if (params.productIds.length === 0) return new Map()

      const { data, error } = await supabase
        .from('product_media_attachments')
        .select(ATTACHMENT_SELECT)
        .in('product_id', params.productIds)
        .order('sort_order', { ascending: true })

      if (error) throw error

      const result = new Map<string, ProductMediaAttachmentRecord[]>()
      params.productIds.forEach(id => result.set(id, []))

      data?.forEach((r) => {
        const attachment = mapAttachment(r as unknown as Record<string, unknown>)
        if (result.has(attachment.product_id)) {
          result.get(attachment.product_id)?.push(attachment)
        }
      })

      return result
    },

    async getGlobalStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_global_stats' })

      const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null)
      if (error) throw error
      return { totalProducts: count ?? 0 }
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
        totalResult,
        publishedResult,
        draftResult,
        featuredResult,
        todayResult,
        lowStockResult,
      ] = await Promise.all([
        // 总商品数
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null),

        // 已上架商品数
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),

        // 草稿商品数
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'draft'),

        // 精选商品数
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_featured', true),

        // 今日新增商品数
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', todayStart.toISOString()).lt('created_at', tomorrowStart.toISOString()),

        // 库存预警商品数（库存 < 10 且不为 null）
        supabase.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('stock_quantity', 'is', 'null').lt('stock_quantity', 10),
      ])

      if (totalResult.error) throw totalResult.error
      if (publishedResult.error) throw publishedResult.error
      if (draftResult.error) throw draftResult.error
      if (featuredResult.error) throw featuredResult.error
      if (todayResult.error) throw todayResult.error
      if (lowStockResult.error) throw lowStockResult.error

      return {
        totalProducts: totalResult.count ?? 0,
        publishedCount: publishedResult.count ?? 0,
        draftCount: draftResult.count ?? 0,
        featuredCount: featuredResult.count ?? 0,
        todayAdded: todayResult.count ?? 0,
        lowStockCount: lowStockResult.count ?? 0,
      }
    },
  }
}
