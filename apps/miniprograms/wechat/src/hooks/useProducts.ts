/**
 * Function: useProducts
 *
 * Description: 商品数据 Composable，提供商品列表、分类、搜索等功能
 *
 * Returns:
 *  products(Ref): 商品列表
 *  categories(Ref): 分类列表
 *  loading(Ref): 加载状态
 *  loadProducts(function): 加载商品
 *  loadCategories(function): 加载分类
 *  searchProducts(function): 搜索商品
 *  refresh(function): 刷新
 */

import { ref, shallowRef, readonly } from 'vue';
import { productService } from '../services/api/products';
import { logger } from '../utils/logger';

// 商品类型定义（映射后端实际返回的字段，经 normalizeProduct 适配后的结构）
interface Product {
  id: string;
  name: string;
  slug?: string;
  summary?: string;
  description?: string;
  kind?: string;               // 后端: 'course' | 'certificate'
  price: { amount: string; currencyCode: string };
  originalPrice?: { amount: string; currencyCode: string };
  isFeatured?: boolean;
  tags: string[];
  coverUrl?: string;           // 后端原始封面图 URL
  mediaUrls?: string[];        // 后端原始媒体 URL 列表
  coverImage?: string;         // 适配后: 由 coverUrl 映射
  imageUrl?: string;           // 适配后: 由 coverUrl 映射
  tag?: string;                // 适配后: 取 tags[0]
  studentCount?: number;       // 适配后: 默认 0
  enrolledCount?: number;      // 适配后: 默认 0
  salesCount?: number;         // 适配后: 默认 0
  createdAt: string;
}

// 分类类型定义
interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sort: number;
  isActive: boolean;
}

interface ProductListParams {
  limit?: number;
  cursor?: string | null;
  categoryId?: string;
  featured?: boolean;
  keyword?: string;
}

interface ProductListResponse {
  items: Product[];
  nextCursor: string | null;
  total: number;
}

// 分类列表响应接口
interface CategoryListResponse {
  items: Category[];
  total?: number;
}

export function useProducts() {
  // 状态
  const products = shallowRef<Product[]>([]);
  const categories = shallowRef<Category[]>([]);
  const loading = ref(false);
  const error = shallowRef<unknown>(null);

  // 游标分页状态
  const pagination = ref({
    limit: 20,
    nextCursor: null as string | null,
    total: 0,
    hasMore: false,
  });

  // 加载商品列表
  async function loadProducts(params: ProductListParams = {}): Promise<ProductListResponse | null> {
    // 竞态保护：如果正在加载中，忽略新的请求
    if (loading.value) {
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      // 构建查询参数，只包含有效值
      const queryParams: Record<string, unknown> = {
        limit: params.limit || pagination.value.limit,
      };

      if (params.cursor) {
        queryParams.cursor = params.cursor;
      }
      if (params.categoryId) {
        queryParams.categoryId = params.categoryId;
      }
      if (params.featured !== undefined) {
        queryParams.featured = params.featured;
      }

      const result = await (productService.listProducts as (params: Record<string, unknown>) => Promise<ProductListResponse>)(queryParams);

      // 安全检查：确保 result 和 result.items 存在
      if (!result || !Array.isArray(result.items)) {
        logger.warn('商品列表响应格式异常', { result });
        products.value = [];
        return null;
      }

      // 如果是加载更多（有 cursor），追加数据
      if (params.cursor) {
        products.value = [...products.value, ...result.items];
      } else {
        products.value = result.items;
      }

      pagination.value = {
        limit: params.limit || pagination.value.limit,
        nextCursor: result.nextCursor,
        total: result.total ?? 0,
        hasMore: !!result.nextCursor,
      };

      logger.info('加载商品成功', { count: result.items.length, total: result.total });

      return result;
    } catch (e) {
      error.value = e;
      logger.error('加载商品失败', e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // 加载分类列表
  async function loadCategories(): Promise<Category[] | null> {
    loading.value = true;
    error.value = null;

    try {
      const result = await productService.listCategories() as CategoryListResponse | undefined;

      // 安全检查：确保 result 和 result.items 存在
      if (!result || !Array.isArray(result.items)) {
        logger.warn('分类列表响应格式异常', { result });
        categories.value = [];
        return [];
      }

      categories.value = result.items;
      logger.info('加载分类成功', { count: result.items.length });
      return result.items;
    } catch (e) {
      error.value = e;
      logger.error('加载分类失败', e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // 搜索商品
  async function searchProducts(keyword: string, limit = 20): Promise<Product[]> {
    if (!keyword.trim()) {
      products.value = [];
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await productService.searchProducts(keyword, limit) as ProductListResponse | undefined;

      // 安全检查
      if (!result || !Array.isArray(result.items)) {
        logger.warn('搜索结果响应格式异常', { result });
        products.value = [];
        return [];
      }

      products.value = result.items;
      logger.info('搜索商品成功', { keyword, count: result.items.length });
      return result.items;
    } catch (e) {
      error.value = e;
      logger.error('搜索商品失败', e);
      return [];
    } finally {
      loading.value = false;
    }
  }

  // 刷新
  async function refresh(): Promise<void> {
    await loadProducts({});
  }

  // 加载更多
  async function loadMore(): Promise<void> {
    if (!pagination.value.hasMore || loading.value) {
      return;
    }

    await loadProducts({ cursor: pagination.value.nextCursor });
  }

  return {
    // 状态
    products: products,
    categories: categories,
    loading: loading,
    error: error,
    pagination: readonly(pagination),

    // 方法
    loadProducts,
    loadCategories,
    searchProducts,
    refresh,
    loadMore,
  };
}
