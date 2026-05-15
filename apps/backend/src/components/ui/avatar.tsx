/**
 * File: avatar.tsx
 * Description: Avatar 组件语义化封装，提供渐变背景和尺寸变体
 *
 * 设计规格:
 *   - 圆形: rounded-full (pill)
 *   - 默认尺寸: 32×32px (在表格用户列使用 30×30px)
 *   - Fallback 背景: 线性渐变 135deg，使用色板中的双色渐变
 *   - Fallback 文字: 白色, DM Sans 600, 12-13px
 *   - 渐变色对 (Paper Design):
 *     - amber:   oklab(65.2% 0.168 0.131) → oklab(66.1% 0.038 0.115)
 *     - teal:    oklab(56.5% -0.106 0.029) → oklab(46.9% -0.092 0.025)
 *     - brown:   oklab(66.1% 0.038 0.115) → oklab(55.9% 0.016 0.064)
 *     - orange:  oklab(56.6% 0.192 0.042) → oklab(47.1% 0.156 0.038)
 *     - neutral: #F2F1ED (纯色，无渐变)
 */

'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Avatar 尺寸变体
 */
const avatarSizeVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        /** 小 — 24×24px，用于紧凑列表、评论等 */
        sm: 'h-6 w-6',
        /** 默认 — 32×32px，标准头像 */
        default: 'h-8 w-8',
        /** 表格专用 — 30×30px，用户列头像 */
        table: 'h-[30px] w-[30px]',
        /** 大 — 40×40px，用户详情页 */
        lg: 'h-10 w-10',
        /** 超大 — 48×48px，个人资料等 */
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

/**
 * 渐变色配置 — 用于 Avatar Fallback 背景
 * 每个渐变使用 135deg 方向，色板中的两色渐变
 *
 * 注: oklab 值已转换为接近的 hex 近似值以兼容所有浏览器
 * 如果浏览器支持 oklab，可直接使用 oklab() 函数
 */
const GRADIENT_MAP = {
  /** 琥珀渐变 (暖橙 → 金棕) */
  amber:
    'bg-gradient-to-br from-[#c87a3a] to-[#9a7a4a]',
  /** 青绿渐变 */
  teal:
    'bg-gradient-to-br from-[#2a8a6a] to-[#1a6a5a]',
  /** 棕色渐变 */
  brown:
    'bg-gradient-to-br from-[#9a7a4a] to-[#7a6a4a]',
  /** 橙色渐变 (主色系) */
  orange:
    'bg-gradient-to-br from-[#d96a2a] to-[#b85a22]',
  /** 中性 — 无渐变，纯暖灰背景 */
  neutral:
    'bg-[var(--bg)]',
} as const

type AvatarGradient = keyof typeof GRADIENT_MAP

/**
 * 根据名字生成确定性的渐变色
 * 使用简单哈希确保同一名字始终映射同一颜色
 */
function getGradientFromName(name: string): AvatarGradient {
  const gradients = Object.keys(GRADIENT_MAP) as AvatarGradient[]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    // 简单字符哈希
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

/**
 * Avatar 组件 — 带尺寸变体
 *
 * @example
 * ```tsx
 * <Avatar size="default">
 *   <AvatarImage src="/photo.jpg" alt="用户头像" />
 *   <AvatarFallback gradient="amber">张</AvatarFallback>
 * </Avatar>
 *
 * // 自动根据名字选择渐变色
 * <Avatar size="table">
 *   <AvatarFallback name="张三" />
 * </Avatar>
 * ```
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarSizeVariants>
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarSizeVariants({ size }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * AvatarImage — 头像图片
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

/**
 * AvatarFallback — 头像后备显示（首字母 + 渐变背景）
 *
 * @prop gradient — 手动指定渐变色名 (amber/teal/brown/orange/neutral)
 * @prop name — 传入名字自动选择渐变色 + 提取首字
 */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    /** 渐变色方案，优先级高于 name */
    gradient?: AvatarGradient
    /** 传入名字用于自动选择渐变色 */
    name?: string
  }
>(({ className, gradient, name, children, ...props }, ref) => {
  // 优先使用手动指定的 gradient，否则根据 name 自动选择
  const activeGradient = gradient || (name ? getGradientFromName(name) : 'neutral')

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full',
        'font-[family-name:var(--font-body)] text-[12px] font-semibold leading-none text-white',
        GRADIENT_MAP[activeGradient],
        // neutral 变体文字使用深色而非白色
        activeGradient === 'neutral' && 'text-[var(--fg-secondary)]',
        className
      )}
      {...props}
    >
      {/* 如果没有显式 children，自动从 name 提取首字 */}
      {children ?? (name ? name.charAt(0) : undefined)}
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback, avatarSizeVariants }
export type { AvatarGradient }
