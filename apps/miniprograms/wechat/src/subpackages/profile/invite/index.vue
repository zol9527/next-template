<template>
  <view class="invite-page">
    <!-- 导航栏（NavBar 组件自动处理安全区域） -->
    <NavBar title="邀请好友" title-align="left" />

    <scroll-view scroll-y class="content-scroll">
      <view class="content-container">
        <!-- Invite Banner -->
        <view class="invite-banner">
          <view class="banner-title">邀请好友，各得 ¥50</view>
          <view class="banner-desc">分享给好友，好友注册并购买课程后，双方各获得 ¥50 优惠券</view>
          <view class="banner-actions">
            <view class="btn primary-btn" @tap="handleInvite">
              <text>立即邀请</text>
            </view>
            <view class="btn secondary-btn" @tap="handleCopyLink">
              <text>复制链接</text>
            </view>
          </view>
        </view>

        <!-- Invite Stats -->
        <view class="invite-stats">
          <view class="stat-item">
            <text class="stat-value">{{ stats.inviteCount || 0 }}</text>
            <text class="stat-label">已邀请</text>
          </view>
          <view class="divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.purchaseCount || 0 }}</text>
            <text class="stat-label">已购买</text>
          </view>
          <view class="divider"></view>
          <view class="stat-item">
            <text class="stat-value">¥{{ stats.totalReward || 0 }}</text>
            <text class="stat-label">累计奖励</text>
          </view>
        </view>

        <!-- Invitee Section -->
        <view class="invitee-section">
          <view class="section-header">
            <text class="section-title">邀请记录</text>
          </view>
          <view v-if="inviteeList.length > 0" class="invitee-list">
            <view v-for="(item, index) in inviteeList" :key="index" class="invitee-card">
              <view class="avatar-box">
                <image v-if="item.avatar" :src="item.avatar" class="avatar" />
                <view v-else class="avatar-placeholder">{{ item.nickname?.charAt(0) || '友' }}</view>
              </view>
              <view class="invitee-info">
                <text class="nickname">{{ item.nickname }}</text>
                <text class="time">{{ item.createTime }} 邀请</text>
              </view>
              <view class="status-tag" :class="item.status">
                {{ item.status === 'purchased' ? '已购买' : '待购买' }}
              </view>
            </view>
          </view>
          <view v-else-if="isLoggedIn" class="empty-tip">暂无邀请记录</view>
          <!-- 未登录提示 -->
          <view v-else class="login-prompt">
            <text class="login-prompt-text">登录后查看邀请记录</text>
            <view class="btn primary-btn login-btn" @tap="goToLogin">
              <text>去登录</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 底部安全距离 -->
      <view :style="{ height: safeArea.safeAreaBottom + 'px' }"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSafeArea } from '@/hooks/useSafeArea'
import { authService } from '@/services/api/auth.service'
import { distributionService } from '@/services/api/distribution'
import { showSuccess, showText } from '@/utils/toast'

// 页面名称：邀请好友
// Paper Artboard: 1TE-0

const safeArea = useSafeArea()

// 登录状态：未登录时页面仍可展示，但不请求 API（避免 401 触发全局 clearAuthAndRedirect）
const isLoggedIn = ref(false)

const stats = ref({
  inviteCount: 0,
  purchaseCount: 0,
  totalReward: 0
})

const inviteeList = ref<any[]>([])

// 跳转登录页
const goToLogin = () => {
  uni.navigateTo({ url: '/pages/login/login' })
}

const handleInvite = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  showText('请点击右上角分享给好友')
}

const handleCopyLink = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  uni.setClipboardData({
    data: 'https://www.shuoboda.cn/invite?u=123',
    success: () => {
      showSuccess('链接已复制')
    }
  })
}

const fetchStats = async () => {
  try {
    const res = await distributionService.getPromoterStats()
    if (res) {
      stats.value = {
        inviteCount: res.inviteCount || 0,
        purchaseCount: res.purchaseCount || 0,
        totalReward: res.totalCommission || 0
      }
    }
  } catch (error) {
    console.error('获取统计失败', error)
  }
}

const fetchInvitees = async () => {
  try {
    const res = await distributionService.getCommissions({ limit: 20 })
    if (res && res.list) {
      inviteeList.value = res.list.map((item: any) => ({
        nickname: item.inviteeNickname || '用户',
        avatar: item.inviteeAvatar || '',
        createTime: item.createTime?.split('T')[0] || '',
        status: item.status === 'settled' ? 'purchased' : 'pending'
      }))
    }
  } catch (error) {
    console.error('获取邀请记录失败', error)
  }
}

