import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import { memoryCache, CACHE_TTL } from '@/lib/cache/memory-cache'

/**
 * 功能开关类型定义
 */
export type FeatureFlagName =
  | 'maintenance_mode' // 维护模式（启用时返回 503）
  | 'payment_enabled' // 支付功能开关
  | 'registration_enabled' // 注册功能开关
  | 'announcement_enabled' // 公告功能开关
  | 'promotion_enabled' // 推广功能开关
  | 'coupon_enabled' // 优惠券功能开关
  | 'ai_text_generation' // AI 文本生成
  | 'ai_image_generation' // AI 图片生成
  | 'ai_pricing_suggestion' // AI 价格建议

/**
 * 功能开关值类型
 */
export type FeatureFlagValue = boolean | string | number

/**
 * 功能开关配置
 */
export interface FeatureFlagConfig {
  name: FeatureFlagName
  defaultValue: FeatureFlagValue
  description: string
}

/**
 * 功能开关配置映射
 */
export const FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlagConfig> = {
  maintenance_mode: {
    name: 'maintenance_mode',
    defaultValue: false,
    description: '维护模式（启用时系统返回 503 Service Unavailable）',
  },
  payment_enabled: {
    name: 'payment_enabled',
    defaultValue: true,
    description: '支付功能开关（禁用时不允许创建支付订单）',
  },
  registration_enabled: {
    name: 'registration_enabled',
    defaultValue: true,
    description: '注册功能开关（禁用时不允许新用户注册）',
  },
  announcement_enabled: {
    name: 'announcement_enabled',
    defaultValue: true,
    description: '公告功能开关（禁用时不显示公告）',
  },
  promotion_enabled: {
    name: 'promotion_enabled',
    defaultValue: true,
    description: '推广功能开关（禁用时不允许使用推广码和分销功能）',
  },
  coupon_enabled: {
    name: 'coupon_enabled',
    defaultValue: true,
    description: '优惠券功能开关（禁用时不允许使用优惠券）',
  },
  ai_text_generation: {
    name: 'ai_text_generation',
    defaultValue: false,
    description: 'AI 文本生成功能（禁用时商品名称/描述/标签等 AI 生成不可用）',
  },
  ai_image_generation: {
    name: 'ai_image_generation',
    defaultValue: false,
    description: 'AI 图片生成功能（禁用时商品封面图 AI 生成不可用）',
  },
  ai_pricing_suggestion: {
    name: 'ai_pricing_suggestion',
    defaultValue: false,
    description: 'AI 价格建议功能（禁用时商品价格 AI 建议不可用）',
  },
} as const

/**
 * Function: createFeatureFlagService
 *
 * Description: 创建功能开关服务，用于管理和检查功能开关状态
 *
 * Parameters:
 *     deps({ systemSettings: SystemSettingsRepository }): 依赖注入的 SystemSettingsRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供功能开关检查和管理的服务对象
 */
