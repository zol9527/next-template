'use client'

/**
 * FormDatePicker - 表单日期选择器组件
 *
 * 使用独立的年/月/日输入框，让用户直接输入数字
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Function: FormDatePicker
 *
 * Description: 表单日期输入组件，使用年/月/日三个独立输入框
 *
 * Parameters:
 *     value(Date | string | undefined): 当前选中的日期
 *     onChange(function): 日期变更回调，接收 ISO 字符串或 undefined
 *     label(string): 字段标签
 *     description(string): 字段描述/提示信息
 *     required(boolean): 是否必填
 *     disabled(boolean): 是否禁用
 *     className(string): 自定义样式类
 *
 * Returns:
 *     component(JSX.Element): 日期输入组件
 */
export function FormDatePicker({
  value,
  onChange,
  label,
  description,
  required = false,
  disabled = false,
  className,
}: {
  value?: Date | string
  onChange: (date: string | undefined) => void
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
}) {
  // 内部状态管理用户正在输入的值
  const [inputValues, setInputValues] = React.useState({ year: '', month: '', day: '' })

  // 当 value 从外部变化时（如表单重置），同步到内部状态
  React.useEffect(() => {
    if (!value) {
      setInputValues({ year: '', month: '', day: '' })
      return
    }
    const date = typeof value === 'string' ? new Date(value) : value
    setInputValues({
      year: date.getFullYear().toString(),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
    })
  }, [value])

  const { year, month, day } = inputValues

  // 处理输入变化 - 只更新内部状态
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setInputValues(prev => ({ ...prev, year: val }))
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val) {
      const monthNum = Number(val)
      if (monthNum > 12) val = '12'
    }
    setInputValues(prev => ({ ...prev, month: val }))
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val && inputValues.year && inputValues.month) {
      const daysInMonth = new Date(Number(inputValues.year), Number(inputValues.month), 0).getDate()
      const dayNum = Number(val)
      if (dayNum > daysInMonth) val = String(daysInMonth)
    }
    setInputValues(prev => ({ ...prev, day: val }))
  }

  // 失焦时验证并同步到父组件
  const handleYearBlur = () => {
    const y = inputValues.year
    const m = inputValues.month || '01'
    const d = inputValues.day || '01'
    if (y && m && d) {
      const newDate = new Date(Number(y), Number(m) - 1, Number(d))
      if (!isNaN(newDate.getTime())) {
        onChange(newDate.toISOString())
      }
    }
  }

  const handleMonthBlur = () => {
    const y = inputValues.year || new Date().getFullYear().toString()
    let m = inputValues.month
    if (m) {
      const monthNum = Number(m)
      if (monthNum > 12) m = '12'
      if (monthNum < 1 && m.length === 2) m = '01'
    }
    const d = inputValues.day || '01'
    if (y && m && d) {
      const newDate = new Date(Number(y), Number(m) - 1, Number(d))
      if (!isNaN(newDate.getTime())) {
        onChange(newDate.toISOString())
      }
    }
  }

  const handleDayBlur = () => {
    const y = inputValues.year || new Date().getFullYear().toString()
    const m = inputValues.month || '01'
    let d = inputValues.day
    if (d && y && m) {
      const daysInMonth = new Date(Number(y), Number(m), 0).getDate()
      const dayNum = Number(d)
      if (dayNum > daysInMonth) d = String(daysInMonth)
      if (dayNum < 1 && d.length === 2) d = '01'
    }
    if (y && m && d) {
      const newDate = new Date(Number(y), Number(m) - 1, Number(d || 1))
      if (!isNaN(newDate.getTime())) {
        onChange(newDate.toISOString())
      }
    }
  }

  const handleClear = () => {
    onChange(undefined)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label className={cn(required && 'after:content-[\'*\'] after:ml-0.5 after:text-destructive')}>
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {/* 年份输入 */}
        <div className="flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="年"
            value={year}
            onChange={handleYearChange}
            onBlur={handleYearBlur}
            disabled={disabled}
            className="text-center"
            maxLength={4}
          />
        </div>
        <span className="text-muted-foreground">年</span>

        {/* 月份输入 */}
        <div className="flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="月"
            value={month}
            onChange={handleMonthChange}
            onBlur={handleMonthBlur}
            disabled={disabled}
            className="text-center"
            maxLength={2}
          />
        </div>
        <span className="text-muted-foreground">月</span>

        {/* 日期输入 */}
        <div className="flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="日"
            value={day}
            onChange={handleDayChange}
            onBlur={handleDayBlur}
            disabled={disabled}
            className="text-center"
            maxLength={2}
          />
        </div>
        <span className="text-muted-foreground">日</span>

        {/* 清除按钮 */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 px-2"
          >
            清除
          </button>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
