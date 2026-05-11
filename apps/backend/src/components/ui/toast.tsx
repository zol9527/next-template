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
Function: ToastProvider

Description: 提供全局 toast 能力的 UI 包装 Provider，并处理浏览器兼容性

Parameters:
	children(React.ReactNode): 子节点

Returns:
	element(React.ReactElement): Provider 包裹后的元素
*/
export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = React.useState<ToastItem[]>([])

	const toast = React.useCallback((params: Omit<ToastItem, 'id'>) => {
		const id = createToastId()
		const item: ToastItem = {
			id,
			variant: 'default',
			...params,
		}

		setItems((prev) => [item, ...prev])

		window.setTimeout(() => {
			setItems((prev) => prev.filter((currentItem) => currentItem.id !== id))
		}, 3500)
	}, [])

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			{/* z-[100] 确保在 Dialog (z-50) 之上，右上角提示始终可见 */}
			<div className="fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
				{items.map((item) => (
					<div
						key={item.id}
						className={[
							'rounded-md border px-4 py-3 text-sm shadow-sm',
							item.variant === 'destructive'
								? 'border-destructive/30 bg-destructive/10 text-foreground'
								: 'border-foreground/15 bg-background text-foreground',
						].join(' ')}
					>
						<div className="font-medium">{item.title}</div>
						{item.description ? <div className="mt-1 text-foreground/70">{item.description}</div> : null}
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
	const context = React.useContext(ToastContext)

	if (!context) {
		throw new Error('useToast must be used within ToastProvider')
	}

	return context
}
