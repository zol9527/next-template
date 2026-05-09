<template>
  <popup-sheet
    v-model="visible"
    title="加入购物车"
    :show-close="true"
  >
    <view class="cart-popup">
      <!-- 商品基本信息 -->
      <view class="product-info">
        <image
          class="product-image"
          :src="product.image || '/static/images/placeholder.png'"
          mode="aspectFill"
        />
        <view class="product-detail">
          <text class="product-price">¥{{ product.price }}</text>
          <text class="product-stock">库存剩余 {{ product.stock }} 件</text>
          <text v-if="product.spec" class="product-spec">已选：{{ product.spec }}</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 数量选择 -->
      <view class="quantity-section">
        <text class="label">购买数量</text>
        <view class="quantity-selector">
          <view
            class="selector-btn minus"
            :class="{ disabled: quantity <= 1 }"
            @tap="handleQuantityChange(-1)"
          >
            <text class="btn-icon">-</text>
          </view>
          <view class="quantity-input">
            <text class="quantity-text">{{ quantity }}</text>
          </view>
          <view
            class="selector-btn plus"
            :class="{ disabled: quantity >= product.stock }"
            @tap="handleQuantityChange(1)"
          >
            <text class="btn-icon">+</text>
          </view>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 底部操作按钮 -->
      <view class="action-footer">
        <button class="btn-primary" @tap="handleConfirm">加入购物车</button>
      </view>
    </view>
  </popup-sheet>
</template>

<script setup lang="ts">
/**
 * CartPopup - 购物车弹窗组件
 * 
 * 用于选择商品规格、数量并加入购物车。
 * 遵循设计系统规范，使用 PopupSheet 作为基座。
 */

import { ref, watch } from 'vue'
import PopupSheet from './PopupSheet.vue'

/** 商品信息接口 */
interface Product {
  id: string | number
  name: string
  price: string | number
  stock: number
  image: string
  spec?: string
}

const props = defineProps<{
  /** 弹窗是否可见 */
  modelValue: boolean
  /** 商品信息 */
  product: Product
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { productId: string | number, quantity: number }): void
}>()

/** 弹窗可见性绑定 */
const visible = ref(props.modelValue)
watch(() => props.modelValue, (val) => {
  visible.value = val
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

/** 选择的购买数量 */
const quantity = ref(1)

/**
 * 处理数量变更
 * @param delta 变化量
 */
const handleQuantityChange = (delta: number) => {
  const newVal = quantity.value + delta
  if (newVal >= 1 && newVal <= props.product.stock) {
    quantity.value = newVal
  }
}

/**
 * 确认加入购物车
 */
const handleConfirm = () => {
  emit('confirm', {
    productId: props.product.id,
    quantity: quantity.value
  })
  visible.value = false
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.cart-popup {
  display: flex;
  flex-direction: column;
}

/* ===== 商品信息 ===== */
.product-info {
  display: flex;
  padding: $spacing-12 0;
  gap: $spacing-16;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: $radius-12;
  background-color: $color-background;
}

.product-detail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: $spacing-4;
}

.product-price {
  font-family: map-get($typography-section-title, font-family);
  font-weight: map-get($typography-section-title, font-weight);
  font-size: 20px;
  line-height: 24px;
  color: $color-primary;
}

.product-stock {
  font-family: map-get($typography-label, font-family);
  font-weight: map-get($typography-label, font-weight);
  font-size: map-get($typography-label, font-size);
  color: $color-text-muted;
}

.product-spec {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  color: $color-text-primary;
}

/* ===== 分割线 ===== */
.divider {
  height: 1px;
  background-color: $color-border;
  margin: $spacing-8 0;
}

/* ===== 数量选择 ===== */
.quantity-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-16 0;
}

.label {
  font-family: map-get($typography-body, font-family);
  font-weight: map-get($typography-body, font-weight);
  font-size: map-get($typography-body, font-size);
  color: $color-text-primary;
}

.quantity-selector {
  display: flex;
  align-items: center;
  background-color: $color-background;
  border-radius: $radius-8;
  overflow: hidden;
}

.selector-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  
  &.disabled {
    opacity: 0.3;
  }
  
  &:active:not(.disabled) {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.btn-icon {
  font-size: 18px;
  color: $color-text-primary;
}

.quantity-input {
  width: 48px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantity-text {
  font-family: $font-family-code;
  font-size: 14px;
  font-weight: 500;
  color: $color-text-primary;
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
