<template>
  <view class="detail-page">
    <!-- ========== Detail Header — 使用 NavBar 组件 ========== -->
    <NavBar title="商品详情" fixed title-align="left">
      <template #right>
        <view class="icon-circle" hover-class="icon-hover">
          <image src="/static/icons/nav-share.svg" class="nav-icon-img" mode="aspectFit" />
        </view>
      </template>
    </NavBar>

    <!-- 骨架屏 -->
    <SkeletonScreen :loading="isLoading && !product" type="product-detail">
      <scroll-view
        scroll-y
        class="scroll-content"
        v-if="product"
        :show-scrollbar="false"
      >
        <!-- ========== Product Hero Image ========== -->
        <!-- 有图片时显示轮播，无图片时显示占位图 -->
        <view class="product-hero" v-if="heroImages.length > 0">
          <swiper
            class="hero-swiper"
            :circular="true"
            @tap="previewProductImage"
            @change="onSwiperChange"
          >
            <swiper-item v-for="(url, idx) in heroImages" :key="idx">
              <image :src="url" class="hero-image" mode="aspectFill" />
            </swiper-item>
          </swiper>
          <view class="hero-indicator">
            <view 
              v-for="(url, idx) in heroImages" 
              :key="idx"
              :class="currentSwiper === idx ? 'dot-active' : 'dot-inactive'" 
            />
          </view>
        </view>
        <!-- 无图片时的占位区域 -->
        <view class="product-hero-placeholder" v-else>
          <image src="/static/icons/empty-image.svg" class="placeholder-icon" mode="aspectFit" />
          <text class="placeholder-text">暂无图片</text>
        </view>

        <!-- ========== Price Section ========== -->
        <view class="price-section">
          <view class="price-row">
            <view class="price-left">
              <text class="price-symbol">¥</text>
              <text class="current-price">{{ productPrice }}</text>
              <text class="original-price" v-if="showOriginalPrice">¥{{ originalPrice }}</text>
            </view>
            <view class="discount-tag" v-if="discountLabel">
              <text class="discount-text">{{ discountLabel }}</text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-item">已售 {{ salesCount }}</text>
            <template v-if="ratingRate">
              <text class="info-divider">·</text>
              <text class="info-item">好评率 {{ ratingRate }}</text>
            </template>
          </view>
        </view>

        <!-- ========== Product Info ========== -->
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-desc">{{ product.summary || '暂无简介' }}</text>
        </view>

        <!-- ========== Service Tags — 从后端 serviceGuarantees 字段渲染 ========== -->
        <view class="service-tags" v-if="serviceGuarantees.length > 0">
          <view class="tag-item" v-for="(tag, idx) in serviceGuarantees" :key="idx">
            <image src="/static/icons/check-green.svg" class="check-icon" />
            <text class="tag-label">{{ tag }}</text>
          </view>
        </view>

        <!-- ========== Detail Content Area ========== -->
        <view class="detail-area">
          <!-- 商品详情 Tab（评价功能暂未开放，仅显示商品详情） -->
          <view class="detail-tabs">
            <view class="tab-item active">
              <text class="tab-text">商品详情</text>
              <view class="tab-line" />
            </view>
          </view>

          <!-- 商品详情内容 — 直接渲染后端返回的 description 富文本 -->
          <view class="detail-content">
            <view class="content-section" v-if="processedDescription">
              <view class="section-body">
                <rich-text :nodes="processedDescription" />
              </view>
            </view>
            <view class="empty-detail" v-else>
              <text class="empty-detail-text">暂无商品详情</text>
            </view>
          </view>
        </view>

        <!-- Bottom Spacer -->
        <view class="bottom-spacer" />
      </scroll-view>
    </SkeletonScreen>

    <!-- ========== Bottom Action Bar ========== -->
    <view class="bottom-bar" v-if="product" :style="{ paddingBottom: safeArea.safeAreaBottom + 'px' }">
      <view class="bar-left">
        <view class="bar-icon-btn" @tap="showContactPopup = true">
          <image src="/static/icons/bar-service.svg" class="bar-icon" />
          <text class="bar-icon-label">客服</text>
        </view>
        <view class="bar-icon-btn" @tap="goToCart">
          <image src="/static/icons/bar-cart.svg" class="bar-icon" />
          <text class="bar-icon-label">购物车</text>
        </view>
      </view>
      <view class="bar-right">
        <view class="bar-btn btn-cart" hover-class="btn-hover" @tap="handleAddToCart">
          <text class="btn-text">加入购物车</text>
        </view>
        <view class="bar-btn btn-buy" hover-class="btn-hover" @tap="handleBuyNow">
          <text class="btn-text">立即购买</text>
        </view>
      </view>
    </view>

    <!-- Error State -->
    <view class="error-container" v-if="!isLoading && error">
      <image src="/static/icons/empty-error.svg" class="error-img" />
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="loadProduct">
        <text class="retry-text">重试</text>
      </view>
    </view>

    <!-- 登录弹窗 -->
    <Popupcustom ref="loginPopupRef" @loginSuccess="onLoginSuccess" />

    <!-- 联系客服弹窗 -->
    <ContactSupportPopup v-model="showContactPopup" />

    <!-- 手机号绑定弹窗 -->
    <view v-if="phoneBindVisible" class="phone-bind-mask" @tap.stop="phoneBindVisible = false">
      <view class="phone-bind-box" @tap.stop>
        <view class="phone-bind-close" @tap="phoneBindVisible = false">
          <image src="/static/icons/close-muted.svg" class="close-icon" />
        </view>
        <view class="phone-bind-header">
          <text class="phone-bind-title">绑定手机号</text>
          <text class="phone-bind-desc">购买前需要绑定手机号</text>
        </view>
        <button class="phone-bind-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
          <text class="btn-text">授权手机号</text>
        </button>
        <view class="phone-bind-cancel" @tap="phoneBindVisible = false">
          <text class="cancel-text">暂不绑定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { productService } from '@/services/api/products'
