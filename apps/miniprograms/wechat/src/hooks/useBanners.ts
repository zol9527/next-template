/**
 * Function: useBanners
 *
 * Description: 轮播图数据 Composable，提供轮播图列表的加载、状态管理等功能
 *
 * Returns:
 *  banners(Ref): 轮播图列表
 *  loading(Ref): 加载状态
 *  error(Ref): 错误信息
 *  loadBanners(function): 加载轮播图
 *  refresh(function): 刷新数据
 */

import { shallowRef, ref, readonly } from 'vue';
import { bannerService } from '../services/api/banner';
import type { Banner } from '../services/api/banner';
import { logger } from '../utils/logger';

export function useBanners() {
  // 状态
  const banners = shallowRef<Banner[]>([]);
  const loading = ref(false);
  const error = shallowRef<unknown>(null);

  /**
   * 加载轮播图列表
   */
  async function loadBanners(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const result = await bannerService.getBanners();

      // 调试：打印 bannerService 返回的数据
      console.log('bannerService.getBanners() 返回值:', JSON.stringify(result, null, 2));
      logger.info('bannerService.getBanners() 返回值', { result });

      // 安全检查：确保 result 是数组
      if (!Array.isArray(result)) {
        logger.warn('轮播图列表响应格式异常', { result });
        banners.value = [];
        return;
      }

      banners.value = result;
      console.log('banners.value 已设置:', banners.value);
      logger.info('加载轮播图成功', { count: result.length });
    } catch (e) {
      error.value = e;
      logger.error('加载轮播图失败', e);
      banners.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * 刷新轮播图数据
   */
  async function refresh(): Promise<void> {
    await loadBanners();
  }

  return {
    // 状态
    banners: banners,
    loading: readonly(loading),
    error: error,

    // 方法
    loadBanners,
    refresh,
  };
}
