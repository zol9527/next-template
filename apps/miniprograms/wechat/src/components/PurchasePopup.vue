<template>
  <popup-sheet
    v-model="visible"
    title="确认订单"
    :show-close="true"
    max-height="85vh"
  >
    <view class="purchase-popup">
      <!-- 商品信息区 -->
      <view class="order-item">
        <image
          class="item-image"
          :src="orderInfo.image || '/static/images/placeholder.png'"
          mode="aspectFill"
        />
        <view class="item-detail">
          <text class="item-name">{{ orderInfo.name }}</text>
          <text class="item-spec">{{ orderInfo.spec }}</text>
          <view class="item-price-row">
            <text class="item-price">¥{{ orderInfo.price }}</text>
            <text class="item-quantity">×{{ orderInfo.quantity }}</text>
          </view>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 价格明细 -->
      <view class="price-breakdown">
        <view class="breakdown-row">
          <text class="label">商品金额</text>
          <text class="value">¥{{ orderInfo.totalAmount }}</text>
        </view>
        <view class="breakdown-row">
          <text class="label">优惠折扣</text>
          <text class="value discount">-¥{{ orderInfo.discountAmount || '0.00' }}</text>
        </view>
        <view class="breakdown-row">
          <text class="label">运费</text>
          <text class="value">{{ orderInfo.shippingFee > 0 ? '¥' + orderInfo.shippingFee : '免运费' }}</text>
        </view>
        
        <view class="breakdown-divider"></view>
        
        <view class="breakdown-row total">
          <text class="label">合计</text>
          <text class="value highlight">¥{{ orderInfo.finalAmount }}</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 支付方式 -->
      <view class="payment-section">
        <text class="section-title">支付方式</text>
        <view class="payment-method">
          <view class="method-info">
            <view class="wechat-icon">
              <!-- 这里通常是一个微信支付的SVG图标 -->
              <view class="icon-inner"></view>
            </view>
            <text class="method-name">微信支付</text>
          </view>
          <view class="radio-check active">
            <view class="check-inner"></view>
          </view>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 确认支付按钮 -->
      <view class="action-footer">
        <button class="btn-primary" @tap="handlePayment">
          确认支付 ¥{{ orderInfo.finalAmount }}
        </button>
      </view>
    </view>
  </popup-sheet>
</template>

<script setup lang="ts">
/**
 * PurchasePopup - 购买确认弹窗组件
 * 
 * 用于订单确认及发起支付流程。
 * 遵循设计系统规范，使用 PopupSheet 作为基座。
 */

import { ref, watch } from 'vue'
import PopupSheet from './PopupSheet.vue'

/** 订单信息接口 */
interface OrderInfo {
  id: string | number
  name: string
  spec: string
  price: string | number
  quantity: number
  image: string
  totalAmount: string | number
  discountAmount?: string | number
  shippingFee: number
  finalAmount: string | number
}

const props = defineProps<{
  /** 弹窗是否可见 */
  modelValue: boolean
  /** 订单详情信息 */
  orderInfo: OrderInfo
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'pay', orderId: string | number): void
}>()