onMounted(() => {
  isLoggedIn.value = !!authService.getToken()
  // 仅在已登录时才请求接口，避免 401 触发 clearAuthAndRedirect 跳走
  if (isLoggedIn.value) {
    fetchStats()
    fetchInvitees()
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.invite-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-background;
}

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.content-container {
  padding-bottom: 32px;
}

.invite-banner {
  margin: $spacing-12 $spacing-20;
  padding: $spacing-24;
  border-radius: $radius-20;
  background: linear-gradient(135deg, #FFF0E8 0%, #FFE0CC 100%);
  display: flex;
  flex-direction: column;
  gap: $spacing-12;

  .banner-title {
    font-family: $font-family-title;
    font-weight: 600;
    font-size: 20px;
    line-height: 28px;
    color: $color-text-primary;
  }

  .banner-desc {
    font-family: $font-family-title;
    font-weight: 400;
    font-size: 13px;
    line-height: 18px;
    color: $color-text-muted;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: $spacing-12;
    margin-top: $spacing-4;

    .btn {
      display: flex;
      align-items: center;
      gap: $spacing-6;
      height: 34px;
      padding: 0 $spacing-16;
      border-radius: $radius-20;
      font-size: 12px;
      font-weight: 600;
      transition: opacity 0.2s;

      &:active {
        opacity: 0.8;
      }

      &.primary-btn {
        background-color: $color-accent;
        color: #FFFFFF;
      }

      &.secondary-btn {
        background-color: #FFFFFF;
        color: $color-text-muted;
        border: 1px solid $color-border;
      }
    }
  }
}

.invite-stats {
  margin: 0 $spacing-20;
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  display: flex;
  align-items: center;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 0;
    gap: $spacing-4;

    // 已邀请 — Paper: accent 金色
    &:nth-child(1) .stat-value {
      color: $color-accent;
    }

    // 已购买 — Paper: primary 绿色
    &:nth-child(3) .stat-value {
      color: $color-primary;
    }

    // 累计奖励 — Paper: text-primary 深色
    &:nth-child(5) .stat-value {
      color: $color-text-primary;
    }

    .stat-value {
      font-family: $font-family-code;
      font-size: 20px;
      font-weight: 600;
      line-height: 22px;
    }

    .stat-label {
      font-size: 11px;
      color: $color-text-muted;
      line-height: 14px;
    }
  }

  .divider {
    width: 1px;
    height: 56px;
    background-color: $color-border;
  }
}

.invitee-section {
  padding: $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-12;

  .section-title {
    font-family: $font-family-title;
    font-weight: 600;
    font-size: 17px;
    color: $color-text-primary;
    line-height: 24px;
  }

  .invitee-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-12;
  }

  .invitee-card {
    display: flex;
    align-items: center;
    padding: $spacing-14;
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-16;
    gap: $spacing-12;

    .avatar-box {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      background-color: $color-primary-light;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .avatar {
        width: 100%;
        height: 100%;
      }

      .avatar-placeholder {
        font-size: 14px;
        color: $color-primary;
        font-weight: 600;
        line-height: 18px;
      }
    }

    .invitee-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .nickname {
        font-size: 14px;
        font-weight: 600;
        color: $color-text-primary;
        line-height: 20px;
      }

      .time {
        font-size: 11px;
        color: $color-text-muted;
        line-height: 14px;
      }
    }

    .status-tag {
      flex-shrink: 0;
      padding: 4px 10px;
      border-radius: $radius-20;
      font-size: 11px;
      font-weight: 600;
      line-height: 14px;

      &.purchased {
        background-color: $color-primary-light;
        color: $color-primary;
      }

      &.pending {
        background-color: $color-background;
        color: $color-text-muted;
      }
    }
  }

  .empty-tip {
    padding: 40px 0;
    text-align: center;
    font-size: 13px;
    color: $color-text-muted;
  }

  // 未登录引导
  .login-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-12;
    padding: 40px 0;

    .login-prompt-text {
      font-size: 13px;
      color: $color-text-muted;
    }

    .login-btn {
      height: 34px;
      padding: 0 $spacing-24;
      background-color: $color-primary;
      color: #FFFFFF;
      border-radius: $radius-20;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
