'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Component: SettingsFormSection
 *
 * Description: 通用表单分区组件，支持两列/三列网格布局
 * 用于在 SettingsCard 内部组织表单字段
 */
interface SettingsFormSectionProps {
  /** 列数: 2 或 3，默认 2 */
  columns?: 2 | 3
  /** 子元素 */
  children: React.ReactNode
  /** 额外的 className */
  className?: string
}

export function SettingsFormSection({
  columns = 2,
  children,
  className,
}: SettingsFormSectionProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Component: SettingsFormField
 *
 * Description: 通用表单字段包装组件
 * 提供 Label + 输入控件 + 错误提示的统一布局
 */
interface SettingsFormFieldProps {
  /** 字段标签 */
  label: string
  /** 是否必填 */
  required?: boolean
  /** 错误信息 */
  error?: string
  /** 占据整行 */
  fullWidth?: boolean
  /** 子元素（输入控件） */
  children: React.ReactNode
  /** 额外的 className */
  className?: string
}

export function SettingsFormField({
  label,
  required,
  error,
  fullWidth,
  children,
  className,
}: SettingsFormFieldProps) {
  return (
    <div
      className={cn(
        'space-y-2',
        fullWidth && 'md:col-span-2 lg:col-span-3',
        className,
      )}
    >
      <label
        className={cn(
          'text-sm font-semibold text-[var(--fg)]/70 transition-colors',
          error && 'text-[var(--error)]',
        )}
      >
        {label}
        {required && <span className="text-[var(--error)] ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[var(--error)] animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}
