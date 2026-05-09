/**
 * Function: favoritesService
 *
 * Description: 收藏服务模块，提供用户收藏课程、商品、文章等功能
 *
 * Returns:
 *   getFavorites(function): 获取收藏列表
 *   addFavorite(function): 添加收藏
 *   removeFavorite(function): 取消收藏
 *   checkFavorite(function): 检查是否已收藏
 */

import { logger } from '../utils/logger';

/**
 * 收藏类型枚举
 */
export enum FavoriteType {
  COURSE = 'course',
  PRODUCT = 'product',
  ARTICLE = 'article',
}

/**
 * 收藏项接口
 */
export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  type: FavoriteType;
  createdAt: string; // ISO 8601 格式
}

/**
 * 收藏列表响应接口
 */
export interface FavoriteListResponse {
  items: Favorite[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * 添加收藏请求接口
 */
export interface AddFavoriteRequest {
  productId: string;
  type: FavoriteType;
}

/**
 * 检查收藏响应接口
 */
export interface CheckFavoriteResponse {
  isFavorited: boolean;
  favoriteId?: string;
}

/**
 * Mock 收藏数据
 */
const mockFavorites: Favorite[] = [
  {
    id: 'fav_001',
    userId: 'user_123',
    productId: 'course_001',
    type: FavoriteType.COURSE,
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'fav_002',
    userId: 'user_123',
    productId: 'product_001',
    type: FavoriteType.PRODUCT,
    createdAt: '2025-01-14T15:20:00Z',
  },
  {
    id: 'fav_003',
    userId: 'user_123',
    productId: 'article_001',
    type: FavoriteType.ARTICLE,
    createdAt: '2025-01-13T09:15:00Z',
  },
  {
    id: 'fav_004',
    userId: 'user_123',
    productId: 'course_002',
    type: FavoriteType.COURSE,
    createdAt: '2025-01-12T14:45:00Z',
  },
];

/**
 * 收藏服务
 */
export const favoritesService = {
  /**
   * 获取收藏列表
   *
   * @param params - 查询参数
   * @param params.type - 收藏类型筛选
   * @param params.cursor - 分页游标
   * @param params.limit - 每页数量
   * @returns Promise<FavoriteListResponse> - 收藏列表响应
   */
  async getFavorites(params?: {
    type?: string;
    cursor?: string;
    limit?: number;
  }): Promise<FavoriteListResponse> {
    logger.info('获取收藏列表', { params });

    try {
      // TODO: 连接后端 API
      // return await httpClient.get<FavoriteListResponse>('/api/v1/user/favorites', params)

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredFavorites = [...mockFavorites];

          // 按类型筛选
          if (params?.type) {
            filteredFavorites = filteredFavorites.filter(
              (fav) => fav.type === params.type
            );
          }

          // 简单的分页模拟
          const limit = params?.limit || 20;
          const startIndex = params?.cursor ? parseInt(params.cursor, 10) : 0;
          const endIndex = startIndex + limit;
          const items = filteredFavorites.slice(startIndex, endIndex);

          resolve({
            items,
            nextCursor: endIndex < filteredFavorites.length ? String(endIndex) : null,
            hasMore: endIndex < filteredFavorites.length,
          });
        }, 300);
      });
    } catch (error) {
      logger.error('获取收藏列表失败', error);
      throw error;
    }
  },

  /**
   * 添加收藏
   *
   * @param productId - 产品 ID
   * @param type - 收藏类型
   * @returns Promise<{ success: boolean }> - 操作结果
   */
  async addFavorite(
    productId: string,
    type: string
  ): Promise<{ success: boolean }> {
    logger.info('添加收藏', { productId, type });

    try {
      // TODO: 连接后端 API
      // return await httpClient.post<{ success: boolean }>('/api/v1/user/favorites', { productId, type })

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          const newFavorite: Favorite = {
            id: `fav_${Date.now()}`,
            userId: 'user_123',
            productId,
            type: type as FavoriteType,
            createdAt: new Date().toISOString(),
          };
          mockFavorites.unshift(newFavorite);
          logger.info('添加收藏成功', { favoriteId: newFavorite.id });
          resolve({ success: true });
        }, 300);
      });
    } catch (error) {
      logger.error('添加收藏失败', error);
      throw error;
    }
  },

  /**
   * 取消收藏
   *
   * @param id - 收藏 ID
   * @returns Promise<{ success: boolean }> - 操作结果
   */
  async removeFavorite(id: string): Promise<{ success: boolean }> {
    logger.info('取消收藏', { favoriteId: id });

    try {
      // TODO: 连接后端 API
      // return await httpClient.delete<{ success: boolean }>(`/api/v1/user/favorites/${id}`)

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockFavorites.findIndex((fav) => fav.id === id);
          if (index !== -1) {
            mockFavorites.splice(index, 1);
            logger.info('取消收藏成功', { favoriteId: id });
          }
          resolve({ success: true });
        }, 300);
      });
    } catch (error) {
      logger.error('取消收藏失败', error);
      throw error;
    }
  },

  /**
   * 检查是否已收藏
   *
   * @param productId - 产品 ID
   * @param type - 收藏类型
   * @returns Promise<CheckFavoriteResponse> - 收藏状态
   */
  async checkFavorite(
    productId: string,
    type: string
  ): Promise<CheckFavoriteResponse> {
    logger.info('检查收藏状态', { productId, type });

    try {
      // TODO: 连接后端 API
      // return await httpClient.get<CheckFavoriteResponse>('/api/v1/user/favorites/check', { productId, type })

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          const favorite = mockFavorites.find(
            (fav) => fav.productId === productId && fav.type === type
          );

          resolve({
            isFavorited: !!favorite,
            favoriteId: favorite?.id,
          });
        }, 200);
      });
    } catch (error) {
      logger.error('检查收藏状态失败', error);
      throw error;
    }
  },
};
