<template>
  <view class="home-page">
    <!-- ========== Header — 使用 NavBar 组件，自动避开胶囊按钮 ========== -->
    <NavBar :show-back="false" background="#FFFFFF">
      <template #left>
        <text class="logo-text">{{ siteName }}</text>
      </template>
      <template #right>
        <view class="header-actions">
          <view class="icon-circle" hover-class="icon-hover" @tap="goToSearch">
            <image src="/static/icons/header-search.svg" class="header-icon-img" mode="aspectFit" />
          </view>
          <view class="icon-circle" hover-class="icon-hover" @tap="goToNotifications">
            <image src="/static/icons/header-bell.svg" class="header-icon-img" mode="aspectFit" />
            <view class="notification-dot" v-if="auth.isLoggedIn.value" />
          </view>
        </view>
      </template>
    </NavBar>

    <!-- ========== Search Bar ========== -->
    <view class="search-section">
      <view class="search-bar" hover-class="search-hover" @tap="goToSearch">
        <image src="/static/icons/search-bar.svg" class="search-icon-img" mode="aspectFit" />
        <text class="search-placeholder">搜索课程、文章、活动...</text>
      </view>
    </view>

    <!-- ========== Banner — 后台配置优先，未启用时显示热门商品 ========== -->
    <view class="banner-section">
      <!-- 后台动态配置 Banner（优先显示） -->
      <view class="banner-card" v-if="homeBannerConfig.enabled" @tap="handleHomeBannerTap">
        <view class="banner-tag">
          <text class="banner-tag-text">{{ homeBannerConfig.tagText }}</text>
        </view>
        <text class="banner-title">{{ homeBannerConfig.title }}</text>
        <text class="banner-subtitle">{{ homeBannerConfig.subtitle }}</text>
        <view class="banner-dots">
          <view class="dot-active" />
          <view class="dot-inactive" />
          <view class="dot-inactive" />
        </view>
        <view class="banner-deco" />
      </view>
      <!-- 后台未启用时，回退到热门商品卡片 -->
      <view class="banner-hot-product" v-else-if="randomHotProduct" @tap="goToDetail(randomHotProduct)">
        <!-- 商品封面图或渐变占位 -->
        <image
          v-if="randomHotProduct.coverImage || randomHotProduct.imageUrl"
          :src="randomHotProduct.coverImage || randomHotProduct.imageUrl"
          mode="aspectFill"
          class="banner-hot-bg"
          lazy-load
        />
        <view v-else class="banner-hot-bg banner-hot-placeholder" />
        <!-- 遮罩层，确保文字可读 -->
        <view class="banner-hot-overlay" />
        <!-- 商品信息 -->
        <view class="banner-hot-content">
          <view class="banner-hot-badge">
            <text class="banner-hot-badge-text">🔥 热门推荐</text>
          </view>
          <text class="banner-hot-name">{{ randomHotProduct.name }}</text>
          <view class="banner-hot-bottom">
            <text class="banner-hot-students">{{ randomHotProduct.studentCount || randomHotProduct.enrolledCount || 0 }} 人学习</text>
            <text class="banner-hot-price" v-if="randomHotProduct.price">{{ formatPrice(randomHotProduct.price) }}</text>
            <text class="banner-hot-price banner-hot-free" v-else>免费</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== Quick Grid Row 1 ========== -->
    <view class="quick-grid">
      <view class="grid-item" v-for="(item, idx) in quickGridRow1" :key="'r1-'+idx" hover-class="grid-item-hover" @tap="handleQuickGridTap(item)">
        <view class="grid-icon" :style="{ backgroundColor: item.bgColor }">
          <image :src="item.iconSrc" class="grid-icon-img" mode="aspectFit" />
        </view>
        <text class="grid-label">{{ item.label }}</text>
      </view>
    </view>

    <!-- ========== Quick Grid Row 2 ========== -->
    <view class="quick-grid">
      <view class="grid-item" v-for="(item, idx) in quickGridRow2" :key="'r2-'+idx" hover-class="grid-item-hover" @tap="handleQuickGridTap(item)">
        <view class="grid-icon" :style="{ backgroundColor: item.bgColor }">
          <image :src="item.iconSrc" class="grid-icon-img" mode="aspectFit" />
        </view>
        <text class="grid-label">{{ item.label }}</text>
      </view>
    </view>

    <!-- ========== 探索内容 Section ========== -->
    <view class="section-header">
      <text class="section-title">探索内容</text>
      <text class="section-more" @tap="goToShop">查看全部 →</text>
    </view>
    <view class="explore-cards">
      <view class="explore-card" v-for="(card, idx) in exploreCards" :key="'exp-'+idx" :style="{ background: card.gradient }" @tap="handleExploreTap(card)">
        <image :src="card.iconSrc" class="explore-icon" mode="aspectFit" />
        <text class="explore-name">{{ card.name }}</text>
        <text class="explore-desc">{{ card.desc }}</text>
      </view>
    </view>

    <!-- ========== 每日学习进度 Card ========== -->
    <view class="daily-card" hover-class="daily-card-hover" @tap="goToCheckin">
      <view class="daily-content">
        <text class="daily-label">今日学习进度</text>
        <text class="daily-title">{{ dailyCheckinStatus.todayCheckedIn ? '今日已签到，继续保持' : '继续你的学习之旅' }}</text>
        <view class="daily-stats">
          <view class="stat-item">
            <text class="stat-number">{{ dailyCheckinStatus.streakDays }}</text>
            <text class="stat-unit">连续签到</text>
          </view>
          <view class="stat-item">
            <text class="stat-number">{{ dailyCheckinStatus.totalDays }}</text>
            <text class="stat-unit">累计签到</text>
          </view>
          <view class="stat-item">
            <text class="stat-number">{{ dailyCheckinStatus.todayCheckedIn ? '✓' : '—' }}</text>
            <text class="stat-unit">今日状态</text>
          </view>
        </view>
      </view>
      <view class="daily-btn" hover-class="daily-btn-hover">
        <text class="daily-btn-text">{{ dailyCheckinStatus.todayCheckedIn ? '已签到' : '去签到' }}</text>
      </view>
      <view class="daily-deco" />
    </view>

    <!-- ========== 热门推荐 Section ========== -->
    <view class="section-header">
      <text class="section-title">热门推荐</text>
      <text class="section-more" @tap="goToShop">更多 →</text>
    </view>
    <view class="hot-cards" v-if="hotCards.length > 0">
      <view class="hot-card" v-for="(card, idx) in hotCards" :key="'hot-'+idx" @tap="goToDetail(card)">
        <view class="hot-thumb" :style="{ background: card.coverImage ? 'transparent' : card.gradient }">
          <image
            v-if="card.coverImage"
            :src="card.coverImage"
            mode="aspectFill"
            class="hot-thumb-img"
            lazy-load
          />
          <view class="hot-badge" :style="{ backgroundColor: card.badgeColor }">
            <text class="hot-badge-text">{{ card.badge }}</text>
          </view>
        </view>
        <view class="hot-info">
          <text class="hot-name">{{ card.name }}</text>
          <view class="hot-bottom">
            <text class="hot-students">{{ card.students }} 人学习</text>
            <text class="hot-price">{{ card.price }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 分类 Tabs ========== -->
    <scroll-view scroll-x class="cat-tabs" :show-scrollbar="false">
      <view
        v-for="(cat, idx) in categories"
        :key="'cat-'+idx"
        :class="['cat-tab', activeCategory === idx ? 'cat-tab-active' : '']"
        @tap="activeCategory = idx"
      >
        <text :class="['cat-tab-text', activeCategory === idx ? 'cat-tab-text-active' : '']">{{ cat }}</text>
      </view>
    </scroll-view>

    <!-- ========== 课程列表 ========== -->
    <view class="course-list">
      <!-- 加载中骨架屏 -->
      <view v-if="products.loading.value" class="skeleton-list">
        <view v-for="i in 3" :key="'sk-'+i" class="skeleton-card">
          <view class="skeleton-thumb" />
          <view class="skeleton-info">
            <view class="skeleton-line skeleton-line-long" />
            <view class="skeleton-line skeleton-line-short" />
          </view>
        </view>
      </view>

      <!-- 课程卡片列表 -->
      <view v-else-if="displayedCourses.length > 0">
        <view class="course-card" v-for="product in displayedCourses" :key="product.id" @tap="goToDetail(product)">
          <view class="course-thumb">
            <image
              v-if="product.coverImage || product.imageUrl"
              :src="product.coverImage || product.imageUrl"
              mode="aspectFill"
              class="course-thumb-img"
              lazy-load
            />
            <view v-else class="course-thumb-placeholder" />
            <view class="course-badge" v-if="product.tag">
              <text class="course-badge-text">{{ product.tag }}</text>
            </view>
          </view>
          <view class="course-info">
            <text class="course-name">{{ product.name }}</text>
            <text class="course-desc">{{ product.summary || product.description || '精选热门课程' }}</text>
            <view class="course-bottom">
              <text class="course-students">{{ product.studentCount || product.enrolledCount || 0 }} 人学习</text>
              <text class="course-price" v-if="product.price">{{ formatPrice(product.price) }}</text>
              <text class="course-price course-free" v-else>免费</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-if="products.error.value" class="error-container">
        <text class="error-text">{{ products.error.value }}</text>
        <view class="retry-btn" @tap="loadAllProducts">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!products.loading.value && displayedCourses.length === 0" class="empty-container">
        <text class="empty-text">暂无推荐课程</text>
      </view>
    </view>

    <!-- ========== 邀请好友 Banner ========== -->
    <view class="invite-banner">
      <view class="invite-content">
        <text class="invite-title">邀请好友，一起学习</text>
        <text class="invite-desc">好友报名即可获得课程奖励</text>
      </view>
      <view class="invite-btn" hover-class="invite-btn-hover" @tap="goToInvite">
        <text class="invite-btn-text">立即邀请</text>
      </view>
    </view>

    <!-- ========== Brand Footer ========== -->
    <view class="brand-footer">
      <view class="brand-line" />
      <text class="brand-title">开启学习之旅</text>
      <text class="brand-subtitle">与知识同行，传递智慧</text>
    </view>

    <!-- ========== TabBar 占位 ========== -->
    <view class="tabbar-placeholder" />
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted, toRaw, onActivated } from 'vue'
import { useAuth } from '@/hooks/useAuth'
import { useProducts } from '@/hooks/useProducts'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { checkinService } from '@/services/checkin'
import type { CheckinStatus } from '@/services/checkin'
import { showError } from '@/utils/toast'
import { httpClient } from '@/core/http-client'
import { checkMiniProgramUpdate } from '@/utils/update-manager'
import { syncCustomTabBar } from '@/utils/tab-bar'
import { logger } from '@/utils/logger'

