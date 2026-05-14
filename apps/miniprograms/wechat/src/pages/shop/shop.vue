<template>
  <view class="shop-page" :style="{ backgroundColor: '#F5F7F6', minHeight: '100vh' }">
    <!-- ========== Shop Header — 使用 NavBar 组件 ========== -->
    <NavBar :show-back="false" background="#FFFFFF">
      <template #left>
        <text class="logo-text">{{ siteName }}</text>
      </template>
      <template #right>
        <view class="cart-icon-container" hover-class="icon-hover" @tap="goToCart">
          <image src="/static/icons/cart.svg" class="cart-icon" mode="aspectFit" />
          <view class="cart-badge" v-if="cartCount > 0">{{ cartCount }}</view>
        </view>
      </template>
    </NavBar>

    <!-- ========== Shop Search ========== -->
    <view class="search-section">
      <view class="search-bar" hover-class="search-hover" @tap="goToSearch">
        <image src="/static/icons/search-bar.svg" class="search-icon" mode="aspectFit" />
        <text class="search-placeholder">搜索课程、会员、周边...</text>
      </view>
    </view>

    <!-- ========== VIP Banner ========== -->
    <view class="banner-section" v-if="bannerConfig.enabled" @tap="handleBannerTap">
      <view class="vip-banner">
        <view class="vip-tag">
          <text class="vip-tag-text">VIP</text>
        </view>
        <text class="vip-title">{{ bannerConfig.title }}</text>
        <text class="vip-subtitle">{{ bannerConfig.subtitle }}</text>
        <view class="vip-deco" />
      </view>
    </view>

    <!-- ========== Cat Tabs ========== -->
    <scroll-view scroll-x class="cat-tabs" :show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="(cat, idx) in categories"
          :key="cat.id || idx"
          :class="['cat-tab', activeCategory === idx ? 'cat-tab-active' : '']"
          @tap="handleCategoryChange(idx)"
        >
          <text :class="['cat-tab-text', activeCategory === idx ? 'cat-tab-text-active' : '']">{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- ========== Product Grid ========== -->
    <view class="product-grid">
      <LoadingState v-if="isLoading || isLoadingCategories" :message="isLoadingCategories ? '加载分类中...' : '加载商品中...'" />
      
      <template v-else-if="products.length > 0">
        <view
          class="product-card"
          v-for="product in products"
          :key="product.id"
          @tap="goToDetail(product)"
        >
          <view class="product-thumb">
            <image
              v-if="getProductImage(product)"
              :src="getProductImage(product)"
              mode="aspectFill"
              class="product-thumb-img"
              lazy-load
              @error="onImageError(product, $event)"
            />
            <view v-else class="product-thumb-placeholder" />
          </view>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <view class="product-stats">
              <text class="product-sales">已售 {{ product.salesCount || 0 }}</text>
              <text class="product-price">{{ formatPrice(product.price) }}</text>
            </view>
          </view>
        </view>
      </template>

      <EmptyState v-else message="暂无相关商品" />

      <!-- 加载更多 -->
      <view v-if="products.length > 0 && !isLoading" class="load-more-section">
        <view v-if="loadingMore" class="loading-more">
          <view class="spinner-sm" />
          <text>加载更多...</text>
        </view>
        <view v-else-if="!hasMore" class="no-more">
          <text>— 没有更多商品了 —</text>
        </view>
      </view>
    </view>

    <!-- ========== TabBar Placeholder ========== -->
    <view class="tabbar-placeholder" :style="{ height: (56 + safeArea.safeAreaBottom) + 'px' }" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, toRaw, onActivated } from 'vue'
import { productService } from '@/services/api/products'
import { httpClient } from '@/core/http-client'
import { showError } from '@/utils/toast'
import { checkMiniProgramUpdate } from '@/utils/update-manager'
import { syncCustomTabBar } from '@/utils/tab-bar'
import { buildFullUrl } from '@/utils/url'
import { useSafeArea } from '@/hooks/useSafeArea'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { logger } from '@/utils/logger'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'

// --- VIP Banner 配置 ---
interface BannerConfig {
  enabled: boolean
  title: string
  subtitle: string
  linkType: 'product' | 'ad' | 'custom' | 'none'
  linkUrl: string | null
  productId: string | null
}

/** Banner 默认配置（接口未返回时的兜底值） */
const DEFAULT_BANNER_CONFIG: BannerConfig = {
  enabled: true,
  title: '年度会员 · 全站畅学',
  subtitle: '128 门精品课程无限次学习',
  linkType: 'none',
  linkUrl: null,
  productId: null,
}

const bannerConfig = ref<BannerConfig>({ ...DEFAULT_BANNER_CONFIG })

