<template>
  <view class="page-container">
    <!-- 导航栏 -->
    <NavBar title="我的反馈" title-align="left" />

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
      <!-- 反馈列表 -->
      <view v-if="feedbackList.length > 0" class="feedback-list">
        <view
          v-for="item in feedbackList"
          :key="item.id"
          class="feedback-card"
          @tap="goToDetail(item.id)"
        >
          <!-- 卡片头部：类型标签 + 状态标签 -->
          <view class="card-header">
            <view class="type-badge" :class="`type-${item.type}`">
              <text class="type-text">{{ getTypeLabel(item.type) }}</text>
            </view>
            <view class="status-badge" :class="`status-${item.status}`">
              <text class="status-text">{{ getStatusLabel(item.status) }}</text>
            </view>
          </view>

          <!-- 反馈标题 -->
          <text class="feedback-title">{{ item.title }}</text>

          <!-- 反馈内容预览 -->
          <text class="feedback-content-preview">{{ item.content }}</text>

          <!-- 卡片底部：时间 -->
          <view class="card-footer">
            <text class="feedback-time">{{ formatDate(item.createdAt) }}</text>
            <image :src="icons.arrow" class="arrow-icon" mode="aspectFit" />
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view v-if="hasMore" class="load-more">
          <text class="load-more-text">加载中...</text>
        </view>
        <view v-else-if="feedbackList.length > 0" class="no-more">
          <text class="no-more-text">没有更多了</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="empty-container">
        <empty-state
          icon="💬"
          title="暂无反馈记录"
          description="你还没有提交过反馈"
          action-text="去提交反馈"
          @action="goToFeedback"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { feedbackService, type Feedback, FeedbackStatus, FeedbackType } from '@/services/feedback'
import { authService } from '@/services/api'
import { useSafeArea } from '@/hooks/useSafeArea'
import EmptyState from '@/components/EmptyState.vue'

/** 安全区域 */
const safeArea = useSafeArea()

/** 状态管理 */
const feedbackList = ref<Feedback[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(false)
const cursor = ref<string | null>(null)

/** 箭头图标（与 profile 页保持一致） */
const icons = {
  arrow: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI4QTk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cG9seWxpbmUgcG9pbnRzPSI5IDE4IDE1IDEyIDkgNiIgLz4KPC9zdmc+Cg==',
}

/**
 * 检查登录态
 */
const ensureLoggedIn = () => {
  if (authService.getToken()) return true
  uni.redirectTo({ url: '/pages/login/login' })
  return false
}

/**
 * 获取反馈列表
 */
const fetchFeedbackList = async (isRefresh = false) => {
  if (loading.value) return

  loading.value = true

  try {
    const res = await feedbackService.getFeedbackList({
      cursor: isRefresh ? undefined : (cursor.value || undefined),
      limit: 20,
    })

    if (isRefresh) {
      feedbackList.value = res.items
    } else {
      feedbackList.value = [...feedbackList.value, ...res.items]
    }

    cursor.value = res.nextCursor
    hasMore.value = res.hasMore
  } catch (err) {
    console.error('获取反馈列表失败:', err)
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
  fetchFeedbackList(true)
}

/**
 * 上拉加载更多
 */
const onLoadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchFeedbackList()
  }
}

/**
 * 跳转反馈详情页
 */
const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/subpackages/profile/feedback-detail/index?id=${id}` })
}

/**
 * 跳转帮助与反馈页
 */
const goToFeedback = () => {
  uni.navigateTo({ url: '/subpackages/about/help-feedback/index' })
}

/**
 * 获取反馈类型标签
 */
const getTypeLabel = (type: FeedbackType) => {
  switch (type) {
    case FeedbackType.SUGGESTION: return '建议'
    case FeedbackType.BUG: return '缺陷'
    case FeedbackType.OTHER: return '其他'
    default: return type
  }
}

/**
 * 获取反馈状态标签
 */
const getStatusLabel = (status: FeedbackStatus) => {
  switch (status) {
    case FeedbackStatus.PENDING: return '待处理'
    case FeedbackStatus.PROCESSING: return '处理中'
    case FeedbackStatus.RESOLVED: return '已解决'
    case FeedbackStatus.CLOSED: return '已关闭'
    default: return status
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  if (!ensureLoggedIn()) return
  fetchFeedbackList(true)
})

// 每次页面显示时刷新（从详情页返回后状态可能变化）
onShow(() => {
  if (authService.getToken() && feedbackList.value.length > 0) {
    fetchFeedbackList(true)
  }
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

.feedback-list {
  padding: $spacing-16 $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

/* 反馈卡片 */
.feedback-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  padding: $spacing-14 $spacing-16;
  display: flex;
  flex-direction: column;
  gap: $spacing-8;

  &:active {
    background-color: $color-background;
  }
}

/* 卡片头部：类型 + 状态标签 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 类型标签 */
.type-badge {
  padding: 1px 8px;
  border-radius: $radius-8;
  background-color: $color-primary-light;

  .type-text {
    font-size: 10px;
    font-weight: 600;
    color: $color-primary;
    line-height: 14px;
  }

  &.type-bug {
    background-color: #FEE2E2;

    .type-text {
      color: #DC2626;
    }
  }

  &.type-other {
    background-color: #F3F4F6;

    .type-text {
      color: #6B7280;
    }
  }
}

/* 状态标签 */
.status-badge {
  padding: 1px 8px;
  border-radius: $radius-8;

  .status-text {
    font-size: 10px;
    font-weight: 600;
    line-height: 14px;
  }

  &.status-pending {
    background-color: #FEF3C7;

    .status-text {
      color: #D97706;
    }
  }

  &.status-processing {
    background-color: #DBEAFE;

    .status-text {
      color: #2563EB;
    }
  }

  &.status-resolved {
    background-color: $color-primary-light;

    .status-text {
      color: $color-primary;
    }
  }

  &.status-closed {
    background-color: #F3F4F6;

    .status-text {
      color: #9CA3AF;
    }
  }
}

/* 反馈标题 */
.feedback-title {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  line-height: map-get($typography-card-title, line-height);
  color: $color-text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 反馈内容预览 */
.feedback-content-preview {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-muted;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-4;
}

.feedback-time {
  font-family: map-get($typography-label, font-family);
  font-weight: map-get($typography-label, font-weight);
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
}

.arrow-icon {
  width: 14px;
  height: 14px;
}

/* 加载更多 & 空状态 */
.load-more,
.no-more {
  padding: $spacing-20 0;
  text-align: center;
}

.load-more-text,
.no-more-text {
  font-size: 12px;
  color: $color-text-muted;
}

.empty-container {
  padding-top: 20vh;
}
</style>
