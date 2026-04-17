'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface CopyCellProps {
  /** 要复制的完整值 */
  value?: string
  /** 显示的截断值（可选，默认显示前8个字符） */
  displayValue?: string
  /** 标签文本，用于 toast 提示 */
  label?: string
  /** 截断显示的长度（默认 8） */
  truncateLength?: number
  /** 额外的类名 */
  className?: string
}

/**
Function: CopyCell

Description: 可点击复制的单元格组件，点击后复制值到剪贴板并显示 toast 提醒

Parameters:
    value(string): 要复制的完整值
    displayValue(string): 自定义显示的文本（可选）
    label(string): 标签文本，用于 toast 提示（默认为"内容"）
    truncateLength(number): 截断显示的长度（默认 8）
    className(string): 额外的 CSS 类名

Returns:
    JSX.Element: 可点击复制的单元格元素
*/
export function CopyCell({
  value = '',
  displayValue,
  label = '内容',
  truncateLength = 8,
  className,
}: CopyCellProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({
        title: '已复制',
        description: `${label}已复制到剪贴板`,
      })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive',
      })
    }
  }

  const defaultDisplayValue = value && value.length > truncateLength
    ? `${value.slice(0, truncateLength)}...`
    : (value || '-')

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-mono hover:bg-accent hover:text-accent-foreground rounded px-1.5 py-0.5 transition-colors cursor-pointer group',
        className
      )}
      title={value ? `点击复制：${value}` : ''}
    >
      <span className="min-w-0 truncate">{displayValue ?? defaultDisplayValue}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity" />
      )}
    </button>
  )
}
