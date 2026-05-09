<script setup lang="ts">
/**
 * ============================================
 * 硕博达小程序 - 隐私设置页面
 * ============================================
 * 对应设计稿 Artboard: 220-0
 * 功能：管理用户的隐私开关（学习记录、好友推荐、数据统计）
 * ============================================
 */

import { ref, onMounted } from 'vue'

// 隐私选项接口
interface PrivacyOption {
  key: string
  title: string
  description: string
  enabled: boolean
}

// 隐私设置选项列表
const options = ref<PrivacyOption[]>([
  {
    key: 'privacy_allow_view_history',
    title: '允许他人查看学习记录',
    description: '关闭后其他用户无法看到你的学习动态',
    enabled: true
  },
  {
    key: 'privacy_allow_recommend_friends',
    title: '允许推荐给好友',
    description: '开启后可能被推荐给通讯录好友',
    enabled: false
  },
  {
    key: 'privacy_allow_data_stats',
    title: '学习数据统计',
    description: '允许平台收集学习行为用于个性化推荐',
    enabled: true
  }
])

/**
 * 从本地存储加载设置
 */
onMounted(() => {
  options.value.forEach(option => {
    const storedValue = uni.getStorageSync(option.key)
    if (typeof storedValue === 'boolean') {
      option.enabled = storedValue
    }
  })
})

/**
 * 处理开关变化
 */
const handleToggleChange = (index: number, e: any) => {
  const newValue = e.detail.value
  const option = options.value[index]
  option.enabled = newValue
  
  // 保存到本地存储
  uni.setStorageSync(option.key, newValue)
  
  // 此处可扩展：同步到后端服务器
  console.log(`[Privacy] ${option.key} changed to: ${newValue}`)
}
</script>

<template>
  <view class="privacy-settings-page">
    <!-- 导航栏（NavBar 组件自动处理安全区域） -->
    <NavBar title="隐私设置" title-align="left" />

    <!-- 内容区域 -->
    <view class="content-area">
      <view class="settings-card">
        <block v-for="(option, index) in options" :key="option.key">
          <view class="setting-item">
            <view class="info-group">
              <text class="item-title">{{ option.title }}</text>
              <text class="item-desc">{{ option.description }}</text>
            </view>
            <view class="action-group">
              <switch 
                :checked="option.enabled" 
                color="#009666" 
                @change="(e) => handleToggleChange(index, e)"
              />
            </view>
          </view>
          <!-- 分割线 -->
          <view v-if="index < options.length - 1" class="divider"></view>
        </block>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.privacy-settings-page {
  min-height: 100vh;
  background-color: $color-background;
}

.content-area {
  padding: $spacing-20;
}

.settings-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-14 $spacing-16;
  
  .info-group {
    display: flex;
    flex-direction: column;
    flex: 1;
    margin-right: $spacing-12;
  }

  .item-title {
    font-family: map-get($typography-card-title, font-family);
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-4;
  }

  .item-desc {
    font-family: map-get($typography-caption, font-family);
    font-size: 13px;
    font-weight: 400;
    color: $color-text-muted;
  }

  .action-group {
    display: flex;
    align-items: center;
  }
}

.divider {
  height: 1px;
  background-color: $color-border;
  margin: 0 $spacing-16;
}

/* 微信小程序 switch 缩放处理，使其更接近设计稿比例 */
:deep(switch) {
  transform: scale(0.8);
  transform-origin: right center;
}
</style>
