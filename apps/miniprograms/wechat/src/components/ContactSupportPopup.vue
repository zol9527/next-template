<template>
  <popup-sheet
    :model-value="modelValue"
    title="联系客服"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 加载状态 -->
    <view v-if="loading" class="contact-list">
      <view class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 联系方式列表（仅显示后台已配置的渠道） -->
    <view v-else-if="contactChannels.length > 0" class="contact-list">
      <!-- 微信客服 -->
      <view v-if="contactInfo.wechat" class="contact-card">
        <view class="contact-info">
          <view class="icon-wrapper">
            <image src="/static/icons/contact-wechat.svg" class="contact-icon" mode="aspectFit" />
          </view>
          <view class="info-content">
            <text class="info-title">微信客服</text>
            <text class="info-value">微信号：{{ contactInfo.wechat }}</text>
          </view>
        </view>
        <view class="action-btn" @tap="copyToClipboard(contactInfo.wechat)">
          <text class="action-text">复制</text>
        </view>
      </view>

      <!-- 客服热线 -->
      <view v-if="contactInfo.phone" class="contact-card">
        <view class="contact-info">
          <view class="icon-wrapper">
            <image src="/static/icons/contact-phone.svg" class="contact-icon" mode="aspectFit" />
          </view>
          <view class="info-content">
            <text class="info-title">客服热线</text>
            <text class="info-value">{{ contactInfo.phone }}</text>
          </view>
        </view>
        <view class="action-btn" @tap="makePhoneCall(contactInfo.phone)">
          <text class="action-text">拨打</text>
        </view>
      </view>

      <!-- 邮箱反馈 -->
      <view v-if="contactInfo.email" class="contact-card">
        <view class="contact-info">
          <view class="icon-wrapper">
            <image src="/static/icons/contact-email.svg" class="contact-icon" mode="aspectFit" />
          </view>
          <view class="info-content">
            <text class="info-title">邮箱反馈</text>
            <text class="info-value">{{ contactInfo.email }}</text>
          </view>
        </view>
        <view class="action-btn" @tap="copyToClipboard(contactInfo.email)">
          <text class="action-text">复制</text>
        </view>
      </view>

      <view class="response-note">
        <text class="note-text">客服响应时间：工作日 9:00 - 18:00，24小时内回复</text>
      </view>
    </view>

    <!-- 无联系方式 -->
    <view v-else class="contact-list">
      <view class="empty-state">
        <text class="empty-text">暂未配置联系方式</text>
      </view>
    </view>
  </popup-sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PopupSheet from '@/components/PopupSheet.vue'
import { showSuccess } from '@/utils/toast'
import { siteConfigService } from '@/services/api/site-config'
import { logger } from '@/utils/logger'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

/** 组件内部 logger */
const componentLogger = logger.child({ component: 'ContactSupportPopup' })

/** 联系方式数据 */
const contactInfo = ref<{
  wechat: string | null
  phone: string | null
  email: string | null
}>({
  wechat: null,
  phone: null,
  email: null,
})

/** 加载状态 */
const loading = ref(false)

/** 是否已初始化（避免重复请求） */
const initialized = ref(false)

/** 监听弹窗打开，触发数据加载 */
watch(() => props.modelValue, (visible) => {
  if (visible && !initialized.value) {
    loadContactInfo()
  }
})

/** 已配置的联系方式渠道数量 */
const contactChannels = computed(() => {
  const channels: string[] = []
  if (contactInfo.value.wechat) channels.push('wechat')
  if (contactInfo.value.phone) channels.push('phone')
  if (contactInfo.value.email) channels.push('email')
  return channels
})

/**
 * 安全获取字段值（兼容 camelCase 和 snake_case）
 * 后端可能返回 contactWechat 或 contact_wechat 等不同格式，
 * 此方法同时尝试两种命名方式，确保数据能正确读取
 * @param {object} obj - 数据源对象
 * @param {string} camelKey - camelCase 格式的字段名
 * @param {string} snakeKey - snake_case 格式的字段名
 * @returns {string|null} 字段值，不存在则返回 null
 */
const safeGet = (obj, camelKey, snakeKey) => {
  return obj[camelKey] || obj[snakeKey] || null
}

/**
 * 加载联系方式信息
 * 优先使用 siteConfigService 的缓存（30 分钟 TTL），
 * 缓存失效时才发起网络请求
 */
const loadContactInfo = async () => {
  // 已初始化过则不再重复请求（如需强制刷新，可在 siteConfigService 层调用 clearCache）
  if (initialized.value) return

  loading.value = true
  try {
    // getSiteConfig 内部已有缓存机制：优先返回缓存，缓存过期才请求
    const config = await siteConfigService.getSiteConfig()

    // 记录原始返回的所有字段名，便于排查字段映射问题
    componentLogger.info('获取站点配置成功', {
      rawKeys: config ? Object.keys(config) : [],
      hasWechat: !!(config.contactWechat || config.contact_wechat),
      hasPhone: !!(config.contactPhone || config.contact_phone),
      hasEmail: !!(config.contactEmail || config.contact_email),
    })

    // 兼容 camelCase（contactWechat）和 snake_case（contact_wechat）两种字段命名
    contactInfo.value = {
      wechat: safeGet(config, 'contactWechat', 'contact_wechat'),
      phone: safeGet(config, 'contactPhone', 'contact_phone'),
      email: safeGet(config, 'contactEmail', 'contact_email'),
    }
    initialized.value = true
  } catch (error) {
    componentLogger.error('获取站点配置失败', error)
    // 请求失败保留空状态，用户可关闭弹窗重试
  } finally {
    loading.value = false
  }
}

/** 复制到剪贴板 */
const copyToClipboard = (text: string) => {
  uni.setClipboardData({
    data: text,
    success: () => {
      showSuccess('已复制到剪贴板')
    }
  })
}

/** 拨打电话 */
const makePhoneCall = (phoneNumber: string) => {
  uni.makePhoneCall({
    phoneNumber: phoneNumber
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.contact-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: $spacing-20;
}

.contact-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: $color-background;
  padding: $spacing-16;
  border-radius: $radius-12;
  /* 防止 padding 撑大卡片导致右侧溢出父容器 */
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: $spacing-8;
  flex: 1;
  min-width: 0;
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  background-color: $color-primary-light;
  border-radius: $radius-8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contact-icon {
  width: 16px;
  height: 16px;
}

.info-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.info-title {
  @each $key, $val in $typography-card-title {
    #{$key}: #{$val};
  }
  color: $color-text-primary;
}

.info-value {
  font-size: 12px;
  line-height: 16px;
  color: $color-text-muted;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-btn {
  background-color: $color-primary;
  border-radius: $radius-20;
  padding: 6px 14px;
  min-width: 52px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: $spacing-8;

  &:active {
    opacity: 0.8;
  }
}

.action-text {
  font-size: 12px;
  font-weight: 600;
  color: $color-surface;
}

.response-note {
  margin-top: $spacing-12;
  text-align: center;
}

.note-text {
  font-size: 11px;
  color: $color-text-muted;
  line-height: 1.5;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-32 0;
}

.loading-text {
  font-size: 13px;
  color: $color-text-muted;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-32 0;
  /* 确保在小程序环境中也能水平居中 */
  text-align: center;
  width: 100%;
}

.empty-text {
  font-size: 13px;
  color: $color-text-muted;
  /* 小程序中 <text> 作为 flex 子项时，text-align 可提供额外的居中保障 */
  text-align: center;
  width: 100%;
}
</style>
