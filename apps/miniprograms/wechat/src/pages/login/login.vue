<template>
  <view class="login-page" :style="{ paddingTop: safeArea.navBarHeight + 'px' }">
    <!-- 品牌 Logo 区域 -->
    <view class="brand-section">
      <text class="brand-logo">{{ siteName }}</text>
      <text class="brand-slogan">{{ siteSlogan }}</text>
    </view>

    <!-- 欢迎文案 -->
    <view class="welcome-section">
      <text class="welcome-title">欢迎来到{{ siteName }}</text>
      <text class="welcome-desc">登录后即可享受完整的学习体验</text>
    </view>

    <!-- 插画区域 -->
    <view class="illustration-wrapper">
      <view class="illustration-container">
        <!-- 打开的书本图标 (SVG 改为符合设计稿的简化版) -->
        <view class="book-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="12" y="16" width="40" height="32" rx="4" fill="#009666" fill-opacity="0.3" />
            <rect x="25" y="20" width="14" height="24" rx="2" fill="#009666" />
            <rect x="42" y="20" width="14" height="24" rx="2" fill="#009666" fill-opacity="0.5" />
          </svg>
        </view>
        <!-- 装饰性元素 -->
        <view class="deco-circle deco-top-right" />
        <view class="deco-circle deco-bottom-left" />
      </view>
    </view>

    <!-- 微信登录按钮 -->
    <view class="wechat-btn-wrapper">
      <view class="wechat-btn" hover-class="wechat-btn-hover" @tap="handleWechatLogin">
        <view class="wechat-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.2 4.127c-3.997 0-7.242 2.697-7.242 6.03 0 3.334 3.245 6.03 7.242 6.03.67 0 1.32-.073 1.942-.21a.717.717 0 0 1 .596.082l1.33.778a.271.271 0 0 0 .139.045.244.244 0 0 0 .241-.245c0-.06-.024-.118-.04-.177l-.272-1.033a.49.49 0 0 1 .177-.552c1.52-1.12 2.485-2.773 2.485-4.718 0-3.333-3.245-6.03-7.242-6.03h-.356zm-2.397 3.49c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.544.434-.983.97-.983zm4.793 0c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.544.434-.983.97-.983z" />
          </svg>
        </view>
        <text class="wechat-btn-text">{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </view>
    </view>

    <!-- 分割线 -->
    <view class="divider-section">
      <view class="divider-line" />
      <text class="divider-text">其他方式</text>
      <view class="divider-line" />
    </view>

    <!-- 手机号登录入口 -->
    <view class="phone-login-entry" hover-class="phone-login-hover" @tap="handlePhoneLogin">
      <view class="phone-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B8A94" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12" y2="18.01" />
        </svg>
      </view>
      <text class="phone-login-text">手机号登录</text>
    </view>

    <!-- 协议区域 -->
    <view class="agreement-section" @tap="toggleAgreement">
      <view :class="['agreement-checkbox', agreementChecked ? 'checked' : '']">
        <text v-if="agreementChecked" class="check-mark">✓</text>
      </view>
      <view class="agreement-text-wrapper">
        <text class="agreement-text"> 登录即代表同意 </text>
        <text class="agreement-link" @tap.stop="openAgreement('USER_AGREEMENT')">《用户协议》</text>
        <text class="agreement-text"> 和 </text>
        <text class="agreement-link" @tap.stop="openAgreement('PRIVACY_POLICY')">《隐私政策》</text>
      </view>
    </view>

    <!-- 底部填充区域，确保安全区 -->
    <view :style="{ height: safeArea.safeAreaBottom + 'px' }" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/utils/logger'
import { useSafeArea } from '@/hooks/useSafeArea'
import { useSiteConfig } from '@/hooks/useSiteConfig'

const authStore = useAuthStore()
const safeArea = useSafeArea()
const { siteName, siteSlogan, loadSiteConfig } = useSiteConfig()
loadSiteConfig() // 加载站点配置

// 响应式状态
const loading = ref(false)
const agreementChecked = ref(false)

/**
 * 切换协议勾选状态
 */
const toggleAgreement = () => {
  agreementChecked.value = !agreementChecked.value
}

/**
 * 打开协议页面
 * @param {string} type - 协议类型：USER_AGREEMENT 或 PRIVACY_POLICY
 */
const openAgreement = (type: string) => {
  uni.navigateTo({
    url: `/subpackages/agreements/detail?type=${type}`
  })
}

/**
 * 处理微信登录
 */
const handleWechatLogin = async () => {
  if (!agreementChecked.value) {
    uni.showToast({ title: '请先阅读并同意用户协议', icon: 'none' })
    return
  }

  loading.value = true

  try {
    logger.info('开始微信登录...')
    const loginResult = await new Promise<{ code: string }>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        onlyAuthorize: true,
        success: (res) => {
          if (res && res.code) {
            logger.info('获取微信 code 成功', { codeLength: res.code.length })
            resolve({ code: res.code })
          } else {
            reject(new Error('获取微信授权码失败：返回数据格式错误'))
          }
        },
        fail: (err) => {
          logger.error('uni.login 调用失败', { errMsg: err.errMsg })
          reject(new Error(`获取微信 code 失败: ${err.errMsg || '未知错误'}`))
        }
      })
    })

    // 使用 code 登录
    await authStore.loginWithWechat(loginResult.code)

    uni.showToast({ title: '登录成功', icon: 'success' })

    // 延迟后根据用户状态决定跳转目标
    setTimeout(() => {
      loading.value = false
      // 判断是否为新用户且需要完善资料
      if (authStore.shouldCompleteProfile.value) {
        logger.info('新用户资料未完善，跳转资料完善页')
        uni.redirectTo({ url: '/subpackages/profile/complete' })
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 1000)
  } catch (error) {
    loading.value = false
    logger.error('微信登录失败', error)

    let errorMessage = '登录失败，请重试'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    uni.showToast({ title: errorMessage, icon: 'none', duration: 2500 })
  }
}

