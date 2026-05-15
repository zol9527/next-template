/**
 * File: card.tsx
 * Description: Card 组件设计系统封装，支持 Paper Design 的卡片变体
 *
 * 设计规范:
 * - 信息卡片 (info): border + --surface 背景, 无阴影, --radius-md (12px)
 * - 主内容卡片 (main): shadow-card + --surface, --radius-lg (16px), 无边框
 * - 通用: 直接使用 base Card 并应用设计令牌
 */

import * as React from 'react'
import {
  Card as BaseCard,
  CardHeader as BaseCardHeader,
  CardTitle as BaseCardTitle,
  CardDescription as BaseCardDescription,
  CardContent as BaseCardContent,
  CardFooter as BaseCardFooter,
} from '@/components/base/card'
import { cn } from '@/lib/utils'

// ============================================
// Card 变体
// ============================================

export type CardVariant = 'default' | 'info' | 'main'

/**
 * Function: getCardVariantClasses
 *
 * Description: 根据 Paper Design 卡片变体返回对应的样式类名
 *
 * Parameters:
 *   variant(CardVariant): 卡片变体
 *
 * Returns:
 *   string: CSS 类名
 */
function getCardVariantClasses(variant: CardVariant): string {
  const variants: Record<CardVariant, string> = {
    // 默认: 保持 base 样式
    default: '',
    // 信息卡片: border only, 无阴影, --radius-md
    info: 'rounded-[var(--radius-md)] border border-[var(--border-default,_var(--border))] bg-[var(--surface,_var(--background))] shadow-none',
    // 主内容卡片: shadow-card, --radius-lg, 无边框
    main: 'rounded-[var(--radius-lg)] border-0 bg-[var(--surface,_var(--background))] shadow-[var(--shadow-card,_var(--shadow))]',
  }
  return variants[variant]
}

// ============================================
// Card — 卡片容器
// ============================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 卡片视觉变体 */
  variant?: CardVariant
}

/**
 * Function: Card
 *
 * Description: 卡片容器组件，支持 Paper Design 的三种卡片变体
 *
 * Parameters:
 *   variant(CardVariant): 卡片变体，默认 'default'
 *   className(string): 自定义样式
 *
 * Returns:
 *   React.ReactElement: 卡片容器
 */
export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <BaseCard
      className={cn(getCardVariantClasses(variant), className)}
      {...props}
    />
  )
}

// ============================================
// CardHeader — 卡片头部
// ============================================

/**
 * Function: CardHeader
 *
 * Description: 卡片头部容器，支持 flex-row 模式
 */
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <BaseCardHeader className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

// ============================================
// CardTitle — 卡片标题
// ============================================

/**
 * Function: CardTitle
 *
 * Description: 卡片标题，应用 heading-2 (Outfit 600, 15px)
 */
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <BaseCardTitle className={cn('heading-2 text-fg', className)} {...props} />
}

// ============================================
// CardDescription — 卡片描述
// ============================================

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <BaseCardDescription className={cn('text-body-sm text-fg-muted', className)} {...props} />
}

// ============================================
// CardContent — 卡片内容
// ============================================

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <BaseCardContent className={cn('p-6', className)} {...props} />
}

// ============================================
// CardFooter — 卡片底部
// ============================================

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <BaseCardFooter className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
