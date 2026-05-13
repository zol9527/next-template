/**
 * Function: productService
 *
 * Description: 商品相关 API 服务，处理商品搜索、列表查询等操作
 *
 * Returns:
 *	listProducts(function): 获取商品列表
 *	searchProducts(function): 搜索商品
 *	getProductDetail(function): 获取商品详情
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'
import { buildFullUrl } from '../../utils/url'

/**
 * Function: buildQueryString
 *
 * Description: 构建查询字符串（兼容小程序环境）
 *
 * Parameters:
 *	params(object): 查询参数对象
 *
 * Returns:
 *	string: 查询字符串
 */
const buildQueryString = (params) => {
  const pairs = []
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    }
  }
  return pairs.join('&')
}

/**
 * Function: normalizeProduct
 *
 * Description: 将后端 API 返回的商品字段映射为小程序模板期望的字段名
 * 后端字段名与前端字段名存在差异，在此统一转换
 *
 * 后端 → 前端字段映射:
 *   coverUrl        → coverImage (封面图，用于列表页卡片)
 *   coverUrl        → imageUrl   (封面图，兜底字段)
 *   tags[0]         → tag        (展示标签，取第一个)
 *   kind            → kind       (商品类型: course/certificate)
 *   summary         → summary    (摘要)
 *   price.amount    → 保持原样 (formatPrice 兼容对象格式)
 *   originalPrice   → 保持原样 (formatPrice 兼容对象格式)
 *   category.id     → categoryId  (用于首页热门推荐分类筛选)
 *   category.name   → categoryName(用于接口未返回分类列表时兜底显示)
 *
 * 后端不返回但前端可能用到的字段，给予合理默认值:
 *   studentCount / enrolledCount → 0
 *   salesCount / soldCount       → 0
 *
 * @param {object} product - 后端返回的原始商品对象
 * @returns {object} 映射后的商品对象，兼容前端模板字段
 */
const normalizeProduct = (product) => {
  if (!product || typeof product !== 'object') return product

  const category = product.category && typeof product.category === 'object'
    ? product.category
    : null
  const categoryIdFromList = Array.isArray(product.categoryIds) && product.categoryIds.length > 0
    ? product.categoryIds[0]
    : ''
  // 封面图优先级: coverUrl > coverImage > imageUrl > mediaUrls[0]
  // 当用户只配置了 mediaUrls（媒体图库）而未设置 coverUrl 时，使用第一张媒体图作为封面
  const coverUrl = product.coverUrl
    || product.coverImage
    || product.imageUrl
    || (Array.isArray(product.mediaUrls) && product.mediaUrls.length > 0 ? product.mediaUrls[0] : '')
    || ''

  return {
    ...product,
    // 封面图映射: 后端 coverUrl / mediaUrls → 前端 coverImage / imageUrl
    // 后端公开文件接口返回的是 /api/v1/public/files/... 相对路径，小程序 image 需要完整 URL。
    // 注意：确保 coverUrl / mediaUrls 始终有值（即使后端未返回），避免前端渲染时 undefined
    coverUrl: product.coverUrl || coverUrl || null,
    mediaUrls: Array.isArray(product.mediaUrls) ? product.mediaUrls : [],
    coverImage: buildFullUrl(coverUrl),
    imageUrl: buildFullUrl(coverUrl),

    // 标签映射: 后端 tags 数组 → 前端 tag 单值展示
    tag: product.tag || (Array.isArray(product.tags) && product.tags.length > 0 ? product.tags[0] : ''),

    // 统计字段默认值（后端暂不返回这些字段）
    studentCount: product.studentCount || 0,
    enrolledCount: product.enrolledCount || 0,
    salesCount: product.salesCount || 0,
    soldCount: product.soldCount || 0,

    // 分类字段兜底：后端有时返回 category 对象，有时直接返回 categoryId。
    // 首页热门推荐 Tab 依赖这个字段判断“哪些分类真的有推荐商品”。
    categoryId: product.categoryId || categoryIdFromList || category?.id || '',
    categoryName: product.categoryName || category?.name || '',
  }
}

/**
 * 商品服务类
 */
class ProductService {
  constructor() {
    this.logger = logger.child({ service: 'product' })
  }

  /**
   * 获取分类列表
   * @returns {Promise<{items: array}>} 分类列表
   */
  async listCategories() {
    this.logger.info('获取分类列表')

    try {
      const result = await httpClient.get('/public/categories')

      // 确保返回值符合预期格式
      const normalizedResult = {
        items: Array.isArray(result?.items) ? result.items : [],
      }

      this.logger.info('获取分类列表成功', { count: normalizedResult.items.length })
      return normalizedResult
    } catch (error) {
      this.logger.error('获取分类列表失败', error)
      throw error
    }
  }

  /**
   * 获取商品列表
   * @param {object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {string} params.cursor - 分页游标
   * @param {string} params.categoryId - 分类 ID
   * @param {boolean} params.featured - 仅推荐商品
   * @returns {Promise<{items: array, nextCursor: string|null, total: number}>} 商品列表
   */
  async listProducts(params = {}) {
    this.logger.info('获取商品列表', params)

    try {
      const queryParams = {}
      if (params.limit) queryParams.limit = params.limit
      if (params.cursor) queryParams.cursor = params.cursor
      if (params.categoryId) queryParams.categoryId = params.categoryId
      if (params.featured) queryParams.featured = 'true'

      const queryString = buildQueryString(queryParams)
      const url = `/public/products${queryString ? '?' + queryString : ''}`

      const result = await httpClient.get(url)

      // 对每个商品进行字段映射适配
      const rawItems = Array.isArray(result?.items) ? result.items : []
      const items = rawItems.map(normalizeProduct)

      const normalizedResult = {
        items,
        nextCursor: result?.nextCursor ?? null,
        total: result?.total ?? 0,
      }

      this.logger.info('获取商品列表成功', { count: normalizedResult.items.length })
      return normalizedResult
    } catch (error) {
      this.logger.error('获取商品列表失败', error, params)
      throw error
    }
  }

  /**
   * 搜索商品
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 每页数量
   * @returns {Promise<{items: array, nextCursor: string|null, total: number}>} 搜索结果
   */
  async searchProducts(keyword, limit = 20) {
    this.logger.info('搜索商品', { keyword, limit })

    try {
      const queryString = buildQueryString({
        keyword: keyword || '',
        limit: String(limit)
      })

      const result = await httpClient.get(`/public/products?${queryString}`)

      // 对搜索结果也进行字段映射适配
      const rawItems = Array.isArray(result?.items) ? result.items : []
      const items = rawItems.map(normalizeProduct)

      const normalizedResult = {
        items,
        nextCursor: result?.nextCursor ?? null,
        total: result?.total ?? 0,
      }

      this.logger.info('搜索商品成功', { count: normalizedResult.items.length, keyword })
      return normalizedResult
    } catch (error) {
      this.logger.error('搜索商品失败', error, { keyword })
      throw error
    }
  }

  /**
   * 获取商品详情
   * @param {string} productId - 商品 ID
   * @returns {Promise<object>} 商品详情
   */
  async getProductDetail(productId) {
    this.logger.info('获取商品详情', { productId })

    try {
      const result = await httpClient.get(`/public/products/${productId}`)

      // 详情也需要字段映射
      const normalized = normalizeProduct(result)

      this.logger.info('获取商品详情成功', { productId })
      return normalized
    } catch (error) {
      this.logger.error('获取商品详情失败', error, { productId })
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const productService = new ProductService()

export default productService
