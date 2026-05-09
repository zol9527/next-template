<!-- ============================================
  NavBar - 统一自定义导航栏组件
  ============================================
  解决微信小程序右上角胶囊按钮（关闭/更多）遮挡问题。
  所有使用 navigationStyle: custom 的页面都应使用此组件。

  用法：
  1. 简单标题页：
     <NavBar title="页面标题" />

  2. 带自定义内容（Tab 页面等）：
     <NavBar :show-back="false">
       <template #left>
         <text class="logo">VANTAGE</text>
       </template>
       <template #right>
         <view class="icon-btn" @tap="goToSettings">...</view>
       </template>
     </NavBar>

  3. 透明背景（商品详情等）：
     <NavBar title="商品详情" transparent />

  组件内部使用 useSafeArea 自动计算：
  - height = navBarHeight（状态栏 + 导航内容区，确保不遮挡胶囊按钮）
  - paddingTop = statusBarHeight（内容从状态栏下方开始）
  ============================================ -->

<template>
  <!-- 固定导航栏：始终置顶，不随页面内容滚动 -->
  <view
    class="nav-bar"
    :style="{
      height: safeArea.navBarHeight + 'px',
      backgroundColor: bgColor,
    }"
    :class="{ 'nav-bar--fixed': fixed }"
  >
    <view
      class="nav-content"
      :style="{
        top: safeArea.navContentTop + 'px',
        height: safeArea.navContentHeight + 'px',
      }"
    >
      <!-- 左侧区域 -->
      <view class="nav-left" :style="{ left: navLayout.left + 'px' }">
        <slot name="left">
          <view v-if="showBack" class="back-btn" @tap="handleBack">
            <!-- 返回箭头 SVG -->
            <image
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTUgMTlMOCAxMkwxNSA1IiBzdHJva2U9IiMxQTJFMzUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg=="
              class="back-icon"
              mode="aspectFit"
            />
          </view>
        </slot>
      </view>

      <!-- 中间区域 -->
      <view
        class="nav-center"
        :class="{ 'nav-center-left': titleAlign === 'left' }"
        :style="{
          left: (titleAlign === 'left' ? navLayout.titleLeft : navLayout.centerLeft) + 'px',
          right: navLayout.centerRight + 'px',
        }"
      >
        <slot name="center">
          <text v-if="title" class="nav-title">{{ title }}</text>
        </slot>
      </view>

      <!-- 右侧区域 -->
      <view class="nav-right" :style="{ right: navLayout.right + 'px' }">
        <slot name="right" />
      </view>
    </view>
  </view>
  <!-- 固定模式占位元素：防止内容被导航栏遮挡 -->
  <view v-if="fixed" class="nav-bar-placeholder" :style="{ height: safeArea.navBarHeight + 'px' }" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSafeArea } from '@/hooks/useSafeArea'

/**
 * Props 定义
 * @prop title - 页面标题（不使用 slot center 时生效）
 * @prop showBack - 是否显示返回按钮（默认 true）
 * @prop background - 背景色（默认白色）
 * @prop transparent - 透明背景模式
 * @prop titleAlign - 标题对齐方式：center 为微信原生居中样式，left 适合二级页面标题紧跟返回按钮
 */
const props = withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  background?: string
  transparent?: boolean
  titleAlign?: 'center' | 'left'
  /** 是否固定在页面顶部（不随内容滚动） */
  fixed?: boolean
}>(), {
  title: '',
  showBack: true,
  background: '',
  transparent: false,
  titleAlign: 'center',
  fixed: true,
})

const emit = defineEmits<{
  (e: 'back'): void
}>()

const safeArea = useSafeArea()

// 计算背景色
const bgColor = props.transparent ? 'transparent' : (props.background || '#FFFFFF')

// 根据微信右上角胶囊按钮动态避让右侧区域，避免搜索、通知、设置等按钮被系统按钮遮挡。
const navLayout = computed(() => {
  const menuButtonRect = safeArea.value.menuButtonRect
  const defaultPadding = 20

  if (!menuButtonRect) {
      return {
        left: defaultPadding,
        right: defaultPadding,
        centerLeft: 88,
        centerRight: 88,
        titleLeft: 52,
      }
  }

  const capsuleRightGap = Math.max(8, safeArea.value.windowWidth - menuButtonRect.right)
  const right = safeArea.value.windowWidth - menuButtonRect.left + capsuleRightGap

  return {
    left: defaultPadding,
    right,
    centerLeft: 88,
    centerRight: right + menuButtonRect.width,
    titleLeft: defaultPadding + 32,
  }
})

// 返回上一页
const handleBack = () => {
  emit('back')
  uni.navigateBack({
    fail: () => {
      // 如果没有上一页，跳转到首页
      uni.switchTab({ url: '/pages/index/index' })
    },
  })
}

// 暴露 navBarHeight 供父组件使用（计算内容区域高度）
defineExpose({
  navBarHeight: safeArea.value.navBarHeight,
  statusBarHeight: safeArea.value.statusBarHeight,
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.nav-bar {
  width: 100%;
  position: relative;
  z-index: 100;
  flex-shrink: 0;
  box-sizing: border-box;
  overflow: hidden;

  /* 固定模式：导航栏始终置顶，不随页面滚动 */
  &.nav-bar--fixed {
    position: fixed;
    top: 0;
    left: 0;
  }
}

.nav-content {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
}

.nav-left {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 32px;
  z-index: 2;
}

.nav-center {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
}

.nav-center-left {
  justify-content: flex-start;
}

.nav-right {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  min-width: 32px;
  gap: 8px;
  z-index: 2;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.6;
  }
}

.back-icon {
  width: 24px;
  height: 24px;
}

.nav-title {
  font-family: $font-family-title;
  font-weight: 600;
  font-size: 17px;
  color: $color-text-primary;
  line-height: 24px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 固定导航栏的占位元素，保持内容区域不被导航栏遮挡 */
.nav-bar-placeholder {
  width: 100%;
  flex-shrink: 0;
}
</style>
