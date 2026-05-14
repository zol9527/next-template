<template>
  <view class="page-container">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar title="我的推广码" />

    <scroll-view class="content-scroll" scroll-y>
      <view class="content-wrapper">
        <!-- 生成推广码按钮 -->
        <view class="action-card">
          <view class="generate-btn" @tap="showGenerateModal" :class="{ disabled: codes.length >= 3 }">
            <text class="generate-icon">+</text>
            <text class="generate-text">生成新推广码</text>
            <text class="generate-hint" v-if="codes.length >= 3">(已达到上限)</text>
          </view>
          <view class="limit-info">
            <text class="limit-text">推广码数量：{{ codes.length }}/3</text>
          </view>
        </view>

        <!-- 推广码列表 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">我的推广码 ({{ codes.length }})</text>
          </view>

          <!-- 空状态 -->
          <view class="empty-state" v-if="!loading && codes.length === 0">
            <text class="empty-icon">🎫</text>
            <text class="empty-text">暂无推广码</text>
            <text class="empty-desc">点击上方按钮生成您的第一个推广码</text>
          </view>

          <!-- 推广码卡片列表 -->
          <view class="code-list" v-if="codes.length > 0">
            <view class="code-card" v-for="code in codes" :key="code.id">
              <!-- 推广码头部 -->
              <view class="code-card-header">
                <text class="code-value">{{ code.code }}</text>
                <view class="status-badge" :class="'status-' + code.status">
                  <text class="status-text">{{ getStatusText(code.status) }}</text>
                </view>
              </view>

              <!-- 推广码数据 -->
              <view class="stats-grid">
                <view class="stat-item">
                  <text class="stat-value">{{ code.usageCount || 0 }}</text>
                  <text class="stat-label">使用次数</text>
                </view>
                <view class="stat-divider"></view>
                <view class="stat-item">
                  <text class="stat-value">{{ code.orderCount || 0 }}</text>
                  <text class="stat-label">成交订单</text>
                </view>
                <view class="stat-divider"></view>
                <view class="stat-item">
                  <text class="stat-value">¥{{ code.commissionAmount || '0.00' }}</text>
                  <text class="stat-label">累计佣金</text>
                </view>
              </view>

              <!-- 推广码时间 -->
              <view class="code-footer">
                <text class="time-text">创建时间: {{ formatTime(code.createdAt) }}</text>
              </view>

              <!-- 操作按钮 -->
              <view class="action-group">
                <view class="action-btn secondary" @tap="handleCopy(code.code)">
                  <text>复制</text>
                </view>
                <view class="action-btn secondary" @tap="handleShare(code)">
                  <text>分享</text>
                </view>
                <view class="action-btn" :class="code.status === 'active' ? 'danger-ghost' : 'primary-ghost'"
                  @tap="handleToggleStatus(code)">
                  <text>{{ code.status === 'active' ? '禁用' : '启用' }}</text>
                </view>
                <view class="action-btn danger-ghost" @tap="handleDelete(code)">
                  <text>删除</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <!-- 底部安全区 -->
      <view :style="{ height: safeArea.safeAreaBottom + 'px' }"></view>
    </scroll-view>

    <!-- 加载状态 -->
    <view class="loading-overlay" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 确认生成推广码弹窗 -->
    <view class="modal-overlay" v-if="showModal" @tap="closeModal" catchtouchmove="true">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">生成新推广码</text>
          <view class="modal-close" @tap="closeModal">
            <text class="close-icon">×</text>
          </view>
        </view>
        <view class="modal-body">
          <view class="confirm-content">
            <text class="confirm-emoji">✨</text>
            <text class="confirm-title">系统将自动生成唯一推广码</text>
            <text class="confirm-desc">8位字母数字组合，方便记忆和分享</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn-cancel" @tap="closeModal">
            <text>取消</text>
          </view>
          <view class="modal-btn-confirm" @tap="handleGenerate">
            <text>确认生成</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import { distributionService } from '@/services/api/distribution'
import { showSuccess, showError } from '@/utils/toast'
import { logger } from '@/utils/logger'
import { useSafeArea } from '@/hooks/useSafeArea'

type PromoterCode = {
  id: string
  code: string
  status?: string
  usageCount?: number
  orderCount?: number
  commissionAmount?: string | number
  createdAt?: string
} & Record<string, unknown>

const safeArea = useSafeArea()
const authStore = useAuthStore()
const loading = ref(false)
const showModal = ref(false)
const codes = ref<PromoterCode[]>([])

