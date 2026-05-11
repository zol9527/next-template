<template>
  <view class="page-container">
    <!-- 导航栏（NavBar 组件自动处理安全区域） -->
    <NavBar title="我的课程" title-align="left" />

    <!-- 2. Tab 筛选器 -->
    <view class="tab-filter">
      <view 
        v-for="tab in tabs" 
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @tap="handleTabChange(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 3. 课程列表 -->
    <scroll-view scroll-y class="course-list-scroll">
      <view class="course-list">
        <!-- 加载中 -->
        <template v-if="loading">
          <view class="loading-container">
            <view class="loading-spinner"></view>
            <text class="loading-text">加载中...</text>
          </view>
        </template>

        <!-- 错误状态 -->
        <template v-else-if="error">
          <empty-state
            icon="❌"
            title="加载失败"
            :description="error"
            action-text="重新加载"
            @action="loadData"
          />
        </template>

        <!-- 课程内容 -->
        <template v-else-if="displayCourses.length > 0">
          <view v-for="course in displayCourses" :key="course.id" class="course-card">
            <!-- 课程缩略图 -->
            <view class="course-thumb">
              <view class="course-thumb-placeholder">
                <view class="book-icon"></view>
              </view>
            </view>
            
            <view class="course-info">
              <text class="course-name">{{ course.name }}</text>
              <text class="course-desc">共 {{ course.lessonCount || 0 }} 课时</text>
              
              <view class="course-bottom">
                <!-- 课程标签 -->
                <view class="course-tag">
                  <text class="tag-text">{{ course.tag }}</text>
                </view>
                
                <!-- 进度条 (Mock) -->
                <view class="progress-container">
                  <view class="progress-bar">
                    <view class="progress-inner" :style="{ width: (course.progress || 0) + '%' }"></view>
                  </view>
                  <text class="progress-text">已学 {{ course.progress || 0 }}%</text>
                </view>
              </view>
            </view>
          </view>
        </template>
        
        <!-- 4. 空状态 -->
        <empty-state
          v-else
          :icon="emptyConfig.icon"
          :title="emptyConfig.title"
          :description="emptyConfig.description"
          :action-text="emptyConfig.actionText"
          @action="handleGoShop"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { orderService } from '@/services/api/orders'
import { authService } from '@/services/api'
import { favoritesService, FavoriteType } from '@/services/favorites'

// --- Tab 数据 ---
const tabs = [
  { label: '全部', value: 'all' },
  { label: '最近购买', value: 'recent' },
  { label: '收藏', value: 'favorites' }
]
const currentTab = ref('all')

// --- 课程数据 ---
interface Course {
  id: string
  name: string
  lessonCount: number
  tag: string
  progress: number
  buyTime?: string
}

const allCourses = ref<Course[]>([])
const favoriteCourses = ref<Course[]>([])
const loading = ref(false)
const error = ref('')

/**
 * 检查是否具备访问个人课程页的登录态。
 */
const ensureLoggedIn = () => {
  if (authService.getToken()) {
    return true
  }

  uni.redirectTo({ url: '/pages/login/login' })
  return false
}

// --- 过滤逻辑 ---
const displayCourses = computed(() => {
  if (currentTab.value === 'all') {
    return allCourses.value
  } else if (currentTab.value === 'recent') {
    // 最近购买：按购买时间排序
    return [...allCourses.value].sort((a, b) => {
      const timeA = a.buyTime ? new Date(a.buyTime).getTime() : 0
      const timeB = b.buyTime ? new Date(b.buyTime).getTime() : 0
      return timeB - timeA
    })
  } else if (currentTab.value === 'favorites') {
    return favoriteCourses.value
  }
  return []
})

// --- 空状态配置（每个 tab 独立图标 + 文案） ---
const emptyConfig = computed(() => {
  if (currentTab.value === 'favorites') {
    return {
      icon: '/static/icons/empty-favorites-courses.svg',
      title: '暂无收藏课程',
      description: '喜欢的课程可以点击收藏，方便随时查看',
      actionText: '去发现好课'
    }
  }
  if (currentTab.value === 'recent') {
    return {
      icon: '/static/icons/empty-recent.svg',
      title: '暂无最近购买',
      description: '你最近购买的课程将在这里显示',
      actionText: '去逛逛'
    }
  }
  return {
    icon: '/static/icons/empty-courses.svg',
    title: '暂无已购课程',
    description: '快去选购你心仪的课程开启学习吧',
    actionText: '去选课'
  }
})

