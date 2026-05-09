/**
 * Function: createStorageStore
 *
 * Description: 创建基于 UniApp 原生存储的响应式状态管理函数
 *
 * Parameters:
 *  name(string): Store 名称
 *  options(object): Store 配置
 *    - defaultState(object): 默认状态
 *    - storageKey(string): 存储键名
 *    - persist(boolean): 是否持久化
 *
 * Returns:
 *  store(object): Store 实例，包含 state、getters、actions
 */

import { ref, computed, watch, Ref } from 'vue';

type StorageValue = string | number | boolean | object | null;

interface StorageStoreOptions<T> {
  defaultState: T;
  storageKey: string;
  persist?: boolean;
}

interface StorageStore<T> {
  state: Ref<T>;
  getters: {
    get: <K extends keyof T>(key: K) => T[K];
  };
  setState: (newState: Partial<T>) => void;
  resetState: () => void;
  action: <A extends (...args: unknown[]) => unknown>(fn: A) => A;
}

export function createStorageStore<T extends Record<string, StorageValue>>(
  name: string,
  options: StorageStoreOptions<T>
): StorageStore<T> {
  const { defaultState, storageKey, persist = true } = options;

  // 尝试从本地存储恢复状态
  function loadState(): T {
    if (persist && typeof uni !== 'undefined') {
      try {
        const stored = uni.getStorageSync(storageKey);
        if (stored) {
          return { ...defaultState, ...JSON.parse(stored) };
        }
      } catch {
        // eslint-disable-next-line no-console
        console.warn(`[${name}] Failed to load state from storage`);
      }
    }
    return { ...defaultState };
  }

  // 保存状态到本地存储
  function saveState(state: T): void {
    if (persist && typeof uni !== 'undefined') {
      try {
        uni.setStorageSync(storageKey, JSON.stringify(state));
      } catch {
        // eslint-disable-next-line no-console
        console.warn(`[${name}] Failed to save state to storage`);
      }
    }
  }

  // 创建响应式状态
  const state = ref<T>(loadState()) as Ref<T>;

  // 监听状态变化并自动持久化
  if (persist) {
    watch(state, (newState) => {
      saveState(newState);
    }, { deep: true });
  }

  // 快捷的 getters 访问
  const getters = {
    get: <K extends keyof T>(key: K): T[K] => state.value[key],
  };

  // 设置状态
  function setState(newState: Partial<T>): void {
    state.value = { ...state.value, ...newState };
  }

  // 重置状态
  function resetState(): void {
    state.value = { ...defaultState };
    if (persist) {
      uni.removeStorageSync(storageKey);
    }
  }

  // 包装 actions，自动处理 loading 和错误
  function action<A extends (...args: unknown[]) => unknown>(
    fn: A
  ): A {
    return ((...args: Parameters<A>) => {
      try {
        return fn(...args);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[${name}] Action error:`, error);
        throw error;
      }
    }) as A;
  }

  return {
    state,
    getters,
    setState,
    resetState,
    action,
  };
}

export type { StorageStore, StorageStoreOptions };