/**
 * 手机号登录
 */
const handlePhoneLogin = () => {
  uni.showToast({ title: '手机号登录即将开放', icon: 'none' })
}
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.login-page {
  height: 100vh;
  overflow: hidden;
  background-color: $color-background;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

/* 品牌 Logo 区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  padding-bottom: 20px;

  .brand-logo {
    font-family: $font-family-brand;
    font-size: 22px;
    font-weight: 800;
    color: $color-brand-dark;
    letter-spacing: 2px;
    line-height: 28px;
  }

  .brand-slogan {
    font-family: $font-family-title;
    font-size: 13px;
    font-weight: 400;
    color: $color-text-muted;
    line-height: 18px;
    margin-top: 8px;
  }
}

/* 欢迎文案区域 */
.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 40px 0;

  .welcome-title {
    font-family: $font-family-title;
    font-size: 22px;
    font-weight: 600;
    color: $color-text-primary;
    line-height: 30px;
    text-align: center;
  }

  .welcome-desc {
    font-family: $font-family-title;
    font-size: 13px;
    color: $color-text-muted;
    line-height: 18px;
    margin-top: 8px;
    text-align: center;
  }
}

/* 插画区域 */
.illustration-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.illustration-container {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: $gradient-light-teal;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 打开的书本图标 */
.book-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 装饰性元素 */
.deco-circle {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: $color-primary;
}

.deco-top-right {
  top: 20px;
  right: 20px;
  opacity: 0.2;
}

.deco-bottom-left {
  bottom: 24px;
  left: 24px;
  opacity: 0.15;
}

/* 微信登录按钮 */
.wechat-btn-wrapper {
  width: 100%;
  padding: 0 32px;
  box-sizing: border-box;
}

.wechat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #07C160;
  border-radius: $radius-20;
  padding: 14px 0;
  transition: opacity 0.2s, transform 0.2s;

  .wechat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wechat-btn-text {
    font-family: $font-family-body;
    font-size: 15px;
    font-weight: 600;
    color: #FFFFFF;
    line-height: 20px;
  }
}

.wechat-btn-hover {
  opacity: 0.85;
  transform: scale(0.98);
}

/* 分割线区域 */
.divider-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 32px 0;
  width: 100%;
  box-sizing: border-box;

  .divider-line {
    flex: 1;
    height: 1px;
    background-color: $color-border;
  }

  .divider-text {
    font-family: $font-family-title;
    font-size: 12px;
    color: $color-text-muted;
    line-height: 16px;
    white-space: nowrap;
  }
}

/* 手机号登录入口 */
.phone-login-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 0;

  .phone-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .phone-login-text {
    font-family: $font-family-title;
    font-size: 13px;
    color: $color-text-muted;
    line-height: 18px;
  }
}

.phone-login-hover {
  opacity: 0.7;
}

/* 协议区域 */
.agreement-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 40px 0;
  width: 100%;
  box-sizing: border-box;
}

.agreement-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid $color-border;
  background-color: $color-surface;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &.checked {
    background-color: $color-primary;
    border-color: $color-primary;
  }

  .check-mark {
    font-size: 10px;
    color: #FFFFFF;
    font-weight: bold;
  }
}

.agreement-text-wrapper {
  display: flex;
  flex-wrap: wrap;
}

.agreement-text {
  font-family: $font-family-title;
  font-size: 11px;
  color: $color-text-muted;
  line-height: 16px;
}

.agreement-link {
  font-family: $font-family-title;
  font-size: 11px;
  color: #576b95;
  line-height: 16px;
}
</style>
