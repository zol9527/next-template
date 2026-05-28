'use client'

import * as React from 'react'

// 导出子组件和类型
export { ProductEditorMain } from './product-editor-main'
export { ProductEditorSettingsPanel } from './product-editor-settings-panel'
export { type ProductFormState, initialProductFormState, type ProductEditorProps } from './types'

import { ProductEditorMain } from './product-editor-main'
import { ProductEditorSettingsPanel } from './product-editor-settings-panel'
import type { ProductEditorProps } from './types'

// ==================== 组件 ====================

/**
 * Function: ProductEditor
 *
 * Description: 商品编辑器主组件，采用左右分栏布局（参考 ArticleEditor）。
 *              左侧为主编辑区域（名称、摘要、详细描述），右侧为设置面板（封面、类型、类目、定价、库存、标签等）。
 *              表单状态由页面组件统一管理，编辑器通过回调通知变更。
 *
 * Parameters:
 *     form(ProductFormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *     viewing(boolean): 是否只读模式
 *     categories(array): 分类列表
 *     ...其他配置属性
 *
 * Returns:
 *     element(React.ReactElement): 商品编辑器 UI
 *
 * Usage:
 * ```tsx
 * const [form, setForm] = React.useState<ProductFormState>(initialProductFormState)
 *
 * <ProductEditor
 *   form={form}
 *   onFormChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
 *   categories={categories}
 *   categoriesLoading={false}
 * />
 * ```
 */
export function ProductEditor({
  form,
  onFormChange,
  viewing = false,
  categories,
  categoriesLoading = false,
  onAiFieldGenerate,
  isAiTextEnabled = false,
  isAiPricingEnabled = false,
  apiMediaUrls,
  getMediaAssetDisplayUrl,
}: ProductEditorProps & {
  /** API 返回的媒体资源 URL 列表（编辑模式） */
  apiMediaUrls?: string[]
  /** 获取媒体资源显示 URL 的工具函数 */
  getMediaAssetDisplayUrl?: (asset: {
    provider: string
    bucket: string
    objectKey: string
    url: string | null
  }) => string
}) {
  return (
    <div className="flex h-full">
      {/* 左侧主编辑区域 */}
      <ProductEditorMain
        form={form}
        onFormChange={onFormChange}
        viewing={viewing}
        onAiFieldGenerate={onAiFieldGenerate}
        isAiTextEnabled={isAiTextEnabled}
      />

      {/* 右侧设置面板 */}
      <ProductEditorSettingsPanel
        form={form}
        onFormChange={onFormChange}
        categories={categories}
        categoriesLoading={categoriesLoading}
        viewing={viewing}
        onAiFieldGenerate={onAiFieldGenerate}
        isAiTextEnabled={isAiTextEnabled}
        isAiPricingEnabled={isAiPricingEnabled}
        apiMediaUrls={apiMediaUrls}
        getMediaAssetDisplayUrl={getMediaAssetDisplayUrl}
      />
    </div>
  )
}
