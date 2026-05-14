<template>
  <view class="container">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar ref="navBarRef" title="订单详情" />

    <!-- Scroll Content -->
    <scroll-view
      scroll-y
      class="scroll-content"
      :style="{ height: `calc(100vh - ${navBarHeight}px - ${55 + safeArea.safeAreaBottom}px)` }"
    >
      <view class="content-inner" v-if="order">
        <!-- Status Banner -->
        <view class="status-banner" :class="'status-' + order.status">
          <view class="status-top">
            <text class="status-text">{{ getStatusText(order.status) }}</text>
            <text class="order-no">#{{ order.orderNo }}</text>
          </view>
          <text class="status-desc">{{ getStatusDesc(order.status) }}</text>
        </view>

        <!-- Product Section -->
        <view class="section product-section">
          <view class="product-item" v-if="product">
            <image class="product-thumbnail" :src="productCover" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ product.name }}</text>
              <text class="product-spec">{{ product.summary || '标准版' }}</text>
            </view>
            <view class="product-price-qty">
              <text class="product-price">¥{{ order.priceAmount }}</text>
              <text class="product-qty">x1</text>
            </view>
          </view>
        </view>

        <!-- Price Summary -->
        <view class="section price-summary">
          <view class="summary-row">
            <text class="summary-label">商品总额</text>
            <text class="summary-value">¥{{ order.priceAmount }}</text>
          </view>
          <view class="summary-row">
            <text class="summary-label">运费</text>
            <text class="summary-value">¥0.00</text>
          </view>
          <view class="summary-row">
            <text class="summary-label">优惠</text>
            <text class="summary-value discount">-¥0.00</text>
          </view>
          <view class="divider"></view>
          <view class="summary-row total-row">
            <text class="total-label">实付金额</text>
            <text class="total-value">¥{{ order.priceAmount }}</text>
          </view>
        </view>

        <!-- Order Timeline -->
        <view class="section timeline-section">
          <text class="section-title">订单信息</text>
          <view class="timeline-row">
            <text class="timeline-label">下单时间</text>
            <text class="timeline-value">{{ formatDateTime(order.createdAt) }}</text>
          </view>
          <view class="timeline-row" v-if="order.paidAt">
            <text class="timeline-label">付款时间</text>
            <text class="timeline-value">{{ formatDateTime(order.paidAt) }}</text>
          </view>

          <view class="timeline-row" v-if="order.paidAt">
            <text class="timeline-label">支付方式</text>
            <text class="timeline-value">微信支付</text>
          </view>
        </view>
      </view>

      <!-- Loading State -->
      <view class="loading-state" v-else-if="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- Empty/Error State -->
      <view class="error-state" v-else>
        <text class="error-text">订单不存在</text>
        <view class="back-btn" @tap="goBack">返回</view>
      </view>
    </scroll-view>

    <!-- Action Bar -->
    <view
      class="action-bar"
      :style="{ paddingBottom: (10 + safeArea.safeAreaBottom) + 'px' }"
      v-if="order"
    >
      <view class="action-secondary" @tap="contactSupport">
        <text class="action-text-secondary">联系客服</text>
      </view>
      <view class="action-primary-group">
        <view
          class="action-secondary"
          v-if="order.status === 'shipped'"
          @tap="viewLogistics"
          style="margin-right: 12px"
        >
          <text class="action-text-secondary">查看详情</text>
        </view>
        <view class="action-secondary" v-if="order.status === 'pending_payment'" @tap="cancelOrder" style="margin-right: 12px">
          <text class="action-text-secondary">取消订单</text>
        </view>
        <view class="action-primary" v-if="order.status === 'pending_payment'" @tap="payOrder">
          <text class="action-text-primary">立即支付</text>
        </view>
        <view class="action-primary" v-else-if="order.status === 'shipped'" @tap="confirmReceipt">
          <text class="action-text-primary">确认收货</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { orderService } from '@/services/api/orders'
import { productService } from '@/services/api/products'
import { paymentService } from '@/services/api/payment'
import { showSuccess, showError } from '@/utils/toast'
import { confirmCancelOrder } from '@/utils/dialog'
import { useSafeArea } from '@/hooks/useSafeArea'
import { logger } from '@/utils/logger'

