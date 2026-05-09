<template>
  <view class="loading-state">
    <!-- 骨架屏模式 -->
    <view v-if="type === 'skeleton'" class="loading-state-skeleton">
      <view
        v-for="i in count"
        :key="i"
        class="loading-state-skeleton-item"
      ></view>
    </view>

    <!-- 旋转加载器模式 -->
    <view v-else-if="type === 'spinner'" class="loading-state-spinner">
      <view class="loading-state-spinner-circle"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * LoadingState - 加载状态组件
 *
 * 用于展示加载状态的统一组件，支持骨架屏和旋转加载器两种模式。
 *
 * Features:
 * - 骨架屏模式：展示多个脉冲动画的占位块，模拟内容加载
 * - 旋转加载器模式：展示居中的旋转加载动画
 * - 可配置骨架屏数量
 * - 脉冲动画使用 CSS @keyframes 实现
 * - 遵循设计系统规范
 *
 * Usage:
 * <!-- 骨架屏模式 -->
 * <loading-state type="skeleton" :count="3" />
 *
 * <!-- 旋转加载器模式 -->
 * <loading-state type="spinner" />
 */

import { computed } from 'vue'

/** 组件 Props 定义 */
const props = withDefaults(
  defineProps<{
    /** 加载类型：skeleton | spinner */
    type?: 'skeleton' | 'spinner'
    /** 骨架屏数量 */
    count?: number
  }>(),
  {
    type: 'skeleton',
    count: 3
  }
)
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

/* ===== 容器 ===== */
.loading-state {
  width: 100%;
}

/* ===== 骨架屏模式 ===== */
.loading-state-skeleton {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
  padding: $spacing-16 0;
}

.loading-state-skeleton-item {
  height: 80px;
  background-color: #f0f0f0;
  border-radius: $radius-12;
  animation: pulse 1.5s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }

  @for $i from 4 through 10 {
    &:nth-child(#{$i}) {
      animation-delay: 0.2s * ($i - 1);
    }
  }
}

/* 脉冲动画 */
@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* ===== 旋转加载器模式 ===== */
.loading-state-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-32 0;
}

.loading-state-spinner-circle {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 旋转动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
