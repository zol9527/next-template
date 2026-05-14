<template>
  <view class="coupons-page">
    <NavBar title="优惠券" title-align="left" />

    <!-- Tab Bar -->
    <view class="tab-bar-container">
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: currentTab === tab.value }"
          @tap="switchTab(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <view v-if="currentTab === tab.value" class="tab-active-line" />
        </view>
      </view>
    </view>

    <!-- Coupon List -->
    <scroll-view scroll-y class="coupon-list-scroll">
      <view class="coupon-list" v-if="coupons.length > 0">
        <view
          v-for="coupon in coupons"
          :key="coupon.id"
          class="coupon-card"
          :class="coupon.status"
        >
          <!-- Left side: Amount Area -->
          <view class="coupon-amount-area">
            <view class="amount-content">
              <text v-if="!isDiscount(coupon.amount)" class="amount-symbol">¥</text>
              <text class="amount-value">{{ coupon.amount }}</text>
            </view>
            <text v-if="coupon.minAmount" class="min-amount">满{{ coupon.minAmount }}可用</text>
            <text v-else class="min-amount">无门槛</text>
          </view>

          <!-- Right side: Info Area -->
          <view class="coupon-info-area">
            <view class="info-top">
              <text class="coupon-title">{{ coupon.title }}</text>
              <text class="coupon-desc">{{ coupon.description }}</text>
            </view>
            <view class="info-bottom">
              <text class="expiry-date">有效期至 {{ coupon.expiryDate }}</text>
              <view
                v-if="coupon.status === 'available'"
                class="action-button"
                @tap="useCoupon(coupon)"
              >
                <text class="action-text">去使用</text>
              </view>
              <view v-else-if="coupon.status === 'used'" class="status-tag used">
                <text class="status-text">已使用</text>
              </view>
              <view v-else class="status-tag expired">
                <text class="status-text">已过期</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <EmptyState
        v-else-if="!loading"
        :icon="emptyConfig.icon"
        :title="emptyConfig.title"
        :description="emptyConfig.description"
        :action-text="emptyConfig.actionText"
        @action="goToShop"
      />

      <!-- Loading State -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { authService } from '@/services/api/auth.service'
import { couponService, type Coupon } from '@/services/api/coupons'

// ====== Constants ======
const tabs = [
  { label: '可使用', value: 'available' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' }
]

// ====== State ======
const currentTab = ref('available')
const coupons = ref<Coupon[]>([])
const loading = ref(false)

/**
 * 检查是否具备访问优惠券页的登录态。
 */
const ensureLoggedIn = () => {
  if (authService.getToken()) {
    return true
  }

  uni.redirectTo({ url: '/pages/login/login' })
  return false
}

// ====== Functions ======

// --- 空状态配置（每个 tab 独立图标 + 文案） ---
const emptyConfig = computed(() => {
  if (currentTab.value === 'used') {
    return {
      icon: '/static/icons/empty-coupons-used.svg',
      title: '暂无已使用的优惠券',
      description: '使用过的优惠券会在这里记录',
      actionText: ''
    }
  }
  if (currentTab.value === 'expired') {
    return {
      icon: '/static/icons/empty-coupons-expired.svg',
      title: '暂无过期优惠券',
      description: '过期优惠券会在到期后自动归档到这里',
      actionText: ''
    }
  }
  return {
    icon: '/static/icons/empty-coupons-available.svg',
    title: '暂无可用优惠券',
    description: '关注官方活动可以领取更多优惠券哦',
    actionText: '去商城逛逛'
  }
})

const fetchCoupons = async () => {
  loading.value = true
  try {
    const result = await couponService.getMyCoupons({ status: currentTab.value })
    coupons.value = result.coupons || []
  } catch (error) {
    console.error('Failed to fetch coupons:', error)
  } finally {
    loading.value = false
  }
}

const switchTab = (value: string) => {
  if (currentTab.value === value) return
  currentTab.value = value
  fetchCoupons()
}

const isDiscount = (amount: string) => amount.includes('折')

const useCoupon = (coupon: Coupon) => {
  uni.switchTab({ url: '/pages/shop/shop' })
}

const goToShop = () => {
  uni.switchTab({ url: '/pages/shop/shop' })
}

// ====== Lifecycle ======
onMounted(() => {
  if (!ensureLoggedIn()) return
  fetchCoupons()
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.coupons-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-background;
}

/* Tab Bar */
.tab-bar-container {
  background-color: $color-surface;
  padding: 0;
  border-bottom: 1px solid $color-border;
  flex-shrink: 0;
}

.tab-bar {
  display: flex;
  height: 45px;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;

  .tab-text {
    font-size: 14px;
    color: $color-text-muted;
    font-weight: 400;
  }

  &.active {
    .tab-text {
      color: $color-primary;
      font-weight: 600;
    }
  }

  .tab-active-line {
    position: absolute;
    bottom: 0;
    left: 15%;
    right: 15%;
    height: 2px;
    background-color: $color-primary;
    border-radius: 2px 2px 0 0;
  }
}

/* Scroll Area */
.coupon-list-scroll {
  flex: 1;
  min-height: 0;
}

.coupon-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Coupon Card */
.coupon-card {
  display: flex;
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  overflow: hidden;
  height: 104px;

  &.used, &.expired {
    .coupon-amount-area {
      background: $color-text-muted;
      opacity: 0.6;
    }
    .amount-value, .amount-symbol, .min-amount {
      color: #FFFFFF;
    }
    .coupon-title {
      color: $color-text-muted;
    }
  }
}

.coupon-amount-area {
  width: 90px;
  background: $gradient-dark-teal;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .amount-content {
    display: flex;
    align-items: baseline;
  }

  .amount-symbol {
    font-size: 14px;
    color: #FFFFFF;
    font-weight: 600;
    margin-right: 2px;
  }

  .amount-value {
    font-size: 28px;
    color: #FFFFFF;
    font-weight: 800;
    font-family: 'JetBrains Mono', system-ui, sans-serif;
  }

  .min-amount {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 2px;
  }
}

.coupon-info-area {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .info-top {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .coupon-title {
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
  }

  .coupon-desc {
    font-size: 11px;
    color: $color-text-muted;
  }

  .info-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .expiry-date {
    font-size: 11px;
    color: $color-text-muted;
  }

  .action-button {
    background-color: $color-primary;
    border-radius: $radius-20;
    padding: 6px 16px;
    
    .action-text {
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
    }

    &:active { opacity: 0.8; }
  }

  .status-tag {
    .status-text {
      font-size: 12px;
      font-weight: 600;
    }
    &.used .status-text { color: $color-text-muted; }
    &.expired .status-text { color: #FF4D4F; }
  }
}

.loading-state {
  padding: 40px;
  text-align: center;
  .loading-text {
    color: $color-text-muted;
    font-size: 14px;
  }
}
</style>
