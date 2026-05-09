<template>
  <!-- 骨架屏容器：loading 时显示骨架屏，否则通过 slot 显示真实内容 -->
  <view v-if="showSkeleton" class="skeleton-wrapper">
    <!-- 商品卡片骨架（Grid 模式：图片区 + 标签 + 标题 + 价格） -->
    <view v-if="type === 'product-card'" class="skeleton-product-card">
      <!-- 图片占位区域 -->
      <view class="skeleton-img-grid"></view>
      <!-- 信息区域 -->
      <view class="skeleton-info-grid">
        <view class="skeleton-tag"></view>
        <view class="skeleton-title"></view>
        <view class="skeleton-price-row">
          <view class="skeleton-price"></view>
          <view class="skeleton-cart-icon"></view>
        </view>
      </view>
    </view>

    <!-- 商品详情骨架（轮播图区域 + 标题 + 价格 + 描述段落） -->
    <view v-else-if="type === 'product-detail'" class="skeleton-product-detail">
      <!-- 顶部标题行 -->
      <view class="skeleton-detail-header">
        <view class="skeleton-tag"></view>
        <view class="skeleton-title-wide"></view>
      </view>
      <!-- 大图占位区域（模拟商品主图 + 价格信息） -->
      <view class="skeleton-gallery">
        <view class="skeleton-hero-img"></view>
        <view class="skeleton-gallery-stats">
          <view class="skeleton-stat-label"></view>
          <view class="skeleton-stat-value"></view>
        </view>
      </view>
      <!-- 概述段落 -->
      <view class="skeleton-section">
        <view class="skeleton-section-title"></view>
        <view class="skeleton-line skeleton-line-long"></view>
        <view class="skeleton-line skeleton-line-medium"></view>
        <view class="skeleton-line skeleton-line-short"></view>
      </view>
      <!-- 详情段落 -->
      <view class="skeleton-section">
        <view class="skeleton-section-title"></view>
        <view class="skeleton-line skeleton-line-long"></view>
        <view class="skeleton-line skeleton-line-long"></view>
        <view class="skeleton-line skeleton-line-medium"></view>
        <view class="skeleton-line skeleton-line-short"></view>
      </view>
    </view>

    <!-- 订单项骨架（商品图 + 订单信息 + 价格 + 状态） -->
    <view v-else-if="type === 'order-item'" class="skeleton-order-item">
      <!-- 商品缩略图 -->
      <view class="skeleton-order-thumb"></view>
      <!-- 订单信息 -->
      <view class="skeleton-order-info">
        <view class="skeleton-line skeleton-line-long"></view>
        <view class="skeleton-line skeleton-line-medium"></view>
        <view class="skeleton-order-bottom">
          <view class="skeleton-price-sm"></view>
          <view class="skeleton-status-tag"></view>
        </view>
      </view>
    </view>
  </view>

  <!-- 真实内容插槽：loading 结束后显示 -->
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * SkeletonScreen 通用骨架屏组件
 *
 * 用于在数据加载过程中展示与真实内容结构相似的占位动画，
 * 提升用户感知性能，避免页面空白闪烁。
 *
 * 支持三种布局类型：
 * - product-card: 商品卡片骨架（适用于首页/商城列表）
 * - product-detail: 商品详情骨架（适用于商品详情页）
 * - order-item: 订单项骨架（适用于订单列表）
 *
 * 内置最小显示时间（300ms），防止骨架屏一闪而过。
 */

/** 组件属性定义 */
const props = withDefaults(
  defineProps<{
    /** 控制骨架屏显示/隐藏 */
    loading: boolean
    /** 布局类型：product-card | product-detail | order-item */
    type?: string
  }>(),
  {
    type: 'product-card',
  }
)

/** 最小显示时间标记：即使 loading 提前结束，也至少显示 300ms */
const showSkeleton = ref(props.loading)

/** 最小显示时间计时器 ID */
let minDisplayTimer: ReturnType<typeof setTimeout> | null = null

/** 记录骨架屏开始显示的时间戳 */
let skeletonStartTime = 0

/** 最小显示持续时间（毫秒） */
const MIN_DISPLAY_DURATION = 300

/**
 * 监听 loading 变化：
 * - 当 loading 变为 true 时，立即显示骨架屏并记录时间
 * - 当 loading 变为 false 时，检查是否满足最小显示时间，
 *   不满足则延迟隐藏，满足则立即隐藏
 */
