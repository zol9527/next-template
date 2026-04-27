/**
 * 插件元数据定义
 *
 * 所有已注册插件的元信息、环境变量映射和默认配置。
 * Install（安装）状态由环境变量决定，编译时生效。
 * Activate（激活）状态由数据库决定，运行时生效。
 */

/**
 * 插件名称联合类型
 */
export type PluginName = 'wechat' | 'ecommerce' | 'promotion'

/**
 * 插件图标名称（对应 Lucide React 组件名）
 */
export type PluginIconName =
  | 'MessageCircle'     // 微信
  | 'ShoppingBag'        // 电商
  | 'TrendingUp'         // 分销推广

/**
 * 插件元数据定义
 */
export interface PluginDefinition {
  /** 插件唯一标识 */
  name: PluginName
  /** 显示名称 */
  label: string
  /** 插件描述 */
  description: string
  /** Lucide 图标组件名 */
  icon: PluginIconName
  /** 对应的环境变量名 */
  envKey: string
  /** 默认激活状态（首次安装时写入数据库） */
  defaultActive: boolean
}

/**
 * 所有已注册插件的元数据映射
 */
export const PLUGIN_DEFINITIONS: Record<PluginName, PluginDefinition> = {
  wechat: {
    name: 'wechat',
    label: '微信插件',
    description: '微信生态集成（小程序登录 / 微信支付 / 轮播图管理）',
    icon: 'MessageCircle',
    envKey: 'PLUGIN_WECHAT',
    defaultActive: true,
  },
  ecommerce: {
    name: 'ecommerce',
    label: '电商插件',
    description: '电商功能（商品 / 订单 / 分类 / 优惠券 / 支付）',
    icon: 'ShoppingBag',
    envKey: 'PLUGIN_ECOMMERCE',
    defaultActive: true,
  },
  promotion: {
    name: 'promotion',
    label: '分销推广插件',
    description: '分销推广（推广员 / 佣金 / 结算 / 等级体系）',
    icon: 'TrendingUp',
    envKey: 'PLUGIN_PROMOTION',
    defaultActive: true,
  },
} as const

/**
 * 所有插件名称列表
 */
export const ALL_PLUGIN_NAMES: PluginName[] = Object.keys(
  PLUGIN_DEFINITIONS,
) as PluginName[]

/**
 * Function: isPluginInstalled
 *
 * Description: 检查指定插件是否已安装（通过环境变量判断，编译时决定）。
 *   安装状态取决于 PLUGIN_* 环境变量是否设置为 'true'。
 *   只有已安装的插件才能被激活。
 *
 * Parameters:
 *   pluginName(PluginName): 插件名称
 *
 * Returns:
 *   boolean: 插件是否已安装
 */
export function isPluginInstalled(pluginName: PluginName): boolean {
  const definition = PLUGIN_DEFINITIONS[pluginName]
  if (!definition) return false
  return process.env[definition.envKey] === 'true'
}

/**
 * Function: getInstalledPlugins
 *
 * Description: 获取所有已安装的插件列表（环境变量为 true 的插件）。
 *
 * Returns:
 *   installedPlugins(PluginName[]): 已安装的插件名称列表
 */
export function getInstalledPlugins(): PluginName[] {
  return ALL_PLUGIN_NAMES.filter((name) => isPluginInstalled(name))
}
