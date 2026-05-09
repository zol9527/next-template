import type { ServiceContext } from '@/types/service/service-context'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import { createFeatureFlagService, type FeatureFlagName } from './feature-flag.service'

/**
Function: createAdminFeatureFlagService

Description: 创建管理员功能开关服务，提供功能开关的管理功能

Parameters:
    deps(object): 依赖项
    deps.systemSettings(SystemSettingsRepository): 系统设置仓库
    ctx(ServiceContext): 服务上下文

Returns:
    service(object): 功能开关管理服务
*/
export function createAdminFeatureFlagService(
  deps: { systemSettings: SystemSettingsRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  // 使用现有的功能开关服务
  const featureFlagService = createFeatureFlagService(
    { systemSettings: deps.systemSettings },
    ctx,
  )

  return {
    /**
     * 获取所有功能开关状态
     */
    async getAllFlags(): Promise<Record<string, boolean>> {
      const flags = await featureFlagService.getAllFlags()

      // 将 FeatureFlagValue 转换为 boolean（所有功能开关都是布尔值）
      const booleanFlags: Record<string, boolean> = {}
      for (const [key, value] of Object.entries(flags)) {
        booleanFlags[key] = Boolean(value)
      }

      logger.info({ action: 'admin_feature_flags.list' }, 'Listed all feature flags')

      return booleanFlags
    },

    /**
     * 切换功能开关状态
     */
    async toggleFlag(params: { key: FeatureFlagName; enabled: boolean }): Promise<void> {
      await featureFlagService.setFlag(params.key, params.enabled)

      logger.info(
        {
          action: 'admin_feature_flags.toggle',
          flagKey: params.key,
          enabled: params.enabled,
        },
        `Toggled feature flag: ${params.key} = ${params.enabled}`,
      )
    },

    /**
     * 检查维护模式是否启用
     */
    async isMaintenanceMode(): Promise<boolean> {
      return featureFlagService.isMaintenanceMode()
    },
  }
}

export type AdminFeatureFlagService = ReturnType<typeof createAdminFeatureFlagService>
