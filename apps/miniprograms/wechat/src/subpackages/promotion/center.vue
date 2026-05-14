<template>
  <view class="container">
    <!-- 导航栏 -->
    <NavBar title="推广中心" />

    <!-- 收益卡片 -->
    <view class="revenue-card">
      <view class="revenue-item">
        <text class="revenue-value">¥{{ stats.totalEarnings || '0.00' }}</text>
        <text class="revenue-label">累计收益</text>
      </view>
      <view class="revenue-divider"></view>
      <view class="revenue-item">
        <text class="revenue-value">¥{{ stats.withdrawableAmount || '0.00' }}</text>
        <text class="revenue-label">可提现金额</text>
      </view>
      <view class="revenue-divider"></view>
      <view class="revenue-item">
        <text class="revenue-value">{{ stats.frozenAmount || '0.00' }}</text>
        <text class="revenue-label">冻结中</text>
      </view>
    </view>

    <!-- 数据统计 -->
    <view class="stats-section">
      <view class="stats-title">推广数据</view>
      <view class="stats-grid">
        <view class="stat-card" @tap="goToCodes">
          <text class="stat-value">{{ stats.codeCount || 0 }}</text>
          <text class="stat-label">推广码数量</text>
        </view>
        <view class="stat-card" @tap="goToCommissions">
          <text class="stat-value">{{ stats.commissionCount || 0 }}</text>
          <text class="stat-label">佣金记录</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.orderCount || 0 }}</text>
          <text class="stat-label">成交订单</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.inviteeCount || 0 }}</text>
          <text class="stat-label">邀请人数</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goToCodes">
        <view class="menu-icon">🎫</view>
        <view class="menu-content">
          <text class="menu-title">我的推广码</text>
          <text class="menu-desc">管理推广码，生成新码</text>
        </view>
        <view class="menu-arrow">›</view>
      </view>

      <view class="menu-item" @tap="goToCommissions">
        <view class="menu-icon">💰</view>
        <view class="menu-content">
          <text class="menu-title">佣金记录</text>
          <text class="menu-desc">查看佣金历史和明细</text>
        </view>
        <view class="menu-arrow">›</view>
      </view>

      <view class="menu-item" @tap="handleShare">
        <view class="menu-icon">📤</view>
        <view class="menu-content">
          <text class="menu-title">邀请推广</text>
          <text class="menu-desc">分享推广码给好友</text>
        </view>
        <view class="menu-arrow">›</view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-overlay" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { ref, onMounted, onActivated } from 'vue'
import { useAuthStore } from '@/stores'
import { distributionService } from '@/services/api/distribution'
import { showError } from '@/utils/toast'
import { logger } from '@/utils/logger'

export default {
  setup() {
    const authStore = useAuthStore()
    const loading = ref(false)
    const stats = ref({
      totalEarnings: '0.00',
      withdrawableAmount: '0.00',
      frozenAmount: '0.00',
      codeCount: 0,
      commissionCount: 0,
      orderCount: 0,
      inviteeCount: 0
    })

    const refreshStats = () => {
      loadStats()
    }

    onActivated(() => {
      refreshStats()
    })

    onMounted(async () => {
      await loadStats()
    })

    /**
     * Function: loadStats
     *
     * Description: 加载推广员统计数据
     *
     * Parameters:
     *
     * Returns:
     *   Promise<void>: 异步加载完成
     */
    const loadStats = async () => {
      if (!authStore.hasRole('promoter')) {
        showError('您暂未开通推广员功能')
        // 延迟返回，让用户看到提示信息
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        return
      }

      try {
        loading.value = true
        const result = await distributionService.getPromoterStats()

        stats.value = {
          totalEarnings: result.totalEarnings || '0.00',
          withdrawableAmount: result.withdrawableAmount || '0.00',
          frozenAmount: result.frozenAmount || '0.00',
          codeCount: result.codeCount || 0,
          commissionCount: result.commissionCount || 0,
          orderCount: result.orderCount || 0,
          inviteeCount: result.inviteeCount || 0
        }
      } catch (error) {
        logger.error('加载统计数据失败', error)
        showError('加载数据失败，请重试')
      } finally {
        loading.value = false
      }
    }

    /**
     * Function: goToCodes
     *
     * Description: 跳转推广码管理页面
     *
     * Parameters:
     *
     * Returns:
     *   void: 无返回值
     */
    const goToCodes = () => {
      uni.navigateTo({
        url: '/subpackages/promotion/codes'
      })
    }

    /**
     * Function: goToCommissions
     *
     * Description: 跳转佣金记录页面
     *
     * Parameters:
     *
     * Returns:
     *   void: 无返回值
     */
    const goToCommissions = () => {
      uni.navigateTo({
        url: '/subpackages/promotion/commissions'
      })
    }

    /**
     * Function: handleShare
     *
     * Description: 处理分享推广
     *
     * Parameters:
     *
     * Returns:
     *   void: 无返回值
     */
    const handleShare = () => {
      // 先跳转到推广码页面，用户可以选择要分享的推广码
      uni.navigateTo({
        url: '/subpackages/promotion/codes?mode=share'
      })
    }

    return {
      authStore,
      loading,
      stats,
      loadStats,
      refreshStats,
      goToCodes,
      goToCommissions,
      handleShare,
    }
  },
}
</script>

<style lang="scss" scoped>

.container {
  padding: 0 30rpx 40rpx;
  min-height: 100vh;
  background-color: #F7F8FA;
  box-sizing: border-box;
}

/* Revenue Card */
.revenue-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #009666 0%, #00C853 100%);
  border-radius: 24rpx;
  padding: 40rpx 0;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.3);

  .revenue-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .revenue-value {
      font-size: 40rpx;
      font-weight: 700;
      color: #fff;
    }

    .revenue-label {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 8rpx;
    }
  }

  .revenue-divider {
    width: 1rpx;
    height: 60rpx;
    background-color: rgba(255, 255, 255, 0.3);
  }
}

/* Stats Section */
.stats-section {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .stats-title {
    font-size: 28rpx;
    font-weight: 600;
    color: $plant-text-main;
    margin-bottom: 20rpx;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20rpx;

    .stat-card {
      background-color: #F7F8FA;
      border-radius: 16rpx;
      padding: 24rpx;
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-value {
        font-size: 36rpx;
        font-weight: 700;
        color: $plant-text-main;
      }

      .stat-label {
        font-size: 24rpx;
        color: $plant-text-grey;
        margin-top: 8rpx;
      }
    }
  }
}

/* Menu Section */
.menu-section {
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .menu-item {
    display: flex;
    align-items: center;
    padding: 32rpx 30rpx;
    border-bottom: 1rpx solid #F5F5F5;

    &:last-child {
      border-bottom: none;
    }

    .menu-icon {
      font-size: 40rpx;
      margin-right: 20rpx;
    }

    .menu-content {
      flex: 1;

      .menu-title {
        font-size: 28rpx;
        font-weight: 600;
        color: $plant-text-main;
        display: block;
      }

      .menu-desc {
        font-size: 24rpx;
        color: $plant-text-grey;
        margin-top: 4rpx;
      }
    }

    .menu-arrow {
      color: #ccc;
      font-size: 32rpx;
      font-weight: 300;
    }
  }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  text {
    font-size: 28rpx;
    color: $plant-text-grey;
  }
}
</style>
