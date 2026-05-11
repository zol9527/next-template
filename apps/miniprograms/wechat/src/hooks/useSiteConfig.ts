/**
 * Function: useSiteConfig
 *
 * Description: 站点配置共享 composable
 * 提供从后端 API 获取的站点名称（品牌名），供所有页面的 Header 使用。
 * 内部使用 siteConfigService 的缓存机制，多次调用不会重复请求。
 *
 * Usage:
 *   const { siteName, loadSiteConfig } = useSiteConfig()
 *   // 在 onMounted 中调用 loadSiteConfig()
 *   // 在模板中使用 {{ siteName }}
 *
 * Returns:
 *   siteName(Ref<string>): 站点名称，默认来自 DEFAULT_SITE_CONFIG
 *   siteSlogan(Ref<string>): 站点标语，默认来自 DEFAULT_SITE_CONFIG
 *   logoUrl(Ref<string>): 站点 Logo，默认来自 DEFAULT_SITE_CONFIG
 *   copyright(ComputedRef<string>): 版权文案，默认基于 siteName 生成
 *   aboutStats(Ref<Array<{ value: string; label: string }>>): 默认来自 DEFAULT_SITE_CONFIG
 *   loadSiteConfig(function): 加载站点配置（带缓存，可安全重复调用）
 */
import { computed, ref } from 'vue'
import { siteConfigService } from '../services/api/site-config'
import { logger } from '../utils/logger'
import { buildFullUrl } from '../utils/url'

type AboutStat = {
  value: string
  label: string
}

type PublicSiteConfig = {
  siteName?: string
  siteSlogan?: string | null
  logoUrl?: string | null
  copyright?: string | null
  aboutStats?: AboutStat[] | null
}

type PublicConfigResponse = {
  siteConfig?: PublicSiteConfig | null
}

const DEFAULT_SITE_CONFIG = {
  siteName: '平台',
  siteSlogan: '知识赋能平台',
  logoUrl: '',
  aboutStats: [
    { value: '200+', label: '精品课程' },
    { value: '50+', label: '专业讲师' },
    { value: '10W+', label: '学员信赖' },
  ] satisfies AboutStat[],
} as const

// 模块级共享状态：所有使用 useSiteConfig 的组件共享同一份数据
const siteName = ref<string>(DEFAULT_SITE_CONFIG.siteName)
const siteSlogan = ref<string>(DEFAULT_SITE_CONFIG.siteSlogan)
const logoUrl = ref<string>(DEFAULT_SITE_CONFIG.logoUrl)
const configuredCopyright = ref<string>('')
const aboutStats = ref<AboutStat[]>([...DEFAULT_SITE_CONFIG.aboutStats])
const copyright = computed(() => configuredCopyright.value || `© 2025 ${siteName.value}. All rights reserved.`)

// 是否已加载过配置（避免多个页面同时触发请求）
let _loaded = false
let _loadingPromise: Promise<void> | null = null

export function useSiteConfig() {
  /**
   * 加载站点配置
   * 使用 siteConfigService 的缓存机制，30 分钟内不会重复请求后端
   * 多个组件同时调用时，只会发起一次请求
   */
  const loadSiteConfig = async (): Promise<void> => {
    // 如果已经成功加载过，直接返回
    if (_loaded) return

    // 如果正在加载中，等待已有的请求完成
    if (_loadingPromise) {
      await _loadingPromise
      return
    }

    _loadingPromise = (async () => {
      try {
        const config = await siteConfigService.getConfig() as PublicConfigResponse
        if (config?.siteConfig?.siteName) {
          siteName.value = config.siteConfig.siteName
        }
        if (config?.siteConfig?.siteSlogan) {
          siteSlogan.value = config.siteConfig.siteSlogan
        }
        if (config?.siteConfig?.logoUrl) {
          logoUrl.value = buildFullUrl(config.siteConfig.logoUrl)
        }
        if (config?.siteConfig?.copyright) {
          configuredCopyright.value = config.siteConfig.copyright
        }
        if (Array.isArray(config?.siteConfig?.aboutStats) && config.siteConfig.aboutStats.length > 0) {
          aboutStats.value = config.siteConfig.aboutStats
            .filter((item) => item?.value && item?.label)
            .slice(0, 3)
        }
        _loaded = true
      } catch (e) {
        const errorMeta = e instanceof Error ? { message: e.message } : undefined
        logger.warn('加载站点配置失败，使用默认值', errorMeta)
        // 加载失败也标记为已加载，避免不断重试
        _loaded = true
      } finally {
        _loadingPromise = null
      }
    })()

    await _loadingPromise
  }

  return {
    siteName,
    siteSlogan,
    logoUrl,
    copyright,
    aboutStats,
    loadSiteConfig,
  }
}
