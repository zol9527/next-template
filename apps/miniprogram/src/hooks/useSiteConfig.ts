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
 *   siteName(Ref<string>): 站点名称，默认 'VANTAGE'
 *   siteSlogan(Ref<string>): 站点标语，默认 '硕博达 · 知识赋能平台'
 *   loadSiteConfig(function): 加载站点配置（带缓存，可安全重复调用）
 */
import { ref } from 'vue'
import { siteConfigService } from '../services/api/site-config'
import { logger } from '../utils/logger'

// 模块级共享状态：所有使用 useSiteConfig 的组件共享同一份数据
const siteName = ref('VANTAGE')
const siteSlogan = ref('硕博达 · 知识赋能平台')

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
        const config = await siteConfigService.getConfig()
        if (config?.siteConfig?.siteName) {
          siteName.value = config.siteConfig.siteName
        }
        if (config?.siteConfig?.siteSlogan) {
          siteSlogan.value = config.siteConfig.siteSlogan
        }
        _loaded = true
      } catch (e) {
        logger.warn('加载站点配置失败，使用默认值', e)
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
    loadSiteConfig,
  }
}