/** 加载商城 VIP Banner 配置 */
const loadBannerConfig = async () => {
  try {
    const result = await httpClient.get('/public/miniprogram/shop-config')
    if (result) {
      bannerConfig.value = { ...DEFAULT_BANNER_CONFIG, ...result }
    }
  } catch (error) {
    // 加载失败时保持默认配置，不影响页面正常使用
    logger.warn('加载商城 Banner 配置失败，使用默认值', error)
  }
}

/** 点击 Banner 跳转处理 */
const handleBannerTap = () => {
  const { linkType, linkUrl, productId } = bannerConfig.value

  switch (linkType) {
    case 'product':
      if (productId) {
        uni.navigateTo({ url: `/subpackages/product/detail?id=${productId}` })
      }
      break
    case 'ad':
      // 广告页面跳转（预留）
      if (linkUrl) {
        uni.navigateTo({ url: linkUrl })
      }
      break
    case 'custom':
      if (linkUrl) {
        uni.navigateTo({ url: linkUrl })
      }
      break
    case 'none':
    default:
      // 不跳转
      break
  }
}

// --- Site Config（品牌名称等全局配置） ---
const { siteName, loadSiteConfig } = useSiteConfig()

// --- State ---
const safeArea = useSafeArea()
const activeCategory = ref(0)
const isLoading = ref(false)
const isLoadingCategories = ref(true)
const products = ref<any[]>([])
const categories = ref<any[]>([])
const cartCount = ref(0)

// Pagination
const pageSize = 20
const nextCursor = ref<string | null>(null)
const hasMore = ref(true)
const loadingMore = ref(false)

// --- Methods ---
const loadCategories = async () => {
  isLoadingCategories.value = true
  try {
    const result = await productService.listCategories()
    const apiCategories = (result.items || []).map((c: any) => ({
      id: c.id,
      name: c.name
    }))
    categories.value = [{ id: '', name: '全部' }, ...apiCategories]
  } catch (error) {
    console.error('Failed to load categories', error)
    categories.value = [{ id: '', name: '全部' }]
  } finally {
    isLoadingCategories.value = false
  }
}

const loadProducts = async (reset = true) => {
  if (reset) {
    isLoading.value = true
    nextCursor.value = null
    hasMore.value = true
  } else {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  }

  try {
    const categoryId = categories.value[activeCategory.value]?.id
    const params: any = { limit: pageSize }
    if (categoryId) params.categoryId = categoryId
    if (!reset && nextCursor.value) {
      params.cursor = nextCursor.value
    }

    const result = await productService.listProducts(params)
    const newItems = (result.items || []).map((item: any) => ({
      ...item,
      isFavorite: false
    }))

    // 调试日志：检查商品图片字段
    logger.debug('商品列表数据', {
      total: newItems.length,
      images: newItems.map((p: any) => ({
        name: p.name,
        resolvedImage: getProductImage(p) || '(空)',
        coverImage: p.coverImage || '(空)',
        imageUrl: p.imageUrl || '(空)',
        coverUrl: p.coverUrl || '(空)',
        mediaUrls: p.mediaUrls || [],
      })),
    })

    nextCursor.value = result.nextCursor ?? null
    hasMore.value = !!result.nextCursor && newItems.length > 0

    if (reset) {
      products.value = newItems
    } else {
      products.value = [...products.value, ...newItems]
    }
  } catch (error) {
    console.error('Failed to load products:', error)
    showError('加载商品失败')
  } finally {
    isLoading.value = false
    loadingMore.value = false
  }
}

const formatPrice = (price: any) => {
  if (typeof price === 'object' && price.amount !== undefined) {
    return `¥${price.amount}`
  }
  return `¥${price}`
}

/**
 * Function: getProductImage
 *
 * Description: 获取商城卡片图片地址，兼容前端适配字段与后端原始字段。
 *
 * Parameters:
 *	product(any): 商品列表项
 *
 * Returns:
 *	imageUrl(string): 可直接给小程序 image 使用的完整图片地址
 */
const getProductImage = (product: any): string => {
  const imageUrl = product?.coverImage
    || product?.imageUrl
    || product?.coverUrl
    || (Array.isArray(product?.mediaUrls) && product.mediaUrls.length > 0 ? product.mediaUrls[0] : '')
    || ''

  return buildFullUrl(imageUrl)
}

/** 图片加载失败回调，用于调试 */
const onImageError = (product: any, event: any) => {
  logger.warn('商品图片加载失败', {
    productId: product.id,
    productName: product.name,
    resolvedImage: getProductImage(product),
    coverImage: product.coverImage,
    imageUrl: product.imageUrl,
    coverUrl: product.coverUrl,
    mediaUrls: product.mediaUrls,
    error: event?.detail?.errMsg || 'unknown',
  })
}

