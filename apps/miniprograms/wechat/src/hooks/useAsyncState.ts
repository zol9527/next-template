/**
 * Function: useAsyncState
 *
 * Description: 异步状态管理 Composable，自动处理加载状态、错误和数据
 *
 * Parameters:
 *  asyncFn(function): 异步函数
 *  initialState(any): 初始状态
 *  options(object): 配置选项
 *
 * Returns:
 *  state(Ref): 响应式状态
 *  isLoading(Ref): 是否加载中
 *  isReady(Ref): 是否已就绪
 *  isError(Ref): 是否有错误
 *  error(Ref): 错误对象
 *  execute(function): 手动执行函数
 *  pending(Ref): 是否 pending 状态
 */

import { ref, shallowRef, computed, watch } from 'vue';
import type { Ref, ShallowRef } from 'vue';

interface UseAsyncStateOptions {
  immediate?: boolean;
  throwError?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}

interface UseAsyncStateReturn<T> {
  state: ShallowRef<T>;
  data: ShallowRef<T | null>;
  isLoading: Readonly<Ref<boolean>>;
  isReady: Readonly<Ref<boolean>>;
  isError: Readonly<Ref<boolean>>;
  error: ShallowRef<unknown | null>;
  execute: (...args: unknown[]) => Promise<T | null>;
  pending: Readonly<Ref<boolean>>;
  reset: () => void;
}

export function useAsyncState<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  initialState: T | null = null,
  options: UseAsyncStateOptions = {}
): UseAsyncStateReturn<T> {
  const { immediate = false, throwError = false, onSuccess, onError } = options;

  // 状态
  const state = shallowRef<T>(initialState) as ShallowRef<T>;
  const data = shallowRef<T | null>(null) as ShallowRef<T | null>;
  const isLoading = ref(false);
  const error = shallowRef<unknown | null>(null) as ShallowRef<unknown | null>;

  // 计算属性
  const isReady = computed(() => data.value !== null);
  const isError = computed(() => error.value !== null);
  const pending = computed(() => isLoading.value);

  // 执行异步函数
  async function execute(...args: unknown[]): Promise<T | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await asyncFn(...args);
      state.value = result;
      data.value = result;
      onSuccess?.(result);
      return result;
    } catch (e) {
      error.value = e;
      if (throwError) {
        throw e;
      }
      onError?.(e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // 重置状态
  function reset(): void {
    state.value = initialState;
    data.value = null;
    isLoading.value = false;
    error.value = null;
  }

  // 立即执行
  if (immediate) {
    execute();
  }

  return {
    state,
    data,
    isLoading: readonly(isLoading),
    isReady: readonly(isReady),
    isError: readonly(isError),
    error: readonly(error) as ShallowRef<unknown | null>,
    execute,
    pending: readonly(pending),
    reset,
  };
}

// 类型导出
export type { UseAsyncStateOptions, UseAsyncStateReturn };
