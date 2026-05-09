<template>
  <view class="search-page">
    <!-- ========== NavBar ========== -->
    <NavBar title="搜索" />

    <!-- ========== 搜索输入框 ========== -->
    <view class="search-input-section">
      <view class="search-input-wrapper">
        <image src="/static/icons/search-bar.svg" class="search-input-icon" mode="aspectFit" />
        <input
          class="search-input"
          type="text"
          :value="keyword"
          :placeholder="searchPlaceholder"
          placeholder-class="search-input-placeholder"
          confirm-type="search"
          :focus="inputFocused"
          @input="handleInput"
          @confirm="handleConfirm"
          @focus="onInputFocus"
          @blur="onInputBlur"
        />
        <!-- 清空按钮 -->
        <view v-if="keyword" class="clear-btn" @tap="clearKeyword">
          <text class="clear-icon">x</text>
        </view>
      </view>
      <view v-if="keyword" class="cancel-btn" @tap="goBack">
        <text class="cancel-text">取消</text>
      </view>
    </view>

    <!-- ========== 搜索历史（无搜索结果时显示） ========== -->
    <view v-if="!keyword && !hasSearched" class="history-section">
      <view class="history-header">
        <text class="history-title">搜索历史</text>
        <view v-if="searchHistory.length > 0" class="history-clear" @tap="clearHistory">
          <text class="history-clear-text">清空</text>
        </view>
      </view>
      <view v-if="searchHistory.length > 0" class="history-tags">
        <view
          v-for="(item, idx) in searchHistory"
          :key="'h-'+idx"
          class="history-tag"
          hover-class="history-tag-hover"
          @tap="fillHistory(item)"
        >
          <text class="history-tag-text">{{ item }}</text>
        </view>
      </view>
      <!-- 无搜索历史 -->
      <view v-else class="history-empty">
        <text class="history-empty-text">暂无搜索记录</text>
      </view>
    </view>

    <!-- ========== 搜索结果 ========== -->
    <view v-if="hasSearched" class="result-section">
      <!-- 加载中骨架屏 -->
      <view v-if="loading" class="skeleton-list">
        <view v-for="i in 3" :key="'sk-'+i" class="skeleton-card">
          <view class="skeleton-thumb" />
          <view class="skeleton-info">
            <view class="skeleton-line skeleton-line-long" />
            <view class="skeleton-line skeleton-line-short" />
          </view>
        </view>
      </view>

      <!-- 搜索结果列表 -->
      <view v-else-if="results.length > 0" class="result-list">
        <view
          v-for="(product, idx) in results"
          :key="'r-'+idx"
          class="result-card"
          @tap="goToDetail(product)"
        >
          <view class="result-thumb">
            <image
              v-if="product.coverImage || product.imageUrl"
              :src="product.coverImage || product.imageUrl"
              mode="aspectFill"
              class="result-thumb-img"
              lazy-load
            />
            <view v-else class="result-thumb-placeholder" />
            <view v-if="product.tag" class="result-badge">
              <text class="result-badge-text">{{ product.tag }}</text>
            </view>
          </view>
          <view class="result-info">
            <text class="result-name">{{ product.name }}</text>
            <view class="result-bottom">
              <text class="result-students">{{ product.studentCount || product.enrolledCount || 0 }} 人学习</text>
              <text v-if="product.price" class="result-price">{{ formatPrice(product.price) }}</text>
              <text v-else class="result-price result-free">免费</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 无搜索结果 -->
      <view v-else class="empty-container">
        <text class="empty-title">未找到相关内容</text>
        <text class="empty-desc">换个关键词试试吧</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productService } from '@/services/api/products'
import { logger } from '@/utils/logger'

// 搜索历史存储 key
const STORAGE_KEY = 'search_history'
// 最大历史记录数
const MAX_HISTORY = 10
// 搜索防抖延时（毫秒）
const DEBOUNCE_DELAY = 500

