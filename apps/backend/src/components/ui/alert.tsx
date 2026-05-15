/**
 * File: alert.tsx
 * Description: Alert 组件语义化封装，提供符合 Paper Design 的语义色变体
 *
 * 设计规格:
 *   - 圆角: radius-md (12px)
 *   - 布局: flex, gap-2.5 (10px), px-4 (16px)
 *   - 变体 padding: default (py-3/12px), compact (py-2.5/10px)
 *   - 标题: DM Sans 600 13px, --fg
 *   - 描述: DM Sans 400 12px (compact) / 13px (default), --fg-secondary
 *   - 每个变体有专属的背景色、边框色、文字色
 *
 * 变体映射:
 *   - warning:  金棕色调 (--gold / --gold-subtle)
 *   - success:  青绿色调 (--teal / --teal-subtle)
 *   - error:    玫红色调 (--rose / --rose-subtle)
 *   - info:     暖橙色调 (--ds-accent / --ds-accent-subtle)
 *   - neutral:  基础色调 (--border-default)
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Alert 容器变体
 * 基于 Paper Design 警告横幅规格
 */
const alertVariants = cva(
  // 基础样式: flex 布局, radius-md 圆角, 语义色浅底
  'relative flex w-full items-start gap-2.5 rounded-[var(--radius-md)] border px-4 text-sm',
  {
    variants: {
      variant: {
        /** 警告 — 金棕色调 */
        warning:
          'bg-[var(--gold-subtle)] border-[rgba(192,133,50,0.12)] text-[var(--gold)]',

        /** 成功 — 青绿色调 */
        success:
          'bg-[var(--teal-subtle)] border-[rgba(31,138,101,0.12)] text-[var(--teal)]',

        /** 错误 — 玫红色调 */
        error:
          'bg-[var(--rose-subtle)] border-[rgba(207,45,86,0.12)] text-[var(--rose)]',

        /** 信息 — 暖橙色调 */
        info:
          'bg-[var(--ds-accent-subtle)] border-[rgba(245,78,0,0.12)] text-[var(--ds-accent)]',

        /** 中性 — 基础边框色调 */
        neutral:
          'bg-[var(--surface)] border-[var(--border-default)] text-[var(--fg)]',
      },
      size: {
        /** 默认尺寸 — py-3 (12px)，适用于带标题+描述的场景 */
        default: 'py-3',
        /** 紧凑尺寸 — py-2.5 (10px)，适用于纯文字横幅 */
        compact: 'py-2.5 items-center',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'default',
    },
  }
)

/**
 * Alert 组件 — 警告横幅容器
 *
 * @example
 * ```tsx
 * <Alert variant="warning">
 *   <AlertTitle>系统维护通知</AlertTitle>
 *   <AlertDescription>计划于本周六 02:00-04:00 进行系统维护</AlertDescription>
 * </Alert>
 *
 * <Alert variant="success" size="compact">
 *   <AlertDescription>数据备份已完成，共备份 2.3 GB</AlertDescription>
 * </Alert>
 * ```
 */
function Alert({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * AlertTitle — 警告横幅标题
 * DM Sans 600 13px, --fg 颜色（不受容器变体色影响）
 */
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-[family-name:var(--font-body)] text-[13px] font-semibold leading-4 text-[var(--fg)]',
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertDescription — 警告横幅描述文字
 * DM Sans 400 12px, --fg-secondary 颜色
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'font-[family-name:var(--font-body)] text-[12px] font-normal leading-4 text-[var(--fg-secondary)]',
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
