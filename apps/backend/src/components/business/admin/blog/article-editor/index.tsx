'use client'

import * as React from 'react'

import type { AdminArticleStatus } from '@/contracts/dtos/admin/blog/articles.dto'

// 导出子组件
import { EditorMain } from './editor-main'
import { EditorSettingsPanel } from './editor-settings-panel'

// ==================== 共享类型导出 ====================

/**
 * 表单状态类型
 * 包含文章编辑器所有可编辑字段，供页面组件使用
 */
export type FormState = {
  /** 文章标题 */
  title: string
  /** URL 友好标识符 */
  slug: string
  /** 文章摘要 */
  excerpt: string
  /** 文章正文（HTML） */
  content: string
  /** 封面图片 URL */
  coverImage: string
  /** 分类 ID */
  categoryId: string
  /** SEO Meta 标题 */
  metaTitle: string
  /** SEO Meta 描述 */
  metaDescription: string
  /** OG 图片 URL */
  ogImage: string
  /** 关联标签 ID 列表 */
  tagIds: string[]
  /** 文章状态 */
  status: AdminArticleStatus
}

// ==================== 初始状态 ====================

/**
 * 初始表单状态常量
 * 新建文章时的默认值，编辑模式下由页面组件覆盖
 */
export const initialFormState: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  categoryId: '',
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
  tagIds: [],
  status: 'DRAFT' as AdminArticleStatus,
}

// ==================== 组件属性 ====================

/**
 * 文章编辑器属性
 * 页面组件负责持有 form 状态并通过 props 传递给编辑器
 */
interface ArticleEditorProps {
  /** 当前表单状态 */
  form: FormState
  /** 表单变更回调，将变更合并到父组件的状态中 */
  onFormChange: (updates: Partial<FormState>) => void
}

// ==================== 组件 ====================

/**
 * Function: ArticleEditor
 *
 * Description: 文章编辑器主组件，采用左右分栏布局。
 *              左侧为主编辑区域（标题、摘要、富文本），右侧为设置面板（封面、分类、标签、SEO 等）。
 *              表单状态由页面组件统一管理，编辑器通过回调通知变更。
 *
 * Parameters:
 *     form(FormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *
 * Returns:
 *     element(React.ReactElement): 文章编辑器 UI
 *
 * Usage:
 * ```tsx
 * const [form, setForm] = React.useState<FormState>(initialFormState)
 *
 * <ArticleEditor
 *   form={form}
 *   onFormChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
 * />
 * ```
 */
export function ArticleEditor({ form, onFormChange }: ArticleEditorProps) {
  return (
    <div className="flex h-full">
      {/* 左侧主编辑区域 */}
      <EditorMain form={form} onFormChange={onFormChange} />

      {/* 右侧设置面板 */}
      <EditorSettingsPanel form={form} onFormChange={onFormChange} />
    </div>
  )
}
