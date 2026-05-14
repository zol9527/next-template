/**
 * 本地存储封装模块
 * Description: 提供类型安全的存储操作和错误处理
 */

import { logger } from './logger';
import { PRESERVE_KEYS_ON_UPDATE } from '../config/constants';

/**
 * 存储信息类型
 */
interface StorageInfo {
  keys: string[];
  currentSize: number;
  limitSize: number;
}

/**
 * 存储操作类
 * Description: 封装 uni-app 存储操作，提供类型安全的 API
 */
class Storage {
  /**
   * Function: get
   *
   * Description: 获取存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *   defaultValue(T): 默认值
   *
   * Returns:
   *   T | null: 存储的值或默认值
   */
  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = uni.getStorageSync<T>(key);
      return value !== ('' as unknown) ? value : defaultValue;
    } catch (e) {
      logger.error('Storage get 失败', e, { key });
      return defaultValue;
    }
  }

  /**
   * Function: getJSON
   *
   * Description: 获取 JSON 数据
   *
   * Parameters:
   *   key(string): 存储键
   *   defaultValue(T): 默认值
   *
   * Returns:
   *   T | null: 解析后的对象或默认值
   */
  getJSON<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = uni.getStorageSync(key);
      if (value === '') {
        return defaultValue;
      }
      return JSON.parse(value as string) as T;
    } catch (e) {
      logger.error('Storage getJSON 失败', e, { key });
      return defaultValue;
    }
  }

  /**
   * Function: set
   *
   * Description: 设置存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *   value(T): 存储值
   *
   * Returns:
   *   boolean: 是否设置成功
   */
  set<T = unknown>(key: string, value: T): boolean {
    try {
      uni.setStorageSync(key, value);
      return true;
    } catch (e) {
      logger.error('Storage set 失败', e, { key });
      return false;
    }
  }

  /**
   * Function: setJSON
   *
   * Description: 设置 JSON 数据（自动序列化）
   *
   * Parameters:
   *   key(string): 存储键
   *   value(T): 存储值
   *
   * Returns:
   *   boolean: 是否设置成功
   */
  setJSON<T = unknown>(key: string, value: T): boolean {
    try {
      uni.setStorageSync(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logger.error('Storage setJSON 失败', e, { key });
      return false;
    }
  }

  /**
   * Function: remove
   *
   * Description: 删除存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *
   * Returns:
   *   boolean: 是否删除成功
   */
  remove(key: string): boolean {
    try {
      uni.removeStorageSync(key);
      return true;
    } catch (e) {
      logger.error('Storage remove 失败', e, { key });
      return false;
    }
  }

  /**
   * Function: clear
   *
   * Description: 清空所有存储
   *
   * Returns:
   *   boolean: 是否清空成功
   */
  clear(): boolean {
    try {
      uni.clearStorageSync();
      return true;
    } catch (e) {
      logger.error('Storage clear 失败', e);
      return false;
    }
  }

  /**
   * Function: clearNonCritical
   *
   * Description: 选择性清除非关键缓存。
   * 版本更新时调用此方法，保留白名单中的关键数据（Token、设备 ID 等），
   * 清除其余所有业务缓存，避免旧数据结构与新代码不兼容。
   *
   * Parameters:
   *   preserveKeys(string[]): 需要保留的键名列表，默认使用 PRESERVE_KEYS_ON_UPDATE
   *
   * Returns:
   *   number: 被清除的键数量
   */
  clearNonCritical(preserveKeys: string[] = [...PRESERVE_KEYS_ON_UPDATE]): number {
    try {
      const info = uni.getStorageInfoSync() as { keys: string[] };
      const preserveSet = new Set(preserveKeys);
      let cleared = 0;

      for (const key of info.keys) {
        if (!preserveSet.has(key)) {
          uni.removeStorageSync(key);
          cleared++;
        }
      }

      logger.info('选择性缓存清除完成', { cleared, preserved: preserveKeys.length });
      return cleared;
    } catch (e) {
      logger.error('选择性缓存清除失败', e);
      return 0;
    }
  }

  /**
   * Function: getInfo
   *
   * Description: 获取存储信息
   *
   * Returns:
   *   StorageInfo | null: 存储信息对象
   */
  getInfo(): StorageInfo | null {
    try {
      return uni.getStorageInfoSync() as StorageInfo;
    } catch (e) {
      logger.error('Storage getInfo 失败', e);
      return null;
    }
  }

  /**
   * Function: isFull
   *
   * Description: 检查存储是否已满
   *
   * Returns:
   *   boolean: 是否已满
   */
  isFull(): boolean {
    const info = this.getInfo();
    if (!info) return false;
    return info.currentSize >= info.limitSize;
  }

  /**
   * Function: getCurrentSize
   *
   * Description: 获取当前存储大小（KB）
   *
   * Returns:
   *   number: 当前存储大小
   */
  getCurrentSize(): number {
    const info = this.getInfo();
    return info ? info.currentSize : 0;
  }

  /**
   * Function: getLimitSize
   *
   * Description: 获取存储限制大小（KB）
   *
   * Returns:
   *   number: 存储限制大小
   */
  getLimitSize(): number {
    const info = this.getInfo();
    return info ? info.limitSize : 0;
  }

  /**
   * Function: getAsync
   *
   * Description: 异步获取存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *   defaultValue(T): 默认值
   *
   * Returns:
   *   Promise<T | null>: 存储的值或默认值
   */
  async getAsync<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    return new Promise((resolve) => {
      uni.getStorage({
        key,
        success: (res: { data: unknown }) => {
          resolve(res.data as T);
        },
        fail: () => {
          resolve(defaultValue);
        },
      });
    });
  }

  /**
   * Function: setAsync
   *
   * Description: 异步设置存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *   value(T): 存储值
   *
   * Returns:
   *   Promise<boolean>: 是否设置成功
   */
  async setAsync<T = unknown>(key: string, value: T): Promise<boolean> {
    return new Promise((resolve) => {
      uni.setStorage({
        key,
        data: value,
        success: () => {
          resolve(true);
        },
        fail: (e: unknown) => {
          logger.error('Storage setAsync 失败', e, { key });
          resolve(false);
        },
      });
    });
  }

  /**
   * Function: removeAsync
   *
   * Description: 异步删除存储数据
   *
   * Parameters:
   *   key(string): 存储键
   *
   * Returns:
   *   Promise<boolean>: 是否删除成功
   */
  async removeAsync(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      uni.removeStorage({
        key,
        success: () => {
          resolve(true);
        },
        fail: (e: unknown) => {
          logger.error('Storage removeAsync 失败', e, { key });
          resolve(false);
        },
      });
    });
  }
}

/**
 * 导出单例
 */
export const storage = new Storage();

export default storage;
