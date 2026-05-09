/**
 * uni-app 请求拦截器
 *
 * 职责：仅在请求发出前注入 Authorization 头
 * 401 Token 刷新重试逻辑已移至 core/http-client.ts 处理
 *   - 原因：uni.addInterceptor 的 success 回调是同步的，无法 await 异步刷新并重试
 *   - 方案：由 http-client.ts 的 request() 方法在 catch 到 401 后触发刷新并重发
 */

import { logger } from '../utils/logger';
import { StorageKey } from '../config/constants';

export function initRequestInterceptor(): void {
  uni.addInterceptor('request', {
    invoke(e: { url?: string; header?: Record<string, string> }) {
      const accessToken = uni.getStorageSync(StorageKey.ACCESS_TOKEN) as string;
      if (accessToken && e.header) {
        e.header.Authorization = `Bearer ${accessToken}`;
        logger.debug('请求拦截器：添加 Authorization 头');
      }
    },

    fail(err: { errMsg: string }) {
      logger.error('请求失败', { errMsg: err.errMsg });
    },
  });

  logger.info('✅ uni-app 请求拦截器已初始化（Token 注入）');
}
