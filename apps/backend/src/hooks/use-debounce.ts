import { useState, useEffect } from 'react'

/**
 * Hook: useDebounce
 * 
 * Description: 用于对频繁变化的值进行防抖处理，特别适用于搜索输入框。
 * 
 * Parameters:
 *     value(T): 需要防抖的值
 *     delay(number): 延迟时间（毫秒）
 * 
 * Returns:
 *     debouncedValue(T): 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