// Constants
const PLACEHOLDER_IMG =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"%3E%3Crect width="200" height="200" fill="%23F1F8E9"/%3E%3Ccircle cx="100" cy="100" r="50" fill="%23DCEDC8"/%3E%3Cpath d="M100 130V80M100 110C100 110 125 100 125 75M100 100C100 100 75 90 75 65" stroke="%23689F38" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E'

// State
const safeArea = useSafeArea()
const navBarRef = ref()
const navBarHeight = computed(() => navBarRef.value?.navBarHeight || safeArea.value.navBarHeight)
const loading = ref(false)
const order = ref<any>(null)
const product = ref<any>(null)

// Computed
const productCover = computed(() => {
  return product.value?.coverAssetId ? PLACEHOLDER_IMG : PLACEHOLDER_IMG
})

// Methods
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending_payment: '待支付',
    paid: '已支付',
    shipped: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    closed: '已关闭',
    refunding: '退款中',
    refunded: '已退款',
  }
  return textMap[status] || '未知状态'
}

const getStatusDesc = (status: string) => {
  const descMap: Record<string, string> = {
    pending_payment: '请在 30 分钟内完成支付',
    paid: '订单已支付，等待商家发货',
    shipped: '您的包裹正在运输中，预计 5月8日 送达',
    completed: '订单已完成，感谢您的支持',
    cancelled: '订单已取消',
    closed: '订单已关闭',
    refunding: '退款处理中',
    refunded: '退款已完成',
  }
  return descMap[status] || ''
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  } catch {
    return dateStr
  }
}

const loadOrderDetail = async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const orderId = currentPage?.options?.id

  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  loading.value = true
  try {
    const result = await orderService.getOrderDetail(orderId)
    order.value = result.order

    if (order.value?.productId) {
      try {
        const productResult = await productService.getProductDetail(order.value.productId)
        product.value = productResult.product || productResult
      } catch (error) {
        logger.error('Failed to load product', error)
      }
    }
  } catch (error: any) {
    logger.error('Failed to load order detail', error)
    showError(error.message || '加载订单详情失败')
  } finally {
    loading.value = false
  }
}

const payOrder = async () => {
  if (!order.value) return
  try {
    const loginResult = (await uni.login({ provider: 'weixin' })) as any
    const result = await paymentService.createWechatPay(order.value.id, loginResult.userInfo?.openId)
    uni.requestPayment({
      provider: 'wxpay',
      ...result.params,
      success: () => {
        showSuccess('支付成功！')
        setTimeout(() => loadOrderDetail(), 1000)
      },
      fail: (err) => {
        logger.error('Payment failed', err)
        showError('支付失败或已取消')
      },
    })
  } catch (error: any) {
    showError(error.message || '发起支付失败')
  }
}

const confirmReceipt = async () => {
  if (!order.value) return
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '确认收货',
      content: '是否确认已收到商品？',
      success: (res) => resolve(res.confirm),
    })
  })
  if (confirmed) {
    try {
      // Assuming there's a confirmReceipt method in orderService
      // If not, we'll need to check the API service
      await orderService.updateOrderStatus(order.value.id, 'completed')
      showSuccess('收货成功')
      loadOrderDetail()
    } catch (error: any) {
      showError(error.message || '操作失败')
    }
  }
}

const cancelOrder = async () => {
  if (!order.value) return

  const success = await confirmCancelOrder(order.value.id)
  if (success) {
    // 刷新订单详情
    loadOrderDetail()
  }
}

const goBack = () => uni.navigateBack()
const contactSupport = () => uni.showToast({ title: '联系客服', icon: 'none' })
const viewLogistics = () => uni.showToast({ title: '查看详情', icon: 'none' })

onMounted(() => {
  loadOrderDetail()
})
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $color-background;
  padding: 0; /* Override global .container padding */
}

/* Scroll Content */
.scroll-content {
  margin-top: 0; /* Will be adjusted by navBarHeight */
  background-color: $color-background;
}

.content-inner {
  padding-bottom: $spacing-20;
}

