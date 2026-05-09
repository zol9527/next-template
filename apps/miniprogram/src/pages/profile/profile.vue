<template>
  <view class="profile-container">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar :show-back="false" background="#FFFFFF">
      <template #left>
        <text class="brand-logo">{{ siteName }}</text>
      </template>
      <template #right>
        <view class="header-action" @tap="goToSettings">
          <image :src="menuIcons.settings_outline" class="action-icon" mode="aspectFit" />
        </view>
      </template>
    </NavBar>

    <!-- Content Scroll -->
    <scroll-view scroll-y class="profile-scroll" :show-scrollbar="false">
      <view class="scroll-content" :style="{ paddingBottom: safeArea.safeAreaBottom + 60 + 'px' }">
        <!-- Profile Hero -->
        <view class="profile-hero">
          <view class="hero-info" v-if="authStore.isLoggedIn.value && userInfo">
            <view class="avatar-container" @tap="showProfileCompletion">
              <image v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" mode="aspectFill" class="avatar-img" />
              <view v-else class="avatar-placeholder">
                <text class="placeholder-text">{{ authStore.displayName.value?.[0] || '' }}</text>
              </view>
            </view>
            <view class="user-meta">
              <text class="user-name">{{ authStore.displayName.value }}</text>
              <view class="vip-badge">
                <text class="vip-text">VIP</text>
                <text class="vip-expiry">有效期至 2027.03</text>
              </view>
            </view>
          </view>
          
          <!-- 未登录状态 — 点击跳转登录页，不再使用旧版弹窗 -->
          <view class="hero-info unlogin" v-else @tap="goToLoginPage">
            <view class="avatar-container">
              <view class="avatar-placeholder">
                <text class="placeholder-text">?</text>
              </view>
            </view>
            <view class="user-meta">
              <text class="user-name">立即登录</text>
              <text class="unlogin-desc">登录后开启精彩学习之旅</text>
            </view>
          </view>
        </view>

        <!-- Menu Group 1: 我的课程 / 我的收藏 -->
        <view class="menu-group">
          <view class="menu-item" @tap="goToMyCourses">
            <view class="menu-icon-box">
              <image :src="menuIcons.courses" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">我的课程</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
          <view class="menu-divider" />
          <view class="menu-item" @tap="goToFavorites">
            <view class="menu-icon-box">
              <image :src="menuIcons.favorites" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">我的收藏</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
        </view>

        <!-- Menu Group 2: 优惠券 / 订单管理 / 邀请好友 -->
        <view class="menu-group">
          <view class="menu-item" @tap="goToCoupons">
            <view class="menu-icon-box">
              <image :src="menuIcons.coupon" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">优惠券</text>
            <view class="menu-badge" v-if="stats.pendingCount > 0">
              <text class="menu-badge-text">{{ stats.pendingCount }}张可用</text>
            </view>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
          <view class="menu-divider" />
          <view class="menu-item" @tap="goToOrders">
            <view class="menu-icon-box">
              <image :src="menuIcons.orders" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">订单管理</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
          <view class="menu-divider" />
          <view class="menu-item" @tap="goToInvite">
            <view class="menu-icon-box">
              <image :src="menuIcons.invite" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">邀请好友</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
        </view>

        <!-- Menu Group 3: 设置 / 帮助与反馈 / 关于 VANTAGE -->
        <view class="menu-group">
          <view class="menu-item" @tap="goToSettings">
            <view class="menu-icon-box">
              <image :src="menuIcons.settings" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">设置</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
          <view class="menu-divider" />
          <view class="menu-item" @tap="goToHelp">
            <view class="menu-icon-box">
              <image :src="menuIcons.help" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">帮助与反馈</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
          <view class="menu-divider" />
          <view class="menu-item" @tap="goToAbout">
            <view class="menu-icon-box">
              <image :src="menuIcons.about" class="menu-icon-img" mode="aspectFit" />
            </view>
            <text class="menu-label">关于 {{ siteName }}</text>
            <image :src="menuIcons.arrow" class="menu-arrow-img" mode="aspectFit" />
          </view>
        </view>

        <!-- Footer -->
        <view class="profile-footer">
          <text class="version-text">{{ siteName }} v2.1.0</text>
        </view>
      </view>
    </scroll-view>

    <!-- 资料补全弹窗（登录由登录页处理） -->
    <ProfileCompletion ref="profileCompletionRef" @completed="refreshUserState" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore, useUserDocumentsStore } from '@/stores'
