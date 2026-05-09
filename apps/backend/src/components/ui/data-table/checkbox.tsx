'use client'

import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'

interface DataTableCheckboxProps {
  checked: boolean | 'indeterminate'
  onChange?: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

/**
Function: DataTableCheckbox

Description: 数据表格复选框组件：用于行选择

Parameters:
    checked(boolean | 'indeterminate'): 是否选中或半选
    onChange(function): 变化回调
    disabled(boolean): 是否禁用
    ariaLabel(string): 无障碍标签

Returns:
    element(React.ReactElement): 复选框 UI
*/
export function DataTableCheckbox({
  checked = false,
  onChange,
  disabled = false,
  ariaLabel = '选择行',
}: DataTableCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className="translate-y-[2px]"
    />
  )
}
