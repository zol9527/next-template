<template>
  <view
    :class="['product-card', `card-${size}`]"
    :style="{ background: cardBackground }"
    @tap.stop="handleTap"
  >
    <!-- Large Card Layout -->
    <template v-if="size === 'large'">
      <view class="card-info">
        <view class="tag-row">
          <text class="tag-text">{{ displayTag }}</text>
          <text class="iconfont icon-paw" v-if="showPaw"></text>
        </view>
        <text class="product-name">{{ displayName }}</text>
        <view class="price-row">
          <text class="currency">¥</text>
          <text class="price">{{ displayPrice }}</text>
        </view>
        <view class="card-actions" v-if="showActions">
          <view class="action-btn favorite-btn" hover-class="scale-hover" @tap.stop="handleFavorite">
            <text :class="['iconfont', isFavorite ? 'icon-heart-fill' : 'icon-heart']"></text>
          </view>
          <view class="action-btn add-cart-btn" hover-class="opacity-hover" @tap.stop="handleAddToCart">
            <text class="iconfont icon-smile-cart"></text>
          </view>
        </view>
      </view>
      <image :src="displayImage" mode="aspectFit" class="product-img"></image>
    </template>

    <!-- Small Card Layout -->
    <template v-else-if="size === 'small'">
      <view class="card-info">
        <text class="small-tag">{{ displayTag }}</text>
        <text class="small-name">{{ displayName }}</text>
        <view class="price-box">
          <text class="currency">¥</text>
          <text class="price">{{ displayPrice }}</text>
        </view>
      </view>
      <view class="card-actions" v-if="showActions">
        <view class="action-btn favorite-btn-small" hover-class="scale-hover" @tap.stop="handleFavorite">
          <text :class="['iconfont', isFavorite ? 'icon-heart-fill' : 'icon-heart']"></text>
        </view>
        <view class="add-btn-small" hover-class="opacity-hover" @tap.stop="handleAddToCart">
          <text class="iconfont icon-smile-cart-small"></text>
        </view>
      </view>
      <image :src="displayImage" mode="aspectFit" class="product-img-small"></image>
    </template>

    <!-- Grid Card Layout -->
    <template v-else-if="size === 'grid'">
      <view class="grid-bg">
        <image :src="displayImage" mode="aspectFit" class="grid-img"></image>
        <view class="favorite-btn" hover-class="scale-hover" @tap.stop="handleFavorite">
          <text :class="['iconfont', isFavorite ? 'icon-heart-fill' : 'icon-heart']"></text>
        </view>
      </view>
      <view class="grid-info">
        <text class="grid-tag">{{ displayTag }}</text>
        <text class="grid-name">{{ displayName }}</text>
        <view class="grid-bottom">
          <view class="price-row">
            <text class="currency">¥</text>
            <text class="price">{{ displayPrice }}</text>
          </view>
          <view class="add-btn" hover-class="opacity-hover" @tap.stop="handleTap">
            <view class="shop-icon icon-cart-svg"></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { computed } from 'vue'
import { buildFullUrl } from '../utils/url'

export default {
  props: {
    product: {
      type: Object,
      required: true
    },
    size: {
      type: String,
      default: 'grid',
      validator: (val) => ['large', 'small', 'grid'].includes(val)
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showPaw: {
      type: Boolean,
      default: false
    },
    index: {
      type: Number,
      default: 0
    }
  },
  emits: ['tap', 'favorite', 'addToCart'],
  setup(props, { emit }) {
    // 显示的标签
    const displayTag = computed(() => {
      const { product } = props
      // 优先使用 category.name
      if (product.category?.name) return product.category.name
      // 其次使用 tags
      if (product.tags && product.tags.length > 0) return product.tags[0]
      // 使用 kind 或默认
      return product.kind === 'course' ? '课程' : '商品'
    })

    // 显示的名称
    const displayName = computed(() => {
      const { product } = props
      return product.name || '未命名商品'
    })

    // 显示的价格
    const displayPrice = computed(() => {
      const { product } = props
      // 优先使用 price.amount
      if (product.price?.amount) return product.price.amount
      // 其次直接使用 price
      return product.price || 0
    })

    // 显示的图片
    const displayImage = computed(() => {
      const { product } = props
      // 优先使用 coverUrl
      if (product.coverUrl) return buildFullUrl(product.coverUrl)
      // 其次使用 mediaUrls
      if (product.mediaUrls && product.mediaUrls.length > 0) {
        return buildFullUrl(product.mediaUrls[0])
      }
      // 使用默认图片
      return '/static/plantify_logo_teal.png'
    })

    // 收藏状态
    const isFavorite = computed(() => {
      return props.product.isFavorite || false
    })

    // 卡片背景色
    const cardBackground = computed(() => {
      const { size, index } = props
      if (size === 'grid') {
        // 统一为白色
        return '#FFFFFF'
      } else if (size === 'large') {
        const backgrounds = [
          '#D4F2E7', // Mint green (Image match)
          '#FAE5D3', // Soft Peach
          '#D6EAF8', // Soft Blue
          '#EBDEF0'  // Soft Purple
        ]
        return backgrounds[index % backgrounds.length]
      } else {
        // small
        const backgrounds = ['#F9E79F', '#FDEBD0', '#A9DFBF', '#FADBD8']
        return backgrounds[index % backgrounds.length]
      }
    })

    const handleTap = () => {
      emit('tap', props.product)
    }

    const handleFavorite = () => {
      emit('favorite', props.product)
    }

    const handleAddToCart = () => {
      emit('addToCart', props.product)
    }

    return {
      displayTag,
      displayName,
      displayPrice,
      displayImage,
      isFavorite,
      cardBackground,
      handleTap,
      handleFavorite,
      handleAddToCart,
    }
  }
}
</script>

<style lang="scss" scoped>

.product-card {
  position: relative;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.04);
  background-color: #fff; // Fallback
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.99);
  }
}