export default {
  /**
   * 分享给朋友
   */
  onShareAppMessage() {
    return {
      title: '发现好课程',
      path: '/pages/index/index',
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '发现好课程',
      query: '',
    }
  },

  /**
    * 下拉刷新
    */
  onPullDownRefresh() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    // loadAllProducts 和 loadCourseList 共享 loading 互斥锁，必须顺序执行
    const sequentialLoad = async () => {
      await currentPage?.loadAllProducts?.()
      await currentPage?.loadCourseList?.()
    }
    const promises: Promise<any>[] = [
        sequentialLoad(),
        currentPage?.loadSiteConfig?.() ?? Promise.resolve(),
        currentPage?.loadCheckinStatus?.() ?? Promise.resolve(),
        currentPage?.loadHomeBannerConfig?.() ?? Promise.resolve(),
      ]
    Promise.all(promises).finally(() => {
      uni.stopPullDownRefresh()
    })
  },

  /**
   * 页面显示时触发（TabBar 切换、从子页面返回等场景）
   * 刷新签到状态，确保从签到页返回或登录后能看到最新数据
   */
  onShow() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    // 仅在页面已初始化后（setup 已执行）才调用
    // 首次进入页面时 onMounted 已处理加载，这里避免重复
    if (currentPage?.loadCheckinStatus) {
      currentPage.loadCheckinStatus()
    }
  },

  setup() {
    const auth = useAuth()
    const products = useProducts()

    const activeCategory = ref(0)
    const categories = ref<string[]>(['全部', '热门推荐'])

    // ====== 所有热门推荐商品（仅后台标记为 isFeatured 的商品，供 hot cards 和 Banner 使用） ======
    const allProducts = ref<any[]>([])

    /**
     * Function: getProductCategoryId
     *
     * Description: 从商品对象中提取分类 ID，兼容 categoryId 与 category.id 两种后端返回形态。
     *
     * Parameters:
     *  product(any): 后端返回并经过 normalizeProduct 适配的商品对象
     *
     * Returns:
     *  categoryId(string): 商品所属分类 ID，缺失时返回空字符串
     */
    const getProductCategoryId = (product: any): string => {
      const categoryIdFromList = Array.isArray(product?.categoryIds) && product.categoryIds.length > 0
        ? product.categoryIds[0]
        : ''
      return product?.categoryId || categoryIdFromList || product?.category?.id || ''
    }

    /**
     * Function: getProductCategoryName
     *
     * Description: 从商品对象中提取分类名称，用于分类接口缺失时的热门推荐 Tab 兜底。
     *
     * Parameters:
     *  product(any): 后端返回并经过 normalizeProduct 适配的商品对象
     *
     * Returns:
     *  categoryName(string): 商品所属分类名称，缺失时返回空字符串
     */
    const getProductCategoryName = (product: any): string => {
      return product?.categoryName || product?.category?.name || ''
    }

    // ====== 签到状态（每日学习进度卡片使用） ======
    const dailyCheckinStatus = ref<CheckinStatus>({
      todayCheckedIn: false,
      streakDays: 0,
      totalDays: 0,
      lastCheckinDate: null,
    })

    // ====== 首页 Banner 配置 ======
    interface HomeBannerConfig {
      enabled: boolean
      tagText: string
      title: string
      subtitle: string
      linkType: 'product' | 'ad' | 'custom' | 'none'
      linkUrl: string | null
      productId: string | null
    }

    const DEFAULT_HOME_BANNER_CONFIG: HomeBannerConfig = {
      enabled: true,
      tagText: '限时免费',
      title: '零基础入门\n数据分析实战课',
      subtitle: '前 100 名报名免费',
      linkType: 'none',
      linkUrl: null,
      productId: null,
    }

    const homeBannerConfig = ref<HomeBannerConfig>({ ...DEFAULT_HOME_BANNER_CONFIG })

    /** 加载首页 Banner 配置 */
    const loadHomeBannerConfig = async () => {
      try {
        const result = await httpClient.get('/public/miniprogram/home-config')
        if (result) {
          homeBannerConfig.value = { ...DEFAULT_HOME_BANNER_CONFIG, ...result }
        }
      } catch (error) {
        // 加载失败时保持默认配置，不影响页面正常使用
        logger.warn('加载首页 Banner 配置失败，使用默认值', error)
      }
    }

    /** 首页 Banner 点击跳转处理 */
    const handleHomeBannerTap = () => {
      const { linkType, linkUrl, productId } = homeBannerConfig.value
      switch (linkType) {
        case 'product':
          if (productId) {
            uni.navigateTo({ url: `/subpackages/product/detail?id=${productId}` })
          }
          break
        case 'ad':
        case 'custom':
          if (linkUrl) {
            uni.navigateTo({ url: linkUrl })
          }
          break
        case 'none':
        default:
          break
      }
    }

    /**
     * 加载签到状态
     * 用于首页每日学习进度卡片展示真实数据
     * 仅在用户已登录时调用，未登录则保持默认值
     */
    const loadCheckinStatus = async () => {
      // 未登录时不请求签到状态，使用默认值（全0）
      if (!auth.isLoggedIn.value) {
        logger.debug('首页加载签到状态跳过：用户未登录')
        return
      }
      try {
        const result = await checkinService.getCheckinStatus()
        logger.debug('首页签到状态加载成功', {
          todayCheckedIn: result.todayCheckedIn,
          streakDays: result.streakDays,
          totalDays: result.totalDays,
        })
        dailyCheckinStatus.value = result
      } catch (e) {
        // 签到状态加载失败不影响页面其他功能，但记录详细错误便于排查
        logger.warn('首页加载签到状态失败', {
          error: e instanceof Error ? e.message : String(e),
          isLoggedIn: auth.isLoggedIn.value,
          hasToken: !!auth.state.value.token,
        })
      }
    }

    // ====== 站点配置 ======
    // 使用共享 composable，所有页面共用同一份站点名称数据
    const { siteName, loadSiteConfig: loadSiteConfigShared } = useSiteConfig()

    // ====== Quick Grid Row 1 数据 ======
    // 功能入口，静态配置（图标和跳转路由固定，不需要从后台获取）
    const quickGridRow1 = ref([
      {
        label: '全部课程', bgColor: '#E8F7F0',
        iconSrc: '/static/icons/all-courses.svg',
        action: 'shop'
      },
      {
        label: '学习文章', bgColor: '#FFF0E8',
        iconSrc: '/static/icons/articles.svg',
        action: 'articles'
      },
      {
        label: '直播课堂', bgColor: '#EEF6FB',
        iconSrc: '/static/icons/live.svg',
        action: 'live'
      },
      {
        label: '学习活动', bgColor: '#FDE8E8',
        iconSrc: '/static/icons/activities.svg',
        action: 'activities'
      },
    ])

    // ====== Quick Grid Row 2 数据 ======
    const quickGridRow2 = ref([
      {
        label: '每日签到', bgColor: '#F0E8FD',
        iconSrc: '/static/icons/checkin.svg',
        action: 'checkin'
      },
      {
        label: '学习社区', bgColor: '#ECFCCB',
        iconSrc: '/static/icons/community.svg',
        action: 'community'
      },
      {
        label: '邀请好友', bgColor: '#F1F5F9',
        iconSrc: '/static/icons/invite.svg',
        action: 'invite'
      },
      {
        label: '我的收藏', bgColor: '#FCE7F3',
        iconSrc: '/static/icons/favorites.svg',
        action: 'favorites'
      },
    ])

    // ====== 探索内容卡片 ======
    // 基于后台分类数据动态生成，显示每个分类的名称和课程总数
    const exploreCards = ref([
      { iconSrc: '/static/icons/explore-courses.svg', name: '精品课程', desc: '0 门课程', gradient: 'linear-gradient(135deg, #E8F5EE, #CEE8DA)', action: 'courses' },
      { iconSrc: '/static/icons/explore-paths.svg', name: '学习路径', desc: '系统化学习', gradient: 'linear-gradient(135deg, #EEF6FB, #D6E8F5)', action: 'paths' },
      { iconSrc: '/static/icons/explore-live.svg', name: '直播课堂', desc: '每周 3 场', gradient: 'linear-gradient(135deg, #FFF0E8, #FFE0D0)', action: 'live' },
    ])

    // ====== 热门推荐卡片 ======
    // 从后台标记为 isFeatured 的商品中随机取 2 个展示，不受分类切换影响
    const hotCards = computed(() => {
      const pool = allProducts.value
      if (pool.length === 0) {
        return []
      }
      // 用基于日期的种子随机选取 2 个，保证同一天展示不变
      const today = new Date()
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      // 从 pool 中选取最多 2 个
      const maxCount = Math.min(2, pool.length)
      const selected: any[] = []
      const usedIndices = new Set<number>()
      for (let i = 0; i < maxCount; i++) {
        const idx = (seed + i * 7) % pool.length
        if (!usedIndices.has(idx)) {
          selected.push(pool[idx])
          usedIndices.add(idx)
        } else {
          // 如果索引重复，向后查找未使用的
          for (let j = 0; j < pool.length; j++) {
            if (!usedIndices.has(j)) {
              selected.push(pool[j])
              usedIndices.add(j)
              break
            }
          }
        }
      }
      // 渐变色轮换列表，为热门推荐卡片提供不同的视觉风格
      const gradients = [
        'linear-gradient(135deg, #E8F5EE, #CEE8DA)',
        'linear-gradient(135deg, #EEF6FB, #D6E8F5)',
        'linear-gradient(135deg, #FFF0E8, #FFE0D0)',
      ]
      return selected.map((product, idx) => ({
        id: product.id,
        name: product.name,
        summary: product.summary || product.description || '精选热门课程',
        coverImage: product.coverImage || product.imageUrl || '',
        students: `${product.studentCount || product.enrolledCount || 0}`,
        price: product.price ? formatPrice(product.price) : '免费',
        badge: product.isFeatured ? 'HOT' : (product.tag || '推荐'),
        badgeColor: idx === 0 ? '#009666' : '#2563EB',
        gradient: gradients[idx % gradients.length],
      }))
    })

    // ====== 随机热门商品（Banner 区域） ======
    // 从后台标记为 isFeatured 的商品中随机选一个展示，不受分类切换影响
    // 使用基于当天日期的固定种子，保证同一天内展示不变
    const randomHotProduct = computed(() => {
      const pool = allProducts.value
      if (pool.length === 0) return null
      // 用固定随机种子（基于当天日期），保证同一天内展示不变
      const today = new Date()
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      const idx = seed % pool.length
      return pool[idx]
    })

    /**
     * 加载热门推荐商品（独立于分类筛选，用于 hot cards 和 Banner）
     * 仅获取后台标记为 isFeatured 的商品，而非全部商品
     * 加载完成后同步更新分类 Tab（只显示有热门推荐的分类）
     */
    const loadAllProducts = async () => {
      try {
        const result = await products.loadProducts({ limit: 50, featured: true })
        if (result && Array.isArray(result.items)) {
          allProducts.value = result.items
          // 根据热门推荐商品中有内容的分类，动态更新分类 Tab
          updateCategoryTabs()
        }
      } catch (e) {
        logger.warn('加载热门推荐商品失败', e)
      }
    }

    /**
     * 加载课程列表（受分类筛选影响）
     * 课程列表直接由 allProducts 中的热门推荐商品派生，不再额外请求全部商品。
     * 这样 Tab、顶部热门卡片、下方课程卡片使用同一个“热门推荐商品池”，避免混入非推荐内容。
     * - 全部 Tab：显示所有分类下的热门推荐
     * - 具体分类 Tab：显示该分类下的热门推荐
     */
    const loadCourseList = async () => {
      // 保留方法给下拉刷新和模板调用，但筛选结果由 displayedCourses 计算得到。
    }

    /**
     * 课程列表显示的商品（仅热门推荐）
     * 「全部」Tab 最多显示 10 个，避免热门内容过多时首页被拉得过长。
     * 具体分类仍保持最多 8 个，保证分类切换后的列表足够轻量。
     */
    const displayedCourses = computed(() => {
      const categoryName = categories.value[activeCategory.value]
      const category = products.categories.value.find(c => c.name === categoryName)
      const maxVisibleCount = activeCategory.value === 0 ? 10 : 8

      return allProducts.value
        .filter(product => {
          if (activeCategory.value === 0) return true
          const productCategoryId = getProductCategoryId(product)
          const productCategoryName = getProductCategoryName(product)
          return productCategoryId === category?.id || productCategoryName === categoryName
        })
        .slice(0, maxVisibleCount)
    })

    /**
     * 格式化价格
     */
    const formatPrice = (price: any): string => {
      if (typeof price === 'object' && price.amount !== undefined) {
        return `¥${price.amount}`
      }
      return `¥${price}`
    }

    // ====== TabBar 同步 ======
    const syncTabBar = () => {
      syncCustomTabBar()
    }

    // ====== 生命周期 ======
    onActivated(() => {
      syncTabBar()
      checkMiniProgramUpdate()
      // 每次激活时刷新签到状态（用户可能从签到页返回）
      loadCheckinStatus()
    })

    onMounted(async () => {
      syncTabBar()
      checkMiniProgramUpdate()
      await auth.init()

      // 兜底日志：确认 onMounted 执行时的登录状态，便于排查竞态条件
      logger.debug('首页 onMounted auth.init 完成', {
        isLoggedIn: auth.isLoggedIn.value,
        hasToken: !!auth.state.value.token,
        userId: auth.userId.value,
      })

      // 第一步：并行加载不依赖 useProducts 的数据
      await Promise.all([
        loadCategories(),
        loadSiteConfig(),
        loadCheckinStatus(),
        loadHomeBannerConfig(),
      ])

      // 第二步：加载热门推荐商品（仅 isFeatured 标记的商品，加载后填充 allProducts）
      await loadAllProducts()
    })

    /**
     * 加载站点配置
     * 委托给共享 composable，自动利用缓存避免重复请求
     */
    const loadSiteConfig = async () => {
      await loadSiteConfigShared()
    }

    /**
     * 加载分类列表
     * 先加载全部分类数据（存储在 products.categories），初始只显示「全部」
     * 等 loadAllProducts 完成后，由 updateCategoryTabs 根据热门推荐商品动态补充有内容的分类
     */
    const loadCategories = async () => {
      const result = await products.loadCategories()
      if (result) {
        // 初始只显示「全部」，等热门推荐商品加载后通过 updateCategoryTabs 补充
        categories.value = ['全部']

        // 更新探索内容卡片中的课程数量（使用 products.total 作为总数）
        if (exploreCards.value.length > 0) {
          exploreCards.value[0] = {
            ...exploreCards.value[0],
            name: result.length > 0 ? result[0].name : '精品课程',
          }
        }
      }
    }

    /**
     * 根据热门推荐商品动态更新分类 Tab 显示
     * 只显示有热门推荐商品的分类，「全部」始终保留
     * 如果没有任何热门推荐商品，则只显示「全部」
     */
    const updateCategoryTabs = () => {
      const featuredProducts = allProducts.value
      const allCategories = products.categories.value

      // 从热门推荐商品中提取有内容的分类 ID 集合
      const categoryIdsWithFeatured = new Set<string>()
      const fallbackCategoryNames = new Set<string>()
      for (const product of featuredProducts) {
        const categoryId = getProductCategoryId(product)
        if (categoryId) {
          categoryIdsWithFeatured.add(categoryId)
        } else {
          const categoryName = getProductCategoryName(product)
          if (categoryName) {
            fallbackCategoryNames.add(categoryName)
          }
        }
      }

      // 按原始分类顺序，筛选有热门推荐内容的分类名称
      const visibleCategoryNames = allCategories
        .filter(cat => categoryIdsWithFeatured.has(cat.id))
        .map(cat => cat.name)

      const visibleCategoryNameSet = new Set(visibleCategoryNames)
      const fallbackNames = [...fallbackCategoryNames]
        .filter(name => !visibleCategoryNameSet.has(name))

      categories.value = ['全部', ...visibleCategoryNames, ...fallbackNames]

      // 如果当前选中的 Tab 超出了新的分类范围，重置为「全部」
      if (activeCategory.value >= categories.value.length) {
        activeCategory.value = 0
      }
    }

    // ====== 导航方法 ======
    const goToSearch = () => {
      uni.navigateTo({ url: '/subpackages/search/index' })
    }

    const goToNotifications = () => {
      if (!auth.isLoggedIn.value) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      uni.navigateTo({ url: '/subpackages/notifications/index' })
    }

    const goToShop = () => {
      uni.switchTab({ url: '/pages/shop/shop' })
    }

    const goToCheckin = () => {
      uni.navigateTo({ url: '/subpackages/checkin/index' })
    }

    const goToInvite = () => {
      uni.navigateTo({ url: '/subpackages/profile/invite/index' })
    }

    const goToDetail = (product: any) => {
      const rawProduct = toRaw(product)
      const productId = rawProduct?.id as string || ''
      if (!productId) {
        showError('商品信息异常')
        return
      }
      uni.navigateTo({
        url: `/subpackages/product/detail?id=${productId}`,
        fail: () => {
          uni.showToast({ title: '跳转失败', icon: 'none' })
        },
      })
    }

    /**
     * 快捷功能入口点击
     */
    const handleQuickGridTap = (item: any) => {
      switch (item.action) {
        case 'shop':
          goToShop()
          break
        case 'invite':
          goToInvite()
          break
        case 'checkin':
          goToCheckin()
          break
        default:
          uni.showToast({ title: '功能开发中', icon: 'none' })
      }
    }

    /**
     * 探索内容卡片点击
     */
    const handleExploreTap = (card: any) => {
      switch (card.action) {
        case 'courses':
          goToShop()
          break
        default:
          uni.showToast({ title: '功能开发中', icon: 'none' })
      }
    }

    return {
      auth,
      products,
      activeCategory,
      categories,
      siteName,
      dailyCheckinStatus,
      homeBannerConfig,
      quickGridRow1,
      quickGridRow2,
      exploreCards,
      hotCards,
      randomHotProduct,
      displayedCourses,
      loadAllProducts,
      loadCourseList,
      loadCategories,
      loadSiteConfig,
      loadCheckinStatus,
      loadHomeBannerConfig,
      formatPrice,
      goToSearch,
      goToNotifications,
      goToShop,
      goToCheckin,
      goToInvite,
      goToDetail,
      handleQuickGridTap,
      handleExploreTap,
      handleHomeBannerTap,
      syncTabBar,
    }
  },
}
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