import { orderService } from '@/services/api/orders'
import { paymentService } from '@/services/api/payment'
import { userService } from '@/services/api/user'
import { showSuccess, showError, showLoading, hideLoading } from '@/utils/toast'
import { buildFullUrl } from '@/utils/url'
import { previewImages } from '@/utils/image-preview'
import Popupcustom from '@/components/Popupcustom.vue'
import ContactSupportPopup from '@/components/ContactSupportPopup.vue'
import SkeletonScreen from '@/components/SkeletonScreen.vue'
import { useAuthStore } from '@/stores/authStore'
import { useSafeArea } from '@/hooks/useSafeArea'

const safeArea = useSafeArea()
const authStore = useAuthStore()

const productId = ref('')
const product = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const loginPopupRef = ref()
const phoneBindVisible = ref(false)
const pendingBuy = ref(false)
const showContactPopup = ref(false)

// 商品详情页面无需 Tab 切换，固定显示"商品详情"内容
const currentSwiper = ref(0)

const heroImages = computed(() => {
  if (!product.value) return []
  const images = []
  if (product.value.coverUrl) images.push(buildFullUrl(product.value.coverUrl))
  if (product.value.mediaUrls && product.value.mediaUrls.length > 0) {
    images.push(...product.value.mediaUrls.map((url: string) => buildFullUrl(url)))
  }
  return images
})

const productPrice = computed(() => {
  if (!product.value) return '0'
  return product.value.price?.amount || product.value.price || '0'
})

const originalPrice = computed(() => {
  if (!product.value) return '0'
  // 后端返回 originalPrice 字段 (格式: { amount: "199.00", currencyCode: "CNY" })
  if (product.value.originalPrice) {
    return product.value.originalPrice.amount || product.value.originalPrice
  }
  // 如果后端没有返回原价，则不显示划线价
  return '0'
})

