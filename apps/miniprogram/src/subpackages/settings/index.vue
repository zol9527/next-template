<template>
  <view class="settings-page">
    <!-- ========== 导航栏（NavBar 组件自动处理安全区域） ========== -->
    <NavBar title="设置" title-align="left" />

    <view class="content">
      <!-- ========== Settings List ========== -->
      <view class="settings-list">
        <view 
          class="setting-item" 
          hover-class="item-hover"
          @tap="navigateTo('/subpackages/settings/account-security/index')"
        >
          <view class="icon-container account-icon">
            <image src="/static/icons/settings-account.svg" class="item-icon" mode="aspectFit" />
          </view>
          <text class="item-label">账号与安全</text>
          <image src="/static/icons/arrow-right.svg" class="arrow-icon" mode="aspectFit" />
        </view>

        <view 
          class="setting-item" 
          hover-class="item-hover"
          @tap="navigateTo('/subpackages/settings/privacy-settings/index')"
        >
          <view class="icon-container privacy-icon">
            <image src="/static/icons/settings-privacy.svg" class="item-icon" mode="aspectFit" />
          </view>
          <text class="item-label">隐私设置</text>
          <image src="/static/icons/arrow-right.svg" class="arrow-icon" mode="aspectFit" />
        </view>

        <view 
          class="setting-item no-border" 
          hover-class="item-hover"
          @tap="handleClearCache"
        >
          <view class="icon-container cache-icon">
            <image src="/static/icons/settings-cache.svg" class="item-icon" mode="aspectFit" />
          </view>
          <text class="item-label">清除缓存</text>
          <text class="extra-text">{{ cacheSize }}</text>
          <image src="/static/icons/arrow-right.svg" class="arrow-icon" mode="aspectFit" />
        </view>
      </view>

      <!-- ========== Logout Section ========== -->
      <view class="logout-section">
        <view class="logout-btn" hover-class="logout-hover" @tap="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { showConfirm, showSuccess, showLoading, hideLoading } from '@/utils/toast'

/**
 * 页面名称：设置
 * Paper Artboard: 1W5-0
 */

const authStore = useAuthStore()

const cacheSize = ref('1.2 GB')

const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}

/**
 * 清除缓存
 */
const handleClearCache = async () => {
  const confirmed = await showConfirm('确定要清除缓存吗？')
  if (confirmed) {
    showLoading('正在清除...')
    // 模拟清除缓存逻辑
    setTimeout(() => {
      cacheSize.value = '0 B'
      hideLoading()
      showSuccess('清除成功')
    }, 1500)
  }
}

/**
 * 退出登录
 */
const handleLogout = async () => {
  const confirmed = await showConfirm('确定要退出登录吗？')
  if (confirmed) {
    await authStore.logout()
    uni.reLaunch({
      url: '/pages/login/login'
    })
  }
}

onMounted(() => {
  // 可以在此处获取真实的缓存大小
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.settings-page {
  min-height: 100vh;
  background-color: #F5F7F6;
  display: flex;
  flex-direction: column;
}

/* ========== Content ========== */
.content {
  padding: 0 40rpx;
  display: flex;
  flex-direction: column;
}

/* ========== Settings List ========== */
.settings-list {
  margin-top: 32rpx;
  background-color: #FFFFFF;
  border-radius: 32rpx;
  border: 1px solid #E2EBED;
  overflow: hidden;
  margin-bottom: 32rpx;
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  gap: 24rpx;
  border-bottom: 1px solid #E2EBED;

  &.no-border {
    border-bottom: none;
  }

  .icon-container {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #E8F7F0;
    flex-shrink: 0;

    .item-icon {
      width: 32rpx;
      height: 32rpx;
    }
  }

  .item-label {
    flex: 1;
    font-size: 28rpx;
    font-weight: 500;
    color: #1A2E35;
    line-height: 40rpx;
  }

  .extra-text {
    font-size: 26rpx;
    color: #6B8A94;
    line-height: 36rpx;
  }

  .arrow-icon {
    width: 28rpx;
    height: 28rpx;
    flex-shrink: 0;
  }
}

.item-hover {
  background-color: #FAFAFA;
}

/* ========== Logout Section ========== */
.logout-section {
  margin-top: 8rpx;
}

.logout-btn {
  height: 88rpx;
  background-color: #FFFFFF;
  border: 1px solid #E2EBED;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .logout-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #FF3B30;
    line-height: 36rpx;
  }
}

.logout-hover {
  background-color: #FEEEEE;
  border-color: #FFC0C0;
}
</style>
