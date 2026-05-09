const tabBarItems = [
  {
    pagePath: '/pages/index/index',
    text: '首页',
    iconPath: '/static/tabbar/home.svg',
    selectedIconPath: '/static/tabbar/home-active.svg'
  },
  {
    pagePath: '/pages/shop/shop',
    text: '商城',
    iconPath: '/static/tabbar/shop.svg',
    selectedIconPath: '/static/tabbar/shop-active.svg'
  },
  {
    pagePath: '/pages/orders/orders',
    text: '订单',
    iconPath: '/static/tabbar/orders.svg',
    selectedIconPath: '/static/tabbar/orders-active.svg'
  },
  {
    pagePath: '/pages/profile/profile',
    text: '我的',
    iconPath: '/static/tabbar/profile.svg',
    selectedIconPath: '/static/tabbar/profile-active.svg'
  }
]

function normalizeTabBarPath(path) {
  return String(path || '').replace(/^\/+/, '')
}

function getTabBarSelectedIndex(path) {
  const currentPath = normalizeTabBarPath(path)
  return tabBarItems.findIndex((item) => normalizeTabBarPath(item.pagePath) === currentPath)
}

Component({
  /**
   * 组件数据
   */
  data: {
    selected: 0,
    color: '#4F6C7B',
    selectedColor: '#009666',
    list: tabBarItems
  },

  /**
   * 组件方法
   */
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      const api = (typeof uni !== 'undefined' && uni && typeof uni.switchTab === 'function') ? uni : wx
      api.switchTab({ url })
      // Do not setData here; let target page's show() handle it
    },

    init() {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        const route = currentPage.route || currentPage.__route__ || ''

        const selectedIndex = getTabBarSelectedIndex(route)

        if (selectedIndex !== -1) {
          this.setData({
            selected: selectedIndex
          })
        }
      }
    }
  },

  lifetimes: {
    attached() {
      this.init()
    }
  },

  pageLifetimes: {
    show() {
      this.init()
    }
  }
})