import { authService, userService, orderService } from '@/services/api'
import { showSuccess, showError } from '@/utils/toast'
import { checkMiniProgramUpdate } from '@/utils/update-manager'
import { syncCustomTabBar } from '@/utils/tab-bar'
import { useSafeArea } from '@/hooks/useSafeArea'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import ProfileCompletion from '@/components/ProfileCompletion.vue'

// ====== Hooks & Stores ======
const safeArea = useSafeArea()
const { siteName, loadSiteConfig } = useSiteConfig()
const authStore = useAuthStore()
const documentsStore = useUserDocumentsStore()

// ====== Refs ======
const profileCompletionRef = ref()
const stats = ref({
  pendingCount: 0,
  paidCount: 0,
  completedCount: 0
})

// ====== Computed ======
const userInfo = computed(() => authStore.userInfo || {})

// ====== Assets (Base64 SVGs) ======
const menuIcons = {
  courses: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMiAzaDZhNCA0IDAgMCAxIDQgNHYxNGEzIDMgMCAwIDAtMy0zSDJ6IiAvPgogIDxwYXRoIGQ9Ik0yMiAzaC02YTQgNCAwIDAgMC00IDR2MTRhMyAzIDAgMCAxIDMtM2g3eiIgLz4KPC9zdmc+Cg==',
  favorites: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTkgMjFsLTctNS03IDVWNWEyIDIgMCAwIDEgMi0yaDEwYTIgMiAwIDAgMSAyIDJ6IiAvPgo8L3N2Zz4K',
  coupon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjAuNTkgMTMuNDFsLTcuMTcgNy4xN2EyIDIgMCAwIDEtMi44MyAwTDIgMTJWMmgxMGw4LjU5IDguNTlhMiAyIDAgMCAxIDAgMi44MnoiIC8+CiAgPGxpbmUgeDE9IjciIHkxPSI3IiB4Mj0iNy4wMSIgeTI9IjciIC8+Cjwvc3ZnPgo=',
  orders: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjh6IiAvPjxwb2x5bGluZSBwb2ludHM9IjE0IDIgMTQgOCAyMCA4IiAvPjxsaW5lIHgxPSIxNiIgeTE9IjEzIiB4Mj0iOCIgeTI9IjEzIiAvPjxsaW5lIHgxPSIxNiIgeTE9IjE3IiB4Mj0iOCIgeTI9IjE3IiAvPjwvc3ZnPg==',
  invite: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTcgMjF2LTJhNCA0IDAgMCAwLTQtNEg1YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iNyIgcj0iNCIgLz4KICA8cGF0aCBkPSJNMjMgMjF2LTJhNCA0IDAgMCAwLTMtMy44NyIgLz4KICA8cGF0aCBkPSJNMTYgMy4xM2E0IDQgMCAwIDEgMCA3Ljc1IiAvPgo8L3N2Zz4K',
  settings: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiAvPjxwYXRoIGQ9Ik0xOS40IDE1YTEuNjUgMS42NSAwIDAgMCAuMzMgMS44MmwuMDYuMDZhMiAyIDAgMCAxLTIuODMgMi44M2wtLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMCAwLTEgMS41MVYyMWEyIDIgMCAwIDEtNCAwdi0uMDlBMS42NSAxLjY1IDAgMCAwIDkgMTkuNGExLjY1IDEuNjUgMCAwIDAtMS44Mi4zM2wtLjA2LjA2YTIgMiAwIDAgMS0yLjgzLTIuODNsLjA2LS4wNkExLjY1IDEuNjUgMCAwIDAgNC42OCAxNWExLjY1IDEuNjUgMCAwIDAtMS41MS0xSDNhMiAyIDAgMCAxIDAtNGguMDlBMS42NSAxLjY1IDAgMCAwIDQuNiA5YTEuNjUgMS42NSAwIDAgMC0uMzMtMS44MmwtLjA2LS4wNmEyIDIgMCAwIDEgMi44My0yLjgzbC4wNi4wNkExLjY1IDEuNjUgMCAwIDAgOSA0LjY4YTEuNjUgMS42NSAwIDAgMCAxLTEuNTFWM2EyIDIgMCAwIDEgNCAwdi4wOWExLjY1IDEuNjUgMCAwIDAgMSAxLjUxIDEuNjUgMS42NSAwIDAgMCAxLjgyLS4zM2wuMDYtLjA2YTIgMiAwIDAgMSAyLjgzIDIuODNsLS4wNi4wNkExLjY1IDEuNjUgMCAwIDAgMTkuNCA5YTEuNjUgMS42NSAwIDAgMCAxLjUxIDFIMjFhMiAyIDAgMCAxIDAgNGgtLjA5YTEuNjUgMS42NSAwIDAgMC0xLjUxIDF6IiAvPjwvc3ZnPg==',
  help: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJNOS4wOSA5YTMgMyAwIDAgMSA1LjgzIDFjMCAyLTMgMy0zIDMiIC8+CiAgPGxpbmUgeDE9IjEyIiB5MT0iMTciIHgyPSIxMi4wMSIgeTI9IjE3IiAvPgo8L3N2Zz4K',
  about: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA5NjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8bGluZSB4MT0iMTIiIHkxPSIxNiIgeDI9IjEyIiB5Mj0iMTIiIC8+CiAgPGxpbmUgeDE9IjEyIiB5MT0iOCIgeDI9IjEyLjAxIiB5Mj0iOCIgLz4KPC9zdmc+Cg==',
  arrow: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI4QTk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cG9seWxpbmUgcG9pbnRzPSI5IDE4IDE1IDEyIDkgNiIgLz4KPC9zdmc+Cg==',
  settings_outline: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkI4QTk0IiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIC8+PHBhdGggZD0iTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAwIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDAgMS00IDB2LS4wOUExLjY1IDEuNjUgMCAwIDAgOSAxOS40YTEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMCAxLTIuODMtMi44M2wuMDYtLjA2QTEuNjUgMS42NSAwIDAgMCA0LjY4IDE1YTEuNjUgMS42NSAwIDAgMC0xLjUxLTFIM2EyIDIgMCAwIDEgMC00aC4wOUExLjY1IDEuNjUgMCAwIDAgNC42IDlhMS42NSAxLjY1IDAgMCAwLS4zMy0xLjgybC0uMDYtLjA2YTIgMiAwIDAgMSAyLjgzLTIuODNsLjA2LjA2QTEuNjUgMS42NSAwIDAgMCA5IDQuNjhhMS42NSAxLjY1IDAgMCAwIDEtMS41MVYzYTIgMiAwIDAgMSA0IDB2LjA5YTEuNjUgMS42NSAwIDAgMCAxIDEuNTEgMS42NSAxLjY1IDAgMCAwIDEuODItLjMzbC4wNi0uMDZhMiAyIDAgMCAxIDIuODMgMi44M2wtLjA2LjA2QTEuNjUgMS42NSAwIDAgMCAxOS40IDlhMS42NSAxLjY1IDAgMCAwIDEuNTEgMUgyMWEyIDIgMCAwIDEgMCA0aC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXoiIC8+PC9zdmc+'
}

