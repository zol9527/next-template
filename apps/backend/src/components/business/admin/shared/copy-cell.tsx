'use client'

import * as React from 'react'
import { Copy } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
Function: CopyCell

Description: 可复用的复制单元格组件：点击复制值到剪贴板，带视觉反馈

Parameters:
    value(string): 要复制的值
    label(string): 值的标签名称（用于提示）
    className(string): 可选的额外样式类名

Returns:
    element(React.ReactElement): 复制单元格 UI
*/
export function CopyCell({ value, label, className }: { value: string; label: string; className?: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast({ title: '已复制', description: `${label} 已复制到剪贴板` })
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all',
        'hover:bg-muted/50 group',
        copied && 'bg-success/10 text-success',
        className,
      )}
      onClick={handleCopy}
    >
      <span className="font-mono text-xs truncate max-w-[120px]">{value}</span>
      <Copy className={cn('h-3 w-3 transition-opacity', copied ? 'opacity-100 text-success' : 'opacity-0 group-hover:opacity-50')} />
    </div>
  )
}
