/**
 * File: dialog.tsx
 * Description: Dialog 组件语义化封装，提供符合 Paper Design 的对话框样式
 *
 * 设计规格 (Paper Design "对话框 · Dialog / Modal"):
 *   - 容器: radius-lg (16px), shadow-card, 白色背景, overflow-hidden
 *   - 头部: pt-5 (20px), px-6 (24px), flex items-center justify-between
 *   - 内容: pt-3 (12px), px-6 (24px), pb-5 (20px)
 *   - 底部: py-4 (16px), px-6 (24px), gap-2 (8px), border-top border-default
 *   - 标题: Outfit 600 18px, --fg
 *   - 描述: DM Sans 400 13px, --fg-secondary
 *   - 关闭按钮: 28×28px 图标按钮, 右上角
 *   - 遮罩: rgba(38,37,30,0.3) + backdrop-blur(2px)
 */

'use client'

import * as React from 'react'
import {
  Dialog as BaseDialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
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
 * DialogContent — 对话框内容容器
 *
 * Paper Design 规格:
 *   - 圆角: 16px (radius-lg)
 *   - 阴影: shadow-card
 *   - 布局: flex-col, gap-0 (由子组件自带间距)
 *   - 默认尺寸 md = max-w-[32rem] (512px)
 *
 * @example
 * ```tsx
 * <Dialog>
 *   <DialogTrigger asChild><Button>打开</Button></DialogTrigger>
 *   <DialogContent size="md">
 *     <DialogHeader>
 *       <DialogTitle>退出登录</DialogTitle>
 *       <DialogDescription>确定要退出登录吗？</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <Button variant="secondary">取消</Button>
 *       <Button variant="destructive">退出登录</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export const DialogContent = React.memo(
  React.forwardRef<
    React.ElementRef<typeof BaseDialogContent>,
    DialogContentProps
  >(({ className, size = 'md', showCloseButton = true, showOverlay = true, overlayClassName, disableAnimation = false, children, ...props }, ref) => {
    // 缓存尺寸类名计算
    const sizeClassName = React.useMemo(() => sizeToClassName(size), [size])

    return (
      <DialogPortal>
        {showOverlay && (
          <DialogOverlay
            className={cn(
              // Paper Design: 遮罩层使用 rgba(38,37,30,0.3) + backdrop-blur(2px)
              'bg-[rgba(38,37,30,0.3)] backdrop-blur-[2px]',
              disableAnimation && 'duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none',
              overlayClassName
            )}
          />
        )}
        <BaseDialogContent
          ref={ref}
          className={cn(
            // Paper Design 核心样式: flex-column, gap-0, 无默认 padding, radius-16px, shadow-card
            'fixed left-[50%] top-[50%] z-50 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden border-0 bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]',
            // 动画
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
          {/* 关闭按钮: 28×28px 图标按钮, 右上角 */}
          {showCloseButton && (
            <DialogClose className="absolute right-4 top-[10px] flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--fg)] focus:outline-none">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
              <span className="sr-only">关闭</span>
            </DialogClose>
          )}
        </BaseDialogContent>
      </DialogPortal>
    )
  })
)
DialogContent.displayName = 'DialogContent'

/**
 * DialogHeader — 对话框头部
 * Paper: pt-5 (20px), px-6 (24px), flex items-center justify-between
 */
export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between pt-5 px-6',
      className
    )}
    {...props}
  />
))
DialogHeader.displayName = 'DialogHeader'

/**
 * DialogFooter — 对话框底部操作区
 * Paper: py-4 (16px), px-6 (24px), gap-2 (8px), border-top border-default, items-center justify-end
 */
export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end gap-2 border-t border-[var(--border-default)] py-4 px-6',
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = 'DialogFooter'

/**
 * DialogTitle — 对话框标题
 * Paper: Outfit 600 18px, --fg
 */
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof BaseDialogTitle>,
  React.ComponentPropsWithoutRef<typeof BaseDialogTitle>
>(({ className, ...props }, ref) => (
  <BaseDialogTitle
    ref={ref}
    className={cn(
      'font-[family-name:var(--font-display)] text-[18px] font-semibold leading-[1.2] text-[var(--fg)]',
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = BaseDialogTitle.displayName

/**
 * DialogDescription — 对话框描述
 * Paper: pt-3 (12px), px-6 (24px), pb-5 (20px), DM Sans 400 13px, --fg-secondary
 */
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof BaseDialogDescription>,
  React.ComponentPropsWithoutRef<typeof BaseDialogDescription>
>(({ className, ...props }, ref) => (
  <BaseDialogDescription
    ref={ref}
    className={cn(
      'px-6 pt-3 pb-5 font-[family-name:var(--font-body)] text-[13px] font-normal leading-[1.5] text-[var(--fg-secondary)]',
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = BaseDialogDescription.displayName

/**
 * 尺寸映射
 * Paper Design: 默认 md = 400px 宽度
 * sm 用于确认对话框, md 用于标准对话框, lg 用于表单, xl 用于大型内容
 */
function sizeToClassName(size: ModalSize): string {
  const sizeClassMap: Record<ModalSize, string> = {
    sm: 'max-w-[28rem]',   // 448px — 确认对话框
    md: 'max-w-[26rem]',   // 416px — 标准对话框 (Paper 默认 ~400px)
    lg: 'max-w-[42rem]',   // 672px — 表单对话框
    xl: 'max-w-[56rem]',   // 896px — 大型内容
    full: 'max-w-full h-[calc(100vh-2rem)] my-4',
  }
  return sizeClassMap[size]
}
