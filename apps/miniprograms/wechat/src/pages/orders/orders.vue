<template>
  <view class="orders-page">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar :show-back="false" background="#FFFFFF">
      <template #left>
        <text class="logo-text">{{ siteName }}</text>
      </template>
    </NavBar>

    <!-- Tabs -->
    <view class="order-tabs-container">
      <scroll-view class="order-tabs" scroll-x show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="(tab, index) in orderTabs"
            :key="index"
            class="tab-item"
            :class="{ active: activeTab === index }"
            @tap="activeTab = index"
          >
            <text class="tab-text">{{ tab }}</text>
            <view class="active-line" v-if="activeTab === index"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Content Area -->
    <scroll-view 
      class="order-content" 
      scroll-y 
      @scrolltolower="onReachBottom"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="order-list-wrapper">
        <!-- Loading State -->
        <LoadingState v-if="loading && orders.length === 0" />

        <!-- Empty State -->
        <EmptyState
          v-else-if="filteredOrders.length === 0"
          :title="searchKeyword ? '未找到相关订单' : '暂无订单'"
          :description="searchKeyword ? '换个关键词试试吧' : '快去选购心仪的商品吧'"
          @action="goToShop"
          actionText="去逛逛"
        />

        <!-- Order List -->
        <view v-else class="order-list">
          <view
            v-for="order in filteredOrders"
            :key="order.id"
            class="order-card"
            @tap="viewOrderDetail(order)"
          >
            <!-- Card Header -->
            <view class="card-header">
              <text class="order-no">#{{ order.orderNo?.slice(-12) || order.id?.slice(-8) }}</text>
              <text class="order-status" :class="getStatusClass(order.status)">
                {{ getStatusText(order.status) }}
              </text>
            </view>

            <!-- Card Body -->
            <view class="card-body">
              <image
                class="product-img"
                :src="getProductCover(order.productId)"
                mode="aspectFill"
              />
              <view class="product-info">
                <text class="product-name">{{ getProductName(order.productId) }}</text>
                <text class="order-time">{{ formatDate(order.createdAt) }} 下单</text>
              </view>
              <view class="price-info">
                <text class="price-symbol">¥</text>
                <text class="price-value">{{ order.priceAmount || '0' }}</text>
              </view>
            </view>

            <!-- Card Footer -->
            <view class="card-footer">
              <view class="footer-actions">
                <!-- Action Buttons based on status -->
                <template v-if="order.status === 'pending_payment'">
                  <view class="btn-secondary" @tap.stop="cancelOrder(order)">
                    <text class="btn-text">取消订单</text>
                  </view>
                  <view class="btn-primary" @tap.stop="payOrder(order)">
                    <text class="btn-text">立即付款</text>
                  </view>
                </template>
                <template v-else-if="order.status === 'paid'">
                  <view class="btn-secondary" @tap.stop="contactService">
                    <text class="btn-text">联系客服</text>
                  </view>
                  <view class="btn-primary" @tap.stop="viewOrderDetail(order)">
                    <text class="btn-text">查看详情</text>
                  </view>
                </template>
                <template v-else-if="order.status === 'completed'">
                  <view class="btn-secondary" @tap.stop="reorder(order)">
                    <text class="btn-text">再次购买</text>
                  </view>
                  <view class="btn-secondary" @tap.stop="reviewOrder(order)">
                    <text class="btn-text">评价</text>
                  </view>
                </template>
                <template v-else>
                   <view class="btn-secondary" @tap.stop="viewOrderDetail(order)">
                    <text class="btn-text">查看详情</text>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- Bottom Safe Area Padding -->
      <view :style="{ height: safeArea.safeAreaBottom + 'px' }"></view>
    </scroll-view>

    <!-- 联系客服弹窗：复用商品详情页同款联系方式弹窗 -->
    <ContactSupportPopup v-model="showContactPopup" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores'
import { orderService } from '@/services/api/orders'
import { productService } from '@/services/api/products'
import { paymentService } from '@/services/api/payment'
import { showSuccess, showError } from '@/utils/toast'
import { confirmCancelOrder } from '@/utils/dialog'
import { useSafeArea } from '@/hooks/useSafeArea'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { syncCustomTabBar } from '@/utils/tab-bar'
import { logger } from '@/utils/logger'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import ContactSupportPopup from '@/components/ContactSupportPopup.vue'

