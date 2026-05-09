/**
 * File: semantics.ts
 * Description: 统一的语义化类型定义
 */

// ============================================
// 颜色角色（Color Roles）
// ============================================
/**
 * Type: ColorRole
 *
 * Description: 语义化颜色角色，用于不同场景的色彩表达
 *
 * Options:
 *     primary: 主要交互元素（按钮、链接）
 *     success: 成功状态
 *     warning: 警告状态
 *     error: 错误状态
 *     info: 信息提示
 *     neutral: 中性内容
 */
export type ColorRole =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'

/**
 * Type: AlertStatus
 *
 * Description: 警告组件的状态类型
 *
 * Options:
 *     success: 成功提示
 *     info: 一般信息
 *     warning: 警告提示
 *     error: 错误提示
 *     critical: 严重错误
 */
export type AlertStatus =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'critical'

// ============================================
// 组件变体（Component Variants）
// ============================================
/**
 * Type: ButtonVariant
 *
 * Description: 按钮视觉变体
 *
 * Options:
 *     solid: 实心按钮（默认）
 *     secondary: 次要按钮
 *     destructive: 危险按钮
 *     outline: 描边按钮
 *     ghost: 幽灵按钮（无背景）
 *     link: 链接样式
 */
export type ButtonVariant =
  | 'solid'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'

/**
 * Type: ButtonSize
 *
 * Description: 按钮尺寸
 *
 * Options:
 *     xs: 超小按钮 (h-6)
 *     sm: 小按钮 (h-8)
 *     md: 中等按钮 (h-9)
 *     lg: 大按钮 (h-10)
 *     xl: 超大按钮 (h-11)
 *     icon: 图标按钮 (h-9 w-9)
 */
export type ButtonSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'icon'

/**
 * Type: InputSize
 *
 * Description: 输入框尺寸
 *
 * Options:
 *     sm: 小输入框 (h-8)
 *     md: 中等输入框 (h-9)
 *     lg: 大输入框 (h-10)
 */
export type InputSize =
  | 'sm'
  | 'md'
  | 'lg'

/**
 * Type: ModalSize
 *
 * Description: 对话框尺寸
 *
 * Options:
 *     sm: 小对话框 (max-w-md)
 *     md: 中等对话框 (max-w-lg)
 *     lg: 大对话框 (max-w-2xl)
 *     xl: 超大对话框 (max-w-4xl)
 *     full: 全屏对话框
 */
export type ModalSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'full'

// ============================================
// 间距系统（Spacing System）
// ============================================
/**
 * Type: SpacingToken
 *
 * Description: 间距 token
 *
 * Options:
 *     xs: 超小间距 (4px / 0.25rem)
 *     sm: 小间距 (8px / 0.5rem)
 *     md: 中等间距 (16px / 1rem)
 *     lg: 大间距 (24px / 1.5rem)
 *     xl: 超大间距 (32px / 2rem)
 *     2xl: 2倍超大 (48px / 3rem)
 *     3xl: 3倍超大 (64px / 4rem)
 */
export type SpacingToken =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'

// ============================================
// 字体系统（Typography System）
// ============================================
/**
 * Type: FontSizeToken
 *
 * Description: 字体大小 token
 *
 * Options:
 *     xs: 超小字体 (12px)
 *     sm: 小字体 (14px)
 *     base: 基础字体 (16px)
 *     lg: 大字体 (18px)
 *     xl: 超大字体 (20px)
 *     2xl: 2倍超大 (24px)
 *     3xl: 3倍超大 (30px)
 *     4xl: 4倍超大 (36px)
 */
export type FontSizeToken =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'

/**
 * Type: FontWeightToken
 *
 * Description: 字重 token
 *
 * Options:
 *     light: 细体 (300)
 *     normal: 正常 (400)
 *     medium: 中等 (500)
 *     semibold: 半粗 (600)
 *     bold: 粗体 (700)
 *     extrabold: 超粗 (800)
 */
export type FontWeightToken =
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'

/**
 * Type: LineHeightToken
 *
 * Description: 行高 token
 *
 * Options:
 *     none: 无行高 (1)
 *     tight: 紧凑 (1.25)
 *     normal: 正常 (1.5)
 *     relaxed: 松散 (1.625)
 *     loose: 超松 (2)
 */
export type LineHeightToken =
  | 'none'
  | 'tight'
  | 'normal'
  | 'relaxed'
  | 'loose'

// ============================================
// 圆角系统（Radius System）
// ============================================
/**
 * Type: RadiusToken
 *
 * Description: 圆角 token
 *
 * Options:
 *     sm: 小圆角 (20px)
 *     md: 中等圆角 (22px)
 *     lg: 大圆角 (24px)
 *     xl: 超大圆角 (28px)
 *     2xl: 2倍超大 (32px)
 *     3xl: 3倍超大 (36px)
 *     4xl: 4倍超大 (40px)
 *     full: 完全圆角 (9999px)
 */
export type RadiusToken =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | 'full'

// ============================================
// 阴影系统（Shadow System）
// ============================================
/**
 * Type: ShadowToken
 *
 * Description: 阴影 token
 *
 * Options:
 *     sm: 小阴影
 *     md: 中等阴影
 *     lg: 大阴影
 *     xl: 超大阴影
 *     2xl: 2倍超大阴影
 *     none: 无阴影
 */
export type ShadowToken =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | 'none'

// ============================================
// Z-index 层级（Z-index Scale）
// ============================================
/**
 * Type: ZIndexToken
 *
 * Description: Z-index 层级 token
 *
 * Options:
 *     dropdown: 下拉菜单 (1000)
 *     sticky: 粘性元素 (1020)
 *     fixed: 固定元素 (1030)
 *     modalBackdrop: 模态框背景 (1040)
 *     modal: 模态框 (1050)
 *     popover: 弹出层 (1060)
 *     tooltip: 工具提示 (1070)
 */
export type ZIndexToken =
  | 'dropdown'
  | 'sticky'
  | 'fixed'
  | 'modalBackdrop'
  | 'modal'
  | 'popover'
  | 'tooltip'

// ============================================
// 过渡动画（Transition Duration）
// ============================================
/**
 * Type: TransitionDurationToken
 *
 * Description: 过渡持续时间 token
 *
 * Options:
 *     fast: 快速 (150ms)
 *     base: 基础 (200ms)
 *     slow: 慢速 (300ms)
 *     slower: 超慢 (500ms)
 */
export type TransitionDurationToken =
  | 'fast'
  | 'base'
  | 'slow'
  | 'slower'

// ============================================
// 工具类型（Utility Types）
// ============================================
/**
 * Type: SemanticProps
 *
 * Description: 语义化组件的基础 props
 *
 * Properties:
 *     color(ColorRole): 颜色角色
 *     spacing(SpacingToken): 间距 token
 *     radius(RadiusToken): 圆角 token
 *     shadow(ShadowToken): 阴影 token
 */
export interface SemanticProps {
  color?: ColorRole
  spacing?: SpacingToken
  radius?: RadiusToken
  shadow?: ShadowToken
}

/**
 * Type: StatusConfig
 *
 * Description: 状态配置类型
 *
 * Properties:
 *     label(string): 显示标签
 *     color(ColorRole): 颜色角色
 *     className(string): 自定义类名
 */
export interface StatusConfig {
  label: string
  color: ColorRole
  className?: string
}
