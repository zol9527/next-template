'use client'

import * as React from 'react'

import { RichTextEditor } from '@/components/business/admin/rich-text-editor'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// 从设置面板导入共享类型（避免重复定义）
import type { FormState } from './editor-settings-panel'

/**
 * 编辑器主区域属性
 */
interface EditorMainProps {
  /** 当前表单状态 */
  form: FormState
  /** 表单变更回调 */
  onFormChange: (updates: Partial<FormState>) => void
}

/**
 * Function: EditorMain
 *
 * Description: 文章编辑器左侧主编辑区域，包含标题输入、摘要输入和富文本编辑器
 *
 * Parameters:
 *     form(FormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *
 * Returns:
 *     element(React.ReactElement): 主编辑区域 UI
 */
export function EditorMain({ form, onFormChange }: EditorMainProps) {
  // 标题输入框引用，用于自动聚焦
  const titleRef = React.useRef<HTMLInputElement>(null)

  // 初始加载时自动聚焦到标题输入框
  React.useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="flex-1 flex flex-col p-7 space-y-4 overflow-auto">
      {/* ========== 标题输入 ========== */}
      <Input
        ref={titleRef}
        value={form.title}
        onChange={(e) => onFormChange({ title: e.target.value })}
        placeholder="输入文章标题..."
        className={cn(
          'border-0 shadow-none focus-visible:ring-0 pl-0',
          'text-2xl font-semibold placeholder:text-muted-foreground/50',
        )}
      />

      <Separator />

      {/* ========== 摘要输入 ========== */}
      <Textarea
        value={form.excerpt}
        onChange={(e) => onFormChange({ excerpt: e.target.value })}
        placeholder="输入文章摘要..."
        rows={2}
        className={cn(
          'border-0 shadow-none focus-visible:ring-0 pl-0 resize-none',
          'text-sm text-muted-foreground placeholder:text-muted-foreground/50',
        )}
      />

      <Separator />

      {/* ========== 富文本编辑器 ========== */}
      <div className="flex-1 min-h-0">
        <RichTextEditor
          value={form.content}
          onChange={(html) => onFormChange({ content: html })}
        />
      </div>
    </div>
  )
}