// -- Safe Area --
const safeArea = useSafeArea()

// -- Site Config --
const { siteName, loadSiteConfig } = useSiteConfig()

// -- Auth --
const authStore = useAuthStore()

// -- State --
const loading = ref(false)
const refreshing = ref(false)
const activeTab = ref(0)
const orders = ref<any[]>([])
const productsMap = ref(new Map())
const searchKeyword = ref('')
const showContactPopup = ref(false)
// 虚拟商品（课程）无物流流程，只保留：全部、待付款、已完成
const orderTabs = ['全部', '待付款', '已完成']

// -- Constants --
const statusFilters: Record<number, string | null> = {
  0: null,                // 全部
  1: 'pending_payment',   // 待付款
  2: 'completed',         // 已完成
}

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"%3E%3Crect width="200" height="200" fill="%23F1F8E9"/%3E%3Ccircle cx="100" cy="100" r="50" fill="%23DCEDC8"/%3E%3Cpath d="M100 130V80M100 110C100 110 125 100 125 75M100 100C100 100 75 90 75 65" stroke="%23689F38" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E'

// -- Computed --
const filteredOrders = computed(() => {
  let result = orders.value

  // Status Filter (Already handled by API in loadOrders, but double check here)
  const filter = statusFilters[activeTab.value]
  if (filter) {
    result = result.filter(o => o.status === filter)
  }

  // Search Filter
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter((order) => {
      if (order.orderNo?.toLowerCase().includes(keyword) || order.id?.toLowerCase().includes(keyword)) {
        return true
      }
      const product = productsMap.value.get(order.productId)
      return product?.name?.toLowerCase().includes(keyword)
    })
  }

  return result
})

// -- Methods --
const loadOrders = async () => {
  if (!authStore.isLoggedIn.value) return

  loading.value = true
  try {
    const params: any = { limit: 50 }
    const filter = statusFilters[activeTab.value]
    if (filter) {
      params.status = filter
    }

    const result = await orderService.getOrderList(params)
    orders.value = result.orders || []

    // Load product details
    await loadProductDetails(orders.value)
  } catch (error: any) {
    logger.error('Failed to load orders', error)
    showError(error.message || '加载订单失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const loadProductDetails = async (orderList: any[]) => {
  const productIds = [...new Set(orderList.map(o => o.productId).filter(Boolean))]
  if (productIds.length === 0) return

  try {
    const promises = productIds.map(async (productId) => {
      if (productsMap.value.has(productId)) return null
      try {
        const product = await productService.getProductDetail(productId)
        return { id: productId, product: product.product || product }
      } catch {
        return { id: productId, product: null }
      }
    })

    const results = await Promise.all(promises)
    results.forEach(res => {
      if (res && res.product) {
        productsMap.value.set(res.id, res.product)
      }
    })
  } catch (error) {
    logger.error('Failed to load product details', error)
  }
}

const onRefresh = () => {
  refreshing.value = true
  loadOrders()
}

const onReachBottom = () => {
  // Infinite scroll logic would go here
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending_payment: 'pending',
    paid: 'paid',
    completed: 'completed',
    cancelled: 'cancelled',
    closed: 'closed',
    refunding: 'refunding',
    refunded: 'refunded',
  }
  return map[status] || 'pending'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_payment: '待付款',
    paid: '已支付',
    completed: '已完成',
    cancelled: '已取消',
    closed: '已关闭',
    refunding: '退款中',
    refunded: '已退款',
  }
  return map[status] || status
}

const getProductName = (productId: string) => {
  return productsMap.value.get(productId)?.name || '课程/商品'
}

