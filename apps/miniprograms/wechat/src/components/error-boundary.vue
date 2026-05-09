<template>
  <view class="error-boundary">
    <slot v-if="!hasError" />

    <view v-else class="error-content">
      <view class="error-icon">
        <text class="iconfont icon-error"></text>
      </view>
      <text class="error-title">{{ errorTitle }}</text>
      <text class="error-message">{{ errorMessage }}</text>
      <view class="error-actions">
        <view class="retry-btn" @click="handleRetry">
          <text>重试</text>
        </view>
        <view class="back-btn" @click="handleBack">
          <text>返回首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { computed, ref, onErrorCaptured } from 'vue';

export default {
  props: {
    fallbackTitle: {
      type: String,
      default: '出错了',
    },
    retryable: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['error', 'retry'],
  setup(props, { emit }) {
    const hasError = ref(false);
    const errorMessage = ref('');
    const errorTitle = computed(() => props.fallbackTitle);

    function handleError(error: Error, vm: unknown) {
      hasError.value = true;
      errorMessage.value = error.message || '未知错误';
      emit('error', error, vm);

      // 记录错误日志
      console.error('[ErrorBoundary]', error);
    }

    function handleRetry() {
      if (props.retryable) {
        hasError.value = false;
        errorMessage.value = '';
        emit('retry');
      }
    }

    function handleBack() {
      uni.reLaunch({ url: '/pages/index/index' });
    }

    // 注册错误捕获
    onErrorCaptured(handleError);

    return {
      hasError,
      errorMessage,
      errorTitle,
      handleRetry,
      handleBack,
    };
  },
};
</script>

<style lang="scss" scoped>
.error-boundary {
  min-height: 100vh;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  min-height: 60vh;

  .error-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background-color: #ffebee;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;

    .iconfont {
      font-size: 60rpx;
      color: #f44336;
    }
  }

  .error-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 20rpx;
  }

  .error-message {
    font-size: 28rpx;
    color: #666;
    text-align: center;
    margin-bottom: 60rpx;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: 30rpx;

    .retry-btn,
    .back-btn {
      padding: 24rpx 60rpx;
      border-radius: 40rpx;
      font-size: 28rpx;
    }

    .retry-btn {
      background-color: #009666;
      color: #fff;
    }

    .back-btn {
      background-color: #f5f5f5;
      color: #666;
    }
  }
}
</style>
