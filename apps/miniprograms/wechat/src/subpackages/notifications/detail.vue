<template>
  <view class="detail-page">
    <!-- 自定义导航栏 -->
    <NavBar title="通知详情" :show-back="true" bg-color="#FFFFFF" />

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <image src="/static/icons/empty-notification.svg" class="error-icon" mode="aspectFit" />
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 通知内容 -->
    <scroll-view v-else-if="detail" scroll-y class="detail-content">
      <view class="detail-inner">
        <!-- 头部信息 -->
        <view class="detail-header">
          <!-- 类型图标 -->
          <view class="icon-wrapper">
            <image
              src="/static/icons/ntf-system.svg"
              class="type-icon"
              mode="aspectFit"
            />
          </view>

          <view class="header-info">
            <text class="detail-title">{{ detail.title }}</text>
            <view class="meta-row">
              <text class="meta-tag">{{ typeLabel }}</text>
              <text class="meta-time">{{ formatTime(detail.createdAt) }}</text>
            </view>
          </view>
        </view>

        <!-- 分割线 -->
        <view class="divider" />

        <!-- 正文内容 -->
        <view class="detail-body">
          <text class="body-text" selectable>{{ detail.content }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { notificationService } from '@/services/api/notifications'
import type { NotificationDetail } from '@/services/api/notifications'

// ======================== 路由参数 ========================

const props = defineProps<{ id: string }>()

// ======================== 状态 ========================

const detail = ref<NotificationDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// ======================== 计算属性 ========================

/** 通知类型中文标签 */
const typeLabel = computed(() => {
  const map: Record<string, string> = { SYSTEM: '系统通知' }
  return map[detail.value?.type ?? ''] ?? '通知'
})

// ======================== 数据加载 ========================

async function loadDetail() {
  loading.value = true
  error.value = null

  try {
    detail.value = await notificationService.getDetail(props.id)
  } catch (e) {
    console.error('加载通知详情失败:', e)
    error.value = '加载失败，请返回重试'
  } finally {
    loading.value = false
  }
}

// ======================== 工具函数 ========================

/** 格式化时间 */
function formatTime(createdAt: string): string {
  const date = new Date(createdAt)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

// ======================== 生命周期 ========================

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #FFFFFF;
}

/* 加载/错误状态 */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #94A8B0;
}

.error-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.error-text {
  font-size: 28rpx;
  color: #94A8B0;
}

/* 详情内容 */
.detail-content {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

.detail-inner {
  width: 100%;
  box-sizing: border-box;
  padding: 32rpx;
}

/* 头部信息 */
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background-color: #E8F7F0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.type-icon {
  width: 48rpx;
  height: 48rpx;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1A2E35;
  line-height: 48rpx;
  margin-bottom: 12rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.meta-tag {
  font-size: 22rpx;
  color: #4DB892;
  background-color: #E8F7F0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.meta-time {
  font-size: 24rpx;
  color: #94A8B0;
}

/* 分割线 */
.divider {
  height: 1rpx;
  background-color: #E2EBED;
  margin: 32rpx 0;
}

/* 正文 */
.detail-body {
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 80rpx;
}

.body-text {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-size: 30rpx;
  color: #3A5058;
  line-height: 52rpx;
  letter-spacing: 0.5rpx;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