watch(
  () => props.loading,
  (newVal) => {
    if (newVal) {
      // 开始加载：立即显示骨架屏，记录开始时间
      showSkeleton.value = true
      skeletonStartTime = Date.now()
    } else {
      // 加载结束：检查是否满足最小显示时间
      const elapsed = Date.now() - skeletonStartTime
      const remaining = MIN_DISPLAY_DURATION - elapsed

      if (remaining > 0) {
        // 未达到最小显示时间，延迟隐藏
        if (minDisplayTimer) clearTimeout(minDisplayTimer)
        minDisplayTimer = setTimeout(() => {
          showSkeleton.value = false
          minDisplayTimer = null
        }, remaining)
      } else {
        // 已满足最小显示时间，立即隐藏
        showSkeleton.value = false
      }
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>

/* ===== 骨架屏基础变量 ===== */
$skeleton-bg: #f0f0f0;         // 骨架占位块背景色
$skeleton-highlight: #e0e0e0;  // 脉冲高亮色（稍深）
$skeleton-radius: 12rpx;       // 默认圆角

/* ===== Shimmer 脉冲动画 ===== */
@keyframes skeleton-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

/* 骨架元素通用样式 */
%skeleton-base {
  background-color: $skeleton-bg;
  border-radius: $skeleton-radius;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-wrapper {
  width: 100%;
}

/* ========================================
   商品卡片骨架（Grid 模式）
   模仿 product-card.vue 的 grid 布局
   ======================================== */
.skeleton-product-card {
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04),
    0 8rpx 24rpx rgba(0, 0, 0, 0.06);

  /* 图片占位 - 对应 grid-bg 的 240rpx 高度 */
  .skeleton-img-grid {
    @extend %skeleton-base;
    height: 240rpx;
    border-radius: 0;
  }

  /* 信息区域 - 对应 grid-info 的 padding */
  .skeleton-info-grid {
    padding: 20rpx;
  }

  /* 标签占位 - 对应 grid-tag */
  .skeleton-tag {
    @extend %skeleton-base;
    width: 80rpx;
    height: 24rpx;
    margin-bottom: 12rpx;
  }

  /* 标题占位 - 对应 grid-name */
  .skeleton-title {
    @extend %skeleton-base;
    width: 70%;
    height: 32rpx;
    margin-bottom: 20rpx;
  }

  /* 价格行 - 对应 grid-bottom */
  .skeleton-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* 价格占位 */
  .skeleton-price {
    @extend %skeleton-base;
    width: 120rpx;
    height: 36rpx;
  }

  /* 购物车图标占位 */
  .skeleton-cart-icon {
    @extend %skeleton-base;
    width: 50rpx;
    height: 50rpx;
    border-radius: 14rpx;
  }
}

/* ========================================
   商品详情骨架
   模仿 subpackages/product/detail.vue 布局
   ======================================== */
.skeleton-product-detail {
  padding: 0 32rpx;

  /* 顶部标题区域 */
  .skeleton-detail-header {
    margin-bottom: 32rpx;
  }

  .skeleton-title-wide {
    @extend %skeleton-base;
    width: 80%;
    height: 56rpx;
    margin-top: 16rpx;
  }

  /* 大图区域（模拟 gallery + stats 布局） */
  .skeleton-gallery {
    display: flex;
    align-items: center;
    margin-bottom: 40rpx;
    gap: 32rpx;
  }

  .skeleton-hero-img {
    @extend %skeleton-base;
    width: 320rpx;
    height: 320rpx;
    border-radius: 24rpx;
    flex-shrink: 0;
  }

  .skeleton-gallery-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  .skeleton-stat-label {
    @extend %skeleton-base;
    width: 60rpx;
    height: 24rpx;
  }

  .skeleton-stat-value {
    @extend %skeleton-base;
    width: 140rpx;
    height: 44rpx;
  }

  /* 信息段落（概述/详情） */
  .skeleton-section {
    margin-bottom: 40rpx;
  }

  .skeleton-section-title {
    @extend %skeleton-base;
    width: 100rpx;
    height: 32rpx;
    margin-bottom: 20rpx;
  }

  /* 文本行占位 */
  .skeleton-line {
    @extend %skeleton-base;
    height: 24rpx;
    margin-bottom: 16rpx;
  }

  .skeleton-line-long {
    width: 100%;
  }

  .skeleton-line-medium {
    width: 75%;
  }

  .skeleton-line-short {
    width: 45%;
  }
}

/* ========================================
   订单项骨架
   模仿订单列表中的订单卡片布局
   ======================================== */
.skeleton-order-item {
  display: flex;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 24rpx;
  gap: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  /* 订单缩略图 */
  .skeleton-order-thumb {
    @extend %skeleton-base;
    width: 160rpx;
    height: 160rpx;
    border-radius: 20rpx;
    flex-shrink: 0;
  }

  /* 订单文字信息区域 */
  .skeleton-order-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 4rpx 0;
  }

  /* 订单底部（价格 + 状态标签） */
  .skeleton-order-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .skeleton-price-sm {
    @extend %skeleton-base;
    width: 100rpx;
    height: 28rpx;
  }

  .skeleton-status-tag {
    @extend %skeleton-base;
    width: 80rpx;
    height: 40rpx;
    border-radius: 20rpx;
  }
}
</style>
