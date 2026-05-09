<template>
  <view class="empty-state">
    <!-- 图标区 -->
    <view v-if="icon" class="empty-state-icon">
      <image v-if="isImageIcon" :src="icon" class="empty-state-icon-img" mode="aspectFit" />
      <text v-else class="empty-state-icon-text">{{ icon }}</text>
    </view>

    <!-- 标题 -->
    <text class="empty-state-title">{{ title }}</text>

    <!-- 描述文字 -->
    <text v-if="description" class="empty-state-description">{{ description }}</text>

    <!-- 操作按钮 -->
    <view v-if="actionText" class="empty-state-action">
      <view class="empty-state-button" @tap="handleAction">
        <text class="empty-state-button-text">{{ actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * EmptyState - 空状态组件
 *
 * 用于展示空状态（如暂无收藏、暂无数据等）的统一组件。
 * 提供图标、标题、描述和操作按钮的可选组合。
 *
 * Features:
 * - 支持图片图标或内置图标（emoji/文字）
 * - 居中布局，视觉统一
 * - 可选描述文字和操作按钮
 * - 遵循设计系统规范
 *
 * Usage:
 * <empty-state
 *   icon="📂"
 *   title="暂无收藏"
 *   description="点击下方按钮添加收藏"
 *   action-text="去浏览"
 *   @action="handleBrowse"
 * />
 */

import { computed } from 'vue'

/** 组件 Props 定义 */
const props = withDefaults(
  defineProps<{
    /** 图标（图片路径或内置图标名/emoji） */
    icon?: string
    /** 主标题 */
    title: string
    /** 描述文字 */
    description?: string
    /** 操作按钮文字 */
    actionText?: string
  }>(),
  {
    icon: '',
    description: '',
    actionText: ''
  }
)

/** 组件 Emits 定义 */
const emit = defineEmits<{
  /** 操作按钮点击事件 */
  (e: 'action'): void
}>()

/**
 * 判断是否为图片图标
 * 通过文件扩展名判断是否为图片路径
 */
const isImageIcon = computed(() => {
  if (!props.icon) return false
  return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(props.icon)
})

/**
 * 处理操作按钮点击
 */
const handleAction = () => {
  emit('action')
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

/* ===== 容器 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-32 $spacing-20;
  text-align: center;
}

/* ===== 图标区 ===== */
.empty-state-icon {
  width: 64px;
  height: 64px;
  background-color: $color-primary-light;
  border-radius: $radius-12;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-20;
}

.empty-state-icon-img {
  width: 32px;
  height: 32px;
}

.empty-state-icon-text {
  font-size: 32px;
  line-height: 1;
}

/* ===== 标题 ===== */
.empty-state-title {
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: map-get($typography-section-title, font-size);
  line-height: map-get($typography-section-title, line-height);
  color: $color-text-primary;
  margin-bottom: $spacing-8;
}

/* ===== 描述文字 ===== */
.empty-state-description {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  line-height: map-get($typography-body, line-height);
  color: $color-text-muted;
  margin-bottom: $spacing-20;
  max-width: 280px;
}

/* ===== 操作按钮 ===== */
.empty-state-action {
  margin-top: $spacing-8;
}

.empty-state-button {
  background-color: $color-primary;
  border-radius: $radius-20;
  padding: 8px $spacing-16;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.empty-state-button:active {
  opacity: 0.8;
}

.empty-state-button-text {
  font-family: map-get($typography-button-small, font-family);
  font-weight: map-get($typography-button-small, font-weight);
  font-size: map-get($typography-button-small, font-size);
  line-height: map-get($typography-button-small, line-height);
  color: #FFFFFF;
}
</style>