/* ========== 首页容器 ========== */
.home-page {
  min-height: 100vh;
  background-color: #F5F7F6;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== Header Slots (inside NavBar) ========== */
.logo-text {
  font-family: $font-family-brand;
  font-size: 22px;
  font-weight: 800;
  color: $color-brand-dark;
  letter-spacing: 2px;
}

.header-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.icon-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #F5F7F6;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .header-icon-img {
    width: 32rpx;
    height: 32rpx;
  }

  .notification-dot {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    width: 14rpx;
    height: 14rpx;
    background-color: #EF4444;
    border-radius: 50%;
    border: 3rpx solid #FFFFFF;
  }
}

.icon-hover {
  opacity: 0.7;
}

/* ========== Search Bar ========== */
.search-section {
  background-color: $color-surface;
  padding: 0 20px 12px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: $spacing-8;
  background-color: $color-background;
  border: 1.5px solid $color-border;
  border-radius: $radius-20;
  padding: 10px 16px;

  .search-icon-img {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }
}

.search-placeholder {
  font-family: $font-family-title;
  font-size: 13px;
  color: $color-text-muted;
}

.search-hover {
  opacity: 0.8;
}

/* ========== Banner — 随机热门商品 ========== */
.banner-section {
  margin: 24rpx 40rpx 40rpx;
}

