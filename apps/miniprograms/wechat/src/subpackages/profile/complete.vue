<template>
  <view class="profile-complete-page">
    <NavBar title="完善个人信息" title-align="left" />

    <!-- 提示区域 -->
    <view class="title-section">
      <text class="page-desc">为了提供更好的服务，请填写以下信息</text>
    </view>

    <!-- 姓名输入 -->
    <view class="form-group">
      <text class="form-label">姓名 *</text>
      <view class="input-wrapper">
        <view class="input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B8A94" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </view>
        <input
          class="form-input"
          type="text"
          v-model="form.name"
          placeholder="请输入您的姓名"
          placeholder-class="placeholder-text"
        />
      </view>
    </view>

    <!-- 手机号输入 -->
    <view class="form-group">
      <text class="form-label">手机号 *</text>
      <view class="input-wrapper">
        <view class="input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B8A94" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <line x1="12" y1="18" x2="12" y2="18.01" />
          </svg>
        </view>
        <input
          class="form-input"
          type="number"
          v-model="form.phone"
          placeholder="请输入手机号"
          placeholder-class="placeholder-text"
          maxlength="11"
        />
        <!-- 微信获取手机号按钮 -->
        <button
          class="get-phone-btn"
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
        >
          <text class="get-phone-text">微信获取</text>
        </button>
      </view>
    </view>

    <!-- 收货地址（选填） -->
    <view class="form-group">
      <text class="form-label">收货地址 （选填）</text>
      <picker mode="region" @change="onRegionChange">
        <view class="input-wrapper">
          <view class="input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B8A94" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </view>
          <view class="form-input" :class="{ 'placeholder-text': !form.region }">
            {{ form.region || '省/市/区' }}
          </view>
          <view class="arrow-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B8A94" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </view>
        </view>
      </picker>
      <!-- 详细地址 -->
      <view class="input-wrapper detail-address">
        <input
          class="form-input"
          type="text"
          v-model="form.address"
          placeholder="详细地址（街道、楼牌号等）"
          placeholder-class="placeholder-text"
        />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <view class="submit-btn" hover-class="submit-btn-hover" @tap="handleSubmit">
        <text class="submit-text">{{ submitting ? '提交中...' : '完成注册' }}</text>
      </view>
      <view class="skip-link" hover-class="opacity-hover" @tap="handleSkip">
        <text class="skip-text">跳过，稍后完善</text>
      </view>
    </view>

    <!-- 底部填充区域，确保安全区 -->
    <view :style="{ height: safeArea.safeAreaBottom + 'px' }" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { userService } from '@/services/api/user'
import { logger } from '@/utils/logger'
import { useSafeArea } from '@/hooks/useSafeArea'

const authStore = useAuthStore()
const safeArea = useSafeArea()

// 表单数据
const form = reactive({
  name: '',
  phone: '',
  region: '',
  address: ''
})

// 提交状态
const submitting = ref(false)

/**
 * 处理地区改变
 */
const onRegionChange = (e: any) => {
  const values = e.detail.value
  form.region = values.join(' ')
}

/**
 * 微信获取手机号回调
 */
const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    logger.info('获取手机号 code', { code: e.detail.code })
    
    try {
      // 调用后端解密手机号
      const result = await userService.bindWechatPhone(e.detail.code)
      logger.info('手机号绑定成功')
      
      // 自动填充手机号到表单
      // 检查返回的手机号是否包含脱敏标记（*），如果被脱敏则提示用户手动输入
      if (result.phone) {
        const phoneStr = String(result.phone)
        if (phoneStr.includes('*')) {
          // 后端返回了脱敏手机号（如 158****6789），提示用户手动输入
          logger.warn('后端返回脱敏手机号，提示用户手动输入', { phone: phoneStr })
          uni.showToast({ title: '手机号已绑定，请手动输入完整号码', icon: 'none', duration: 2000 })
        } else if (/^1[3-9]\d{9}$/.test(phoneStr)) {
          // 完整的 11 位手机号，直接填充
          form.phone = phoneStr
          uni.showToast({ title: '手机号获取成功', icon: 'success' })
        } else {
          // 格式异常的手机号，提示手动输入
          logger.warn('后端返回手机号格式异常', { phone: phoneStr })
          uni.showToast({ title: '请手动输入手机号', icon: 'none' })
        }
      }
    } catch (error) {
      logger.error('手机号绑定失败', error)
      uni.showToast({ title: '获取手机号失败，请手动输入', icon: 'none' })
    }
  } else {
    logger.warn('获取手机号失败', e.detail.errMsg)
    uni.showToast({ title: '获取手机号失败', icon: 'none' })
  }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  // 验证姓名
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }

  // 验证手机号
  if (!form.phone.trim()) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(form.phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    logger.info('提交个人信息', { name: form.name, phone: form.phone })

    // TODO: 调用后端 API 提交用户信息
    // await api.user.updateProfile(form)

    uni.showToast({ title: '注册完成', icon: 'success' })

    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (error) {
    logger.error('提交个人信息失败', error)
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/**
 * 跳过资料完善
 * 记录跳过状态后跳转首页，下次登录不再提示完善信息
 */
const handleSkip = () => {
  authStore.skipProfileCompletion()
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.profile-complete-page {
  min-height: 100vh;
  background-color: $color-background;
  display: flex;
  flex-direction: column;
  padding: 0 20px;
  box-sizing: border-box;
}

/* 标题区域 */
.title-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;

  .page-title {
    font-family: $font-family-title;
    font-size: 22px;
    font-weight: 600;
    color: $color-text-primary;
    line-height: 30px;
  }

  .page-desc {
    font-family: $font-family-title;
    font-size: 13px;
    color: $color-text-muted;
    line-height: 18px;
    margin-top: 8px;
  }
}

/* 表单组 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 32px;

  .form-label {
    font-family: $font-family-title;
    font-size: 13px;
    font-weight: 500;
    color: $color-text-primary;
    line-height: 18px;
  }
}

/* 输入框容器 */
.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: $color-surface;
  border: 1.5px solid $color-border;
  border-radius: 20px;
  padding: 12px 16px;

  .input-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .form-input {
    flex: 1;
    font-family: $font-family-title;
    font-size: 14px;
    color: $color-text-primary;
    line-height: 20px;
    min-height: 20px;
  }
}

.detail-address {
  margin-top: 8px;
  border-radius: $radius-16;
}

/* 占位文字样式 */
.placeholder-text {
  color: $color-text-muted;
  opacity: 0.6;
}

/* 微信获取手机号按钮 */
.get-phone-btn {
  background-color: $color-primary-light;
  border-radius: 12px;
  padding: 6px 12px;
  flex-shrink: 0;
  margin: 0;
  line-height: normal;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }

  .get-phone-text {
    font-family: $font-family-title;
    font-size: 11px;
    font-weight: 500;
    color: $color-primary;
    white-space: nowrap;
  }
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 36px;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  background-color: $color-primary;
  border-radius: $radius-20;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.2s;

  .submit-text {
    font-family: $font-family-body;
    font-size: 15px;
    font-weight: 600;
    color: #FFFFFF;
    line-height: 20px;
  }
}

.submit-btn-hover {
  opacity: 0.85;
  transform: scale(0.98);
}

/* 跳过链接 */
.skip-link {
  padding: 4px 0;

  .skip-text {
    font-family: $font-family-title;
    font-size: 13px;
    color: $color-text-muted;
    line-height: 18px;
  }
}

/* 工具类 */
.opacity-hover {
  opacity: 0.7;
}
</style>