// URL 参数
let shareMode = false

const getPageOptions = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> }
  return currentPage?.options || {}
}

/**
 * 加载推广码列表
 */
const loadCodes = async () => {
  if (!authStore.hasRole('promoter')) {
    showError('您暂未开通推广员功能')
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  try {
    loading.value = true
    const result = await distributionService.getPromoterCodes() as { codes?: PromoterCode[] }
    codes.value = result.codes || []

    if (shareMode && codes.value.length > 0) {
      handleShare(codes.value[0])
    }
  } catch (error) {
    logger.error('加载推广码列表失败', error)
    showError('加载数据失败，请重试')
  } finally {
    loading.value = false
  }
}

/**
 * 显示生成推广码确认弹窗
 */
const showGenerateModal = () => {
  if (codes.value.length >= 3) {
    showError('最多只能创建 3 个推广码')
    return
  }
  showModal.value = true
}

/**
 * 关闭弹窗
 */
const closeModal = () => {
  showModal.value = false
}

/**
 * 生成新推广码
 */
const handleGenerate = async () => {
  try {
    loading.value = true
    await distributionService.generatePromoterCode({
      type: 'auto'
    })

    showSuccess('生成成功')
    closeModal()
    await loadCodes()
  } catch (error) {
    logger.error('生成推广码失败', error)
    const message =
      error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
        ? error.message
        : '生成失败，请重试'
    showError(message)
  } finally {
    loading.value = false
  }
}

/**
 * 复制推广码
 */
const handleCopy = (code: string) => {
  uni.setClipboardData({
    data: code,
    success: () => {
      showSuccess('已复制到剪贴板')
    }
  })
}

/**
 * 分享推广码
 */
const handleShare = (codeData: PromoterCode) => {
  const shareContent = `我在使用这个优质的教育平台，通过我的专属推广码【${codeData.code}】注册，可以获得更多优惠！`

  uni.showModal({
    title: '分享推广码',
    content: shareContent,
    confirmText: '复制推广码',
    cancelText: '关闭',
    success: (res) => {
      if (res.confirm) {
        handleCopy(codeData.code)
      }
    }
  })
}

/**
 * 切换推广码状态
 */
const handleToggleStatus = async (codeData: PromoterCode) => {
  const action = codeData.status === 'active' ? '禁用' : '启用'

  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action}推广码【${codeData.code}】吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          loading.value = true

          if (codeData.status === 'active') {
            await distributionService.disablePromoterCode(codeData.id)
          } else {
            await distributionService.enablePromoterCode(codeData.id)
          }

          showSuccess(`${action}成功`)
          await loadCodes()
        } catch (error) {
          logger.error(`${action}推广码失败`, { codeId: codeData.id, error })
          const errorMessage =
            error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
              ? error.message
              : `${action}失败，请重试`
          showError(errorMessage)
        } finally {
          loading.value = false
        }
      }
    }
  })
}

/**
 * 获取状态文本
 */
const getStatusText = (status?: string) => {
  const statusMap = {
    active: '启用中',
    inactive: '已禁用'
  }
  return (status && statusMap[status as keyof typeof statusMap]) || '未知'
}

/**
 * 删除推广码
 */
const handleDelete = async (codeData: PromoterCode) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除推广码【${codeData.code}】吗？删除后无法恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          loading.value = true
          await distributionService.deletePromoterCode(codeData.id)
          showSuccess('删除成功')
          await loadCodes()
        } catch (error) {
          logger.error('删除推广码失败', { codeId: codeData.id, error })
          const message = error instanceof Error ? error.message : '删除失败，请重试'
          showError(message)
        } finally {
          loading.value = false
        }
      }
    }
  })
}

/**
 * 格式化时间
 */
const formatTime = (time?: string) => {
  if (!time) return '-'
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}

