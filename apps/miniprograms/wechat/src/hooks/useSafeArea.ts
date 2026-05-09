// ============================================
// 硕博达小程序 - Safe Area Composable
// ============================================
// 统一安全距离计算，适配不同设备的状态栏、导航栏和底部安全区
// ============================================

import { ref, type Ref } from 'vue'

/**
 * 安全区域信息接口
 */
export interface SafeAreaInfo {
  /** 屏幕宽度（px） */
  windowWidth: number
  /** 状态栏高度（px） */
  statusBarHeight: number
  /** 自定义导航栏高度（px）= statusBarHeight + 导航内容高度 */
  navBarHeight: number
  /** 导航内容区距离页面顶部的距离（px） */
  navContentTop: number
  /** 底部安全距离（px）= 屏幕高度 - safeArea.bottom */
  safeAreaBottom: number
  /** 微信胶囊按钮信息（仅在微信小程序中可用） */
  menuButtonRect: UniApp.GetMenuButtonBoundingClientRectRes | null
  /** 导航内容高度（不含状态栏），标准为 44px，可根据胶囊按钮调整 */
  navContentHeight: number
}

/**
 * 获取设备系统信息
 */
function getSystemInfo() {
  return uni.getSystemInfoSync()
}

/**
 * 获取微信胶囊按钮信息（仅在微信小程序中可用）
 */
function getMenuButtonRect(): UniApp.GetMenuButtonBoundingClientRectRes | null {
  let result: UniApp.GetMenuButtonBoundingClientRectRes | null = null

  // #ifdef MP-WEIXIN
  try {
    result = uni.getMenuButtonBoundingClientRect()
  } catch (e) {
    console.warn('[useSafeArea] 获取胶囊按钮信息失败:', e)
    result = null
  }
  // #endif

  return result
}

/**
 * 计算导航内容高度
 * 微信小程序：根据胶囊按钮位置计算，确保导航内容区域不遮挡胶囊
 * 其他平台：使用标准 44px
 */
function calculateNavContentHeight(
  menuButtonRect: UniApp.GetMenuButtonBoundingClientRectRes | null,
  statusBarHeight: number
): number {
  // 如果没有胶囊按钮信息，使用标准高度
  if (!menuButtonRect) {
    return 44
  }

  // 微信胶囊按钮通常位于状态栏下方，导航栏内容高度应包含：
  // 顶部间距 + 胶囊高度 + 底部同等间距，才能让标题和自定义按钮垂直居中。
  const menuButtonTopGap = Math.max(0, menuButtonRect.top - statusBarHeight)
  const availableHeight = menuButtonRect.height + menuButtonTopGap * 2

  // 确保最小高度为 44px
  return Math.max(44, availableHeight)
}

/**
 * 计算导航内容区顶部位置
 * 微信小程序中直接对齐胶囊按钮的视觉中心，比单纯使用 statusBarHeight 更稳定。
 */
function calculateNavContentTop(
  menuButtonRect: UniApp.GetMenuButtonBoundingClientRectRes | null,
  statusBarHeight: number,
  navContentHeight: number
): number {
  if (!menuButtonRect) {
    return statusBarHeight
  }

  const top = menuButtonRect.top - (navContentHeight - menuButtonRect.height) / 2
  return Math.max(statusBarHeight, top)
}

/**
 * 计算底部安全距离
 * @param screenHeight 屏幕高度
 * @param safeAreaBottom safeArea.bottom 值
 */
function calculateSafeAreaBottom(screenHeight: number, safeAreaBottom: number): number {
  return screenHeight - safeAreaBottom
}

/**
 * Safe Area Composable
 *
 * 使用示例：
 * ```vue
 * <script setup lang="ts">
 * import { useSafeArea } from '@/hooks/useSafeArea'
 *
 * const { statusBarHeight, navBarHeight, safeAreaBottom } = useSafeArea()
 * </script>
 *
 * <template>
 *   <view
 *     class="custom-nav-bar"
 *     :style="{ height: navBarHeight + 'px', paddingTop: statusBarHeight + 'px' }"
 *   >
 *     导航内容
 *   </view>
 *   <view class="tab-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
 *     底部导航
 *   </view>
 * </template>
 * ```
 *
 * @returns SafeAreaInfo - 包含所有安全距离信息的响应式对象
 */
export function useSafeArea(): Ref<SafeAreaInfo> {
  // 获取系统信息
  const systemInfo = getSystemInfo()

  // 获取胶囊按钮信息
  const menuButtonRect = getMenuButtonRect()

  // 计算状态栏高度（默认 20px，防止某些设备返回 0）
  const statusBarHeight = systemInfo.statusBarHeight || 20

  // 计算导航内容高度
  const navContentHeight = calculateNavContentHeight(menuButtonRect, statusBarHeight)

  // 计算导航内容区顶部位置
  const navContentTop = calculateNavContentTop(menuButtonRect, statusBarHeight, navContentHeight)

  // 计算导航栏总高度
  const navBarHeight = navContentTop + navContentHeight

  // 计算底部安全距离
  const safeAreaBottom = calculateSafeAreaBottom(
    systemInfo.screenHeight,
    systemInfo.safeArea?.bottom || systemInfo.screenHeight
  )

  // 返回响应式对象
  const safeAreaInfo = ref<SafeAreaInfo>({
    windowWidth: systemInfo.windowWidth || systemInfo.screenWidth || 375,
    statusBarHeight,
    navBarHeight,
    navContentTop,
    safeAreaBottom,
    menuButtonRect,
    navContentHeight,
  })

  return safeAreaInfo
}

/**
 * 导出单个安全距离值（用于某些只需要部分值的场景）
 */
export function useStatusBarHeight(): number {
  const systemInfo = getSystemInfo()
  return systemInfo.statusBarHeight || 20
}

export function useNavBarHeight(): number {
  const safeArea = useSafeArea()
  return safeArea.value.navBarHeight
}

export function useSafeAreaBottom(): number {
  const systemInfo = getSystemInfo()
  return calculateSafeAreaBottom(
    systemInfo.screenHeight,
    systemInfo.safeArea?.bottom || systemInfo.screenHeight
  )
}
