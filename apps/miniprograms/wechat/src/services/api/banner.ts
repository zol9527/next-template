/**
 * Function: bannerService
 *
 * Description: 轮播图服务模块，提供小程序端轮播图数据获取功能
 *
 * Returns:
 *   getBanners(function): 获取轮播图列表
 */

import { httpClient } from '../../core/http-client';
import { logger } from '../../utils/logger';

const API_PREFIX = '/public/miniprogram';

/**
 * 轮播图类型定义
 */
export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: 'none' | 'product' | 'category' | 'page' | 'external';
  sortOrder?: number; // 接口返回的字段名是 sortOrder
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 轮播图列表响应接口
 * 接口直接返回数组，由 HTTP 客户端处理 success 包装
 */
type BannersResponse = Banner[];

/**
 * 轮播图服务
 */
export const bannerService = {
  /**
   * 获取轮播图列表
   *
   * @returns Promise<Banner[]> - 轮播图数组
   */
  async getBanners(): Promise<Banner[]> {
    logger.info('获取轮播图列表');

    try {
      // HTTP 客户端会自动处理 { success: true, data: [...] } 格式，直接返回 data 数组
      // 注意: 后端端点名称是 carousels（不是 banners）
      const result = await httpClient.get<Banner[]>(`${API_PREFIX}/carousels`);

      console.log('轮播图接口原始响应:', JSON.stringify(result, null, 2));
      logger.info('轮播图接口原始响应', { result });

      // 安全检查：确保 result 是数组
      if (!Array.isArray(result)) {
        logger.warn('轮播图响应格式异常，期望数组', { result });
        return [];
      }

      // 过滤仅返回激活状态的轮播图
      const activeBanners = result.filter((banner) => banner.isActive);

      // 按 sortOrder 排序（注意：接口返回的字段是 sortOrder，不是 orderId）
      activeBanners.sort((a, b) => {
        const orderA = (a as any).sortOrder ?? 0;
        const orderB = (b as any).sortOrder ?? 0;
        return orderA - orderB;
      });

      logger.info('获取轮播图成功', { count: activeBanners.length });
      return activeBanners;
    } catch (error) {
      logger.error('获取轮播图失败', error);
      throw error;
    }
  },
};