const discountLabel = computed(() => {
  if (!product.value) return ''
  // 基于当前价和原价的差额自动计算折扣标签
  const current = parseFloat(productPrice.value)
  const original = parseFloat(originalPrice.value)
  if (original > 0 && current > 0 && current < original) {
    const discount = Math.round((current / original) * 10)
    return `限时${discount}折`
  }
  return ''
})

// 是否显示原价划线 — 仅在原价大于 0 且不等于当前价时显示
const showOriginalPrice = computed(() => {
  const current = parseFloat(productPrice.value)
  const original = parseFloat(originalPrice.value)
  return original > 0 && original !== current
})

const salesCount = computed(() => {
  if (!product.value) return '0'
  // 适配后的字段: salesCount / soldCount（后端暂不返回，默认 0）
  return (product.value.salesCount || product.value.soldCount || 0).toLocaleString()
})

const ratingRate = computed(() => {
  if (!product.value) return ''
  return product.value.ratingRate || ''
})

// 服务保障标签 — 从后端 serviceGuarantees 字段获取
const serviceGuarantees = computed(() => {
  if (!product.value) return []
  return Array.isArray(product.value.serviceGuarantees) ? product.value.serviceGuarantees : []
})

/**
 * processedDescription — 将后端 TipTap 编辑器输出的 HTML 转为小程序 rich-text 兼容格式
 *
 * 核心问题：微信小程序 rich-text 组件只识别 inline style，不识别 class / Tailwind。
 * 后端 TipTap 输出的 HTML 带有 Tailwind class（如 rounded-lg、shadow-sm），
 * 但这些 class 在 rich-text 中完全无效，导致标题不加粗、间距塌缩、无颜色层级。
 *
 * 解决方案：对每种 HTML 元素做正则替换，注入精确的 inline style，
 * 使 rich-text 渲染出清晰的排版层次和舒适的阅读体验。
 *
 * 设计 Token 参考（与 design-tokens.scss 保持一致）：
 *   主色 #009666  |  标题色 #1A2E35  |  正文色 #333333  |  次要文本 #6B8A94
 *
 * 处理项：
 * 1. h2 — 页面主标题：20px/600，大间距，主色调
 * 2. h3 — 模块标题：17px/600，上间距分隔模块
 * 3. h4 — 子标题：15px/600，左侧绿色边框装饰，视觉上与正文区分
 * 4. p  — 段落：15px 正文，行高 1.8（舒适阅读），段间距 12px
 * 5. ul/ol — 列表：左缩进，列表项间距
 * 6. li — 列表项：行高 1.6，项间距 6px
 * 7. strong/b — 加粗：字重 600 + 标题色加深
 * 8. blockquote — 引用块：左侧绿色边框 + 浅背景
 * 9. img — 图片：max-width 限制、圆角、间距（保留原有逻辑）
 * 10. a — 链接：主题色 + 下划线（视觉标识，rich-text 不支持实际跳转）
 * 11. em/i — 斜体：次要文本色
 * 12. code — 行内代码：等宽字体 + 浅背景
 * 13. 外层容器 — 换行控制、全局字体基线
 */