.banner-hot-product {
  height: 320rpx;
  border-radius: 40rpx;
  overflow: hidden;
  position: relative;

  .banner-hot-bg {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }

  .banner-hot-placeholder {
    background: linear-gradient(135deg, #3B6B5E, #2A5247);
  }

  .banner-hot-overlay {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 70%;
    background: linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0));
  }

  .banner-hot-content {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    padding: 32rpx 40rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    z-index: 1;

    .banner-hot-badge {
      align-self: flex-start;
      background-color: rgba(0, 150, 102, 0.9);
      border-radius: 20rpx;
      padding: 4rpx 16rpx;
      margin-bottom: 4rpx;

      .banner-hot-badge-text {
        font-size: 20rpx;
        font-weight: 600;
        color: #FFFFFF;
        line-height: 28rpx;
      }
    }

    .banner-hot-name {
      font-family: 'PingFang SC', system-ui, sans-serif;
      font-size: 36rpx;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 48rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .banner-hot-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4rpx;

      .banner-hot-students {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.8);
        line-height: 30rpx;
      }

      .banner-hot-price {
        font-family: 'JetBrains Mono', system-ui, sans-serif;
        font-size: 32rpx;
        font-weight: 700;
        color: #FFFFFF;
        line-height: 40rpx;
      }

      .banner-hot-free {
        font-family: system-ui, sans-serif;
        font-size: 28rpx;
      }
    }
  }
}

