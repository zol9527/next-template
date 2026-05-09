<template>
  <view class="container">
    <!-- 导航栏 -->
    <NavBar title="佣金记录" />

    <!-- 筛选标签 -->
    <view class="filter-section">
      <view class="filter-tab" :class="{ active: currentFilter === '' }" @tap="handleFilterChange('')">
        <text>全部</text>
      </view>
      <view class="filter-tab" :class="{ active: currentFilter === 'frozen' }" @tap="handleFilterChange('frozen')">
        <text>冻结中</text>
      </view>
      <view class="filter-tab" :class="{ active: currentFilter === 'payable' }" @tap="handleFilterChange('payable')">
        <text>可提现</text>
      </view>
      <view class="filter-tab" :class="{ active: currentFilter === 'settled' }" @tap="handleFilterChange('settled')">
        <text>已结算</text>
      </view>
    </view>

    <!-- 佣金列表 -->
    <view class="commissions-section">
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && commissions.length === 0">
        <text class="empty-icon">💰</text>
        <text class="empty-text">暂无佣金记录</text>
        <text class="empty-desc">完成推广订单后将显示佣金记录</text>
      </view>

      <!-- 佣金卡片列表 -->
      <view class="commission-list" v-if="commissions.length > 0">
        <view class="commission-card" v-for="commission in commissions" :key="commission.id"
          @tap="handleShowDetail(commission)">
          <!-- 佣金头部 -->
          <view class="commission-header">
            <text class="order-id">订单号: {{ commission.orderId || '-' }}</text>
            <view class="commission-status" :class="'status-' + commission.status">
              <text class="status-text">{{ getStatusText(commission.status) }}</text>
            </view>
          </view>

          <!-- 佣金金额 -->
          <view class="commission-amount">
            <text class="amount-label">佣金金额</text>
            <text class="amount-value">¥{{ commission.amount }}</text>
          </view>

          <!-- 佣金详情 -->
          <view class="commission-details">
            <view class="detail-row">
              <text class="detail-label">推广码:</text>
              <text class="detail-value">{{ commission.promoterCode || '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">订单金额:</text>
              <text class="detail-value">¥{{ commission.orderAmount }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">佣金比例:</text>
              <text class="detail-value">{{ commission.commissionRate }}%</text>
            </view>
            <view class="detail-row" v-if="commission.status === 'settled' && commission.settledAt">
              <text class="detail-label">结算时间:</text>
              <text class="detail-value">{{ formatTime(commission.settledAt) }}</text>
            </view>
            <view class="detail-row" v-else>
              <text class="detail-label">创建时间:</text>
              <text class="detail-value">{{ formatTime(commission.createdAt) }}</text>
            </view>
          </view>

          <!-- 状态提示 -->
          <view class="commission-hint" v-if="commission.status === 'frozen'">
            <text class="hint-icon">⏱</text>
            <text class="hint-text">佣金将在订单完成后转为可提现</text>
          </view>
          <view class="commission-hint" v-else-if="commission.status === 'payable'">
            <text class="hint-icon">💵</text>
            <text class="hint-text">佣金已可提现，请在推广中心申请提现</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore && !loading" @tap="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>

      <!-- 没有更多 -->
      <view class="no-more" v-if="!hasMore && commissions.length > 0">
        <text class="no-more-text">没有更多了</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-overlay" v-if="loading && commissions.length === 0">
      <text>加载中...</text>
    </view>

    <!-- 详情弹窗 -->
    <view class="modal-overlay" v-if="showDetailModal" @tap="closeDetailModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">佣金详情</text>
          <view class="modal-close" @tap="closeDetailModal">
            <text>×</text>
          </view>
        </view>
        <view class="modal-body" v-if="selectedCommission">
          <view class="detail-group">
            <view class="detail-item">
              <text class="item-label">订单号</text>
              <text class="item-value">{{ selectedCommission.orderId || '-' }}</text>
            </view>
            <view class="detail-item">
              <text class="item-label">佣金金额</text>
              <text class="item-value highlight">¥{{ selectedCommission.amount }}</text>
            </view>
            <view class="detail-item">
              <text class="item-label">订单金额</text>
              <text class="item-value">¥{{ selectedCommission.orderAmount }}</text>
            </view>
            <view class="detail-item">
              <text class="item-label">佣金比例</text>
              <text class="item-value">{{ selectedCommission.commissionRate }}%</text>
            </view>
            <view class="detail-item">
              <text class="item-label">推广码</text>
              <text class="item-value">{{ selectedCommission.promoterCode || '-' }}</text>
            </view>
            <view class="detail-item">
              <text class="item-label">状态</text>
              <text class="item-value">{{ getStatusText(selectedCommission.status) }}</text>
            </view>
            <view class="detail-item">
              <text class="item-label">创建时间</text>
              <text class="item-value">{{ formatFullTime(selectedCommission.createdAt) }}</text>
            </view>
            <view class="detail-item" v-if="selectedCommission.settledAt">
              <text class="item-label">结算时间</text>
              <text class="item-value">{{ formatFullTime(selectedCommission.settledAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import { distributionService } from '@/services/api'
import { showError } from '@/utils/toast'
import { logger } from '@/utils/logger'
export default {
  setup() {
    const authStore = useAuthStore()
    const loading = ref(false)
    const commissions = ref([])
    const currentFilter = ref('')
    const hasMore = ref(false)
    const nextCursor = ref(null)
    const showDetailModal = ref(false)
    const selectedCommission = ref(null)

    onMounted(async () => {
      await loadCommissions()
    })

    /**
     * Function: loadCommissions
     *
     * Description: 加载佣金记录列表
     *
     * Parameters:
     *   refresh(boolean): 是否刷新（重置分页）
     *
     * Returns:
     *   Promise<void>: 异步加载完成
     */
    const loadCommissions = async (refresh = true) => {
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

        const params = {
          limit: 20
        }

        if (currentFilter.value) {
          params.status = currentFilter.value
        }

        if (!refresh && nextCursor.value) {
          params.cursor = nextCursor.value
        }

        const result = await distributionService.getCommissions(params)

        if (refresh) {
          commissions.value = result.commissions || []
        } else {
          commissions.value = [...commissions.value, ...(result.commissions || [])]
        }

        hasMore.value = result.hasMore || false
        nextCursor.value = result.nextCursor || null
      } catch (error) {
        logger.error('加载佣金记录失败', error)
        showError('加载数据失败，请重试')
      } finally {
        loading.value = false
      }
    }

    /**
     * Function: handleFilterChange
     *
     * Description: 处理筛选变更
     *
     * Parameters:
     *   status(string): 状态筛选值
     *
     * Returns:
     *   void: 无返回值
     */
    const handleFilterChange = (status) => {
      currentFilter.value = status
      loadCommissions(true)
    }

    /**
     * Function: loadMore
     *
     * Description: 加载更多
     *
     * Parameters:
     *
     * Returns:
     *   Promise<void>: 异步加载完成
     */
    const loadMore = async () => {
      if (hasMore.value && !loading.value) {
        await loadCommissions(false)
      }
    }

    /**
     * Function: handleShowDetail
     *
     * Description: 显示佣金详情弹窗
     *
     * Parameters:
     *   commission(object): 佣金数据
     *
     * Returns:
     *   void: 无返回值
     */
    const handleShowDetail = (commission) => {
      selectedCommission.value = commission
      showDetailModal.value = true
    }

    /**
     * Function: closeDetailModal
     *
     * Description: 关闭详情弹窗
     *
     * Parameters:
     *
     * Returns:
     *   void: 无返回值
     */
    const closeDetailModal = () => {
      showDetailModal.value = false
      selectedCommission.value = null
    }

    /**
     * Function: getStatusText
     *
     * Description: 获取状态文本
     *
     * Parameters:
     *   status(string): 状态值
     *
     * Returns:
     *   string: 状态文本
     */
    const getStatusText = (status) => {
      const statusMap = {
        frozen: '冻结中',
        payable: '可提现',
        settled: '已结算'
      }
      return statusMap[status] || '未知'
    }

    /**
     * Function: formatTime
     *
     * Description: 格式化时间（简短）
     *
     * Parameters:
     *   time(string): ISO 时间字符串
     *
     * Returns:
     *   string: 格式化后的时间
     */
    const formatTime = (time) => {
      if (!time) return '-'
      const date = new Date(time)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}-${day}`
    }

    /**
     * Function: formatFullTime
     *
     * Description: 格式化时间（完整）
     *
     * Parameters:
     *   time(string): ISO 时间字符串
     *
     * Returns:
     *   string: 格式化后的时间
     */
    const formatFullTime = (time) => {
      if (!time) return '-'
      const date = new Date(time)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }

    return {
      authStore,
      loading,
      commissions,
      currentFilter,
      hasMore,
      nextCursor,
      showDetailModal,
      selectedCommission,
      loadCommissions,
      handleFilterChange,
      loadMore,
      handleShowDetail,
      closeDetailModal,
      getStatusText,
      formatTime,
      formatFullTime,
    }
  },
}
</script>

<style lang="scss" scoped>

.container {
  padding: 0 0 40rpx;
  min-height: 100vh;
  background-color: #F7F8FA;
  box-sizing: border-box;
}

/* Filter Section */
.filter-section {
  display: flex;
  background-color: #fff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;

  .filter-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16rpx 0;
    margin-right: 20rpx;
    background-color: #F7F8FA;
    border-radius: 40rpx;
    font-size: 26rpx;
    color: $plant-text-grey;

    &.active {
      background: linear-gradient(135deg, #009666 0%, #00C853 100%);
      color: #fff;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

/* Commissions Section */
.commissions-section {
  padding: 0 30rpx;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
  background-color: #fff;
  border-radius: 24rpx;

  .empty-icon {
    font-size: 100rpx;
    margin-bottom: 20rpx;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 28rpx;
    font-weight: 600;
    color: $plant-text-main;
    margin-bottom: 12rpx;
  }

  .empty-desc {
    font-size: 24rpx;
    color: $plant-text-grey;
  }
}

/* Commission List */
.commission-list {
  .commission-card {
    background-color: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

    .commission-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;

      .order-id {
        font-size: 24rpx;
        color: $plant-text-grey;
      }

      .commission-status {
        padding: 8rpx 20rpx;
        border-radius: 20rpx;
        font-size: 22rpx;

        &.status-frozen {
          background-color: rgba(255, 149, 0, 0.1);

          .status-text {
            color: #FF9500;
          }
        }

        &.status-payable {
          background-color: rgba(0, 150, 102, 0.1);

          .status-text {
            color: #009666;
          }
        }

        &.status-settled {
          background-color: rgba(153, 153, 153, 0.1);

          .status-text {
            color: #999;
          }
        }
      }
    }

    .commission-amount {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;

      .amount-label {
        font-size: 26rpx;
        color: $plant-text-grey;
      }

      .amount-value {
        font-size: 40rpx;
        font-weight: 700;
        color: $plant-text-main;
      }
    }

    .commission-details {
      margin-bottom: 16rpx;

      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12rpx;

        &:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 24rpx;
          color: $plant-text-grey;
        }

        .detail-value {
          font-size: 24rpx;
          color: $plant-text-main;
          font-weight: 500;
        }
      }
    }

    .commission-hint {
      display: flex;
      align-items: center;
      background-color: #F7F8FA;
      border-radius: 12rpx;
      padding: 16rpx;

      .hint-icon {
        font-size: 28rpx;
        margin-right: 12rpx;
      }

      .hint-text {
        flex: 1;
        font-size: 22rpx;
        color: $plant-text-grey;
      }
    }
  }
}

/* Load More */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;

  .load-more-text {
    font-size: 26rpx;
    color: #009666;
  }
}

/* No More */
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;

  .no-more-text {
    font-size: 24rpx;
    color: #ccc;
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

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 30rpx;
}

.modal-content {
  background-color: #fff;
  border-radius: 24rpx;
  width: 100%;
  max-width: 600rpx;
  overflow: hidden;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #F5F5F5;

    .modal-title {
      font-size: 32rpx;
      font-weight: 700;
      color: $plant-text-main;
    }

    .modal-close {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 48rpx;
        font-weight: 300;
        color: #999;
      }
    }
  }

  .modal-body {
    padding: 30rpx;

    .detail-group {
      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #F5F5F5;

        &:last-child {
          border-bottom: none;
        }

        .item-label {
          font-size: 26rpx;
          color: $plant-text-grey;
        }

        .item-value {
          font-size: 26rpx;
          color: $plant-text-main;
          font-weight: 500;

          &.highlight {
            color: #009666;
            font-weight: 700;
            font-size: 32rpx;
          }
        }
      }
    }
  }
}
</style>
