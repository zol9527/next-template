/**
 * File: Button.tsx
 * Description: 语义化按钮组件，封装 shadcn/ui 基础按钮
 */

'use client'

import * as React from 'react'
import { Button as BaseButton, buttonVariants } from '@/components/base/button'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ButtonSize, ButtonVariant, ColorRole } from '@/types/ui-component/semantics'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/**
 * Type: ButtonProps
 *
 * Description: 语义化按钮组件的 props
 *
 * Properties:
 *     variant(ButtonVariant | ColorRole): 按钮变体或颜色角色
 *     size(ButtonSize): 按钮尺寸
 *     color(ColorRole): 颜色角色（当 variant 为 'solid' 时使用）
 *     asChild(boolean): 是否作为子组件渲染
 *     children(React.ReactNode): 按钮内容
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant' | 'size'> {
  asChild?: boolean
  color?: ColorRole
  size?: ButtonSize
  variant?: ButtonVariant | ColorRole
}

/**
 * Type: ButtonRef
 *
 * Description: 按钮组件的 ref 类型
 */
type ButtonRef = React.ComponentRef<typeof BaseButton>

// ============================================
// 组件实现（Component Implementation）
// ============================================

/**
 * Function: Button
 *
 * Description: 语义化按钮组件，支持颜色角色和尺寸变体
 *
 * Parameters:
 *     props(ButtonProps): 按钮配置
 *     ref(ButtonRef): 按钮引用
 *
 * Returns:
 *     React.ReactElement: 渲染后的按钮组件
 *
 * Example:
 *     // 基础用法
 *     <Button>点击我</Button>
 *
 *     // 使用颜色角色
 *     <Button color="success">确认</Button>
 *     <Button color="error">删除</Button>
 *
 *     // 使用尺寸
 *     <Button size="lg">大按钮</Button>
 *
 *     // 使用变体
 *     <Button variant="outline">描边按钮</Button>
 */
const Button = React.memo(
  React.forwardRef<ButtonRef, ButtonProps>(
    ({ className, variant = 'solid', size = 'md', color, asChild = false, ...props }, ref) => {
      // 缓存颜色角色检查结果
      const variantIsColorRole = React.useMemo(
        () => isColorRole(variant),
        [variant]
      )

      // 缓存最终变体和类名计算
      const { finalVariant, finalClassName } = React.useMemo(() => {
        let resultVariant: VariantProps<typeof buttonVariants>['variant'] = 'default'
        const classes: string[] = []

        // 如果 variant 是颜色角色，转换为对应的样式
        if (variantIsColorRole) {
          resultVariant = 'default'
          classes.push(colorToClassName(variant as ColorRole))
        } else if (variant === 'solid' || variant === 'outline' || variant === 'ghost' || variant === 'link' || variant === 'secondary' || variant === 'destructive') {
          // 映射语义化变体到 shadcn 变体
          resultVariant = VARIANT_MAP[variant]

          // 危险变体: 注入 Paper Design 的 subtle 风格
          if (variant === 'destructive') {
            classes.push(DESTRUCTIVE_OVERRIDE)
          }
        }

        // 如果同时指定了 color 和 variant
        if (color && !variantIsColorRole) {
          classes.push(colorToClassName(color))
        }

        return { finalVariant: resultVariant, finalClassName: cn(...classes, className) }
      }, [variant, variantIsColorRole, color, className])

      // 获取尺寸配置: base 尺寸 + 覆盖类名
      const sizeConfig = SIZE_MAP[size]

      return (
        <BaseButton
          ref={ref}
          variant={finalVariant}
          size={sizeConfig.base}
          className={cn(sizeConfig.override, finalClassName)}
          asChild={asChild}
          {...props}
        />
      )
    }
  )
)

// ============================================
// 辅助函数（Helper Functions）
// ============================================

/**
 * Function: COLOR_ROLES
 *
 * Description: 颜色角色集合，用于类型检查
 */
const COLOR_ROLES = new Set(['primary', 'success', 'warning', 'error', 'info', 'neutral'] as const)

/**
 * Function: isColorRole
 *
 * Description: 检查值是否为颜色角色
 *
 * Parameters:
 *     value(unknown): 待检查的值
 *
 * Returns:
 *     boolean: 是否为颜色角色
 */
function isColorRole(value: unknown): value is ColorRole {
  return typeof value === 'string' && COLOR_ROLES.has(value as ColorRole)
}

/**
 * Function: VARIANT_MAP
 *
 * Description: 变体映射表，将语义化变体映射到 shadcn 变体
 *
 * 注意: destructive 映射到 'outline'，随后通过 SIZE_OVERRIDE 注入
 * Paper Design 风格的 subtle 玫红底 + 玫红边框
 */
const VARIANT_MAP = {
  solid: 'default',
  default: 'default',
  destructive: 'outline',
  outline: 'outline',
  secondary: 'secondary',
  ghost: 'ghost',
  link: 'link',
} as const

/**
 * Function: SIZE_MAP
 *
 * Description: 尺寸映射表，将语义化尺寸映射到 shadcn 尺寸 + 覆盖类名
 *
 * Paper Design 按钮规范:
 *   - md: 高度 32px, 水平内边距 20px, gap 6px
 *   - sm: 高度 30px, 水平内边距 16px
 *   - icon: 34×34px
 *   - 圆角统一 8px (--radius-sm)
 */
const SIZE_MAP: Record<ButtonSize, { base: 'default' | 'sm' | 'lg' | 'icon'; override: string }> = {
  xs: { base: 'default', override: 'h-6 px-2 text-xs gap-1' },
  sm: { base: 'sm', override: '' },
  md: { base: 'default', override: 'h-8 px-5 gap-1.5' },
  lg: { base: 'lg', override: 'h-10 px-6 gap-1.5' },
  xl: { base: 'default', override: 'h-11 px-7 gap-1.5 text-base' },
  icon: { base: 'icon', override: 'size-[34px]' },
}

/**
 * Function: DESTRUCTIVE_OVERRIDE
 *
 * Description: 危险按钮的样式覆盖
 * Paper Design: subtle 玫红底 (#CF2D5614) + 玫红边框 (#CF2D5633) + 玫红文字
 * 与 base 的 solid destructive 不同，Paper 的危险按钮是 outline 风格
 */
const DESTRUCTIVE_OVERRIDE =
  'bg-[var(--rose-subtle)] border-[var(--rose)]/20 text-[var(--rose)] hover:bg-[var(--rose-subtle)]/80'

/**
 * Function: COLOR_CLASS_MAP
 *
 * Description: 颜色类名映射表，将颜色角色转换为 Tailwind 类名
 */
const COLOR_CLASS_MAP: Record<ColorRole, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  error: 'bg-error text-error-foreground hover:bg-error/90',
  info: 'bg-info text-info-foreground hover:bg-info/90',
  neutral: 'bg-neutral text-neutral-foreground hover:bg-neutral/90',
}

/**
 * Function: colorToClassName
 *
 * Description: 将颜色角色转换为 Tailwind 类名
 *
 * Parameters:
 *     color(ColorRole): 颜色角色
 *
 * Returns:
 *     string: Tailwind 类名字符串
 */
function colorToClassName(color: ColorRole): string {
  return COLOR_CLASS_MAP[color]
}

// ============================================
// 导出（Exports）
// ============================================

Button.displayName = 'Button'

export { Button, buttonVariants }