/* Large Card - 首页大卡片 */
.card-large {
  width: 100%;
  height: 420rpx;
  padding: 48rpx;
  box-sizing: border-box;
  margin-bottom: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  // 必须确保文字层级高于图片
  .card-info {
    width: 100%; 
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 10;
    position: relative;
  }

  .tag-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;

    .tag-text {
      font-size: 28rpx;
      font-weight: 700;
      color: $plant-text-main;
      letter-spacing: 2rpx;
      opacity: 0.9;
    }

    .icon-paw {
      color: $plant-secondary;
      font-size: 32rpx;
      opacity: 0.8;
    }
  }

  .product-name {
    font-size: 60rpx;
    line-height: 1.25;
    margin-bottom: auto; // 将价格推到底部
    font-family: 'Times New Roman', serif;
    font-weight: 500;
    color: $plant-text-main;
    // 限制宽度以防遮挡右下角操作（如果有）
    max-width: 90%;
    // 允许换行
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 6rpx;
    margin-top: 20rpx;

    .currency {
      font-size: 36rpx;
      font-weight: 700;
      color: $plant-text-main;
    }

    .price {
      font-size: 60rpx;
      font-weight: 600;
      color: $plant-text-main;
      font-family: 'Times New Roman', serif;
      letter-spacing: -2rpx;
    }
  }

  .card-actions {
    position: absolute;
    right: 40rpx;
    bottom: 40rpx;
    display: flex;
    gap: 24rpx;
    z-index: 20;

    .action-btn {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
      
      .iconfont {
        font-size: 40rpx;
        color: $plant-text-main;
      }
    }

    .add-cart-btn {
      background-color: $plant-text-main;
      
      .iconfont {
        color: #fff;
      }
    }
  }

  .product-img {
    position: absolute;
    right: -40rpx;
    bottom: -40rpx;
    width: 320rpx;
    height: 320rpx;
    z-index: 1;
    opacity: 0.2; // 降低透明度，作为背景纹理
    transform: rotate(-10deg);
  }
}

/* Small Card */
.card-small {
  height: 280rpx;
  padding: 30rpx 36rpx;
  box-sizing: border-box;
  margin-bottom: 30rpx;
  display: flex;
  
  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 5;
  }

  .small-tag {
    font-size: 22rpx;
    font-weight: 700;
    color: $plant-text-main;
    opacity: 0.7;
    margin-bottom: 12rpx;
  }

  .small-name {
    font-size: 40rpx;
    line-height: 1.2;
    color: $plant-text-main;
    margin-bottom: 24rpx;
    font-family: 'Times New Roman', serif;
    font-weight: 600;
  }

  .price-box {
    display: flex;
    align-items: baseline;
    gap: 4rpx;

    .currency {
      font-size: 24rpx;
      font-weight: 700;
      color: $plant-text-main;
    }

    .price {
      font-size: 36rpx;
      font-weight: 800;
      color: $plant-text-main;
    }
  }

  .card-actions {
    position: absolute;
    right: 20rpx;
    bottom: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    z-index: 10;

    .favorite-btn-small {
       width: 60rpx;
       height: 60rpx;
       display: flex;
       align-items: center;
       justify-content: center;
       
       .iconfont {
         font-size: 32rpx;
         color: $plant-text-main;
       }
    }

    .add-btn-small {
      width: 64rpx;
      height: 64rpx;
      background-color: $plant-text-main;
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .iconfont {
         font-size: 32rpx;
         color: #fff;
      }
    }
  }

  .product-img-small {
    position: absolute;
    top: 50%;
    right: 10rpx;
    transform: translateY(-50%);
    width: 200rpx;
    height: 200rpx;
    opacity: 0.15; // Subtle background
  }
}

/* Grid Card */
.card-grid {
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04),
              0 8rpx 24rpx rgba(0, 0, 0, 0.06);

  .grid-bg {
    height: 240rpx;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    
    .grid-img {
      width: 100%; 
      height: 100%;
      object-fit: cover;
    }

    .favorite-btn {
      position: absolute;
      top: 16rpx;
      right: 16rpx;
      width: 50rpx;
      height: 50rpx;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .iconfont {
        font-size: 28rpx;
        color: $plant-text-main;
      }
    }
  }

  .grid-info {
    padding: 20rpx;
  }

  .grid-tag {
    font-size: 20rpx;
    color: $plant-text-grey;
    margin-bottom: 6rpx;
    display: block;
  }

  .grid-name {
    font-size: 28rpx;
    font-weight: 600;
    color: $plant-text-main;
    margin-bottom: 16rpx;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .grid-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .price-row {
      display: flex;
      align-items: baseline;
      gap: 2rpx;

      .currency {
        font-size: 22rpx;
        font-weight: 700;
        color: $plant-text-main;
      }

      .price {
        font-size: 34rpx;
        font-weight: 800;
        color: $plant-text-main;
      }
    }

    .add-btn {
      width: 50rpx;
      height: 50rpx;
      background-color: $plant-secondary;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .iconfont {
        font-size: 24rpx;
        color: #fff;
      }
    }
  }
}

.iconfont {
  font-family: serif;
  font-style: normal;
}

.opacity-hover {
  opacity: 0.7;
}

.scale-hover {
  transform: scale(0.9);
}

.shop-icon {
  width: 32rpx;
  height: 32rpx;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.icon-cart-svg {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z'/%3E%3C/svg%3E");
}

</style>
