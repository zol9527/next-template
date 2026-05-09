import { AuthContext } from "@/components/context/auth-context";
import type { AuthContextValue } from "@/types/lib/auth-context";
import { useContext } from "react";


/**
 * Function: useAuth
 *
 * Description: 获取认证状态的 Hook
 *
 * Returns:
 *     AuthContextValue: 认证上下文值
 *
 * Throws:
 *     Error: 当在 AuthProvider 外部使用时抛出错误
 */

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用')
  }
  return context
}
