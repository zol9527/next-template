/**
 * Function: favoritesService
 *
 * Description: 收藏服务模块，对接后端收藏 API，提供用户收藏课程、商品、文章等功能
 *
 * 后端 API 端点:
 *   GET    /user/favorites         — 获取收藏列表（query: type, cursor, limit）
 *   POST   /user/favorites         — 添加收藏（body: { productId, type }）
 *   DELETE /user/favorites/:id     — 取消收藏
 *   GET    /user/favorites/check   — 检查是否已收藏（query: productId, type）
 *
 * 所有端点需要用户认证（Authorization header 由 httpClient 自动携带）
 *
 * Returns:
 *   getFavorites(function): 获取收藏列表
 *   addFavorite(function): 添加收藏
 *   removeFavorite(function): 取消收藏
 *   checkFavorite(function): 检查是否已收藏
 */

import { httpClient } from '../core/http-client';
import { logger } from '../utils/logger';

/** 后端收藏接口路径 */
const FAVORITES_API_PATH = '/user/favorites';

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
 * 收藏服务 — 对接后端真实 API
 */
export const favoritesService = {
  /**
   * 获取收藏列表
   *
   * 调用后端 GET /user/favorites 接口
   * 支持按类型筛选和游标分页
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
      const result = await httpClient.get<FavoriteListResponse>(FAVORITES_API_PATH, params);
      logger.info('获取收藏列表成功', { count: result?.items?.length ?? 0 });
      return result;
    } catch (error) {
      logger.error('获取收藏列表失败', error);
      throw error;
    }
  },

  /**
   * 添加收藏
   *
   * 调用后端 POST /user/favorites 接口
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
      await httpClient.post<{ success: boolean }>(FAVORITES_API_PATH, { productId, type });
      logger.info('添加收藏成功', { productId, type });
      return { success: true };
    } catch (error) {
      logger.error('添加收藏失败', error);
      throw error;
    }
  },

  /**
   * 取消收藏
   *
   * 调用后端 DELETE /user/favorites/:id 接口
   *
   * @param id - 收藏 ID
   * @returns Promise<{ success: boolean }> - 操作结果
   */
  async removeFavorite(id: string): Promise<{ success: boolean }> {
    logger.info('取消收藏', { favoriteId: id });

    try {
      await httpClient.delete<{ success: boolean }>(`${FAVORITES_API_PATH}/${id}`);
      logger.info('取消收藏成功', { favoriteId: id });
      return { success: true };
    } catch (error) {
      logger.error('取消收藏失败', error);
      throw error;
    }
  },

  /**
   * 检查是否已收藏
   *
   * 调用后端 GET /user/favorites/check 接口
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
      const result = await httpClient.get<CheckFavoriteResponse>(`${FAVORITES_API_PATH}/check`, { productId, type });
      logger.info('检查收藏状态成功', { productId, isFavorited: result?.isFavorited });
      return result;
    } catch (error) {
      logger.error('检查收藏状态失败', error);
      throw error;
    }
  },
};