.banner-card {
  height: 320rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #E8F5EE, #CEE8DA);
  padding: 48rpx;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .banner-tag {
    align-self: flex-start;
    background-color: #009666;
    border-radius: 40rpx;
    padding: 6rpx 20rpx;
    margin-bottom: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .banner-tag-text {
      font-size: 22rpx;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 28rpx;
    }
  }

  .banner-title {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 40rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 56rpx;
    margin-bottom: 8rpx;
    white-space: pre-line;
  }

  .banner-subtitle {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 26rpx;
    color: #6B8A94;
    line-height: 36rpx;
  }

  .banner-dots {
    display: flex;
    gap: 12rpx;
    margin-top: 24rpx;

    .dot-active {
      width: 36rpx;
      height: 12rpx;
      background-color: #009666;
      border-radius: 6rpx;
    }

    .dot-inactive {
      width: 12rpx;
      height: 12rpx;
      background-color: #E2EBED;
      border-radius: 50%;
    }
  }

  .banner-deco {
    position: absolute;
    right: -60rpx;
    top: -60rpx;
    width: 360rpx;
    height: 360rpx;
    border-radius: 50%;
    background-color: rgba(0, 150, 102, 0.08);
  }
}

/* ========== Quick Grid ========== */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  padding: 0 40rpx;
  margin-bottom: 8rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 4rpx 16rpx;

  .grid-icon {
    width: 88rpx;
    height: 88rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .grid-icon-img {
      width: 44rpx;
      height: 44rpx;
    }
  }

  .grid-label {
    font-size: 22rpx;
    font-weight: 500;
    color: #6B8A94;
    line-height: 28rpx;
    text-align: center;
  }
}