export default {
  setup() {
    // ====== 响应式数据 ======
    const keyword = ref('')
    const inputFocused = ref(false)
    const loading = ref(false)
    const hasSearched = ref(false)
    const results = ref<any[]>([])
    const searchHistory = ref<string[]>([])
    const searchSource = ref<'home' | 'shop'>('home')

    const searchPlaceholder = computed(() => {
      return searchSource.value === 'shop'
        ? '搜索课程、会员、周边...'
        : '搜索课程、文章、活动...'
    })

    // 防抖定时器
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    /**
     * 从本地存储加载搜索历史
     */
    const loadHistory = () => {
      try {
        const raw = uni.getStorageSync(STORAGE_KEY)
        if (raw && typeof raw === 'string') {
          searchHistory.value = JSON.parse(raw)
        } else if (Array.isArray(raw)) {
          searchHistory.value = raw
        }
      } catch (e) {
        logger.warn('加载搜索历史失败', e)
        searchHistory.value = []
      }
    }

    /**
     * 保存搜索历史到本地存储
     * 新关键词插入最前面，超过最大数量时截断
     */
    const saveHistory = (newKeyword: string) => {
      if (!newKeyword || !newKeyword.trim()) return
      const trimmed = newKeyword.trim()

      // 去重：如果已存在则移到最前
      const filtered = searchHistory.value.filter(item => item !== trimmed)
      filtered.unshift(trimmed)

      // 限制最大数量
      searchHistory.value = filtered.slice(0, MAX_HISTORY)

      try {
        uni.setStorageSync(STORAGE_KEY, JSON.stringify(searchHistory.value))
      } catch (e) {
        logger.warn('保存搜索历史失败', e)
      }
    }

    /**
     * 执行搜索
     * 调用 productService.searchProducts API
     */
    const doSearch = async (searchKeyword: string) => {
      if (!searchKeyword || !searchKeyword.trim()) {
        hasSearched.value = false
        results.value = []
        return
      }

      const trimmed = searchKeyword.trim()
      loading.value = true
      hasSearched.value = true

      try {
        const res = await productService.searchProducts(trimmed)
        results.value = res?.items || []

        // 搜索成功后保存到历史
        saveHistory(trimmed)

        logger.info('搜索完成', { keyword: trimmed, count: results.value.length })
      } catch (e) {
        logger.error('搜索失败', e)
        results.value = []
      } finally {
        loading.value = false
      }
    }

    /**
     * 输入事件处理（带防抖）
     */
    const handleInput = (e: any) => {
      keyword.value = e.detail.value || ''

      // 清除之前的防抖定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }

      // 设置新的防抖定时器
      debounceTimer = setTimeout(() => {
        if (keyword.value.trim()) {
          doSearch(keyword.value)
        } else {
          hasSearched.value = false
          results.value = []
        }
      }, DEBOUNCE_DELAY)
    }

    /**
     * 键盘确认搜索
     */
    const handleConfirm = () => {
      // 取消防抖，立即搜索
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      doSearch(keyword.value)
    }

    /**
     * 输入框聚焦
     */
    const onInputFocus = () => {
      inputFocused.value = true
    }

    /**
     * 输入框失焦
     */
    const onInputBlur = () => {
      inputFocused.value = false
    }

    /**
     * 清空搜索关键词
     */
    const clearKeyword = () => {
      keyword.value = ''
      hasSearched.value = false
      results.value = []
    }

    /**
     * 点击历史标签填充搜索框并触发搜索
     */
    const fillHistory = (item: string) => {
      keyword.value = item
      doSearch(item)
    }

    /**
     * 清空搜索历史
     */
    const clearHistory = () => {
      searchHistory.value = []
      try {
        uni.removeStorageSync(STORAGE_KEY)
      } catch (e) {
        logger.warn('清空搜索历史失败', e)
      }
    }

    /**
     * 返回上一页
     */
    const goBack = () => {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({
            url: searchSource.value === 'shop' ? '/pages/shop/shop' : '/pages/index/index'
          })
        },
      })
    }

    /**
     * 跳转到商品详情
     */
    const goToDetail = (product: any) => {
      const productId = product?.id
      if (!productId) {
        uni.showToast({ title: '商品信息异常', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/subpackages/product/detail?id=${productId}`,
        fail: () => {
          uni.showToast({ title: '跳转失败', icon: 'none' })
        },
      })
    }

    /**
     * 格式化价格
     * 兼容对象格式 { amount: 99 } 和数字格式 99
     */
    const formatPrice = (price: any): string => {
      if (typeof price === 'object' && price.amount !== undefined) {
        return `¥${price.amount}`
      }
      return `¥${price}`
    }

    // ====== 生命周期 ======
    onLoad((options = {}) => {
      searchSource.value = options.source === 'shop' ? 'shop' : 'home'
    })

    onMounted(() => {
      loadHistory()
    })

    return {
      keyword,
      inputFocused,
      loading,
      hasSearched,
      results,
      searchHistory,
      searchPlaceholder,
      handleInput,
      handleConfirm,
      onInputFocus,
      onInputBlur,
      clearKeyword,
      fillHistory,
      clearHistory,
      goBack,
      goToDetail,
      formatPrice,
    }
  },
}
</script>

<style lang="scss" scoped>

/* ========== 搜索页面容器 ========== */
.search-page {
  min-height: 100vh;
  background-color: #F5F7F6;
}

/* ========== 搜索输入区 ========== */
.search-input-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 40rpx 24rpx;
  background-color: #FFFFFF;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background-color: #F5F7F6;
  border: 3rpx solid #E2EBED;
  border-radius: 40rpx;
  padding: 20rpx 32rpx;

  .search-input-icon {
    width: 30rpx;
    height: 30rpx;
    flex-shrink: 0;
  }
}

.search-input {
  flex: 1;
  font-family: 'PingFang SC', system-ui, sans-serif;
  font-size: 28rpx;
  color: #1A2E35;
  line-height: 40rpx;
}

.search-input-placeholder {
  font-family: 'PingFang SC', system-ui, sans-serif;
  font-size: 28rpx;
  color: #6B8A94;
}

/* 清空按钮 */
.clear-btn {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background-color: #6B8A94;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .clear-icon {
    font-size: 22rpx;
    color: #FFFFFF;
    line-height: 22rpx;
    text-align: center;
  }
}

/* 取消按钮 */
.cancel-btn {
  flex-shrink: 0;
  padding: 8rpx 0;

  .cancel-text {
    font-size: 28rpx;
    color: #6B8A94;
    line-height: 40rpx;
  }
}

/* ========== 搜索历史区 ========== */
.history-section {
  padding: 40rpx 40rpx 0;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;

  .history-title {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 30rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 42rpx;
  }
}

.history-clear {
  display: flex;
  align-items: center;

  .history-clear-text {
    font-size: 24rpx;
    color: #6B8A94;
    line-height: 34rpx;
  }
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-tag {
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  padding: 14rpx 28rpx;

  .history-tag-text {
    font-size: 26rpx;
    color: #1A2E35;
    line-height: 36rpx;
  }
}

.history-tag-hover {
  opacity: 0.7;
}

.history-empty {
  padding: 80rpx 0;

  .history-empty-text {
    font-size: 26rpx;
    color: #6B8A94;
    line-height: 36rpx;
    text-align: center;
  }
}

/* ========== 搜索结果区 ========== */
.result-section {
  padding: 24rpx 40rpx 40rpx;
}

/* ========== 搜索结果卡片（复用首页 course-card 样式） ========== */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.result-card {
  display: flex;
  gap: 28rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  padding: 28rpx;

  .result-thumb {
    width: 200rpx;
    height: 160rpx;
    border-radius: 24rpx;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;

    .result-thumb-img {
      width: 100%;
      height: 100%;
    }

    .result-thumb-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #F0F5F2, #DDE9E3);
    }

    .result-badge {
      position: absolute;
      left: 12rpx;
      bottom: 12rpx;
      background-color: rgba(0, 77, 64, 0.8);
      border-radius: 8rpx;
      padding: 4rpx 12rpx;

      .result-badge-text {
        font-size: 20rpx;
        color: #FFFFFF;
        line-height: 24rpx;
      }
    }
  }

  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;

    .result-name {
      font-family: 'PingFang SC', system-ui, sans-serif;
      font-size: 28rpx;
      font-weight: 600;
      color: #1A2E35;
      line-height: 40rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .result-bottom {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;

      .result-students {
        font-size: 22rpx;
        color: #6B8A94;
        line-height: 30rpx;
      }

      .result-price {
        font-family: 'JetBrains Mono', system-ui, sans-serif;
        font-size: 32rpx;
        font-weight: 700;
        color: #009666;
        line-height: 44rpx;
      }

      .result-free {
        font-family: system-ui, sans-serif;
      }
    }
  }
}

/* ========== 骨架屏加载 ========== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.skeleton-card {
  display: flex;
  gap: 28rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E2EBED;
  border-radius: 32rpx;
  padding: 28rpx;

  .skeleton-thumb {
    width: 200rpx;
    height: 160rpx;
    border-radius: 24rpx;
    background-color: #F0F5F2;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .skeleton-line {
      height: 28rpx;
      border-radius: 8rpx;
      background-color: #F0F5F2;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    .skeleton-line-long {
      width: 80%;
    }

    .skeleton-line-short {
      width: 50%;
    }
  }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ========== 空状态 ========== */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 80rpx;

  .empty-title {
    font-family: 'PingFang SC', system-ui, sans-serif;
    font-size: 30rpx;
    font-weight: 600;
    color: #1A2E35;
    line-height: 42rpx;
    margin-bottom: 12rpx;
  }

  .empty-desc {
    font-size: 26rpx;
    color: #6B8A94;
    line-height: 36rpx;
  }
}
</style>
