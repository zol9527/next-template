<template>
  <view v-if="isVisible" class="mask" @tap.stop="handleSkip">
    <view class="popup-box" @tap.stop>
      <view class="close-icon" @tap="handleSkip">
        <text class="close-text">×</text>
      </view>

      <view class="brand-section">
        <text class="brand-title">设置昵称</text>
        <text class="brand-desc">设置一个昵称，便于展示和互动</text>
      </view>

      <!-- 昵称输入 -->
      <view class="nickname-section">
        <text class="field-label">昵称</text>
        <input
          type="nickname"
          class="nickname-input"
          v-model="nickname"
          placeholder="请输入昵称"
          maxlength="64"
          @blur="onNicknameBlur"
        />
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button
          :class="['submit-btn', canSubmit ? 'submit-btn-enabled' : 'submit-btn-disabled', submitting ? 'loading-state' : '']"
          :disabled="submitting || !canSubmit"
          @tap="handleSubmit"
        >
          <view v-if="submitting" class="spinner"></view>
          <text v-else>保存</text>
        </button>
        <view class="skip-text" @tap="handleSkip">
          <text>稍后再说</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { userService } from '@/services/api/user';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const isVisible = ref(false);
const nickname = ref('');
const submitting = ref(false);

const authStore = useAuthStore();
const emit = defineEmits(['completed', 'skipped']);

// 只需要昵称即可提交（头像后续通过微信接入）
const canSubmit = computed(() => {
  return nickname.value.trim().length > 0;
});

const showPopup = () => {
  // 预填当前用户的昵称（如果有）
  if (authStore.userInfo?.nickname) {
    nickname.value = authStore.userInfo.nickname;
  }
  isVisible.value = true;
};

const hidePopup = () => {
  isVisible.value = false;
};

const onNicknameBlur = () => {
  nickname.value = nickname.value.trim();
};

const handleSubmit = async () => {
  if (!canSubmit.value || submitting.value) return;

  submitting.value = true;
  try {
    // 只提交昵称，不提交头像（后续接入微信头像）
    await userService.updateWechatProfile({
      nickname: nickname.value.trim(),
    });

    // 刷新用户信息
    await authStore.fetchUserInfo();

    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      submitting.value = false;
      isVisible.value = false;
      emit('completed');
    }, 1000);
  } catch (error) {
    submitting.value = false;
    logger.error('昵称保存失败', error);
    uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
  }
};

const handleSkip = () => {
  isVisible.value = false;
  emit('skipped');
};

defineExpose({ showPopup, hidePopup });
</script>

<style scoped>
.mask {
  width: 620rpx;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.popup-box {
  width: 100%;
  background-color: #ffffff;
  border-radius: 40rpx;
  padding: 40rpx 40rpx 60rpx;
  box-sizing: border-box;
  position: relative;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.12), 0 2rpx 16rpx rgba(0, 0, 0, 0.08);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.close-icon {
  position: absolute;
  right: 40rpx;
  top: 40rpx;
  padding: 10rpx;
  z-index: 10;
}

.close-text {
  font-size: 48rpx;
  color: #ccc;
  line-height: 1;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20rpx;
  margin-bottom: 40rpx;
}

.brand-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1A2E35;
}

.brand-desc {
  font-size: 24rpx;
  color: #6B8A94;
  margin-top: 10rpx;
}

.nickname-section {
  margin-bottom: 48rpx;
}

.field-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1A2E35;
  margin-bottom: 12rpx;
  display: block;
}

.nickname-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #E2EBED;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background-color: #F5F7F6;
  color: #1A2E35;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.submit-btn {
  width: 100%;
  height: 90rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all 0.3s;
}

/* 未激活态：清晰的禁用样式 */
.submit-btn-disabled {
  background-color: #E2EBED;
  color: #6B8A94;
}

/* 激活态：使用品牌主色 */
.submit-btn-enabled {
  background-color: #009666;
  color: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.25);
}

.submit-btn-enabled:active {
  opacity: 0.85;
  transform: scale(0.98);
}

.submit-btn::after {
  border: none;
}

.submit-btn:disabled {
  opacity: 0.6;
}

.skip-text {
  text-align: center;
  padding: 20rpx;
  font-size: 28rpx;
  color: #6B8A94;
  margin-top: 10rpx;
}

.skip-text:active {
  color: #1A2E35;
}

.spinner {
  width: 30rpx;
  height: 30rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