/* Status Banner */
.status-banner {
  margin: $spacing-12 $spacing-20 0;
  padding: $spacing-16 $spacing-18;
  border-radius: $radius-16;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;
  background: $gradient-dark-teal;

  &.status-shipped {
    background: linear-gradient(135deg, #3b6b5e 0%, #2a5247 100%);
  }

  &.status-pending_payment {
    background: linear-gradient(135deg, $color-accent 0%, darken($color-accent, 10%) 100%);
  }

  .status-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .status-text {
      font-size: 16px;
      font-weight: 600;
      color: $color-surface;
      line-height: 20px;
    }

    .order-no {
      font-family: $font-family-code;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 14px;
    }
  }

  .status-desc {
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
    line-height: 16px;
  }
}

/* Section Common */
.section {
  margin: $spacing-12 $spacing-20 0;
  padding: $spacing-14;
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
}

.section-title {
  font-family: $font-family-title;
  font-weight: 600;
  font-size: 14px;
  color: $color-text-primary;
  margin-bottom: $spacing-12;
}

/* Product Section */
.product-section {
  .product-item {
    display: flex;
    align-items: center;
    gap: $spacing-12;

    .product-thumbnail {
      width: 56px;
      height: 56px;
      border-radius: $radius-12;
      background-color: $color-background;
    }

    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: $spacing-4;

      .product-name {
        font-size: 14px;
        font-weight: 600;
        color: $color-text-primary;
        line-height: 18px;
      }

      .product-spec {
        font-size: 11px;
        color: $color-text-muted;
        line-height: 14px;
      }
    }

    .product-price-qty {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: $spacing-4;

      .product-price {
        font-size: 14px;
        font-weight: 600;
        color: $color-text-primary;
      }

      .product-qty {
        font-size: 11px;
        color: $color-text-muted;
      }
    }
  }
}

/* Price Summary */
.price-summary {
  gap: $spacing-8;

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-8;

    &:last-child {
      margin-bottom: 0;
    }

    .summary-label {
      font-size: 13px;
      color: $color-text-muted;
    }

    .summary-value {
      font-size: 13px;
      color: $color-text-primary;

      &.discount {
        color: $color-primary;
      }
    }
  }

  .divider {
    height: 1px;
    background-color: $color-border;
    margin-block: $spacing-4;
  }

  .total-row {
    margin-top: $spacing-8;

    .total-label {
      font-size: 13px;
      font-weight: 600;
      color: $color-text-primary;
    }

    .total-value {
      font-size: 16px;
      font-weight: 600;
      color: $color-text-primary;
    }
  }
}

/* Order Timeline */
.timeline-section {
  gap: $spacing-10;

  .timeline-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-10;

    &:last-child {
      margin-bottom: 0;
    }

    .timeline-label {
      font-size: 12px;
      color: $color-text-muted;
    }

    .timeline-value {
      font-size: 12px;
      color: $color-text-primary;
    }
  }
}

/* Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px $spacing-20;
  background-color: $color-surface;
  border-top: 1px solid $color-border;

  .action-secondary {
    height: 34px;
    padding-inline: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-20;
    border: 1px solid $color-border;

    .action-text-secondary {
      font-size: 12px;
      font-weight: 600;
      color: $color-text-muted;
    }
  }

  .action-primary-group {
    display: flex;
    align-items: center;
  }

  .action-primary {
    height: 34px;
    padding-inline: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-20;
    background-color: $color-primary;

    .action-text-primary {
      font-size: 12px;
      font-weight: 600;
      color: $color-surface;
    }
  }
}

/* Utils */
.opacity-hover {
  opacity: 0.7;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px $spacing-20;

  .loading-text,
  .error-text {
    font-size: 14px;
    color: $color-text-muted;
  }

  .back-btn {
    margin-top: $spacing-20;
    padding: 8px 24px;
    background-color: $color-primary;
    color: $color-surface;
    border-radius: $radius-20;
    font-size: 14px;
    font-weight: 600;
  }
}

/* Iconfont Mock */
.iconfont {
  font-family: 'PingFang SC'; /* Use fallback for now */
}

.icon-arrow-left::before {
  content: '←';
}

.icon-location::before {
  content: '📍';
}
</style>
