/**
 * File: toast.tsx
 * Description: Toast 通知组件，符合 Paper Design 规格的语义化通知系统
 *
 * 设计规格 (Paper Design "通知 · Toast Notifications"):
 *   - 容器: radius-md (12px), py-3 (12px), px-4 (16px), gap-2.5 (10px)
 *   - 阴影: shadow-card
 *   - 尺寸: 380px 宽度
 *   - 变体: success / error / warning, 各有专属边框色和图标色
 *   - 关闭按钮: 14×14px 图标
 *   - 成功: 边框 #1F8A6526, 图标色 #1F8A65
 *   - 错误: 边框 #CF2D5626, 图标色 #CF2D56
 *   - 警告: 边框 #C0853226, 图标色 #C08532
 *   - 标题: DM Sans 500 13px, --fg
 *   - 描述: DM Sans 400 12px, --fg-secondary
 *   - 图标: 20×20px
 */

'use client'

import * as React from 'react'

/** Toast 变体类型 — 对应 Paper Design 的三种语义色 + 兼容旧代码的别名 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'destructive' | 'default'

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  toast: (params: Omit<ToastItem, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

function createToastId(): string {
  const cryptoObject = globalThis.crypto

  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID()
  }

  if (typeof cryptoObject?.getRandomValues === 'function') {
    const bytes = cryptoObject.getRandomValues(new Uint8Array(16))

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * 变体样式映射
 * Paper Design: 每个变体有专属边框色 + 图标色
 */
const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: string; iconPath: string; viewBox: string }> = {
  success: {
    border: 'border-[rgba(31,138,101,0.15)]',
    icon: 'text-[var(--teal)]',
    // Checkmark icon path
    iconPath: 'M5 10l3 3 7-7',
    viewBox: '0 0 16 16',
  },
  error: {
    border: 'border-[rgba(207,45,86,0.15)]',
    icon: 'text-[var(--rose)]',
    // X icon path
    iconPath: 'M4 4l8 8M12 4l-8 8',
    viewBox: '0 0 16 16',
  },
  warning: {
    border: 'border-[rgba(192,133,50,0.15)]',
    icon: 'text-[var(--gold)]',
    // Alert triangle path
    iconPath: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    viewBox: '0 0 24 24',
  },
  // destructive 是 error 的别名，用于向后兼容
  destructive: {
    border: 'border-[rgba(207,45,86,0.15)]',
    icon: 'text-[var(--rose)]',
    iconPath: 'M4 4l8 8M12 4l-8 8',
    viewBox: '0 0 16 16',
  },
  // default 是 success 的别名，用于向后兼容
  default: {
    border: 'border-[rgba(31,138,101,0.15)]',
    icon: 'text-[var(--teal)]',
    iconPath: 'M5 10l3 3 7-7',
    viewBox: '0 0 16 16',
  },
}

/**
 * ToastProvider — 提供全局 toast 能力的 UI 包装 Provider
 *
 * Paper Design 规格:
 *   - 容器定位: fixed right-4 top-4, z-100
 *   - 宽度: 380px
 *   - 间距: gap-2 (8px)
 *   - 单条 Toast: radius-md, py-3, px-4, gap-2.5, shadow-card, 边框
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // 在组件中使用
 * const { toast } = useToast()
 * toast({ title: '保存成功', variant: 'success' })
 * toast({ title: '删除失败', description: '请稍后重试', variant: 'error' })
 * ```
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback((params: Omit<ToastItem, 'id'>) => {
    const id = createToastId()
    const item: ToastItem = {
      id,
      variant: 'success',
      ...params,
    }

    setItems((prev) => [item, ...prev])

    // 3.5 秒后自动关闭
    window.setTimeout(() => {
      dismiss(id)
    }, 3500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* z-[100] 确保在 Dialog (z-50) 之上 */}
      <div className="fixed right-4 top-4 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((item) => {
          const variantStyle = VARIANT_STYLES[item.variant || 'success']

          return (
            <div
              key={item.id}
              className={[
                // Paper Design 核心: flex, radius-md, shadow-card, border
                'flex items-center rounded-[var(--radius-md)] border bg-[var(--surface)] px-4 py-3 gap-2.5',
                'shadow-[var(--shadow-card)]',
                // 变体专属边框色
                variantStyle.border,
                // 进入动画
                'animate-[toast-in_0.15s_ease]',
              ].join(' ')}
            >
              {/* 图标 20×20px */}
              <div className={cn('flex-shrink-0', variantStyle.icon)}>
                <svg
                  width="20"
                  height="20"
                  viewBox={variantStyle.viewBox}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={variantStyle.iconPath} />
                </svg>
              </div>

              {/* 文本内容区 */}
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-body)] text-[13px] font-medium leading-[1.3] text-[var(--fg)]">
                  {item.title}
                </div>
                {item.description ? (
                  <div className="mt-0.5 font-[family-name:var(--font-body)] text-[12px] font-normal leading-[1.4] text-[var(--fg-secondary)]">
                    {item.description}
                  </div>
                ) : null}
              </div>

              {/* 关闭按钮 14×14px */}
              <button
                onClick={() => dismiss(item.id)}
                className="flex-shrink-0 flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                aria-label="关闭通知"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * cn 工具函数 — 内联简易版本避免循环依赖
 */
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

/**
 * useToast — 获取 toast 发送函数的 Hook
 *
 * @example
 * ```tsx
 * const { toast } = useToast()
 * toast({ title: '操作成功', variant: 'success' })
 * ```
 */
export function useToast() {
  const context = React.useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