onMounted(async () => {
  const options = getPageOptions()
  shareMode = options.mode === 'share'
  await loadCodes()
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

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.content-wrapper {
  padding: $spacing-20;
}

/* Action Card */
.action-card {
  margin-bottom: $spacing-24;

  .generate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    background-color: $color-primary;
    border-radius: $radius-20;
    transition: all 0.2s ease;

    &:active {
      opacity: 0.8;
      transform: scale(0.98);
    }

    &.disabled {
      background-color: $color-text-muted;
      opacity: 0.5;
      pointer-events: none;
    }

    .generate-icon {
      font-size: 24px;
      color: $color-surface;
      margin-right: $spacing-8;
    }

    .generate-text {
      font-family: $font-family-body;
      font-weight: 600;
      font-size: 15px;
      color: $color-surface;
    }

    .generate-hint {
      font-size: 12px;
      color: rgba($color-surface, 0.8);
      margin-left: $spacing-8;
    }
  }

  .limit-info {
    display: flex;
    justify-content: center;
    margin-top: $spacing-12;

    .limit-text {
      font-size: 12px;
      color: $color-text-muted;
    }
  }
}

/* Section Header */
.section-header {
  margin-bottom: $spacing-16;

  .section-title {
    font-family: $font-family-title;
    font-weight: 600;
    font-size: 16px;
    color: $color-text-primary;
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px $spacing-20;
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;

  .empty-icon {
    font-size: 64px;
    margin-bottom: $spacing-16;
  }

  .empty-text {
    font-family: $font-family-title;
    font-weight: 600;
    font-size: 16px;
    color: $color-text-primary;
    margin-bottom: $spacing-8;
  }

  .empty-desc {
    font-size: 13px;
    color: $color-text-muted;
    text-align: center;
  }
}

/* Code Card */
.code-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  padding: $spacing-20;
  margin-bottom: $spacing-16;
  border: 1px solid $color-border;

  .code-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-20;

    .code-value {
      font-family: $font-family-code;
      font-weight: 700;
      font-size: 20px;
      color: $color-text-primary;
      letter-spacing: 1px;
    }

    .status-badge {
      padding: 4px $spacing-12;
      border-radius: $radius-20;

      &.status-active {
        background-color: $color-primary-light;
        .status-text { color: $color-primary; }
      }

      &.status-inactive {
        background-color: #F0F2F5;
        .status-text { color: $color-text-muted; }
      }

      .status-text {
        font-size: 12px;
        font-weight: 500;
      }
    }
  }

  .stats-grid {
    display: flex;
    align-items: center;
    background-color: $color-background;
    border-radius: $radius-12;
    padding: $spacing-16;
    margin-bottom: $spacing-16;

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-value {
        font-family: $font-family-title;
        font-weight: 600;
        font-size: 16px;
        color: $color-text-primary;
      }

      .stat-label {
        font-size: 11px;
        color: $color-text-muted;
        margin-top: $spacing-4;
      }
    }

    .stat-divider {
      width: 1px;
      height: 24px;
      background-color: $color-border;
    }
  }

  .code-footer {
    margin-bottom: $spacing-20;
    .time-text {
      font-size: 12px;
      color: $color-text-muted;
    }
  }

  .action-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-12;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      border-radius: $radius-20;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid transparent;

      &.secondary {
        background-color: #F0F2F5;
        color: $color-text-primary;
      }

      &.primary-ghost {
        background-color: $color-surface;
        border-color: $color-primary;
        color: $color-primary;
      }

      &.danger-ghost {
        background-color: $color-surface;
        border-color: #FF4D4F;
        color: #FF4D4F;
      }
    }
  }
}

/* Loading */
.loading-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba($color-surface, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid $color-primary-light;
    border-top-color: $color-primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: $spacing-12;
  }

  .loading-text {
    font-size: 14px;
    color: $color-text-muted;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $spacing-32;
}

.modal-content {
  width: 100%;
  background-color: $color-surface;
  border-radius: $radius-16;
  overflow: hidden;
  animation: modalIn 0.3s ease-out;

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-20;
    border-bottom: 1px solid $color-border;

    .modal-title {
      font-family: $font-family-title;
      font-weight: 600;
      font-size: 16px;
      color: $color-text-primary;
    }

    .modal-close {
      padding: 4px;
      .close-icon {
        font-size: 24px;
        color: $color-text-muted;
      }
    }
  }

  .modal-body {
    padding: $spacing-32 $spacing-20;

    .confirm-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .confirm-emoji {
        font-size: 48px;
        margin-bottom: $spacing-16;
      }

      .confirm-title {
        font-family: $font-family-title;
        font-weight: 600;
        font-size: 16px;
        color: $color-text-primary;
        margin-bottom: $spacing-8;
      }

      .confirm-desc {
        font-size: 13px;
        color: $color-text-muted;
      }
    }
  }

  .modal-footer {
    display: flex;
    border-top: 1px solid $color-border;

    view {
      flex: 1;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 15px;
    }

    .modal-btn-cancel {
      color: $color-text-muted;
      border-right: 1px solid $color-border;
    }

    .modal-btn-confirm {
      color: $color-primary;
    }
  }
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