// --- 交互处理 ---
const handleTabChange = (val: string) => {
  currentTab.value = val
}

const handleGoShop = () => {
  uni.switchTab({
    url: '/pages/shop/shop'
  })
}

// --- 数据加载 ---
const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    // 1. 获取已购课程 (Mock 数据处理，因为后端具体返回字段需适配)
    const orderRes = await orderService.getOrderList({ status: 'paid' })
    // 这里简单 Mock 转换，实际应根据 API 字段映射
    if (orderRes.orders) {
      allCourses.value = orderRes.orders.map((o: any) => ({
        id: o.id,
        name: o.productName || '注册会计师全科通关班',
        lessonCount: o.lessonCount || 40,
        tag: o.categoryName || '注册会计师',
        progress: Math.floor(Math.random() * 100), // 进度通常在学习服务中，这里 Mock
        buyTime: o.createdAt
      }))
    }

    // 2. 获取收藏课程
    const favRes = await favoritesService.getFavorites({ type: FavoriteType.COURSE })
    if (favRes.items) {
      favoriteCourses.value = favRes.items.map((f: any) => ({
        id: f.productId,
        name: '收藏课程 - ' + f.productId,
        lessonCount: 20,
        tag: '热门课程',
        progress: 0
      }))
    }
  } catch (e) {
    console.error('加载课程数据失败', e)
    error.value = '网络连接失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!ensureLoggedIn()) return
  loadData()
})
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-background;
}

/* ===== Tab Filter ===== */
.tab-filter {
  display: flex;
  padding: 12px $spacing-20;
  gap: $spacing-8;
  background-color: $color-surface;
  flex-shrink: 0;
}

.tab-item {
  padding: 7px $spacing-18;
  background-color: $color-background;
  border-radius: $radius-20;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &.active {
    background-color: $color-primary;
    .tab-text {
      color: #FFFFFF;
      font-weight: 600;
    }
  }
}

.tab-text {
  font-family: map-get($typography-body, font-family);
  font-weight: 500;
  font-size: map-get($typography-body, font-size);
  color: $color-text-muted;
}

/* ===== Course List ===== */
.course-list-scroll {
  flex: 1;
  overflow: hidden;
}

.course-list {
  padding: $spacing-16 $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

.course-card {
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  padding: $spacing-14;
  display: flex;
  align-items: center;
  gap: $spacing-12;
}

.course-thumb {
  width: 80px;
  height: 80px;
  border-radius: $radius-12;
  overflow: hidden;
  background-color: $color-primary-light;
}

.course-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-icon {
  width: 24px;
  height: 24px;
  border: 1.5px solid $color-primary;
  border-radius: 2px;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: 6px;
    left: 4px;
    width: 12px;
    height: 1.5px;
    background-color: $color-primary;
    box-shadow: 0 4px 0 $color-primary, 0 8px 0 $color-primary;
  }
}

.course-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.course-name {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  line-height: map-get($typography-card-title, line-height);
  color: $color-text-primary;
  margin-bottom: $spacing-4;
}

.course-desc {
  font-family: map-get($typography-label, font-family);
  font-weight: map-get($typography-label, font-weight);
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
  margin-bottom: $spacing-8;
}

.course-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.course-tag {
  background-color: $color-primary-light;
  padding: 2px $spacing-8;
  border-radius: 10px;
}

.tag-text {
  font-size: map-get($typography-label, font-size);
  color: $color-primary;
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.progress-bar {
  width: 60px;
  height: 4px;
  background-color: $color-background;
  border-radius: 2px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background-color: $color-primary;
  border-radius: 2px;
}

.progress-text {
  font-size: map-get($typography-tab-bar, font-size);
  color: $color-text-muted;
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid $color-border;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.loading-text {
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
