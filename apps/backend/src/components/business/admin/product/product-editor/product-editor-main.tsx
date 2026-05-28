'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { RichTextEditor } from '@/components/business/admin/rich-text-editor'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import type { ProductFormState } from './types'

// ==================== 属性接口 ====================

/**
 * 商品编辑器左侧主区域属性
 */
interface ProductEditorMainProps {
  /** 当前表单状态 */
  form: ProductFormState
  /** 表单变更回调 */
  onFormChange: (updates: Partial<ProductFormState>) => void
  /** 是否为查看模式 */
  viewing?: boolean
  /** AI 单字段生成回调 */
  onAiFieldGenerate?: (field: string) => void
  /** AI 文本生成功能是否启用 */
  isAiTextEnabled?: boolean
}

// ==================== 组件 ====================

/**
 * Function: ProductEditorMain
 *
 * Description: 商品编辑器左侧主编辑区域。
 *              参考文章编辑器 (EditorMain) 的风格，采用无边框输入 + 分隔线的极简布局。
 *              包含商品名称（大号输入）、营销摘要（文本域）、详细描述（富文本编辑器）。
 *
 * Parameters:
 *     form(ProductFormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *     viewing(boolean): 是否只读模式
 *     onAiFieldGenerate(function): AI 单字段生成回调
 *     isAiTextEnabled(boolean): AI 文本生成功能是否启用
 *
 * Returns:
 *     element(React.ReactElement): 商品主编辑区域 UI
 */
export function ProductEditorMain({
  form,
  onFormChange,
  viewing = false,
  onAiFieldGenerate,
  isAiTextEnabled = false,
}: ProductEditorMainProps) {
  // 标题输入框引用，用于自动聚焦
  const titleRef = React.useRef<HTMLInputElement>(null)

  // 初始加载时自动聚焦到标题输入框
  React.useEffect(() => {
    if (!viewing) {
      titleRef.current?.focus()
    }
  }, [viewing])

  return (
    <div className="flex-1 flex flex-col p-7 space-y-4 overflow-auto">
      {/* ========== 商品名称输入 ========== */}
      <div className="relative">
        <Input
          ref={titleRef}
          value={form.name}
          onChange={(e) => onFormChange({ name: e.target.value })}
          placeholder="输入商品名称..."
          disabled={viewing}
          className={cn(
            'border-0 shadow-none focus-visible:ring-0 pl-0',
            'text-2xl font-semibold placeholder:text-muted-foreground/50',
          )}
        />
        {/* AI 生成按钮 */}
        {isAiTextEnabled && !viewing && onAiFieldGenerate && (
          <button
            onClick={() => onAiFieldGenerate('name')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
            title="AI 生成名称"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}
      </div>

      <Separator />

      {/* ========== 营销摘要输入 ========== */}
      <div className="relative">
        <Textarea
          value={form.summary}
          onChange={(e) => onFormChange({ summary: e.target.value })}
          placeholder="输入商品营销摘要，简单概括核心卖点..."
          rows={2}
          disabled={viewing}
          className={cn(
            'border-0 shadow-none focus-visible:ring-0 pl-0 resize-none',
            'text-sm text-muted-foreground placeholder:text-muted-foreground/50',
          )}
        />
        {/* AI 生成按钮 */}
        {isAiTextEnabled && !viewing && onAiFieldGenerate && (
          <button
            onClick={() => onAiFieldGenerate('summary')}
            className="absolute right-2 top-3 p-1.5 text-muted-foreground hover:text-primary transition-colors"
            title="AI 生成摘要"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}
      </div>

      <Separator />

      {/* ========== 详细描述富文本编辑器 ========== */}
      <div className="flex-1 min-h-0">
        <div className="relative h-full">
          <RichTextEditor
            value={form.description}
            onChange={(html) => onFormChange({ description: html })}
            readOnly={viewing}
          />
          {/* AI 生成按钮 — 悬浮在编辑器右上角 */}
          {isAiTextEnabled && !viewing && onAiFieldGenerate && (
            <button
              onClick={() => onAiFieldGenerate('description')}
              className="absolute right-3 top-3 z-10 p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-background/80"
              title="AI 生成描述"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