.grid-item-hover {
  opacity: 0.7;
}

/* ========== Section Header ========== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40rpx;
  margin-bottom: 24rpx;

  .section-title {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 34rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 48rpx;
  }

  .section-more {
    font-size: 26rpx;
    color: #6B8A94;
    line-height: 36rpx;
  }
}

/* ========== Explore Cards ========== */
.explore-cards {
  display: flex;
  gap: 24rpx;
  padding: 0 40rpx;
  margin-bottom: 40rpx;
}

.explore-card {
  width: 206rpx;
  height: 192rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
  padding: 28rpx 24rpx;

  .explore-icon {
    width: 48rpx;
    height: 48rpx;
  }

  .explore-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 36rpx;
  }

  .explore-desc {
    font-size: 22rpx;
    color: #6B8A94;
    line-height: 30rpx;
  }
}

/* ========== Daily Card ========== */
.daily-card {
  margin: 0 40rpx 40rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #3B6B5E, #2A5247);
  padding: 40rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  .daily-content {
    flex: 1;
    display: flex;
    flex-direction: column;

    .daily-label {
      font-size: 26rpx;
      color: #FFFFFF;
      opacity: 0.75;
      line-height: 36rpx;
      margin-bottom: 8rpx;
    }

    .daily-title {
      font-size: 34rpx;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 48rpx;
      margin-bottom: 16rpx;
    }

    .daily-stats {
      display: flex;
      gap: 32rpx;

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;

        .stat-number {
          font-family: 'JetBrains Mono', system-ui, sans-serif;
          font-size: 40rpx;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 52rpx;
        }

        .stat-unit {
          font-size: 20rpx;
          color: #FFFFFF;
          opacity: 0.7;
          line-height: 28rpx;
        }
      }
    }
  }

  .daily-btn {
    background-color: rgba(255, 255, 255, 0.18);
    border: 2rpx solid rgba(255, 255, 255, 0.3);
    border-radius: 60rpx;
    padding: 20rpx 36rpx;
    flex-shrink: 0;

    .daily-btn-text {
      font-size: 26rpx;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 32rpx;
    }
  }

  .daily-deco {
    position: absolute;
    right: -80rpx;
    bottom: -80rpx;
    width: 280rpx;
    height: 280rpx;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.06);
  }
}

