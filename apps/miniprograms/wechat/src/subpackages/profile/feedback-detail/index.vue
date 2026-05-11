<template>
  <view class="page-container">
    <!-- 导航栏 -->
    <NavBar title="反馈详情" title-align="left" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll" :style="{ height: `calc(100vh - ${safeArea.navBarHeight}px)` }">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 加载失败 -->
      <view v-else-if="loadError" class="error-container">
        <text class="error-text">加载失败，</text>
        <text class="retry-link" @tap="fetchDetail">点击重试</text>
      </view>

      <!-- 详情内容 -->
      <view v-else-if="detail" class="detail-content">
        <!-- 反馈信息卡片 -->
        <view class="feedback-info-card">
          <!-- 头部：类型 + 状态 -->
          <view class="info-header">
            <view class="type-badge" :class="`type-${detail.type}`">
              <text class="type-text">{{ getTypeLabel(detail.type) }}</text>
            </view>
            <view class="status-badge" :class="`status-${detail.status}`">
              <text class="status-text">{{ getStatusLabel(detail.status) }}</text>
            </view>
          </view>

          <!-- 标题 -->
          <text class="feedback-title">{{ detail.title }}</text>

          <!-- 内容 -->
          <text class="feedback-content">{{ detail.content }}</text>

          <!-- 图片附件 -->
          <view v-if="detail.images && detail.images.length > 0" class="images-section">
            <text class="section-label">附件图片</text>
            <view class="image-grid">
              <image
                v-for="(img, idx) in detail.images"
                :key="idx"
                :src="img"
                class="feedback-image"
                mode="aspectFill"
                @tap="previewImage(img, detail.images)"
              />
            </view>
          </view>

          <!-- 提交时间 -->
          <view class="feedback-meta">
            <text class="meta-text">提交于 {{ formatDate(detail.createdAt) }}</text>
          </view>
        </view>

        <!-- 对话记录区域 -->
        <view class="conversation-section">
          <text class="section-title">对话记录</text>

          <view v-if="detail.replies && detail.replies.length > 0" class="conversation-list">
            <!-- 用户原始反馈（气泡） -->
            <view class="conversation-item user-item">
              <view class="avatar-box user-avatar">
                <text class="avatar-text">我</text>
              </view>
              <view class="bubble user-bubble">
                <text class="bubble-text">{{ detail.content }}</text>
                <text class="bubble-time">{{ formatDate(detail.createdAt) }}</text>
              </view>
            </view>

            <!-- 管理员回复（气泡） -->
            <view
              v-for="reply in detail.replies"
              :key="reply.id"
              class="conversation-item admin-item"
            >
              <view class="avatar-box admin-avatar">
                <text class="avatar-text">客</text>
              </view>
              <view class="bubble admin-bubble">
                <text class="bubble-label">客服回复</text>
                <text class="bubble-text">{{ reply.content }}</text>
                <text class="bubble-time">{{ formatDate(reply.createdAt) }}</text>
              </view>
            </view>
          </view>

          <!-- 无回复 -->
          <view v-else class="no-replies">
            <text class="no-replies-text">暂无回复，请耐心等待客服处理</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { feedbackService, type FeedbackDetail, FeedbackStatus, FeedbackType } from '@/services/feedback'
import { authService } from '@/services/api'
import { useSafeArea } from '@/hooks/useSafeArea'

/** 安全区域 */
const safeArea = useSafeArea()

/** 状态管理 */
const detail = ref<FeedbackDetail | null>(null)
const loading = ref(false)
const loadError = ref(false)
const feedbackId = ref('')

/**
 * 检查登录态
 */
const ensureLoggedIn = () => {
  if (authService.getToken()) return true
  uni.redirectTo({ url: '/pages/login/login' })
  return false
}

/**
 * 获取反馈详情
 */
const fetchDetail = async () => {
  if (!feedbackId.value) return

  loading.value = true
  loadError.value = false

  try {
    detail.value = await feedbackService.getFeedbackDetail(feedbackId.value)
  } catch (err) {
    console.error('获取反馈详情失败:', err)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 预览图片
 */
const previewImage = (current: string, urls: string[]) => {
  uni.previewImage({
    current,
    urls,
  })
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

onLoad((options) => {
  if (!ensureLoggedIn()) return
  feedbackId.value = options?.id || ''
  fetchDetail()
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

.content-scroll {
  flex: 1;
}

/* 加载与错误状态 */
.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40vh $spacing-16 0;
}

.loading-text {
  font-size: 14px;
  color: $color-text-muted;
}

.error-text {
  font-size: 13px;
  color: $color-text-muted;
}

.retry-link {
  font-size: 13px;
  color: $color-primary;
  font-weight: 500;
}

/* 详情内容 */
.detail-content {
  padding: $spacing-16 $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-16;
}

/* 反馈信息卡片 */
.feedback-info-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  padding: $spacing-14 $spacing-16;
  display: flex;
  flex-direction: column;
  gap: $spacing-10;
}

/* 头部标签行 */
.info-header {
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
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: map-get($typography-section-title, font-size);
  line-height: map-get($typography-section-title, line-height);
  color: $color-text-primary;
}

/* 反馈内容 */
.feedback-content {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-primary;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 图片附件 */
.images-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-8;

  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: $color-text-muted;
  }
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-8;
}

.feedback-image {
  width: 100px;
  height: 100px;
  border-radius: $radius-12;
}

/* 元信息 */
.feedback-meta {
  padding-top: $spacing-4;
}

.meta-text {
  font-size: 11px;
  color: $color-text-muted;
}

/* 对话记录区域 */
.conversation-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

.section-title {
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: map-get($typography-section-title, font-size);
  line-height: map-get($typography-section-title, line-height);
  color: $color-text-primary;
}

/* 对话列表 */
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-16;
}

/* 对话项 */
.conversation-item {
  display: flex;
  gap: $spacing-10;
  align-items: flex-start;
}

/* 头像 */
.avatar-box {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 12px;
  font-weight: 600;
}

.user-avatar {
  background-color: $color-primary-light;

  .avatar-text {
    color: $color-primary;
  }
}

.admin-avatar {
  background-color: #DBEAFE;

  .avatar-text {
    color: #2563EB;
  }
}

/* 气泡 */
.bubble {
  flex: 1;
  padding: $spacing-12 $spacing-14;
  border-radius: $radius-16;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;
}

.user-bubble {
  background-color: $color-primary-light;
}

.admin-bubble {
  background-color: $color-surface;
  border: 1px solid $color-border;
}

.bubble-label {
  font-size: 11px;
  font-weight: 600;
  color: #2563EB;
}

.bubble-text {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-primary;
  white-space: pre-wrap;
  word-break: break-all;
}

.bubble-time {
  font-size: 10px;
  color: $color-text-muted;
  align-self: flex-end;
}

/* 无回复 */
.no-replies {
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  padding: $spacing-24 $spacing-16;
  text-align: center;
}

.no-replies-text {
  font-size: 13px;
  color: $color-text-muted;
}
</style>
