/**
 * 商品编辑器共享类型定义
 *
 * 包含商品编辑器所有可编辑字段的类型定义、初始状态和回调接口。
 * 页面组件持有状态，通过 props 传递给编辑器子组件。
 */
import type { AdminProductKind, AdminProductStatus } from '@/plugins/ecommerce/contracts/admin-products.dto'

// ==================== 表单状态类型 ====================

/**
 * 商品编辑器表单状态
 *
 * 包含创建/编辑商品时所有可编辑字段。
 * 页面组件通过 useState 持有此状态，通过 onFormChange 回调通知子组件变更。
 */
export type ProductFormState = {
  /** 商品名称 */
  name: string
  /** 营销摘要 */
  summary: string
  /** 详细图文描述（HTML） */
  description: string
  /** 商品类型：course(在线课程) / certificate(专业证书) */
  kind: AdminProductKind
  /** 销售价格（字符串格式，支持小数） */
  priceAmount: string
  /** 划线原价（字符串格式，可选） */
  originalPriceAmount: string
  /** 库存数量（null 表示无限制） */
  stockQuantity: number | null
  /** 是否精选推荐 */
  isFeatured: boolean
  /** 搜索标签列表 */
  tags: string[]
  /** 服务保障选项（至少2项，最多4项） */
  serviceGuarantees: string[]
  /** 所属类目 ID 列表 */
  categoryIds: string[]
  /** 封面图资源 ID */
  coverAssetId: string
  /** 封面图显示 URL */
  coverUrl: string
  /** API 返回的媒体资源 ID 列表（编辑模式） */
  mediaAssetIds: string[]
  /** 新添加的媒体资源 ID 列表 */
  newMediaAssetIds: string[]
  /** 新添加的媒体资源 URL 列表（与 newMediaAssetIds 一一对应） */
  newMediaUrlList: string[]
  /** 已删除的 API 媒体资源索引集合 */
  deletedApiMediaIndices: Set<number>
  /** 商品当前状态（编辑模式下从 API 加载） */
  productStatus: AdminProductStatus | null
}

// ==================== 初始状态 ====================

/**
 * 新建商品时的默认表单状态
 */
export const initialProductFormState: ProductFormState = {
  name: '',
  summary: '',
  description: '',
  kind: 'course',
  priceAmount: '',
  originalPriceAmount: '',
  stockQuantity: null,
  isFeatured: false,
  tags: [],
  serviceGuarantees: ['正品保障'],
  categoryIds: [],
  coverAssetId: '',
  coverUrl: '',
  mediaAssetIds: [],
  newMediaAssetIds: [],
  newMediaUrlList: [],
  deletedApiMediaIndices: new Set(),
  productStatus: null,
}

// ==================== 编辑器属性接口 ====================

/**
 * 编辑器主组件属性
 *
 * 页面组件持有 form 状态并通过 props 传递给编辑器
 */
export interface ProductEditorProps {
  /** 当前表单状态 */
  form: ProductFormState
  /** 表单变更回调，将变更合并到父组件的状态中 */
  onFormChange: (updates: Partial<ProductFormState>) => void
  /** 是否为查看模式（只读） */
  viewing?: boolean
  /** 分类列表（从页面组件传入） */
  categories: Array<{ id: string; name: string }>
  /** 分类列表是否加载中 */
  categoriesLoading: boolean
  /** AI 单字段生成回调（可选） */
  onAiFieldGenerate?: (field: string) => void
  /** AI 文本生成功能是否启用 */
  isAiTextEnabled?: boolean
  /** AI 价格建议功能是否启用 */
  isAiPricingEnabled?: boolean
}