const processedDescription = computed(() => {
  if (!product.value?.description) return ''
  let html = product.value.description

  // ── 颜色常量（与 design-tokens.scss 对齐）──
  const primary = '#009666'       // 主色
  const titleColor = '#1A2E35'    // 标题色（深色）
  const bodyColor = '#333333'     // 正文色
  const mutedColor = '#6B8A94'    // 次要文本色
  const bgColor = '#F5F7F6'       // 浅背景色

  // ── 1. h2 主标题 ──
  // 最大的标题，用于商品描述的开篇标题（如"科学管理健康·开启职业新方向"）
  html = html.replace(
    /<h2>/gi,
    `<h2 style="font-size:20px;font-weight:600;color:${titleColor};margin-top:28px;margin-bottom:12px;line-height:1.4;">`
  )
  // 处理带属性的 h2（如 <h2 class="...">）
  html = html.replace(
    /<h2\s/gi,
    `<h2 style="font-size:20px;font-weight:600;color:${titleColor};margin-top:28px;margin-bottom:12px;line-height:1.4;" `
  )

  // ── 2. h3 模块标题 ──
  // 用于"课程亮点"、"适合人群"、"课程大纲"等模块分隔
  html = html.replace(
    /<h3>/gi,
    `<h3 style="font-size:17px;font-weight:600;color:${titleColor};margin-top:24px;margin-bottom:8px;line-height:1.4;">`
  )
  html = html.replace(
    /<h3\s/gi,
    `<h3 style="font-size:17px;font-weight:600;color:${titleColor};margin-top:24px;margin-bottom:8px;line-height:1.4;" `
  )

  // ── 3. h4 子标题 ──
  // 带左侧绿色边框装饰，视觉上与正文加粗区分（如"系统化教学"、"实战技能培养"）
  html = html.replace(
    /<h4>/gi,
    `<h4 style="font-size:15px;font-weight:600;color:${titleColor};margin-top:16px;margin-bottom:6px;padding-left:10px;border-left:3px solid ${primary};line-height:1.5;">`
  )
  html = html.replace(
    /<h4\s/gi,
    `<h4 style="font-size:15px;font-weight:600;color:${titleColor};margin-top:16px;margin-bottom:6px;padding-left:10px;border-left:3px solid ${primary};line-height:1.5;" `
  )

  // ── 4. p 段落 ──
  // 15px 正文 + 1.8 行高，确保移动端长文阅读舒适
  html = html.replace(
    /<p>/gi,
    `<p style="font-size:15px;line-height:1.8;color:${bodyColor};margin-top:0;margin-bottom:12px;">`
  )
  html = html.replace(
    /<p\s/gi,
    `<p style="font-size:15px;line-height:1.8;color:${bodyColor};margin-top:0;margin-bottom:12px;" `
  )

  // ── 5. ul / ol 列表容器 ──
  html = html.replace(
    /<ul>/gi,
    `<ul style="margin:8px 0 12px 0;padding-left:20px;list-style-type:disc;">`
  )
  html = html.replace(
    /<ol>/gi,
    `<ol style="margin:8px 0 12px 0;padding-left:20px;list-style-type:decimal;">`
  )

  // ── 6. li 列表项 ──
  html = html.replace(
    /<li>/gi,
    `<li style="font-size:15px;line-height:1.6;color:${bodyColor};margin-bottom:6px;">`
  )
  html = html.replace(
    /<li\s/gi,
    `<li style="font-size:15px;line-height:1.6;color:${bodyColor};margin-bottom:6px;" `
  )

  // ── 7. strong / b 加粗 ──
  // 加粗文本使用标题色加深对比，与正文形成明确区分
  html = html.replace(
    /<strong>/gi,
    `<strong style="font-weight:600;color:${titleColor};">`
  )
  html = html.replace(
    /<b>/gi,
    `<b style="font-weight:600;color:${titleColor};">`
  )

  // ── 8. blockquote 引用块 ──
  html = html.replace(
    /<blockquote>/gi,
    `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid ${primary};background-color:${bgColor};border-radius:0 8px 8px 0;">`
  )

  // ── 9. img 图片 ──
  // 后端 TipTap 输出: <img src="..." class="rounded-lg max-w-full ...">
  // 小程序 rich-text 不识别 Tailwind class，需要注入 inline style
  html = html.replace(
    /<img(\s)/gi,
    `<img style="max-width:100%;height:auto;border-radius:16px;display:block;margin:16px 0;"$1`
  )

  // ── 10. a 链接 ──
  // rich-text 不支持实际跳转，但用主题色 + 下划线做视觉标识
  html = html.replace(
    /<a\s/gi,
    `<a style="color:${primary};text-decoration:underline;" `
  )

  // ── 11. em / i 斜体（保持，增加次要文本色）──
  html = html.replace(
    /<em>/gi,
    `<em style="font-style:italic;color:${mutedColor};">`
  )

  // ── 12. code 行内代码 ──
  html = html.replace(
    /<code>/gi,
    `<code style="font-family:monospace;font-size:13px;background-color:${bgColor};padding:2px 6px;border-radius:4px;color:${titleColor};">`
  )

  // ── 外层容器 ──
  // 全局字体基线 + 换行控制，防止长文本溢出
  const wrapperStyle = 'word-break:break-word;overflow-wrap:break-word;font-size:15px;line-height:1.8;color:#333333;'

  return `<div style="${wrapperStyle}">${html}</div>`
})