.daily-btn-hover {
  opacity: 0.8;
}

.daily-card-hover {
  opacity: 0.92;
}

/* ========== Hot Cards ========== */
.hot-cards {
  display: flex;
  gap: 24rpx;
  padding: 0 40rpx;
  margin-bottom: 40rpx;
}

.hot-card {
  width: 322rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  overflow: hidden;
  flex-shrink: 0;

  .hot-thumb {
    height: 180rpx;
    position: relative;

    .hot-thumb-img {
      width: 100%;
      height: 100%;
    }

    .hot-badge {
      position: absolute;
      left: 20rpx;
      top: 20rpx;
      border-radius: 20rpx;
      padding: 4rpx 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .hot-badge-text {
        font-size: 20rpx;
        font-weight: 600;
        color: #FFFFFF;
        line-height: 24rpx;
      }
    }
  }

  .hot-info {
    padding: 20rpx 24rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .hot-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #1A2E35;
      line-height: 40rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hot-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .hot-students {
        font-size: 22rpx;
        color: #6B8A94;
        line-height: 30rpx;
      }

      .hot-price {
        font-family: 'JetBrains Mono', system-ui, sans-serif;
        font-size: 28rpx;
        font-weight: 700;
        color: #009666;
        line-height: 40rpx;
      }
    }
  }
}

