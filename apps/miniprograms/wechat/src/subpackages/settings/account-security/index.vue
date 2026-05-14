<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { authService } from '@/services/api/auth.service'
import { handleError } from '@/utils/error-handler'
import type { UserInfo } from '@/types'

// 用户信息
const userInfo = ref<UserInfo | null>(null)
const isLoading = ref(true)

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    isLoading.value = true
    const res = await authService.getCurrentUser()
    userInfo.value = res
  } catch (error) {
    handleError(error)
  } finally {
    isLoading.value = false
  }
}

// 格式化手机号 (138****6789)
const formattedPhone = computed(() => {
  const phone = userInfo.value?.user?.phone
  if (!phone) return '未绑定'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

// 占位处理函数
const handleItemClick = (type: string) => {
  uni.showToast({
    title: `点击了 ${type}`,
    icon: 'none'
  })
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<template>
  <view class="page-container">
    <!-- 导航栏（NavBar 组件自动处理安全区域） -->
    <NavBar title="账号与安全" title-align="left" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content">
      <!-- 绑定信息组 -->
      <view class="card-group">
        <view class="menu-item" @tap="handleItemClick('手机号')">
          <view class="icon-container phone-bg">
            <image class="menu-icon" src="/static/icons/phone.svg" />
          </view>
          <view class="item-content">
            <text class="item-label">手机号</text>
            <text class="item-sub-label">{{ formattedPhone }}</text>
          </view>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" />
        </view>
        <view class="divider" />
        <view class="menu-item" @tap="handleItemClick('微信绑定')">
          <view class="icon-container wechat-bg">
            <image class="menu-icon" src="/static/icons/wechat.svg" />
          </view>
          <view class="item-content">
            <text class="item-label">微信绑定</text>
            <text class="item-sub-label">{{ userInfo?.user?.nickname ? `已绑定 ${userInfo.user.nickname}` : '未绑定' }}</text>
          </view>
          <text class="status-badge" v-if="userInfo?.user?.nickname">已绑定</text>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" v-else />
        </view>
      </view>

      <!-- 安全设置组 -->
      <view class="card-group">
        <view class="menu-item" @tap="handleItemClick('登录密码')">
          <view class="icon-container password-bg">
            <image class="menu-icon" src="/static/icons/lock.svg" />
          </view>
          <view class="item-content">
            <text class="item-label">登录密码</text>
          </view>
          <text class="item-value">未设置</text>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" />
        </view>
        <view class="divider" />
        <view class="menu-item" @tap="handleItemClick('注销账号')">
          <view class="icon-container logout-bg">
            <image class="menu-icon" src="/static/icons/logout-alert.svg" />
          </view>
          <view class="item-content">
            <text class="item-label danger">注销账号</text>
          </view>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" />
        </view>
      </view>

      <!-- 其他管理组 -->
      <view class="card-group">
        <view class="menu-item" @tap="handleItemClick('登录设备管理')">
          <view class="icon-container device-bg">
            <image class="menu-icon" src="/static/icons/device.svg" />
          </view>
          <view class="item-content">
            <text class="item-label">登录设备管理</text>
            <text class="item-sub-label">当前设备 · iPhone 15 Pro</text>
          </view>
          <image class="arrow-icon" src="/static/icons/arrow-right.svg" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.page-container {
  min-height: 100vh;
  background-color: $color-background;
}

.content {
  box-sizing: border-box;
  flex: 1;
}

.card-group {
  margin: $spacing-12 $spacing-20 0;
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: $spacing-14 $spacing-16;
  min-height: 60px;
  box-sizing: border-box;

  &:active {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .icon-container {
    width: 32px;
    height: 32px;
    border-radius: $radius-12;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-12;
    flex-shrink: 0;

    &.phone-bg, &.wechat-bg, &.password-bg, &.device-bg {
      background-color: $color-primary-light;
    }

    &.logout-bg {
      background-color: $color-warm-bg;
    }

    .menu-icon {
      width: 16px;
      height: 16px;
    }
  }

  .item-content {
    flex: 1;
    display: flex;
    flex-direction: column;

    .item-label {
      font-size: 14px;
      font-weight: 500;
      color: $color-text-primary;
      line-height: 20px;

      &.danger {
        color: $color-accent;
      }
    }

    .item-sub-label {
      font-size: 12px;
      color: $color-text-muted;
      line-height: 16px;
    }
  }

  .item-value {
    font-size: 12px;
    color: $color-text-muted;
    margin-right: $spacing-4;
  }

  .status-badge {
    font-size: 12px;
    font-weight: 500;
    color: $color-primary;
    margin-right: $spacing-4;
  }

  .arrow-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}

.divider {
  height: 1px;
  background-color: $color-border;
  margin-left: 60px; // 图标容器 32px + 间隔 12px + 自身的 padding 16px
  margin-right: $spacing-16;
}
</style>
