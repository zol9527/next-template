type TabBarItem = {
  pagePath: string
}

const TAB_BAR_ITEMS: TabBarItem[] = [
  { pagePath: '/pages/index/index' },
  { pagePath: '/pages/shop/shop' },
  { pagePath: '/pages/orders/orders' },
  { pagePath: '/pages/profile/profile' }
]

type MiniProgramPage = {
  route?: string
  __route__?: string
  getTabBar?: () => { setData?: (data: Record<string, unknown>) => void } | null
}

/**
 * Function: normalizeTabBarPath
 *
 * Description: 统一处理页面路径格式，避免 /pages/index/index 和 pages/index/index 比较失败。
 *
 * Parameters:
 *   path(string): 页面路径
 *
 * Returns:
 *   normalizedPath(string): 去掉开头斜杠后的页面路径
 */
function normalizeTabBarPath(path: string): string {
  return String(path || '').replace(/^\/+/, '')
}

/**
 * Function: getTabBarSelectedIndex
 *
 * Description: 根据页面路径计算底部菜单选中项。
 *
 * Parameters:
 *   path(string): 当前页面路径
 *
 * Returns:
 *   index(number): 命中的菜单索引，未命中时返回 -1
 */
function getTabBarSelectedIndex(path: string): number {
  const currentPath = normalizeTabBarPath(path)
  return TAB_BAR_ITEMS.findIndex((item) => {
    return normalizeTabBarPath(item.pagePath) === currentPath
  })
}

/**
 * Function: syncCustomTabBar
 *
 * Description: 同步微信小程序原生自定义 TabBar 的选中状态。
 * Vue 页面不要再直接写 getCurrentPages/getTabBar/setData，统一调用这个函数即可。
 *
 * Parameters:
 *   explicitIndex(number | undefined): 指定选中索引；不传则根据当前页面路径自动计算
 *
 * Returns:
 *   success(boolean): 是否成功同步到自定义 TabBar
 */
export function syncCustomTabBar(explicitIndex?: number): boolean {
  try {
    const pages = getCurrentPages() as MiniProgramPage[]
    const currentPage = pages[pages.length - 1]
    if (!currentPage || typeof currentPage.getTabBar !== 'function') return false

    const tabBar = currentPage.getTabBar()
    if (!tabBar || typeof tabBar.setData !== 'function') return false

    const route = currentPage.route || currentPage.__route__ || ''
    const selected = typeof explicitIndex === 'number'
      ? explicitIndex
      : getTabBarSelectedIndex(route)

    if (selected < 0) return false
    tabBar.setData({ selected })
    return true
  } catch (error) {
    console.error('TabBar sync error:', error)
    return false
  }
}
