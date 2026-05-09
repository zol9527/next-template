/**
 * Function: useFetch
 *
 * Description: 基于 HTTP 客户端的 Fetch Composable，提供优雅的数据获取体验
 *
 * Parameters:
 *  fetcher(function): 数据获取函数
 *  options(object): 配置选项
 *
 * Returns:
 *  data(Ref): 请求结果数据
 *  error(Ref): 错误信息
 *  loading(Ref): 加载状态
 *  execute(function): 执行请求
 *  refresh(function): 刷新数据
 */

import { shallowRef, ref, computed } from 'vue';
import type { ShallowRef, Ref } from 'vue';
import { useAsyncState } from './useAsyncState';
import { logger } from '../utils/logger';

interface UseFetchOptions<T> {
  initialValue?: T | null;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  deps?: unknown[];
}

interface UseFetchReturn<T> {
  data: ShallowRef<T | null>;
  error: ShallowRef<unknown | null>;
  loading: Readonly<Ref<boolean>>;
  pending: Readonly<Ref<boolean>>;
  execute: (...args: unknown[]) => Promise<T | null>;
  refresh: () => Promise<T | null>;
  mutate: (newData: T) => void;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { initialValue = null, immediate = false, onSuccess, onError, deps = [] } = options;

  const { state, isLoading, error, execute, reset } = useAsyncState(
    async () => {
      logger.debug('useFetch 执行请求', { deps });
      return fetcher();
    },
    initialValue,
    {
      immediate,
      onSuccess: (data) => {
        logger.debug('useFetch 请求成功');
        onSuccess?.(data as T);
      },
      onError: (err) => {
        logger.error('useFetch 请求失败', err);
        onError?.(err);
      },
    }
  );

  // 刷新数据
  async function refresh(): Promise<T | null> {
    reset();
    return execute();
  }

  // 直接修改数据（乐观更新）
  function mutate(newData: T): void {
    state.value = newData;
  }

  return {
    data: state,
    error,
    loading: readonly(isLoading),
    pending: readonly(isLoading),
    execute,
    refresh,
    mutate,
  };
}

// 带参数的 Fetch
export function useLazyFetch<T>(
  fetcher: (...args: unknown[]) => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> & { ready: Readonly<Ref<boolean>> } {
  const { initialValue = null, immediate = false, onSuccess, onError } = options;

  const { state, isLoading, error, execute, refresh, mutate } = useAsyncState(
    async (...args: unknown[]) => fetcher(...args),
    initialValue,
    {
      immediate,
      onSuccess: (data) => onSuccess?.(data as T),
      onError,
    }
  );

  const ready = computed(() => state.value !== null && !isLoading.value);

  return {
    data: state,
    error,
    loading: readonly(isLoading),
    pending: readonly(isLoading),
    execute,
    refresh,
    mutate,
    ready,
  };
}

export type { UseFetchOptions, UseFetchReturn };
