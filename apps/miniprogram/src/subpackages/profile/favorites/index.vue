<template>
  <view class="page-container">
    <!-- 导航栏（NavBar 组件自动处理安全区域） -->
    <NavBar title="我的收藏" title-align="left" />

    <!-- 列表区域 -->
    <scroll-view
      class="list-container"
      scroll-y
      enable-back-to-top
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      :style="{ height: `calc(100vh - ${safeArea.navBarHeight}px)` }"
    >
      <view v-if="favorites.length > 0" class="favorites-list">
        <view 
          v-for="item in favorites" 
          :key="item.id" 
          class="favorite-card"
          @tap="handleNavigate(item)"
        >
          <!-- 缩略图 -->
          <view class="item-thumbnail">
            <view class="thumbnail-placeholder">
              <text class="type-icon">{{ getTypeIcon(item.type) }}</text>
            </view>
          </view>

          <!-- 内容区 -->
          <view class="item-content">
            <text class="item-title">{{ getItemTitle(item) }}</text>
            <text class="item-desc">{{ getItemDesc(item) }}</text>
            <view class="item-footer">
              <text class="item-date">收藏于 {{ formatDate(item.createdAt) }}</text>
            </view>
          </view>

          <!-- 收藏状态图标 -->
          <view class="favorite-action" @tap.stop="handleRemove(item.id)">
            <text class="star-icon">★</text>
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view v-if="hasMore" class="load-more">
          <text class="load-more-text">加载中...</text>
        </view>
        <view v-else-if="favorites.length > 0" class="no-more">
          <text class="no-more-text">没有更多了</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="empty-container">
        <empty-state
          icon="⭐"
          title="暂无收藏"
          description="你还没有收藏任何内容，快去逛逛吧"
          action-text="去逛逛"
          @action="handleGoBrowse"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { favoritesService, type Favorite, FavoriteType } from '@/services/favorites'
import { authService } from '@/services/api'
import { useSafeArea } from '@/hooks/useSafeArea'
import EmptyState from '@/components/EmptyState.vue'
import { showToast, showConfirm, showLoading, hideLoading } from '@/utils/toast'

/** 安全区域 */
const safeArea = useSafeArea()

/** 状态管理 */
const favorites = ref<Favorite[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(false)
const cursor = ref<string | null>(null)

/**
 * 检查是否具备访问个人收藏页的登录态。
 */
const ensureLoggedIn = () => {
  if (authService.getToken()) {
    return true
  }

  uni.redirectTo({ url: '/pages/login/login' })
  return false
}

/**
 * 获取收藏列表
 */
const fetchFavorites = async (isRefresh = false) => {
  if (loading.value) return
  
  loading.value = true
  
  try {
    const res = await favoritesService.getFavorites({
      cursor: isRefresh ? undefined : (cursor.value || undefined),
      limit: 10
    })
    
    if (isRefresh) {
      favorites.value = res.items
    } else {
      favorites.value = [...favorites.value, ...res.items]
    }
    
    cursor.value = res.nextCursor
    hasMore.value = res.hasMore
  } catch (err) {
    console.error('获取收藏列表失败:', err)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/**
 * 下拉刷新
 */
const onRefresh = () => {
  refreshing.value = true
  fetchFavorites(true)
}

/**
 * 上拉加载更多
 */
const onLoadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchFavorites()
  }
}

/**
 * 取消收藏
 */
const handleRemove = async (id: string) => {
  const confirmed = await showConfirm('确定要取消收藏吗？')
  if (!confirmed) return
  
  showLoading('正在取消...')
  try {
    const res = await favoritesService.removeFavorite(id)
    if (res.success) {
      favorites.value = favorites.value.filter(item => item.id !== id)
      showToast('已取消收藏')
      
      // 如果列表空了且还有更多，自动加载
      if (favorites.value.length === 0 && hasMore.value) {
        fetchFavorites(true)
      }
    }
  } catch (err) {
    console.error('取消收藏失败:', err)
  } finally {
    hideLoading()
  }
}

/**
 * 去逛逛
 */
const handleGoBrowse = () => {
  uni.switchTab({
    url: '/pages/shop/shop'
  })
}

/**
 * 跳转详情
 */
const handleNavigate = (item: Favorite) => {
  let url = ''
  if (item.type === FavoriteType.COURSE) {
    url = `/subpackages/product/detail?id=${item.productId}&type=course`
  } else if (item.type === FavoriteType.PRODUCT) {
    url = `/subpackages/product/detail?id=${item.productId}&type=product`
  }
  
  if (url) {
    uni.navigateTo({ url })
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 获取类型图标 (Mock)
 */
const getTypeIcon = (type: FavoriteType) => {
  switch (type) {
    case FavoriteType.COURSE: return '📚'
    case FavoriteType.PRODUCT: return '🌿'
    case FavoriteType.ARTICLE: return '📄'
    default: return '📍'
  }
}

/**
 * 获取项标题 (Mock)
 */
const getItemTitle = (item: Favorite) => {
  // 实际应用中应从 item.productInfo 获取，这里根据 ID 模拟
  if (item.productId === 'course_001') return '注册会计师全科通关班'
  if (item.productId === 'product_001') return '精品虎皮兰盆栽'
  if (item.productId === 'article_001') return '室内绿植养护指南'
  if (item.productId === 'course_002') return '中级会计职称精讲班'
  return '收藏项目'
}

/**
 * 获取项描述 (Mock)
 */
const getItemDesc = (item: Favorite) => {
  if (item.productId === 'course_001') return '涵盖会计、审计、税法等六大科目'
  if (item.productId === 'product_001') return '空气净化专家，好养易活'
  if (item.productId === 'article_001') return '让你的绿植告别枯萎'
  if (item.productId === 'course_002') return '系统讲解中级会计核心知识点'
  return '暂无描述'
}

onMounted(() => {
  if (!ensureLoggedIn()) return
  fetchFavorites(true)
})
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.page-container {
  min-height: 100vh;
  background-color: $color-background;
  display: flex;
  flex-direction: column;
}

/* 列表容器 */
.list-container {
  flex: 1;
}

.favorites-list {
  padding: $spacing-16 $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

/* 收藏卡片 */
.favorite-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  padding: $spacing-14;
  display: flex;
  align-items: center;
  gap: $spacing-12;
  position: relative;
  transition: opacity 0.2s;

  &:active {
    opacity: 0.9;
  }
}

.item-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: $radius-12;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: $gradient-thumbnail;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-icon {
  font-size: 32px;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 80px;
  padding: 2px 0;
  overflow: hidden;
}

.item-title {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  line-height: map-get($typography-card-title, line-height);
  color: $color-text-primary;
  margin-bottom: $spacing-4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-desc {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-muted;
  margin-bottom: $spacing-8;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.item-footer {
  display: flex;
  align-items: center;
}

.item-date {
  font-family: map-get($typography-label, font-family);
  font-weight: map-get($typography-label, font-weight);
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
}

.favorite-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: $spacing-4;
}

.star-icon {
  font-size: 18px;
  color: $color-accent;
}

/* 加载更多 & 空状态 */
.load-more, .no-more {
  padding: $spacing-20 0;
  text-align: center;
}

.load-more-text, .no-more-text {
  font-size: 12px;
  color: $color-text-muted;
}

.empty-container {
  padding-top: 20vh;
}
</style>
