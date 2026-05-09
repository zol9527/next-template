<template>
  <view class="error-state">
    <!-- 错误图标 -->
    <view class="error-state-icon">
      <text class="error-state-icon-text">⚠️</text>
    </view>

    <!-- 标题 -->
    <text class="error-state-title">{{ title }}</text>

    <!-- 描述文字 -->
    <text v-if="description" class="error-state-description">{{ description }}</text>

    <!-- 重试按钮 -->
    <view class="error-state-action">
      <view class="error-state-button" @tap="handleRetry">
        <text class="error-state-button-text">{{ retryText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * ErrorState - 错误状态组件
 *
 * 用于展示加载失败、网络错误等错误状态的统一组件。
 * 提供错误图标、标题、描述和重试按钮。
 *
 * Features:
 * - 统一的错误状态展示
 * - 居中布局，视觉统一
 * - 可选描述文字
 * - 支持自定义重试按钮文字
 * - 遵循设计系统规范
 *
 * Usage:
 * <error-state
 *   title="加载失败"
 *   description="网络连接异常，请检查网络设置"
 *   retry-text="重新加载"
 *   @retry="handleRetry"
 * />
 */

import { computed } from 'vue'

/** 组件 Props 定义 */
const props = withDefaults(
  defineProps<{
    /** 错误标题 */
    title?: string
    /** 错误描述 */
    description?: string
    /** 重试按钮文字 */
    retryText?: string
  }>(),
  {
    title: '加载失败',
    description: '',
    retryText: '重新加载'
  }
)

/** 组件 Emits 定义 */
const emit = defineEmits<{
  /** 重试按钮点击事件 */
  (e: 'retry'): void
}>()

/**
 * 处理重试按钮点击
 */
const handleRetry = () => {
  emit('retry')
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

/* ===== 容器 ===== */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-32 $spacing-20;
  text-align: center;
}

/* ===== 错误图标 ===== */
.error-state-icon {
  width: 64px;
  height: 64px;
  background-color: $color-primary-light;
  border-radius: $radius-12;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-20;
}

.error-state-icon-text {
  font-size: 32px;
  line-height: 1;
}

/* ===== 标题 ===== */
.error-state-title {
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: map-get($typography-section-title, font-size);
  line-height: map-get($typography-section-title, line-height);
  color: $color-text-primary;
  margin-bottom: $spacing-8;
}

/* ===== 描述文字 ===== */
.error-state-description {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-muted;
  margin-bottom: $spacing-20;
  max-width: 280px;
}

/* ===== 重试按钮 ===== */
.error-state-action {
  margin-top: $spacing-8;
}

.error-state-button {
  background-color: $color-primary;
  border-radius: $radius-20;
  padding: 8px $spacing-16;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.error-state-button:active {
  opacity: 0.8;
}

.error-state-button-text {
  font-family: map-get($typography-button, font-family);
  font-weight: map-get($typography-button, font-weight);
  font-size: map-get($typography-button, font-size);
  line-height: map-get($typography-button, line-height);
  color: #FFFFFF;
}
</style>