const handleCategoryChange = (index: number) => {
  activeCategory.value = index
  loadProducts(true)
}

const goToSearch = () => {
  uni.navigateTo({ url: '/subpackages/search/index?source=shop' })
}

const goToCart = () => {
  uni.showToast({ title: '购物车功能开发中', icon: 'none' })
}

const goToDetail = (product: any) => {
  const rawProduct = toRaw(product)
  const productId = rawProduct?.id || product?.id || ''
  if (!productId) {
    showError('商品信息异常')
    return
  }
  uni.navigateTo({
    url: `/subpackages/product/detail?id=${productId}`
  })
}

// --- Lifecycle ---
onMounted(() => {
  syncCustomTabBar()
  checkMiniProgramUpdate()
  loadSiteConfig()
  // 并行加载分类和 Banner 配置
  loadBannerConfig()
  loadCategories().then(() => {
    loadProducts(true)
  })
})

onActivated(() => {
  syncCustomTabBar()
})

// --- Pull to Refresh / Reach Bottom ---
defineExpose({
  loadCategories,
  loadProducts
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.shop-page {
  min-height: 100vh;
  background-color: $color-background;
}

/* ========== Shop Header Slots (inside NavBar) ========== */
.logo-text {
  font-family: $font-family-brand;
  font-size: 22px;
  font-weight: 800;
  color: $color-brand-dark;
  letter-spacing: 2px;
}

.cart-icon-container {
  width: 36px;
  height: 36px;
  background-color: $color-background;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .cart-icon {
    width: 18px;
    height: 18px;
  }

  .cart-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background-color: #EF4444;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 600;
    min-width: 14px;
    height: 14px;
    padding: 0 4px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid $color-surface;
  }
}

.icon-hover {
  opacity: 0.7;
}

/* ========== Shop Search ========== */
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

  .search-icon {
    width: 15px;
    height: 15px;
  }

  .search-placeholder {
    font-family: $font-family-title;
    font-size: 13px;
    color: $color-text-muted;
  }
}

.search-hover {
  opacity: 0.8;
}

/* ========== VIP Banner ========== */
.banner-section {
  padding: 12px 20px 20px;
}

.vip-banner {
  height: 128px;
  border-radius: $radius-20;
  background: $gradient-dark-teal;
  padding: 24px;
  position: relative;
  overflow: clip;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .vip-tag {
    align-self: flex-start;
    background-color: $color-accent;
    border-radius: 4px;
    padding: 2px 8px;
    margin-bottom: 8px;

    .vip-tag-text {
      font-size: 11px;
      font-weight: 600;
      color: $color-surface;
    }
  }

  .vip-title {
    font-family: $font-family-title;
    font-size: 20px;
    font-weight: 600;
    color: $color-surface;
    margin-bottom: 4px;
  }

  .vip-subtitle {
    font-family: $font-family-title;
    font-size: 13px;
    color: rgba($color-surface, 0.8);
  }

  .vip-deco {
    position: absolute;
    right: -20px;
    top: -20px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background-color: rgba($color-surface, 0.05);
  }
}

/* ========== Cat Tabs ========== */
.cat-tabs {
  width: 100%;
  padding-bottom: 16px;

  .tabs-inner {
    display: flex;
    padding: 0 20px;
    gap: 4px;
  }
}

.cat-tab {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: $radius-20;
  background-color: $color-background;
  white-space: nowrap;

  .cat-tab-text {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-muted;
  }

  &.cat-tab-active {
    background-color: $color-primary;

    .cat-tab-text-active {
      color: $color-surface;
      font-weight: 600;
    }
  }
}

/* ========== Product Grid ========== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 20px 20px;
}

.product-card {
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .product-thumb {
    width: 100%;
    height: 220rpx;
    background-color: $color-background;

    .product-thumb-img {
      width: 100%;
      height: 100%;
      display: block;
    }

    .product-thumb-placeholder {
      width: 100%;
      height: 100%;
      background: $gradient-thumbnail;
    }
  }

  .product-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .product-name {
      font-size: 14px;
      font-weight: 600;
      color: $color-text-primary;
      line-height: 20px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .product-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .product-sales {
        font-size: 11px;
        color: $color-text-muted;
      }

      .product-price {
        font-family: $font-family-code;
        font-size: 14px;
        font-weight: 700;
        color: $color-primary;
      }
    }
  }
}

/* ========== Helpers ========== */
.tabbar-placeholder {
  width: 100%;
}

.load-more-section {
  grid-column: span 2;
  text-align: center;
  padding: 20px 0;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: $color-text-muted;
  font-size: 12px;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba($color-primary, 0.1);
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-more {
  color: $color-text-muted;
  font-size: 12px;
  opacity: 0.6;
}
</style>