/** 弹窗可见性绑定 */
const visible = ref(props.modelValue)
watch(() => props.modelValue, (val) => {
  visible.value = val
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

/**
 * 处理支付确认
 */
const handlePayment = () => {
  emit('pay', props.orderInfo.id)
  // 支付通常会跳转或有后续逻辑，这里不一定立即关闭 visible.value = false
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.purchase-popup {
  display: flex;
  flex-direction: column;
}

/* ===== 商品信息 ===== */
.order-item {
  display: flex;
  padding: $spacing-12 0;
  gap: $spacing-14;
}

.item-image {
  width: 72px;
  height: 72px;
  border-radius: $radius-12;
  background-color: $color-background;
  flex-shrink: 0;
}

.item-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  color: $color-text-primary;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.item-spec {
  font-family: map-get($typography-label, font-family);
  font-weight: map-get($typography-label, font-weight);
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
}

.item-price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.item-price {
  font-family: map-get($typography-body, font-family);
  font-weight: 600;
  font-size: 15px;
  color: $color-text-primary;
}

.item-quantity {
  font-family: map-get($typography-label, font-family);
  font-size: 13px;
  color: $color-text-muted;
}

/* ===== 分割线 ===== */
.divider {
  height: 1px;
  background-color: $color-border;
  margin: $spacing-12 0;
}

/* ===== 价格明细 ===== */
.price-breakdown {
  display: flex;
  flex-direction: column;
  gap: $spacing-10;
  padding: $spacing-4 0;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .label {
    font-family: map-get($typography-body, font-family);
    font-size: 13px;
    color: $color-text-muted;
  }
  
  .value {
    font-family: $font-family-code;
    font-size: 13px;
    color: $color-text-primary;
    
    &.discount {
      color: $color-accent;
    }
  }
  
  &.total {
    margin-top: $spacing-4;
    .label {
      font-weight: 600;
      color: $color-text-primary;
    }
    .highlight {
      font-size: 18px;
      font-weight: 600;
      color: $color-primary;
    }
  }
}

.breakdown-divider {
  height: 1px;
  border-top: 1px dashed $color-border;
  margin: $spacing-4 0;
}

/* ===== 支付方式 ===== */
.payment-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
  padding: $spacing-4 0;
}

.section-title {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: 14px;
  color: $color-text-primary;
}

.payment-method {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-8 0;
}

.method-info {
  display: flex;
  align-items: center;
  gap: $spacing-12;
}

.wechat-icon {
  width: 28px;
  height: 28px;
  background-color: #07C160; // 微信品牌色
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-inner {
  width: 16px;
  height: 16px;
  background-color: $color-surface;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M8.3 12c0-.3.1-.6.3-.8.2-.2.5-.3.8-.3.3 0 .6.1.8.3.2.2.3.5.3.8 0 .3-.1.6-.3.8-.2.2-.5.3-.8.3-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.8zm5.4 0c0-.3.1-.6.3-.8.2-.2.5-.3.8-.3s.6.1.8.3c.2.2.3.5.3.8 0 .3-.1.6-.3.8-.2.2-.5.3-.8.3s-.6-.1-.8-.3c-.2-.2-.3-.5-.3-.8zm7.6-2.1c0-1.8-1.4-3.5-3.8-4.6-2.4-1.1-5.3-1.6-8.2-1.6-2.9 0-5.8.5-8.2 1.6-2.4 1.1-3.8 2.8-3.8 4.6 0 1.6 1.1 3 3.1 4.1-.1.4-.2.9-.4 1.4L1.7 17l1.7-.5c.8-.2 1.6-.5 2.4-.8 1.4.6 3.1 1 4.8 1 .4 0 .8 0 1.2-.1-.1-.3-.1-.7-.1-1 0-2.4 2-4.4 4.4-4.4 1.3 0 2.5.6 3.3 1.5 1.1-.8 1.9-1.8 1.9-2.8zm-3 5.4c0-1.5-1.1-2.9-3-3.8-1.9-.9-4.2-1.3-6.5-1.3-2.3 0-4.6.4-6.5 1.3-1.9.9-3 2.3-3 3.8 0 1.3.8 2.5 2.5 3.4-.1.3-.2.7-.3 1.1l-.6 1.4 1.4-.4c.6-.2 1.3-.4 1.9-.7 1.1.5 2.4.8 3.8.8s2.7-.3 3.8-.8c.6.3 1.3.5 1.9.7l1.4.4-.6-1.4c-.1-.4-.2-.8-.3-1.1 1.7-.9 2.5-2.1 2.5-3.4z'/%3E%3C/svg%3E") no-repeat center;
  mask-size: contain;
}

.method-name {
  font-family: map-get($typography-body, font-family);
  font-size: 14px;
  color: $color-text-primary;
}

.radio-check {
  width: 18px;
  height: 18px;
  border: 1px solid $color-border;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.active {
    background-color: $color-primary;
    border-color: $color-primary;
  }
}

.check-inner {
  width: 6px;
  height: 6px;
  background-color: $color-surface;
  border-radius: 50%;
}

/* ===== 底部操作 ===== */
.action-footer {
  padding: $spacing-20 0 $spacing-10;
}

.btn-primary {
  width: 100%;
  height: 44px;
  background-color: $color-primary;
  color: $color-surface;
  border-radius: $radius-20;
  font-family: map-get($typography-button, font-family);
  font-weight: map-get($typography-button, font-weight);
  font-size: map-get($typography-button, font-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  
  &:active {
    opacity: 0.8;
  }
}
</style>
