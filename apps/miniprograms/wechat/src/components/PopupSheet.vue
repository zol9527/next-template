<template>
  <!-- 遮罩层 -->
  <view
    v-if="modelValue"
    class="popup-sheet-mask"
    @tap="handleMaskTap"
  >
    <!-- 底部面板 -->
    <view
      class="popup-sheet-panel"
      @tap.stop
    >
      <!-- 拖拽指示条 -->
      <view class="popup-sheet-indicator"></view>

      <!-- 标题栏 -->
      <view v-if="title || showClose" class="popup-sheet-header">
        <text class="popup-sheet-title">{{ title }}</text>
        <view v-if="showClose" class="popup-sheet-close" @tap="handleClose">
          <text class="popup-sheet-close-icon">×</text>
        </view>
      </view>

      <!-- 内容区 -->
      <scroll-view
        class="popup-sheet-content"
        scroll-y
        :style="{ maxHeight: maxHeight }"
      >
        <slot></slot>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * PopupSheet - 底部弹出面板基座组件
 *
 * 用于从底部弹出的面板组件，支持遮罩点击关闭、自定义标题、关闭按钮等功能。
 * 适用于选择器、表单、详情展示等场景。
 *
 * Features:
 * - 半透明黑色遮罩，点击遮罩关闭弹窗
 * - 底部面板带平滑的滑入动画
 * - 拖拽指示条（视觉提示）
 * - 可选标题和关闭按钮
 * - 可配置最大高度，内容超出可滚动
 * - 支持 v-model 双向绑定
 *
 * Usage:
 * <popup-sheet v-model:visible="showPopup" title="选择分类" :max-height="'60vh'">
 *   <view>内容区域</view>
 * </popup-sheet>
 */

import { computed, watch } from 'vue'

/** 组件 Props 定义 */
const props = withDefaults(
  defineProps<{
    /** 控制显示/隐藏（v-model） */
    modelValue: boolean
    /** 弹窗标题 */
    title?: string
    /** 是否显示关闭按钮 */
    showClose?: boolean
    /** 最大高度 */
    maxHeight?: string
  }>(),
  {
    title: '',
    showClose: true,
    maxHeight: '70vh'
  }
)

/** 组件 Emits 定义 */
const emit = defineEmits<{
  /** 更新显示状态（v-model） */
  (e: 'update:modelValue', value: boolean): void
}>()

/**
 * 处理遮罩点击
 * 点击遮罩层时关闭弹窗
 */
// 弹窗打开时隐藏 TabBar，关闭时恢复，防止原生 TabBar 遮挡弹窗内容
watch(() => props.modelValue, (visible) => {
  if (visible) {
    // 隐藏原生 TabBar
    uni.hideTabBar({ animation: false })
    // 隐藏自定义 TabBar（通过 setData 控制 wx:if）
    try {
      const pages = getCurrentPages() as any[]
      const page = pages[pages.length - 1]
      if (page?.getTabBar?.()) {
        page.getTabBar().setData({ visible: false })
      }
    } catch {}
  } else {
    // 恢复原生 TabBar
    uni.showTabBar({ animation: false })
    // 恢复自定义 TabBar
    try {
      const pages = getCurrentPages() as any[]
      const page = pages[pages.length - 1]
      if (page?.getTabBar?.()) {
        page.getTabBar().setData({ visible: true })
      }
    } catch {}
  }
})

const handleMaskTap = () => {
  emit('update:modelValue', false)
}

/**
 * 处理关闭按钮点击
 * 点击关闭按钮时关闭弹窗
 */
const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

/* ===== 遮罩层 ===== */
.popup-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ===== 底部面板 ===== */
.popup-sheet-panel {
  width: 100%;
  background-color: $color-surface;
  border-radius: $radius-20 $radius-20 0 0;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* ===== 拖拽指示条 ===== */
.popup-sheet-indicator {
  width: 40px;
  height: 4px;
  background-color: $color-border;
  border-radius: 2px;
  margin: $spacing-8 auto;
  flex-shrink: 0;
}

/* ===== 标题栏 ===== */
.popup-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 $spacing-20 $spacing-12;
  border-bottom: 1px solid $color-border;
  flex-shrink: 0;
}

.popup-sheet-title {
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: map-get($typography-section-title, font-size);
  line-height: map-get($typography-section-title, line-height);
  color: $color-text-primary;
}

.popup-sheet-close {
  padding: $spacing-4;
  margin: -$spacing-4;
}

.popup-sheet-close-icon {
  font-size: 24px;
  color: $color-text-muted;
  line-height: 1;
}

/* ===== 内容区 ===== */
.popup-sheet-content {
  padding: $spacing-16 $spacing-20;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