// ====== Functions ======
const loadUserStats = async () => {
  try {
    const result = await orderService.getOrderStats()
    stats.value = {
      pendingCount: result.pendingCount || 0,
      paidCount: result.paidCount || 0,
      completedCount: result.completedCount || 0
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const refreshUserState = async () => {
  await authStore.initAuthState()
  if (authStore.isLoggedIn.value) {
    await loadUserStats()
  }
}

const goToLoginPage = () => {
  uni.navigateTo({ url: '/pages/login/login' })
}

const showProfileCompletion = () => {
  profileCompletionRef.value?.showPopup()
}

// ====== Navigation ======
const navigateToAuthPage = (url: string) => {
  if (!authStore.isLoggedIn.value && !authService.getToken()) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }

  uni.navigateTo({ url })
}

const goToMyCourses = () => {
  navigateToAuthPage('/subpackages/profile/my-courses/index')
}

const goToFavorites = () => {
  navigateToAuthPage('/subpackages/profile/favorites/index')
}

const goToCoupons = () => {
  navigateToAuthPage('/subpackages/profile/coupons/index')
}

const goToOrders = () => {
  uni.switchTab({ url: '/pages/orders/orders' })
}

const goToInvite = () => {
  uni.navigateTo({ url: '/subpackages/profile/invite/index' })
}

const goToSettings = () => {
  uni.navigateTo({ url: '/subpackages/settings/index' })
}

const goToHelp = () => {
  uni.navigateTo({ url: '/subpackages/about/help-feedback/index' })
}

const goToAbout = () => {
  uni.navigateTo({ url: '/subpackages/about/about/index' })
}

// ====== Lifecycle ======
onShow(() => {
  checkMiniProgramUpdate()
  syncCustomTabBar()
  refreshUserState()
})

onMounted(() => {
  loadSiteConfig()
  refreshUserState()
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.profile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-background;
}

/* Header Slots (inside NavBar) */
.brand-logo {
  font-family: $font-family-brand;
  font-weight: 800;
  font-size: 22px;
  color: $color-brand-dark;
  letter-spacing: 2px;
}

.header-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  width: 18px;
  height: 18px;
}

/* Scroll Area */
.profile-scroll {
  flex: 1;
}

.scroll-content {
  display: flex;
  flex-direction: column;
}

/* Profile Hero — Paper Design: 335×104, mt 12px, mx 20px, p 24px 20px, radius 20px */
.profile-hero {
  margin: $spacing-12 $spacing-20 0;
  padding: $spacing-24 $spacing-20;
  border-radius: $radius-20;
  background: $gradient-profile-hero;
  position: relative;
  overflow: hidden;

  // 装饰圆 — Paper Design: right -20px, top -20px, 140×140
  &::after {
    content: '';
    position: absolute;
    right: -20px;
    top: -20px;
    width: 140px;
    height: 140px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
  }

  .hero-info {
    display: flex;
    align-items: center;
    gap: $spacing-12; // Paper: 12px
    position: relative;
    z-index: 1;
  }

  // 头像 — Paper: 56×56, radius 50%, bg #FFFFFF26, 无 border
  .avatar-container {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .placeholder-text {
      color: #FFFFFF;
      font-size: 22px; // Paper: 22px
      font-weight: 600;
    }
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  // 用户名 — Paper: 17px, white, font-weight 600
  .user-name {
    color: #FFFFFF;
    font-size: 17px;
    font-weight: 600;
    line-height: 22px;
  }

  // VIP 标签行
  .vip-badge {
    display: flex;
    align-items: center;
    gap: $spacing-4;
  }

  // VIP 标签 — Paper: radius 8px, padding 1px 8px, bg #F5A623, text 10px
  .vip-text {
    background-color: $color-accent;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: $radius-8;
    line-height: 14px;
  }

  // 有效期文字 — Paper: 11px, #FFFFFFB3
  .vip-expiry {
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    line-height: 14px;
  }

  .unlogin-desc {
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
  }
}

/* Menu Groups */
.menu-group {
  margin: $spacing-12 $spacing-20 0;
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  overflow: hidden;

  // 第一个菜单组与 hero 的间距更大 — Paper: 16px
  &:first-of-type {
    margin-top: $spacing-16;
  }
}

// 菜单项 — Paper: padding 14px 16px, gap 12px
.menu-item {
  display: flex;
  align-items: center;
  padding: $spacing-14 $spacing-16;
  gap: $spacing-12;

  &:active {
    background-color: $color-background;
  }

  // 图标容器 — Paper: 32×32, radius 12px, bg #E8F7F0
  .menu-icon-box {
    width: 32px;
    height: 32px;
    border-radius: $radius-12;
    background-color: $color-primary-light;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  // 图标 — Paper: 16×16
  .menu-icon-img {
    width: 16px;
    height: 16px;
  }

  // 菜单文字 — Paper: 14px, font-weight 600, #1A2E35
  .menu-label {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
    line-height: 18px;
  }

  // 角标 badge — Paper: radius 8px, bg #FFF0E8, text 10px #F5A623
  .menu-badge {
    background-color: $color-warm-bg;
    padding: 1px 6px;
    border-radius: $radius-8;

    .menu-badge-text {
      color: $color-accent;
      font-size: 10px;
      font-weight: 600;
      line-height: 14px;
    }
  }

  // 箭头 — Paper: 14×14, stroke #6B8A94
  .menu-arrow-img {
    width: 14px;
    height: 14px;
  }
}

// 分割线 — Paper: 1px, #E2EBED, margin-inline 16px
.menu-divider {
  height: 1px;
  background-color: $color-border;
  margin-left: calc(32px + 12px + 16px); // iconbox + gap + padding，与图标对齐
}

/* Footer — Paper: 左对齐, padding 10px 16px 10px 20px, text 11px #6B8A94 */
.profile-footer {
  margin-top: $spacing-12;
  display: flex;
  justify-content: flex-start;
  padding: 10px $spacing-16 10px $spacing-20;

  .version-text {
    font-size: 11px;
    color: $color-text-muted;
    line-height: 14px;
  }
}
</style>