const onSwiperChange = (e: any) => {
  currentSwiper.value = e.detail.current
}

const loadProduct = async () => {
  if (!productId.value) return
  isLoading.value = true
  error.value = null
  try {
    const result = await productService.getProductDetail(productId.value)
    product.value = result
  } catch (err) {
    console.error('Failed to load product:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load product'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

const previewProductImage = () => {
  if (heroImages.value.length > 0) {
    previewImages(heroImages.value, heroImages.value[currentSwiper.value])
  }
}

const goToCart = () => {
  uni.switchTab({ url: '/pages/shop/shop' })
}

const handleAddToCart = () => {
  showSuccess('已加入购物车')
}

const onLoginSuccess = () => {
  if (pendingBuy.value) {
    pendingBuy.value = false
    setTimeout(() => handleBuyNow(), 500)
  }
}

const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok' || !e.detail.code) {
    showError('手机号授权失败，请重新尝试')
    return
  }
  try {
    showLoading('绑定中...')
    await (userService as any).bindWechatPhone(e.detail.code)
    await authStore.fetchUserInfo()
    hideLoading()
    phoneBindVisible.value = false
    showSuccess('手机号绑定成功')
    setTimeout(() => proceedToOrder(), 500)
  } catch (err) {
    hideLoading()
    console.error('手机号绑定失败:', err)
    showError('手机号绑定失败，请重新尝试')
  }
}

const handleBuyNow = async () => {
  if (!authStore.isLoggedIn) {
    pendingBuy.value = true
    loginPopupRef.value?.showPopup()
    return
  }
  if (!authStore.hasPhone) {
    phoneBindVisible.value = true
    return
  }
  if (!product.value) return
  await proceedToOrder()
}

const proceedToOrder = async () => {
  if (!product.value) return
  showLoading('正在创建订单...')
  try {
    const orderResult = await orderService.createOrder(product.value.id) as any
    const orderId = orderResult.order.id
    showLoading('正在准备支付...')
    const payResult = await (paymentService as any).createWechatPay(orderId)
    hideLoading()
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payResult.params.timeStamp,
      nonceStr: payResult.params.nonceStr,
      package: payResult.params.package,
      signType: payResult.params.signType,
      paySign: payResult.params.paySign,
      success: () => {
        showSuccess('支付成功')
        setTimeout(() => {
          uni.switchTab({ url: '/pages/orders/orders' })
        }, 1500)
      },
      fail: (err) => {
        console.error('Payment failed:', err)
        showError(err.errMsg.indexOf('cancel') > -1 ? '已取消支付' : '支付失败')
      }
    })
  } catch (err) {
    hideLoading()
    console.error('Buy failed:', err)
    showError(err instanceof Error ? err.message : '下单失败')
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> }
  const options = currentPage?.options || {}
  if (!options.id || !options.id.trim()) {
    uni.showToast({ title: '商品信息异常', icon: 'none' })
    setTimeout(() => goBack(), 1500)
    return
  }
  productId.value = options.id
  loadProduct()
})
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.detail-page {
  min-height: 100vh;
  background-color: $color-background;
}

/* ========== NavBar Slot Styles ========== */
.icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: $color-background;
  display: flex;
  align-items: center;
  justify-content: center;

  .nav-icon-img {
    width: 20px;
    height: 20px;
  }
}

.icon-hover {
  opacity: 0.7;
}

/* ========== Scroll Content ========== */
.scroll-content {
  height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
}

