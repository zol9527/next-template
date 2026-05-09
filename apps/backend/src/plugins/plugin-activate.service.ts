import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import { memoryCache, CACHE_TTL } from '@/lib/cache/memory-cache'
import { PLUGIN_DEFINITIONS, type PluginName, getInstalledPlugins } from '@/plugins/plugin-definitions'

/**
 * Function: createPluginActivateService
 *
 * Description: 创建插件激活状态管理服务，使用 SystemSetting 持久化激活状态，
 *   memoryCache 提供缓存加速。遵循 cache → DB → default 三级回退模式。
 *
 * Parameters:
 *     deps({ systemSettings: SystemSettingsRepository }): 依赖注入的 SystemSettingsRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供插件激活状态查询和管理的服务对象
 */
export function createPluginActivateService(
  deps: { systemSettings: SystemSettingsRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  function getStorageKey(pluginName: PluginName): string {
    return `plugin.${pluginName}.active`
  }

  function getCacheKey(pluginName: PluginName): string {
    return `plugin-activate:${pluginName}`
  }

  return {
    /**
     * Function: getActivationStatus
     *
     * Description: 获取指定插件的激活状态。按 cache → DB → default 三级回退。
     *
     * Parameters:
     *     pluginName(PluginName): 插件名称
     *
     * Returns:
     *     active(boolean): 插件是否激活
     */
    async getActivationStatus(pluginName: PluginName): Promise<boolean> {
      const definition = PLUGIN_DEFINITIONS[pluginName]
      if (!definition) {
        logger.warn({ action: 'plugin_activate.get', pluginName }, '未知的插件')
        return false
      }

      const cacheKey = getCacheKey(pluginName)
      const cached = memoryCache.get<boolean>(cacheKey)
      if (cached !== undefined) {
        logger.debug({
          action: 'plugin_activate.get',
          pluginName,
          value: cached,
          source: 'cache',
        })
        return cached
      }

      try {
        const key = getStorageKey(pluginName)
        const value = await deps.systemSettings.getSetting<string | null>(repoCtx, { key })

        let active = definition.defaultActive
        if (value !== null) {
          active = value === 'true'
        }

        memoryCache.set(cacheKey, active, CACHE_TTL.FEATURE_FLAG)

        logger.debug({
          action: 'plugin_activate.get',
          pluginName,
          value: active,
          source: value !== null ? 'database' : 'default',
        })

        return active
      } catch (error) {
        logger.error({ action: 'plugin_activate.get', pluginName, error }, '获取插件激活状态失败')
        return definition.defaultActive
      }
    },

    /**
     * Function: setActivationStatus
     *
     * Description: 设置指定插件的激活状态，写入数据库并失效缓存。
     *
     * Parameters:
     *     pluginName(PluginName): 插件名称
     *     active(boolean): 是否激活
     *
     * Returns:
     *     void
     */
    async setActivationStatus(pluginName: PluginName, active: boolean): Promise<void> {
      const definition = PLUGIN_DEFINITIONS[pluginName]
      if (!definition) {
        const error = new Error(`Unknown plugin: ${pluginName}`) as Error & { code?: string }
        error.code = 'INVALID_PLUGIN'
        throw error
      }

      const key = getStorageKey(pluginName)
      const valueStr = JSON.stringify(active)

      await deps.systemSettings.updateSetting(repoCtx, { key, value: valueStr })

      memoryCache.invalidate(getCacheKey(pluginName))

      logger.info({
        action: 'plugin_activate.set',
        pluginName,
        active,
      })
    },

    /**
     * Function: getAllActivationStatuses
     *
     * Description: 获取所有已安装插件的激活状态。
     *
     * Returns:
     *     statuses(Record<PluginName, boolean>): 已安装插件的激活状态映射
     */
    async getAllActivationStatuses(): Promise<Record<PluginName, boolean>> {
      const installed = getInstalledPlugins()
      const result = {} as Record<PluginName, boolean>

      await Promise.all(
        installed.map(async (name) => {
          result[name] = await this.getActivationStatus(name)
        }),
      )

      return result
    },

    /**
     * Function: isPluginActive
     *
     * Description: 同步检查插件是否激活。仅从 memoryCache 读取，
     *   cache miss 时返回 true（默认激活，适用于冷启动场景）。
     *
     * Parameters:
     *     pluginName(PluginName): 插件名称
     *
     * Returns:
     *     active(boolean): 插件是否激活（cache miss 返回 true）
     */
    isPluginActive(pluginName: PluginName): boolean {
      const cacheKey = getCacheKey(pluginName)
      const cached = memoryCache.get<boolean>(cacheKey)
      return cached ?? true
    },
  }
}

export type PluginActivateService = ReturnType<typeof createPluginActivateService>
