<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { StorageKey } from '@/config/constants';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue', 'cleared']);

const cacheSize = ref('0 KB');

// 获取缓存大小
const getCacheSize = () => {
  try {
    const res = uni.getStorageInfoSync();
    const size = res.currentSize;
    if (size < 1024) {
      cacheSize.value = `${size} KB`;
    } else if (size < 1024 * 1024) {
      cacheSize.value = `${(size / 1024).toFixed(2)} MB`;
    } else {
      cacheSize.value = `${(size / (1024 * 1024)).toFixed(2)} GB`;
    }
  } catch (e) {
    console.error('获取缓存信息失败', e);
  }
};

onMounted(() => {
  getCacheSize();
});

const close = () => {
  emit('update:modelValue', false);
};

const confirmClear = () => {
  try {
    const res = uni.getStorageInfoSync();
    const keys = res.keys;
    
    // 需要保留的 Key 列表
    const keysToKeep = [
      StorageKey.ACCESS_TOKEN,
      StorageKey.REFRESH_TOKEN,
      StorageKey.USER_INFO,
      StorageKey.DEVICE_ID,
      StorageKey.COOKIES,
      'auth_token' // 兼容性
    ];

    keys.forEach(key => {
      if (!keysToKeep.includes(key as any)) {
        uni.removeStorageSync(key);
      }
    });

    uni.showToast({
      title: '清理成功',
      icon: 'success'
    });
    
    getCacheSize();
    emit('cleared');
    close();
  } catch (e) {
    uni.showToast({
      title: '清理失败',
      icon: 'none'
    });
    console.error('清除缓存失败', e);
  }
};
</script>

<template>
  <view v-if="modelValue" class="popup-overlay" @touchmove.stop.prevent @tap="close">
    <view class="popup-container" @tap.stop>
      <!-- 顶部图标 -->
      <view class="icon-wrapper">
        <svg class="trash-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6H5H21" stroke="#009666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="#009666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11V17" stroke="#009666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 11V17" stroke="#009666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </view>

      <!-- 标题 -->
      <view class="title">确认清除缓存？</view>

      <!-- 描述 -->
      <view class="description">
        当前缓存大小 {{ cacheSize }}，清除后需要重新下载课程资源
      </view>

      <!-- 按钮组 -->
      <view class="button-group">
        <view class="btn btn-cancel" @tap="close">取消</view>
        <view class="btn btn-confirm" @tap="confirmClear">确认清除</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.popup-container {
  width: 295px;
  background-color: $color-surface;
  border-radius: $radius-16;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background-color: $color-primary-light;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 12px;
}

.title {
  font-family: $font-family-title;
  font-weight: 600;
  font-size: 17px;
  line-height: 24px;
  color: $color-text-primary;
  margin-bottom: 8px;
}

.description {
  font-family: $font-family-body;
  font-weight: 400;
  font-size: 13px;
  line-height: 18px;
  color: $color-text-muted;
  text-align: center;
  padding: 0 24px;
  margin-bottom: 24px;
}

.button-group {
  display: flex;
  width: 100%;
  border-top: 1px solid $color-border;
}

.btn {
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: $font-family-body;
  font-weight: 600;
  font-size: 14px;
}

.btn-cancel {
  color: $color-text-muted;
  border-right: 1px solid $color-border;
}

.btn-confirm {
  color: $color-primary;
}

/* 兼容点击态 */
.btn:active {
  background-color: #f8f8f8;
}
</style>