const getProductCover = (productId: string) => {
  // For now return placeholder as per original code comment
  return PLACEHOLDER_IMG
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

// -- Actions --
const viewOrderDetail = (order: any) => {
  uni.navigateTo({ url: `/subpackages/orders-detail/detail?id=${order.id}` })
}

const payOrder = async (order: any) => {
  try {
    const loginResult = await uni.login({ provider: 'weixin' })
    const result = await paymentService.createWechatPay(order.id, (loginResult as any).userInfo?.openId)
    uni.requestPayment({
      provider: 'wxpay',
      ...result.params,
      success: () => {
        showSuccess('支付成功！')
        loadOrders()
      },
      fail: (err) => {
        logger.error('Payment failed', err)
        showError('支付失败')
      }
    })
  } catch (error: any) {
    showError(error.message || '支付失败')
  }
}

const cancelOrder = async (order: any) => {
  const success = await confirmCancelOrder(order.id)
  if (success) {
    // 刷新订单列表
    loadOrders()
  }
}

const confirmOrder = async (order: any) => {
  // Add confirm logic
}

const reorder = (order: any) => {
  uni.switchTab({ url: '/pages/shop/shop' })
}

const reviewOrder = (order: any) => {
  // Navigate to review
}

const goToShop = () => {
  uni.switchTab({ url: '/pages/shop/shop' })
}

const contactService = () => {
  showContactPopup.value = true
}

// -- Lifecycle --
onShow(() => {
  syncCustomTabBar(2)
  loadSiteConfig()
  if (authStore.isLoggedIn.value) {
    loadOrders()
  }
})

watch(activeTab, () => {
  loadOrders()
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.orders-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-background;
}

.logo-text {
  font-family: $font-family-brand;
  font-size: 22px;
  font-weight: 800;
  color: $color-brand-dark;
  letter-spacing: 2px;
}

/* Tabs */
.order-tabs-container {
  background-color: $color-surface;
  border-bottom: 1px solid $color-border;
}

.order-tabs {
  width: 100%;
  white-space: nowrap;

  .tabs-inner {
    display: flex;
    padding: 0 $spacing-20;
  }

  .tab-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 46px;
    margin-right: $spacing-20;
    
    &:last-child {
      margin-right: 0;
    }

    .tab-text {
      font-family: $font-family-title;
      font-size: 14px;
      font-weight: 400;
      color: $color-text-muted;
      transition: all 0.2s;
    }

    &.active {
      .tab-text {
        font-weight: 600;
        color: $color-primary;
      }
    }

    .active-line {
      position: absolute;
      bottom: 6px;
      width: 24px;
      height: 3px;
      background-color: $color-primary;
      border-radius: 2px;
    }
  }
}

/* Content */
.order-content {
  flex: 1;
  overflow: hidden;
}

.order-list-wrapper {
  padding: $spacing-12 $spacing-20;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

/* Order Card */
.order-card {
  display: flex;
  flex-direction: column;
  padding: $spacing-12 $spacing-14;
  background-color: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-16;
  gap: $spacing-10;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .order-no {
      font-family: $font-family-code;
      font-size: 11px;
      line-height: 14px;
      color: $color-text-muted;
    }

    .order-status {
      font-family: $font-family-title;
      font-size: 11px;
      font-weight: 600;
      line-height: 14px;

      &.pending { color: $color-accent; }
      &.paid { color: $color-primary; }
      &.completed { color: $color-text-muted; }
      &.cancelled { color: $color-text-muted; }
      &.closed { color: $color-text-muted; }
      &.refunding { color: #E6A23C; }
      &.refunded { color: #F56C6C; }
    }
  }

  .card-body {
    display: flex;
    align-items: flex-start;
    gap: $spacing-12;

    .product-img {
      width: 48px;
      height: 48px;
      border-radius: $radius-12;
      background-color: $color-primary-light;
    }

    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .product-name {
        font-family: $font-family-title;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        color: $color-text-primary;
      }

      .order-time {
        font-family: $font-family-title;
        font-size: 11px;
        color: $color-text-muted;
      }
    }

    .price-info {
      display: flex;
      align-items: baseline;
      gap: 2px;

      .price-symbol {
        font-size: 12px;
        font-weight: 600;
        color: $color-text-primary;
      }

      .price-value {
        font-size: 16px;
        font-weight: 700;
        color: $color-text-primary;
      }
    }
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;

    .footer-actions {
      display: flex;
      gap: $spacing-8;
    }
  }
}

/* Buttons */
.btn-primary, .btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 14px;
  border-radius: 16px;
  transition: opacity 0.2s;

  &:active {
    opacity: 0.8;
  }
}

.btn-primary {
  background-color: $color-primary;
  
  .btn-text {
    font-size: 12px;
    font-weight: 600;
    color: #FFFFFF;
  }
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid $color-border;
  
  .btn-text {
    font-size: 12px;
    font-weight: 600;
    color: $color-text-primary;
  }
}
</style>
