/**
 * File: dialog.tsx
 * Description: Dialog 组件语义化封装，包装 shadcn/ui 基础 Dialog
 */

'use client'

import * as React from 'react'
import {
  Dialog as BaseDialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent as BaseDialogContent,
  DialogHeader as BaseDialogHeader,
  DialogFooter as BaseDialogFooter,
  DialogTitle as BaseDialogTitle,
  DialogDescription as BaseDialogDescription,
} from '@/components/base/dialog'
import { cn } from '@/lib/utils'
import type { ModalSize } from '@/types/ui-component/semantics'

export {
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
} from '@/components/base/dialog'

export { Dialog as BaseDialog } from '@/components/base/dialog'

export type DialogProps = React.ComponentProps<typeof BaseDialog>
export type DialogTriggerProps = React.ComponentProps<typeof DialogTrigger>

export interface DialogContentProps extends Omit<React.ComponentProps<typeof BaseDialogContent>, 'size'> {
  size?: ModalSize
  showCloseButton?: boolean
  /** 是否显示遮罩层背景，默认显示 */
  showOverlay?: boolean
  /** 遮罩层背景样式类名 */
  overlayClassName?: string
  /** 是否禁用开关动画，默认不禁用 */
  disableAnimation?: boolean
}

export type DialogHeaderProps = React.ComponentProps<typeof BaseDialogHeader>
export type DialogFooterProps = React.ComponentProps<typeof BaseDialogFooter>
export type DialogTitleProps = React.ComponentProps<typeof BaseDialogTitle>
export type DialogDescriptionProps = React.ComponentProps<typeof BaseDialogDescription>

export const Dialog = BaseDialog

/**
 * Function: DialogContent
 *
 * Description: 对话框内容组件，支持不同尺寸和关闭按钮
 *
 * Parameters:
 *     className(string): 自定义样式类名
 *     size(ModalSize): 对话框尺寸
 *     showCloseButton(boolean): 是否显示关闭按钮
 *     showOverlay(boolean): 是否显示遮罩层背景
 *     overlayClassName(string): 遮罩层背景样式类名
 *     children(React.ReactNode): 子元素
 *     ref(React.RefObject): 组件引用
 *
 * Returns:
 *     JSX.Element: 对话框内容元素
 */
export const DialogContent = React.memo(
  React.forwardRef<
    React.ElementRef<typeof BaseDialogContent>,
    DialogContentProps
  >(({ className, size = 'md', showCloseButton = true, showOverlay = true, overlayClassName, disableAnimation = false, children, ...props }, ref) => {
    // 缓存尺寸类名计算，避免每次渲染重新计算
    const sizeClassName = React.useMemo(() => sizeToClassName(size), [size])

    return (
      <DialogPortal>
        {showOverlay && (
          <DialogOverlay
            className={cn(
              disableAnimation && 'duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none',
              overlayClassName
            )}
          />
        )}
        <BaseDialogContent
          ref={ref}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
            disableAnimation
              ? 'duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none'
              : 'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            sizeClassName,
            !showCloseButton && '*:data-radix-dialog-close:hidden',
            className
          )}
          {...props}
        >
          {children}
        </BaseDialogContent>
      </DialogPortal>
    )
  })
)
DialogContent.displayName = BaseDialogContent.displayName

export const DialogHeader = BaseDialogHeader
export const DialogFooter = BaseDialogFooter
export const DialogTitle = BaseDialogTitle
export const DialogDescription = BaseDialogDescription

function sizeToClassName(size: ModalSize): string {
  const sizeClassMap: Record<ModalSize, string> = {
    sm: 'max-w-[28rem]',
    md: 'max-w-[32rem]',
    lg: 'max-w-[42rem]',
    xl: 'max-w-[56rem]',
    full: 'max-w-full h-[calc(100vh-2rem)] my-4',
  }
  return sizeClassMap[size]
}
