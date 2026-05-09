/**
 * uni-app API Mock
 *
 * 测试环境中模拟 uni-app 全局 API，包括：
 * - 系统信息获取
 * - 菜单按钮位置
 * - 网络请求
 * - 本地存储（内存实现）
 * - 导航跳转（日志记录）
 * - 提示和加载（日志记录）
 * - 模态框
 * - 图片预览
 */

// 导航调用日志
const navigationLogs: string[] = []

// 提示和加载调用日志
const toastLogs: string[] = []

// 存储使用内存 Map 实现
const storage = new Map<string, any>()

// 系统信息 Mock
const mockSystemInfo = {
  brand: 'devtools',
  model: 'iPhone 14 Pro',
  pixelRatio: 3,
  screenWidth: 390,
  screenHeight: 844,
  windowWidth: 375,
  windowHeight: 812,
  statusBarHeight: 44,
  language: 'zh-CN',
  system: 'iOS 16.0',
  version: '8.0.5',
  platform: 'ios',
  fontSizeSetting: 16,
  SDKVersion: '2.45.0',
  windowTop: 0,
  windowBottom: 0,
  safeArea: {
    left: 0,
    right: 375,
    top: 44,
    bottom: 812,
    width: 375,
    height: 768,
  },
  safeAreaInsets: {
    top: 44,
    right: 0,
    bottom: 0,
    left: 0,
  },
}

// 菜单按钮位置 Mock
const mockMenuButton = {
  width: 87,
  height: 32,
  top: 8,
  right: 8,
  bottom: 40,
  left: 280,
}

export const uniMock = {
  // 系统信息
  getSystemInfoSync: () => mockSystemInfo,

  getSystemInfo: (options: UniApp.GetSystemInfoOptions) => {
    options.success?.(mockSystemInfo)
    options.complete?.()
  },

  // 菜单按钮位置
  getMenuButtonBoundingClientRect: () => mockMenuButton,

  // 网络请求 Mock
  request: (options: UniApp.RequestOptions) => {
    const { url, method, success, fail, complete, data } = options

    // 模拟异步请求
    setTimeout(() => {
      // 默认返回成功
      success?.({
        data: data || { mock: true },
        statusCode: 200,
        header: { 'Content-Type': 'application/json' },
        cookies: [],
      })
      complete?.()
    }, 10)
  },

  // 本地存储（内存实现）
  getStorageSync: (key: string) => {
    return storage.get(key) || ''
  },

  setStorageSync: (key: string, data: any) => {
    storage.set(key, data)
    return true
  },

  removeStorageSync: (key: string) => {
    storage.delete(key)
    return true
  },

  clearStorageSync: () => {
    storage.clear()
  },

  // 异步存储（基于同步实现）
  getStorage: (options: UniApp.GetStorageOptions) => {
    const { key, success, fail, complete } = options
    try {
      const data = storage.get(key)
      success?.({ data })
      complete?.()
    } catch (error: any) {
      fail?.({ errMsg: error.message })
      complete?.()
    }
  },

  setStorage: (options: UniApp.SetStorageOptions) => {
    const { key, data, success, fail, complete } = options
    try {
      storage.set(key, data)
      success?.({ data })
      complete?.()
    } catch (error: any) {
      fail?.({ errMsg: error.message })
      complete?.()
    }
  },

  removeStorage: (options: UniApp.RemoveStorageOptions) => {
    const { key, success, fail, complete } = options
    try {
      storage.delete(key)
      success?.({ data: '' })
      complete?.()
    } catch (error: any) {
      fail?.({ errMsg: error.message })
      complete?.()
    }
  },

  // 导航（日志记录）
  navigateTo: (options: UniApp.NavigateToOptions) => {
    navigationLogs.push(`navigateTo: ${options.url}`)
    options.success?.()
    options.complete?.()
  },

  redirectTo: (options: UniApp.RedirectToOptions) => {
    navigationLogs.push(`redirectTo: ${options.url}`)
    options.success?.()
    options.complete?.()
  },

  switchTab: (options: UniApp.SwitchTabOptions) => {
    navigationLogs.push(`switchTab: ${options.url}`)
    options.success?.()
    options.complete?.()
  },

  navigateBack: (options?: UniApp.NavigateBackOptions) => {
    const delta = options?.delta || 1
    navigationLogs.push(`navigateBack: delta=${delta}`)
    options?.success?.()
    options?.complete?.()
  },

  reLaunch: (options: UniApp.ReLaunchOptions) => {
    navigationLogs.push(`reLaunch: ${options.url}`)
    options.success?.()
    options.complete?.()
  },

  // 提示和加载（日志记录）
  showToast: (options: UniApp.ShowToastOptions) => {
    toastLogs.push(`showToast: ${options.title}`)
    options.success?.()
    options.complete?.()
  },

  hideToast: () => {
    toastLogs.push('hideToast')
  },

  showLoading: (options?: UniApp.ShowLoadingOptions) => {
    toastLogs.push(`showLoading: ${options?.title || '加载中'}`)
  },

  hideLoading: () => {
    toastLogs.push('hideLoading')
  },

  // 模态框
  showModal: (options: UniApp.ShowModalOptions) => {
    // 默认用户点击确定
    if (options.success) {
      options.success({ confirm: true, cancel: false, errMsg: 'showModal:ok' })
    }
    options.complete?.()
  },

  // 图片预览（日志记录）
  previewImage: (options: UniApp.PreviewImageOptions) => {
    toastLogs.push(`previewImage: ${options.urls.join(', ')}`)
    options.success?.()
    options.complete?.()
  },

  // 其他常用 API Mock
  login: (options: UniApp.LoginOptions) => {
    options.success?.({
      code: 'mock_login_code',
      errMsg: 'login:ok',
    })
    options.complete?.()
  },

  getUserInfo: (options: UniApp.GetUserInfoOptions) => {
    options.success?.({
      userInfo: {
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.png',
      },
      rawData: '',
      signature: '',
      encryptedData: '',
      iv: '',
      errMsg: 'getUserInfo:ok',
    })
    options.complete?.()
  },

  // 下载文件 Mock
  downloadFile: (options: UniApp.DownloadFileOptions) => {
    setTimeout(() => {
      options.success?.({
        tempFilePath: '/mock/temp/file.png',
        statusCode: 200,
        header: {},
        errMsg: 'downloadFile:ok',
      })
      options.complete?.()
    }, 10)
  },

  // 上传文件 Mock
  uploadFile: (options: UniApp.UploadFileOptions) => {
    setTimeout(() => {
      options.success?.({
        data: JSON.stringify({ url: 'https://example.com/uploaded.png' }),
        statusCode: 200,
        header: {},
        errMsg: 'uploadFile:ok',
      })
      options.complete?.()
    }, 10)
  },
}

// 辅助函数：获取导航日志
export function getNavigationLogs(): string[] {
  return [...navigationLogs]
}

// 辅助函数：获取提示日志
export function getToastLogs(): string[] {
  return [...toastLogs]
}

// 辅助函数：清空日志
export function clearLogs(): void {
  navigationLogs.length = 0
  toastLogs.length = 0
}

// 辅助函数：清空存储
export function clearStorage(): void {
  storage.clear()
}