/* ========== Product Hero ========== */
.product-hero {
  background: $gradient-thumbnail;
  position: relative;
  width: 100%;
  height: 211px;

  .hero-swiper {
    width: 100%;
    height: 100%;
    
    .hero-image {
      width: 100%;
      height: 100%;
    }
  }

  .hero-indicator {
    position: absolute;
    bottom: 12px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: $spacing-6;

    .dot-active {
      width: 6px;
      height: 6px;
      background-color: $color-primary;
      border-radius: 50%;
    }

    .dot-inactive {
      width: 6px;
      height: 6px;
      background-color: rgba($color-primary, 0.2);
      border-radius: 50%;
    }
  }
}

/* ========== Product Hero Placeholder（无图片时） ========== */
.product-hero-placeholder {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #F0F5F2, #DDE9E3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-8;

  .placeholder-icon {
    width: 48px;
    height: 48px;
    opacity: 0.4;
  }

  .placeholder-text {
    font-size: 13px;
    color: $color-text-muted;
  }
}

/* ========== Price Section ========== */
.price-section {
  background-color: $color-surface;
  padding: $spacing-16 $spacing-20;
  display: flex;
  flex-direction: column;
  gap: $spacing-8;

  .price-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .price-left {
    display: flex;
    align-items: baseline;
    gap: $spacing-4;

    .price-symbol {
      font-size: 18px;
      font-weight: 700;
      color: $color-primary;
    }

    .current-price {
      font-size: 28px;
      line-height: 32px;
      font-weight: 700;
      color: $color-primary;
      font-family: $font-family-code;
    }

    .original-price {
      font-size: 14px;
      color: $color-text-muted;
      text-decoration: line-through;
      margin-left: $spacing-8;
    }
  }

  .discount-tag {
    background-color: $color-warm-bg;
    border-radius: 20px;
    padding: 2px $spacing-8;

    .discount-text {
      @each $key, $val in $typography-badge-text {
        #{$key}: #{$val};
      }
      color: $color-accent;
    }
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: $spacing-4;

    .info-item {
      @each $key, $val in $typography-label {
        #{$key}: #{$val};
      }
      color: $color-text-muted;
    }

    .info-divider {
      color: $color-text-muted;
      margin: 0 $spacing-2;
    }
  }
}

/* ========== Product Info ========== */
.product-info {
  background-color: $color-surface;
  padding: 0 $spacing-20 $spacing-16;
  margin-bottom: $spacing-12;

  .product-name {
    @each $key, $val in $typography-section-title {
      #{$key}: #{$val};
    }
    color: $color-text-primary;
    margin-bottom: $spacing-8;
    display: block;
  }

  .product-desc {
    @each $key, $val in $typography-body {
      #{$key}: #{$val};
    }
    color: $color-text-muted;
    display: block;
  }
}

/* ========== Service Tags ========== */
.service-tags {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: $spacing-12 $spacing-20;
  background-color: $color-surface;
  padding: $spacing-12 $spacing-20;
  margin-bottom: $spacing-12;
  border-top: 1px solid $color-border;
  border-bottom: 1px solid $color-border;

  .tag-item {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    flex-shrink: 0;

    .check-icon {
      width: 14px;
      height: 14px;
    }

    .tag-label {
      @each $key, $val in $typography-label {
        #{$key}: #{$val};
      }
      color: $color-text-primary;
    }
  }
}

/* ========== Detail Area ========== */
.detail-area {
  background-color: $color-surface;
  padding-bottom: $spacing-20;
}

.detail-tabs {
  display: flex;
  height: 48px;
  border-bottom: 1px solid $color-border;

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    position: relative;
    padding-left: $spacing-20;

    .tab-text {
      @each $key, $val in $typography-card-title {
        #{$key}: #{$val};
      }
      color: $color-text-muted;
    }

    &.active .tab-text {
      color: $color-primary;
    }

    .tab-line {
      position: absolute;
      bottom: 0;
      width: 20px;
      height: 3px;
      background-color: $color-primary;
      border-radius: 2px 2px 0 0;
    }
  }
}

.detail-content {
  padding: $spacing-20;
}

