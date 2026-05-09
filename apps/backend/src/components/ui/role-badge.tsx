/**
 * File: role-badge.tsx
 * Description: 角色标签组件，用于权限管理页面展示角色类型
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Type: RoleBadgeVariant
 *
 * Description: 角色标签变体类型
 *
 * Options:
 *     admin: 管理员角色（最高权限）
 *     moderator: 版主角色（中等权限）
 *     user: 普通用户角色（基础权限）
 *     custom: 自定义角色
 */
export type RoleBadgeVariant = 'admin' | 'moderator' | 'user' | 'custom'

/**
 * Type: RoleBadgeProps
 *
 * Description: 角色标签组件的 props
 *
 * Properties:
 *     variant(RoleBadgeVariant): 角色类型变体
 *     className(string): 自定义样式类名
 *     children(React.ReactNode): 标签内容
 */
export interface RoleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: RoleBadgeVariant
}

/**
 * Variable: VARIANT_STYLES
 *
 * Description: 角色标签变体样式映射
 */
const VARIANT_STYLES: Record<RoleBadgeVariant, string> = {
  admin: 'bg-linear-to-r from-warning/20 to-warning/10 text-warning border-warning/30 shadow-warning/10',
  moderator: 'bg-linear-to-r from-info/20 to-info/10 text-info border-info/30 shadow-info/10',
  user: 'bg-linear-to-r from-success/20 to-success/10 text-success border-success/30 shadow-success/10',
  custom: 'bg-linear-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-primary/10',
}

/**
 * Variable: VARIANT_LABELS
 *
 * Description: 角色标签默认文本映射
 */
const VARIANT_LABELS: Record<RoleBadgeVariant, string> = {
  admin: 'ADMIN',
  moderator: 'MOD',
  user: 'USER',
  custom: 'CUSTOM',
}

/**
 * Function: RoleBadge
 *
 * Description: 角色标签组件：用于展示角色类型，带有渐变背景和阴影效果
 *
 * Parameters:
 *     variant(RoleBadgeVariant): 角色类型变体，默认 'custom'
 *     className(string): 自定义样式类名
 *     children(React.ReactNode): 标签内容，默认使用变体对应的大写文本
 *
 * Returns:
 *     element(React.ReactElement): 角色标签元素
 *
 * Example:
 *     // 基础用法
 *     <RoleBadge variant="admin" />
 *
 *     // 自定义文本
 *     <RoleBadge variant="custom">SUPER</RoleBadge>
 */
export function RoleBadge({ variant = 'custom', className = '', children, ...props }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'text-[10px] px-1.5 py-0.5 rounded-md border',
        'uppercase tracking-wider font-bold',
        'shadow-sm',
        'transition-all duration-300',
        'hover:scale-105 hover:shadow-md',
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {children || VARIANT_LABELS[variant]}
    </span>
  )
}

/**
 * Function: getRoleBadgeVariant
 *
 * Description: 根据角色名称获取对应的标签变体
 *
 * Parameters:
 *     roleName(string): 角色名称
 *
 * Returns:
 *     variant(RoleBadgeVariant): 对应的标签变体
 *
 * Example:
 *     getRoleBadgeVariant('admin') // 'admin'
 *     getRoleBadgeVariant('editor') // 'custom'
 */
export function getRoleBadgeVariant(roleName: string): RoleBadgeVariant {
  const name = roleName.toLowerCase()
  if (name === 'admin' || name === 'superadmin' || name === 'super_admin') {
    return 'admin'
  }
  if (name === 'moderator' || name === 'mod' || name === 'editor') {
    return 'moderator'
  }
  if (name === 'user' || name === 'member' || name === 'guest') {
    return 'user'
  }
  return 'custom'
}
