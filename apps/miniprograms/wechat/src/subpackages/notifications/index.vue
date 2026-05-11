<template>
  <view class="notifications-page">
    <!-- 自定义导航栏 -->
    <NavBar title="通知中心" :show-back="true" bg-color="#FFFFFF" />

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeTab === tab.value }"
          @tap="switchTab(tab.value)"
        >
          <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.value }">
            {{ tab.label }}
          </text>
          <view v-if="activeTab === tab.value" class="tab-indicator" />
        </view>
      </scroll-view>
    </view>

    <!-- 通知列表 -->
    <scroll-view
      scroll-y
      class="notification-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 内部容器：承载 padding，避免 scroll-view padding 导致溢出 -->
      <view class="list-inner">
        <!-- 空状态 -->
        <view v-if="!loading && notifications.length === 0" class="empty-state">
          <image
            src="/static/icons/empty-notification.svg"
            class="empty-icon"
            mode="aspectFit"
          />
          <text class="empty-text">暂无通知</text>
          <text class="empty-sub">有新消息时会在这里提醒你</text>
        </view>

        <!-- 通知列表项 -->
        <view
          v-for="item in notifications"
          :key="item.id"
          class="notification-card"
          :class="{ unread: !item.isRead }"
          @tap="onNotificationTap(item)"
        >
          <!-- 未读指示点 -->
          <view v-if="!item.isRead" class="unread-dot" />

          <!-- 类型图标 -->
          <view class="icon-wrapper" :class="`icon-${item.type.toLowerCase()}`">
            <image
              :src="getTypeIcon(item.type)"
              class="type-icon"
              mode="aspectFit"
            />
          </view>

          <!-- 内容 -->
          <view class="notification-content">
            <text class="notification-title">{{ item.title }}</text>
            <text v-if="item.summary" class="notification-summary">{{ item.summary }}</text>
            <text class="notification-time">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>

        <!-- 加载状态 -->
        <view class="loading-footer">
          <text v-if="loadingMore" class="loading-text">加载中...</text>
          <text v-else-if="!hasMore && notifications.length > 0" class="loading-text">没有更多了</text>
        </view>
      </view>
    </scroll-view>

    <!-- 全部已读按钮 -->
    <view v-if="notifications.length > 0" class="mark-all-btn" @tap="onMarkAllRead">
      <text class="mark-all-text">全部标为已读</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationService } from '@/services/api/notifications'
import type { NotificationItem, NotificationType } from '@/services/api/notifications'
import { useAuth } from '@/hooks/useAuth'

// ======================== 认证状态 ========================

const auth = useAuth()

// ======================== Tab 配置 ========================

const tabs = [
  { label: '全部', value: '' },
  { label: '系统', value: 'SYSTEM' },
]

const activeTab = ref('')

// ======================== 分页状态 ========================

const notifications = ref<NotificationItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)

// ======================== 数据加载 ========================

/** 加载通知列表（首页或切换 Tab） */
async function loadNotifications(append = false) {
  if (!auth.isLoggedIn.value) return

  if (!append) {
    loading.value = true
    nextCursor.value = null
  } else {
    loadingMore.value = true
  }

  try {
    const result = await notificationService.list({
      cursor: append ? nextCursor.value : null,
      limit: 20,
      type: (activeTab.value || undefined) as NotificationType | undefined,
    })

    if (append) {
      notifications.value.push(...result.items)
    } else {
      notifications.value = result.items
    }

    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
    isRefreshing.value = false
  }
}

/** 加载更多（滚动到底部） */
async function loadMore() {
  if (!hasMore.value || loadingMore.value || loading.value) return
  await loadNotifications(true)
}

/** 下拉刷新 */
async function onRefresh() {
  isRefreshing.value = true
  await loadNotifications(false)
}

/** 切换 Tab */
function switchTab(value: string) {
  activeTab.value = value
  loadNotifications(false)
}

// ======================== 交互 ========================

/** 点击通知：标记已读 + 跳转详情 */
async function onNotificationTap(item: NotificationItem) {
  // 标记已读
  if (!item.isRead) {
    item.isRead = true
    try {
      await notificationService.markAsRead(item.id)
    } catch {
      item.isRead = false // 回滚
    }
  }

  // 跳转到通知详情页
  uni.navigateTo({
    url: `/subpackages/notifications/detail?id=${item.id}`,
  })
}

/** 全部标记已读 */
async function onMarkAllRead() {
  try {
    const result = await notificationService.markAllAsRead()
    // 批量更新本地状态
    notifications.value.forEach(n => { n.isRead = true })
    uni.showToast({ title: `已标记 ${result.markedCount} 条`, icon: 'none' })
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

// ======================== 工具函数 ========================

/** 获取通知类型图标路径 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    SYSTEM: '/static/icons/ntf-system.svg',
  }
  return icons[type] || '/static/icons/ntf-system.svg'
}

/** 格式化时间 */
function formatTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ======================== 生命周期 ========================

onMounted(() => {
  loadNotifications(false)
})
</script>

<style scoped>
/* 页面容器 */
.notifications-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F5F7F6;
}

/* 筛选标签 */
.filter-tabs {
  background-color: #FFFFFF;
  border-bottom: 1rpx solid #E2EBED;
}

.tabs-scroll {
  white-space: nowrap;
  padding: 0 20rpx;
}

.tab-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 24rpx;
  position: relative;
}

.tab-text {
  font-size: 28rpx;
  color: #6B8A94;
  font-weight: 400;
}

.tab-text-active {
  color: #009666;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 24rpx;
  right: 24rpx;
  height: 4rpx;
  background-color: #009666;
  border-radius: 2rpx;
}

/* 通知列表 */
.notification-list {
  flex: 1;
}

/* 内部容器承载 padding，避免 scroll-view padding 导致右侧溢出 */
.list-inner {
  padding: 24rpx 32rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 32rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 30rpx;
  color: #6B8A94;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.empty-sub {
  font-size: 24rpx;
  color: #94A8B0;
}

/* 通知卡片 */
.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 28rpx;
  gap: 20rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  border: 2rpx solid #E2EBED;
  margin-bottom: 20rpx;
  position: relative;
  box-sizing: border-box;
  width: 100%;
}

.notification-card.unread {
  background-color: #FFFFFF;
}

/* 未读圆点 */
.unread-dot {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #009666;
}

/* 类型图标 */
.icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.icon-system { background-color: #E8F7F0; }

.type-icon {
  width: 48rpx;
  height: 48rpx;
}

/* 通知内容 */
.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  overflow: hidden;
}

.notification-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A2E35;
  line-height: 40rpx;
  word-break: break-all;
}

.notification-summary {
  font-size: 26rpx;
  color: #6B8A94;
  line-height: 36rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 22rpx;
  color: #94A8B0;
  margin-top: 4rpx;
}

/* 加载状态 */
.loading-footer {
  padding: 32rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 24rpx;
  color: #94A8B0;
}

/* 全部已读按钮 */
.mark-all-btn {
  padding: 32rpx 0 48rpx;
  text-align: center;
}

.mark-all-text {
  font-size: 26rpx;
  color: #6B8A94;
}
</style>
