<template>
  <view class="container">
    <!-- 导航栏 -->
    <NavBar :title="pageTitle" />

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error-container" v-else-if="error">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="loadAgreement">
        <text>重试</text>
      </view>
    </view>

    <!-- 协议内容 -->
    <view class="content-container" v-else-if="agreement">
      <!-- <view class="agreement-meta">
        <text class="agreement-version">版本：{{ agreement.version || 'V1.0' }}</text>
        <text class="agreement-date">生效日期：{{ formatDate(agreement.effectiveDate || agreement.createdAt) }}</text>
      </view> -->
      <rich-text class="agreement-content" :nodes="agreementContentNodes"></rich-text>
    </view>
  </view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { agreementService } from '@/services/api/agreement'

export default {
  setup() {
    const loading = ref(true)
    const error = ref('')
    const agreement = ref(null)
    const agreementType = ref('')

    /**
     * 计算属性：页面标题
     */
    const pageTitle = computed(() => {
      if (agreementType.value === 'USER_AGREEMENT') {
        return '用户协议'
      } else if (agreementType.value === 'PRIVACY_POLICY') {
        return '隐私政策'
      }
      return agreement.value?.title || '协议'
    })

    /**
     * Function: agreementContentNodes
     *
     * Description: 为协议富文本补充小程序兼容的段落内联样式
     *
     * Returns:
     *   string|Array: rich-text 可渲染的节点内容
     */
    const agreementContentNodes = computed(() => {
      const content = agreement.value?.content || ''
      if (typeof content !== 'string') {
        return content
      }

      return content
        .replace(/<p(?![^>]*style=)/gi, '<p style="margin:20rpx 0;"')
        .replace(/<h1(?![^>]*style=)/gi, '<h1 style="margin:30rpx 0 20rpx;font-weight:600;font-size:36rpx;"')
        .replace(/<h2(?![^>]*style=)/gi, '<h2 style="margin:30rpx 0 20rpx;font-weight:600;font-size:32rpx;"')
        .replace(/<h3(?![^>]*style=)/gi, '<h3 style="margin:30rpx 0 20rpx;font-weight:600;font-size:30rpx;"')
        .replace(/<ul(?![^>]*style=)/gi, '<ul style="padding-left:40rpx;box-sizing:border-box;margin:20rpx 0;"')
        .replace(/<ol(?![^>]*style=)/gi, '<ol style="padding-left:40rpx;box-sizing:border-box;margin:20rpx 0;"')
        .replace(/<li(?![^>]*style=)/gi, '<li style="margin:10rpx 0;"')
        .replace(/<a(?![^>]*style=)/gi, '<a style="color:#009666;text-decoration:underline;"')
    })

    /**
     * Function: loadAgreement
     *
     * Description: 加载协议内容
     *
     * Returns:
     *   Promise<void>: 异步加载完成
     */
    const loadAgreement = async () => {
      if (!agreementType.value) {
        error.value = '协议类型参数缺失'
        loading.value = false
        return
      }

      try {
        loading.value = true
        error.value = ''

        const result = await agreementService.getAgreementByType(agreementType.value)
        agreement.value = result
      } catch (err) {
        console.error('加载协议失败:', err)
        error.value = err.message || '加载失败，请重试'
      } finally {
        loading.value = false
      }
    }

    /**
     * Function: formatDate
     *
     * Description: 格式化日期
     *
     * Parameters:
     *   dateStr {string}: 日期字符串
     *
     * Returns:
     *   string: 格式化后的日期
     */
    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }

    /**
     * Function: goBack
     *
     * Description: 返回上一页
     *
     * Returns:
     *   void: 无返回值
     */
    // 有效的协议类型白名单
    const VALID_AGREEMENT_TYPES = ['USER_AGREEMENT', 'PRIVACY_POLICY']

    onMounted(() => {
      // 从 URL 参数中获取协议类型
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const options = currentPage.options || {}

      // 参数校验：统一转大写后校验，兼容不同大小写的传入方式
      const type = (options.type || '').toUpperCase()
      if (!type || !VALID_AGREEMENT_TYPES.includes(type)) {
        uni.showToast({ title: '协议类型无效', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1500)
        return
      }

      agreementType.value = type
      loadAgreement()
    })

    return {
      loading,
      error,
      agreement,
      agreementContentNodes,
      pageTitle,
      loadAgreement,
      formatDate,
    }
  }
}
</script>

<style lang="scss" scoped>

.container {
  min-height: 100vh;
  background-color: #F7F8FA;
  box-sizing: border-box;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  box-sizing: border-box;

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid #E0E0E0;
    border-top-color: #009666;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20rpx;
  }

  .loading-text {
    font-size: 26rpx;
    color: $plant-text-grey;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
  box-sizing: border-box;
  .error-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }

  .error-text {
    font-size: 28rpx;
    color: $plant-text-grey;
    margin-bottom: 40rpx;
    text-align: center;
  }

  .retry-btn {
    background: linear-gradient(135deg, #009666 0%, #00C853 100%);
    color: #fff;
    padding: 20rpx 60rpx;
	box-sizing: border-box;
    border-radius: 40rpx;
    font-size: 28rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.3);
  }
}

/* Content Container */
.content-container {
  background-color: #fff;
  margin: 20rpx 20rpx;
  border-radius: 24rpx;
  padding: 26rpx;
  box-sizing: border-box;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.agreement-meta {
  display: flex;
  flex-direction: column;
  padding-bottom: 30rpx;
  box-sizing: border-box;
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #F0F0F0;

  .agreement-version {
    font-size: 24rpx;
    color: $plant-text-grey;
    margin-bottom: 8rpx;
  }

  .agreement-date {
    font-size: 24rpx;
    color: $plant-text-grey;
  }
}

.agreement-content {
  font-size: 28rpx;
  line-height: 1.8;
  color: $plant-text-main;

}
</style>