.content-section {
  margin-bottom: $spacing-20;

  .section-title {
    @each $key, $val in $typography-section-title {
      #{$key}: #{$val};
    }
    color: $color-text-primary;
    margin-bottom: $spacing-12;
    display: block;
  }

  .section-body {
    @each $key, $val in $typography-body {
      #{$key}: #{$val};
    }
    color: $color-text-primary;
    /* 确保富文本内容不溢出容器 */
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: break-word;

    /* rich-text 内部元素间距控制 */
    /* 注：rich-text 在小程序中会生成原生节点，
       外层 view 的 overflow:hidden 可约束其不溢出 */
  }
}

/* 空详情提示 */
.empty-detail {
  padding: $spacing-32 0;
  text-align: center;

  .empty-detail-text {
    @each $key, $val in $typography-body {
      #{$key}: #{$val};
    }
    color: $color-text-muted;
  }
}

/* ========== Bottom Action Bar ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background-color: $color-surface;
  display: flex;
  align-items: center;
  padding: 0 $spacing-20;
  box-shadow: $shadow-tab-bar;
  z-index: 100;
  border-top: 1px solid $color-border;

  .bar-left {
    display: flex;
    gap: $spacing-20;
    margin-right: $spacing-12;
  }

  .bar-icon-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 44px;

    .bar-icon {
      width: 22px;
      height: 22px;
    }

    .bar-icon-label {
      font-size: 10px;
      color: $color-text-muted;
      margin-top: 2px;
    }
  }

  .bar-right {
    flex: 1;
    display: flex;
    gap: $spacing-12;
  }

  .bar-btn {
    flex: 1;
    height: 36px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;

    .btn-text {
      @each $key, $val in $typography-button {
        #{$key}: #{$val};
      }
      color: $color-surface;
    }

    &.btn-cart {
      background-color: $color-primary-light;
      .btn-text {
        color: $color-primary;
      }
    }

    &.btn-buy {
      background-color: $color-primary;
    }
  }
}

.btn-hover {
  opacity: 0.9;
}

.bottom-spacer {
  height: 100px;
}

/* ========== Error State ========== */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;

  .error-img {
    width: 120px;
    height: 120px;
    margin-bottom: $spacing-20;
  }

  .error-text {
    @each $key, $val in $typography-body {
      #{$key}: #{$val};
    }
    color: $color-text-muted;
    margin-bottom: $spacing-20;
    text-align: center;
  }

  .retry-btn {
    background-color: $color-primary;
    border-radius: 20px;
    padding: 10px 32px;

    .retry-text {
      @each $key, $val in $typography-button {
        #{$key}: #{$val};
      }
      color: $color-surface;
    }
  }
}

/* ========== 手机号绑定弹窗 ========== */
.phone-bind-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.phone-bind-box {
  width: 290px;
  background-color: $color-surface;
  border-radius: $radius-16;
  padding: 24px 20px;
  position: relative;

  .phone-bind-close {
    position: absolute;
    right: 16px;
    top: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    .close-icon {
      width: 12px;
      height: 12px;
    }
  }

  .phone-bind-header {
    text-align: center;
    margin-bottom: 24px;

    .phone-bind-title {
      @each $key, $val in $typography-section-title {
        #{$key}: #{$val};
      }
      color: $color-text-primary;
      display: block;
      margin-bottom: 6px;
    }

    .phone-bind-desc {
      @each $key, $val in $typography-label {
        #{$key}: #{$val};
      }
      color: $color-text-muted;
      display: block;
    }
  }

  .phone-bind-btn {
    width: 100%;
    height: 44px;
    background-color: $color-primary;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    margin-bottom: $spacing-12;

    .btn-text {
      @each $key, $val in $typography-button {
        #{$key}: #{$val};
      }
      color: $color-surface;
    }

    &::after { border: none; }
  }

  .phone-bind-cancel {
    text-align: center;
    
    .cancel-text {
      @each $key, $val in $typography-label {
        #{$key}: #{$val};
      }
      color: $color-text-muted;
    }
  }
}
</style>
