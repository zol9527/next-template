'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/**
 * Function: ShopFilterDropdown
 *
 * Description: 商城管理页面筛选下拉按钮组件
 *
 * 设计规范:
 *   - 高度: 32px (h-8)
 *   - 背景: bg-surface
 *   - 边框: border border-border-default
 *   - 圆角: rounded-lg (8px)
 *   - 文字: text-body-sm (DM Sans, 12px)
 *   - 下拉箭头: 自定义 chevron
 *
 * Parameters:
 *   value(string): 当前选中值
 *   onValueChange((value: string) => void): 选中值变化回调
 *   placeholder(string): 占位文本
 *   options(Option[]): 选项列表
 *   label(string): 选项分组标签
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 筛选下拉按钮
 */
interface Option {
  /** 选项值 */
  value: string
  /** 选项标签 */
  label: string
}

interface ShopFilterDropdownProps {
  /** 当前选中值 */
  value: string
  /** 选中值变化回调 */
  onValueChange: (value: string) => void
  /** 占位文本 */
  placeholder?: string
  /** 选项列表 */
  options: Option[]
  /** 选项分组标签 */
  label?: string
  /** 触发器宽度 */
  triggerWidth?: string
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopFilterDropdown({
  value,
  onValueChange,
  placeholder = '选择...',
  options,
  label,
  triggerWidth = 'w-[130px]',
  className,
}: ShopFilterDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          // 尺寸
          triggerWidth,
          'h-8',
          // 样式
          'bg-surface border border-border-default rounded-lg',
          // 文字
          'text-body-sm text-fg-secondary',
          // 悬停效果
          'hover:border-border-medium',
          // 聚焦样式
          'focus-visible:ring-1 focus-visible:ring-primary/30',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent className="bg-surface border border-border-default rounded-lg shadow-lg">
        {label && (
          <>
            <SelectGroup>
              <SelectLabel className="text-caption text-fg-muted">
                {label}
              </SelectLabel>
            </SelectGroup>
            <Separator className="my-1" />
          </>
        )}
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-body-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
