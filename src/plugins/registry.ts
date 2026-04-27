/**
 * 插件注册表 — 启用状态双重检查 + 缓存优先策略
 *
 * Install（安装）状态：环境变量 PLUGIN_* === 'true'，编译时生效
 * Activate（激活）状态：数据库 SystemSetting plugin.{name}.active，运行时生效
 *
 * 缓存策略：
 *   - 缓存键: plugin-activate:{pluginName}
 *   - TTL: 60 秒（与 CACHE_TTL.FEATURE_FLAG 对齐）
 *   - 缓存由 refreshPluginCache 异步填充，getEnabledPlugins 同步读取
 *   - isPluginEnabled 同步读取缓存，cache miss 默认返回 true（安全降级）
 *
 * 注意：getEnabledPlugins 当前保持同步（14+ 消费者依赖同步签名）。
 *   Task 7 将 layout.tsx 改为 await refreshPluginCache() + getEnabledPlugins()。
 */

import {
  ALL_PLUGIN_NAMES,
  isPluginInstalled,
} from '@/plugins/plugin-definitions'
import { memoryCache, CACHE_TTL } from '@/lib/cache/memory-cache'

import type { PluginName } from '@/plugins/plugin-definitions'

/** 缓存键前缀 */
const CACHE_KEY_PREFIX = 'plugin-activate:'

/** 插件激活状态缓存 TTL（毫秒） */
const PLUGIN_ACTIVATE_TTL = CACHE_TTL.FEATURE_FLAG

function getCacheKey(pluginName: string): string {
  return `${CACHE_KEY_PREFIX}${pluginName}`
}

/** 动态创建插件激活服务实例，失败时降级返回 null */
async function tryGetActivationService() {
  try {
    const { createPluginActivateService } = await import('@/plugins/plugin-activate.service')
    const { createSystemSettingsRepository } = await import('@/repositories/factory')
    const { createServiceContext } = await import('@/types/service/service-context')
    const { logger } = await import('@/lib/logger')

    const systemSettings = await createSystemSettingsRepository()
    const ctx = createServiceContext('plugin-registry', logger)
    return createPluginActivateService({ systemSettings }, ctx)
  } catch {
    return null
  }
}

/**
 * Function: isPluginEnabled
 *
 * Description: 检查指定插件是否已启用（同步，缓存优先）。
 *   双重逻辑：已安装（env var） AND 已激活（缓存 / DB）。
 *   ⚠️ 此函数保持同步签名，14+ 个消费者依赖它。
 *   ⚠️ 此函数只能在 Server Components / Route Handlers / Server Actions 中使用。
 *
 * 判断流程：
 *   1. isPluginInstalled(pluginName) → false 直接返回 false
 *   2. 检查内存缓存 plugin-activate:{pluginName} → 有值返回 Boolean(value)
 *   3. Cache miss → 返回 true（安全默认值：已安装但缓存为空时默认激活）
 *
 * Parameters:
 *   pluginName(string): 插件名称（如 'wechat', 'ecommerce', 'promotion'）
 *
 * Returns:
 *   boolean: 插件是否启用（非 Promise）
 */
export function isPluginEnabled(pluginName: string): boolean {
  if (!isPluginInstalled(pluginName as PluginName)) {
    return false
  }

  const cached = memoryCache.get<boolean>(getCacheKey(pluginName))
  if (cached !== undefined) {
    return cached
  }

  // Cache miss → 安全默认值 true（缓存由 refreshPluginCache 在 admin 页面请求时填充）
  return true
}

/**
 * Function: getEnabledPlugins
 *
 * Description: 获取所有插件的启用状态映射（同步，读缓存）。
 *   基于 installed + cached activated 双重判断返回结果。
 *   用于 Server Component 向 Client Component 传递插件状态。
 *   ⚠️ 调用方应先 await refreshPluginCache() 填充缓存（Task 7 统一改造）。
 *
 * Returns:
 *   Record<string, boolean>: 插件名称 → 启用状态映射
 */
export function getEnabledPlugins(): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const pluginName of ALL_PLUGIN_NAMES) {
    result[pluginName] = isPluginEnabled(pluginName)
  }
  return result
}

/**
 * Function: setPluginCache
 *
 * Description: 直接写入单个插件的激活状态到缓存，无 DB 开销。
 *   用于 PATCH 后立即更新缓存，跳过 refreshPluginCache 的完整重载。
 *
 * Parameters:
 *   pluginName(string): 插件名称
 *   active(boolean): 激活状态
 */
export function setPluginCache(pluginName: string, active: boolean): void {
  memoryCache.set(getCacheKey(pluginName), active, PLUGIN_ACTIVATE_TTL)
}

/**
 * Function: refreshPluginCache
 *
 * Description: 从数据库加载所有插件激活状态到内存缓存。
 *   调用 plugin-activate.service 获取激活状态并写入缓存。
 *   适用于：(1) admin 页面加载时 (2) 管理员修改插件状态后。
 *
 * Returns:
 *   Promise<void>
 */
export async function refreshPluginCache(): Promise<void> {
  const activationService = await tryGetActivationService()
  if (!activationService) {
    return
  }

  const statuses = await activationService.getAllActivationStatuses()
  for (const [name, active] of Object.entries(statuses)) {
    memoryCache.set(getCacheKey(name), active, PLUGIN_ACTIVATE_TTL)
  }
}

/**
 * Function: refreshPluginCacheWithStatuses
 *
 * Description: 用已获取的激活状态批量刷新缓存，零 DB 开销。
 *   用于 GET 接口已调用 getAllActivationStatuses 后顺便刷新缓存，
 *   避免 refreshPluginCache 再次查库。
 *
 * Parameters:
 *   statuses(Record<string, boolean>): 插件名称 → 激活状态映射
 */
export function refreshPluginCacheWithStatuses(statuses: Record<string, boolean>): void {
  for (const [name, active] of Object.entries(statuses)) {
    memoryCache.set(getCacheKey(name), active, PLUGIN_ACTIVATE_TTL)
  }
}