export function createFeatureFlagService(
  deps: { systemSettings: SystemSettingsRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  /**
   * 生成功能开关的存储键
   */
  function getStorageKey(featureName: FeatureFlagName): string {
    return `feature.${featureName}`
  }

  return {
    /**
     * 获取功能开关状态
     * @param featureName 功能开关名称
     * @returns 功能开关值（如果未设置则返回默认值）
     */
    async getFlag(featureName: FeatureFlagName): Promise<FeatureFlagValue> {
      const config = FEATURE_FLAGS[featureName]
      if (!config) {
        logger.warn({ action: 'feature_flag.get', featureName }, '未知的功能开关')
        return false
      }

      const cacheKey = `feature-flag:${featureName}`
      const cached = memoryCache.get<FeatureFlagValue>(cacheKey)
      if (cached !== undefined) {
        logger.debug({
          action: 'feature_flag.get',
          featureName,
          value: cached,
          source: 'cache',
        })
        return cached
      }

      try {
        const key = getStorageKey(featureName)
        const value = await deps.systemSettings.getSetting<string | null>(repoCtx, { key })

        let parsedValue: FeatureFlagValue = config.defaultValue
        if (value !== null) {
          try {
            parsedValue = JSON.parse(value)
          } catch {
            parsedValue = value as FeatureFlagValue
          }
        }

        memoryCache.set(cacheKey, parsedValue, CACHE_TTL.FEATURE_FLAG)

        logger.debug({
          action: 'feature_flag.get',
          featureName,
          value: parsedValue,
          source: value !== null ? 'database' : 'default',
        })

        return parsedValue
      } catch (error) {
        logger.error({ action: 'feature_flag.get', featureName, error }, '获取功能开关失败')
        return config.defaultValue
      }
    },

    /**
     * 设置功能开关状态
     * @param featureName 功能开关名称
     * @param value 功能开关值
     */
    async setFlag(featureName: FeatureFlagName, value: FeatureFlagValue): Promise<void> {
      const config = FEATURE_FLAGS[featureName]
      if (!config) {
        const error = new Error(`Unknown feature flag: ${featureName}`) as Error & { code?: string }
        error.code = 'INVALID_FEATURE_FLAG'
        throw error
      }

      const key = getStorageKey(featureName)
      const valueStr = JSON.stringify(value)

      await deps.systemSettings.updateSetting(repoCtx, { key, value: valueStr })

      memoryCache.invalidate(`feature-flag:${featureName}`)

      logger.info({
        action: 'feature_flag.set',
        featureName,
        value,
      })
    },

    /**
     * 检查功能开关是否启用（布尔值）
     * @param featureName 功能开关名称
     * @returns 是否启用
     */
    async isEnabled(featureName: FeatureFlagName): Promise<boolean> {
      const value = await this.getFlag(featureName)
      return Boolean(value)
    },

    /**
     * 检查维护模式是否启用
     * @returns 是否处于维护模式
     */
    async isMaintenanceMode(): Promise<boolean> {
      return this.isEnabled('maintenance_mode')
    },

    /**
     * 检查支付功能是否启用
     * @returns 支付功能是否启用
     */
    async isPaymentEnabled(): Promise<boolean> {
      return this.isEnabled('payment_enabled')
    },

    /**
     * 检查注册功能是否启用
     * @returns 注册功能是否启用
     */
    async isRegistrationEnabled(): Promise<boolean> {
      return this.isEnabled('registration_enabled')
    },

    /**
     * 检查推广功能是否启用
     * @returns 推广功能是否启用
     */
    async isPromotionEnabled(): Promise<boolean> {
      return this.isEnabled('promotion_enabled')
    },

    /**
     * 检查公告功能是否启用
     * @returns 公告功能是否启用
     */
    async isAnnouncementEnabled(): Promise<boolean> {
      return this.isEnabled('announcement_enabled')
    },

    /**
     * 检查优惠券功能是否启用
     * @returns 优惠券功能是否启用
     */
    async isCouponEnabled(): Promise<boolean> {
      return this.isEnabled('coupon_enabled')
    },

    /**
     * 批量获取功能开关状态
     * @param featureNames 功能开关名称列表
     * @returns 功能开关值映射
     */
    async getFlags(featureNames: FeatureFlagName[]): Promise<Record<FeatureFlagName, FeatureFlagValue>> {
      const result = {} as Record<FeatureFlagName, FeatureFlagValue>

      await Promise.all(
        featureNames.map(async (name) => {
          result[name] = await this.getFlag(name)
        }),
      )

      return result
    },

    /**
     * 获取所有功能开关状态
     * @returns 所有功能开关值映射
     */
    async getAllFlags(): Promise<Record<FeatureFlagName, FeatureFlagValue>> {
      return this.getFlags(Object.keys(FEATURE_FLAGS) as FeatureFlagName[])
    },
  }
}

export type FeatureFlagService = ReturnType<typeof createFeatureFlagService>
