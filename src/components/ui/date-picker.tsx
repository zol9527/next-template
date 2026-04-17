'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * Function: DatePicker
 *
 * Description: 日期选择器组件，支持选择单个日期
 *
 * Parameters:
 *     value(Date | undefined): 当前选中的日期
 *     onChange(function): 日期变更回调
 *     placeholder(string): 占位文本
 *     disabled(boolean): 是否禁用
 *
 * Returns:
 *     element(React.ReactElement): 日期选择器 UI
 */
export function DatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  disabled = false,
  className,
}: {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-12',
            !value && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
