'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'

/**
 * 分类行内表单组件的属性接口
 *
 * 用于在分类列表顶部或行内创建/编辑分类时使用，
 * 表单设计紧凑，最多占两行，适合侧边栏面板场景。
 */
interface CategoryInlineFormProps {
  /** 编辑模式时传入的分类数据，不传则表示新建模式 */
  category?: AdminBlogCategory
  /** 提交回调，将表单数据传递给父组件处理 */
  onSubmit: (data: { name: string; slug?: string; description?: string }) => void
  /** 取消回调，关闭表单 */
  onCancel: () => void
  /** 是否正在提交中 */
  isSubmitting?: boolean
}

/**
 * 分类行内表单组件
 *
 * 紧凑的行内表单，支持新建和编辑两种模式：
 * - 新建模式：所有字段为空
 * - 编辑模式：预填充 category 数据
 *
 * 表单包含：
 * - 名称（必填）
 * - 标识 / slug（可选，新建时自动生成）
 * - 描述（可选）
 * - 确认 / 取消按钮
 */
export function CategoryInlineForm({ category, onSubmit, onCancel, isSubmitting }: CategoryInlineFormProps) {
  /** 分类名称状态 */
  const [name, setName] = React.useState(category?.name ?? '')
  /** 分类标识（slug）状态 */
  const [slug, setSlug] = React.useState(category?.slug ?? '')
  /** 分类描述状态 */
  const [description, setDescription] = React.useState(category?.description ?? '')

  /** 名称输入框引用，用于自动聚焦 */
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  // 初始化时自动聚焦名称输入框
  React.useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  /**
   * 表单提交处理
   * 校验名称非空后调用 onSubmit 回调
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const trimmedSlug = slug.trim()
    const trimmedDescription = description.trim()

    onSubmit({
      name: trimmedName,
      // 仅在用户手动输入了 slug 时才传递，否则让后端自动生成
      ...(trimmedSlug ? { slug: trimmedSlug } : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    })
  }

  /**
   * 键盘事件处理
   * Escape 键取消表单编辑
   */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <form
      className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-2"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      {/* 第一行：名称输入 + 确认/取消按钮 */}
      <div className="flex items-center gap-1.5">
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名称"
          className="h-7 flex-1 text-sm"
          disabled={isSubmitting}
          required
        />
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="标识"
          className="h-7 flex-1 text-sm"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          variant="solid"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isSubmitting || !name.trim()}
        >
          确认
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
      </div>

      {/* 第二行：描述输入（可选） */}
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="描述（可选）"
        className="h-7 text-sm"
        disabled={isSubmitting}
      />
    </form>
  )
}
