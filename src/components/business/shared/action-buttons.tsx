/**
 * File: ActionButtons.tsx
 * Description: 操作按钮组组件
 */

'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { ColorRole } from '@/types/ui-component/semantics'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * Type: ActionConfig
 *
 * Description: 单个操作按钮的配置
 *
 * Properties:
 *     icon(LucideIcon): 图标组件
 *     onClick(function): 点击处理函数
 *     label(string): 按钮标签
 *     color(ColorRole): 颜色角色
 *     variant(string): 按钮变体
 *     disabled(boolean): 是否禁用
 */
export interface ActionConfig {
  icon: LucideIcon
  onClick: () => void
  label?: string
  color?: ColorRole
  variant?: 'solid' | 'outline' | 'ghost'
  disabled?: boolean
}

/**
 * Type: ActionButtonsProps
 *
 * Description: 操作按钮组组件的 props
 *
 * Properties:
 *     actions(ActionConfig[]): 操作配置数组
 *     className(string): 自定义样式类名
 */
export interface ActionButtonsProps {
  actions: ActionConfig[]
  className?: string
}

/**
 * Function: ActionButtons
 *
 * Description: 操作按钮组组件，用于展示一行图标按钮
 *
 * Parameters:
 *     props(ActionButtonsProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的按钮组组件
 *
 * Example:
 *     <ActionButtons
 *       actions={[
 *         { icon: Edit, onClick: handleEdit, label: '编辑' },
 *         { icon: Trash, onClick: handleDelete, color: 'error', label: '删除' },
 *       ]}
 *     />
 */
export function ActionButtons({ actions, className }: ActionButtonsProps) {
  return (
    <div className={cn('flex justify-end items-center gap-1.5', className)}>
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <Button
            key={index}
            type="button"
            variant={action.variant || 'ghost'}
            size="sm"
            color={action.color}
            className="h-8 w-8"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        )
      })}
    </div>
  )
}
