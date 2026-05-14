import { storage } from './storage'
import { StorageKey } from '../config/constants'
import { APP_VERSION } from '../config/version'
import { logger } from './logger'

let updateManager: WechatMiniprogram.UpdateManager | null = null
let hasBoundListeners = false
let hasReadyUpdate = false
let isPromptVisible = false

const UPDATE_TITLE = '更新提示'
const UPDATE_CONTENT = '检测到新版本，是否立即重启小程序完成更新？'
const UPDATE_FAIL_CONTENT = '新版本下载失败，请检查网络后重试。'

function getUpdateManagerSafely(): WechatMiniprogram.UpdateManager | null {
  const getter = (uni as { getUpdateManager?: () => WechatMiniprogram.UpdateManager }).getUpdateManager
  if (typeof getter !== 'function') {
    return null
  }

  try {
    return getter()
  } catch (error) {
    logger.error('获取更新管理器失败', error)
    return null
  }
}

function showUpdateModal() {
  if (!updateManager || !hasReadyUpdate || isPromptVisible) {
    return
  }

  isPromptVisible = true
  uni.showModal({
    title: UPDATE_TITLE,
    content: UPDATE_CONTENT,
    confirmText: '立即更新',
    cancelText: '稍后',
    success: ({ confirm }) => {
      isPromptVisible = false
      if (confirm) {
        // 应用更新前清除非关键缓存，避免旧数据结构导致异常
        const cleared = storage.clearNonCritical()
        // 同步写入新版本号，避免 applyUpdate 重启后 onLaunch 再次重复清除
        storage.set(StorageKey.APP_VERSION, APP_VERSION)
        logger.info('更新前缓存已清除', { cleared })
        updateManager?.applyUpdate()
      }
    },
    fail: () => {
      isPromptVisible = false
    },
  })
}

export function checkMiniProgramUpdate() {
  // #ifdef MP-WEIXIN
  if (!updateManager) {
    updateManager = getUpdateManagerSafely()
  }

  if (!updateManager) {
    return
  }

  if (!hasBoundListeners) {
    hasBoundListeners = true

    updateManager.onCheckForUpdate(() => {
      // WeChat 会自动拉取版本信息，这里仅用于注册回调。
    })

    updateManager.onUpdateReady(() => {
      hasReadyUpdate = true
      showUpdateModal()
    })

    updateManager.onUpdateFailed(() => {
      hasReadyUpdate = false
      uni.showModal({
        title: UPDATE_TITLE,
        content: UPDATE_FAIL_CONTENT,
        showCancel: false,
        confirmText: '我知道了',
      })
    })
  }

  showUpdateModal()
  // #endif
}
