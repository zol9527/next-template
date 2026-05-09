'use client'

import * as React from 'react'

export type ToastVariant = 'default' | 'destructive'

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

/**
Function: ToastProvider

Description: 提供全局 toast 能力的 Provider

Parameters:
	children(React.ReactNode): 子节点

Returns:
	element(React.ReactElement): Provider 包裹后的元素
*/
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((params: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    const item: ToastItem = { 
      id, 
      variant: 'default',
      ...params 
    }
    setItems((prev) => [item, ...prev])

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              'rounded-md border px-4 py-3 text-sm shadow-sm',
              t.variant === 'destructive'
                ? 'border-destructive/30 bg-destructive/10 text-foreground'
                : 'border-foreground/15 bg-background text-foreground',
            ].join(' ')}
          >
            <div className="font-medium">{t.title}</div>
            {t.description ? <div className="mt-1 text-foreground/70">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
Function: useToast

Description: 获取 toast 发送函数的 Hook

Parameters:

Returns:
	toastFn((params: Omit<ToastItem, 'id'>) => void): 发送 toast 的函数
*/
export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