/* ========== Category Tabs ========== */
.cat-tabs {
  white-space: nowrap;
  padding: 28rpx 40rpx 32rpx;

  /* 隐藏滚动条 */
  &::-webkit-scrollbar {
    display: none;
  }

  /* 确保最后一个 tab 完整显示（右侧额外留白） */
  .cat-tab:last-child {
    margin-right: 40rpx;
  }
}

.cat-tab {
  display: inline-flex;
  padding: 10rpx 24rpx;
  border-radius: 40rpx;
  background-color: #F5F7F6;
  margin-right: 8rpx;

  .cat-tab-text {
    font-size: 26rpx;
    font-weight: 600;
    color: #6B8A94;
    line-height: 32rpx;
  }
}

.cat-tab-active {
  background-color: #009666;

  .cat-tab-text-active {
    color: #FFFFFF;
  }
}

/* ========== Course List ========== */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 40rpx 40rpx;
}

.course-card {
  display: flex;
  flex-direction: row;
  height: 188rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 28rpx rgba(26, 46, 53, 0.06);

  .course-thumb {
    width: 220rpx;
    height: 100%;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;

    .course-thumb-img {
      width: 100%;
      height: 100%;
    }

    .course-thumb-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #F0F5F2, #DDE9E3);
    }

    .course-badge {
      position: absolute;
      left: 12rpx;
      bottom: 12rpx;
      background-color: rgba(0, 77, 64, 0.8);
      border-radius: 8rpx;
      padding: 4rpx 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .course-badge-text {
        font-size: 20rpx;
        color: #FFFFFF;
        line-height: 20rpx;
      }
    }
  }

  .course-info {
    flex: 1;
    min-width: 0;
    padding: 22rpx 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .course-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #1A2E35;
      line-height: 40rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .course-desc {
      font-size: 22rpx;
      color: #6B8A94;
      line-height: 32rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .course-bottom {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;

      .course-students {
        font-size: 22rpx;
        color: #6B8A94;
        line-height: 30rpx;
      }

      .course-price {
        font-family: 'JetBrains Mono', system-ui, sans-serif;
        font-size: 32rpx;
        font-weight: 700;
        color: #009666;
        line-height: 44rpx;
      }

      .course-free {
        font-family: system-ui, sans-serif;
      }
    }
  }
}

/* ========== Skeleton Loading ========== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.skeleton-card {
  display: flex;
  gap: 28rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  padding: 28rpx;

  .skeleton-thumb {
    width: 200rpx;
    height: 160rpx;
    border-radius: 24rpx;
    background-color: #F0F5F2;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .skeleton-line {
      height: 28rpx;
      border-radius: 8rpx;
      background-color: #F0F5F2;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    .skeleton-line-long {
      width: 80%;
    }

    .skeleton-line-short {
      width: 50%;
    }
  }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ========== Error / Empty State ========== */
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 80rpx;

  .error-text,
  .empty-text {
    font-size: 26rpx;
    color: #6B8A94;
    margin-bottom: 32rpx;
  }

  .retry-btn {
    background-color: #009666;
    border-radius: 40rpx;
    padding: 16rpx 48rpx;

    .retry-text {
      font-size: 26rpx;
      color: #FFFFFF;
    }
  }
}

/* ========== Invite Banner ========== */
.invite-banner {
  margin: 0 40rpx 40rpx;
  background-color: #FFF0E8;
  border-radius: 40rpx;
  padding: 36rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .invite-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .invite-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1A2E35;
      line-height: 40rpx;
    }

    .invite-desc {
      font-size: 24rpx;
      color: #6B8A94;
      line-height: 34rpx;
    }
  }

  .invite-btn {
    background-color: #F5A623;
    border-radius: 40rpx;
    padding: 16rpx 32rpx;
    flex-shrink: 0;

    .invite-btn-text {
      font-size: 24rpx;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 32rpx;
      white-space: nowrap;
    }
  }
}

.invite-btn-hover {
  opacity: 0.85;
}

/* ========== Brand Footer ========== */
.brand-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 40rpx 64rpx;

  .brand-line {
    width: 64rpx;
    height: 6rpx;
    background-color: #004D40;
    border-radius: 3rpx;
    margin-bottom: 32rpx;
  }

  .brand-title {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 48rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 64rpx;
    margin-bottom: 8rpx;
  }

  .brand-subtitle {
    font-size: 28rpx;
    color: #6B8A94;
    line-height: 40rpx;
  }
}

/* ========== TabBar 占位 ========== */
.tabbar-placeholder {
  height: 156rpx;
}
</style>
