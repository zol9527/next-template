<script setup lang="ts">
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { APP_VERSION } from '@/config/version'

const { siteName, siteSlogan, logoUrl, copyright, aboutStats, loadSiteConfig } = useSiteConfig()
loadSiteConfig()

const legalLinks = [
  { text: '用户协议', path: '/subpackages/agreements/detail?type=USER_AGREEMENT' },
  { text: '隐私政策', path: '/subpackages/agreements/detail?type=PRIVACY_POLICY' },
  { text: '检查更新', subText: '已是最新版本' }
]

const handleNavigate = (path?: string) => {
  if (path) {
    uni.navigateTo({ url: path })
  }
}
</script>

<template>
  <view class="about-page">
    <NavBar :title="`关于 ${siteName}`" title-align="left" />

    <!-- Brand Section -->
    <view class="brand-section">
      <view class="logo-container">
        <image v-if="logoUrl" :src="logoUrl" class="logo-image" mode="aspectFill" />
        <text v-else class="logo-text">{{ siteName.charAt(0) }}</text>
      </view>
      <text class="brand-name">{{ siteName }}</text>
      <text class="brand-desc">{{ siteSlogan }}</text>
      <text class="brand-version">v{{ APP_VERSION }}</text>
    </view>

    <!-- Features Section -->
    <view class="features-section">
      <view v-for="stat in aboutStats" :key="stat.label" class="stat-card">
        <text class="stat-value">{{ stat.value }}</text>
        <text class="stat-label">{{ stat.label }}</text>
      </view>
    </view>

    <!-- Legal Links Section -->
    <view class="legal-links">
      <view
        v-for="(link, index) in legalLinks"
        :key="link.text"
        class="link-item"
        :class="{ 'border-bottom': index !== legalLinks.length - 1 }"
        @tap="handleNavigate(link.path)"
      >
        <text class="link-text">{{ link.text }}</text>
        <view class="link-right">
          <text v-if="link.subText" class="sub-text">{{ link.subText }}</text>
          <text class="arrow-icon"></text>
        </view>
      </view>
    </view>

    <!-- Copyright -->
    <view class="copyright">
      <text class="copyright-text">{{ copyright }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.about-page {
  min-height: 100vh;
  background-color: $color-background;
  display: flex;
  flex-direction: column;
}



.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 32px;
  gap: 12px;

  .logo-container {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, #3B6B5E, #2A5247);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;

    .logo-text {
      color: $color-surface;
      font-size: 32px;
      font-weight: 800;
      font-family: $font-family-brand;
    }

    .logo-image {
      width: 100%;
      height: 100%;
      border-radius: 18px;
    }
  }

  .brand-name {
    font-family: $font-family-brand;
    font-weight: 800;
    font-size: 22px;
    line-height: 28px;
    letter-spacing: 2px;
    color: $color-brand-dark;
  }

  .brand-desc {
    font-family: $font-family-title;
    font-weight: 400;
    font-size: 13px;
    line-height: 18px;
    color: $color-text-muted;
  }

  .brand-version {
    font-family: $font-family-code;
    font-weight: 400;
    font-size: 12px;
    line-height: 16px;
    color: $color-text-muted;
  }
}

.features-section {
  display: flex;
  padding: 0 20px;
  gap: 12px;

  .stat-card {
    flex: 1;
    background-color: $color-surface;
    border-radius: $radius-16;
    border: 1px solid $color-border;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 76px;
    gap: 4px;

    .stat-value {
      font-family: $font-family-code;
      font-weight: 600;
      font-size: 20px;
      line-height: 22px;
      color: $color-text-primary;
    }
    
    &:first-child .stat-value {
      color: $color-primary;
    }

    .stat-label {
      font-family: $font-family-title;
      font-weight: 400;
      font-size: 11px;
      line-height: 14px;
      color: $color-text-muted;
    }
  }
}

.legal-links {
  margin: 20px;
  background-color: $color-surface;
  border-radius: $radius-16;
  border: 1px solid $color-border;
  overflow: hidden;

  .link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    height: 50px;
    box-sizing: border-box;

    &.border-bottom {
      border-bottom: 1px solid $color-border;
    }

    .link-text {
      font-family: $font-family-title;
      font-weight: 500;
      font-size: 14px;
      line-height: 20px;
      color: $color-text-primary;
    }

    .link-right {
      display: flex;
      align-items: center;
      gap: 4px;

      .sub-text {
        font-family: $font-family-title;
        font-weight: 400;
        font-size: 12px;
        color: $color-text-muted;
      }

      .arrow-icon {
        width: 6px;
        height: 6px;
        border-top: 1.5px solid $color-text-muted;
        border-right: 1.5px solid $color-text-muted;
        transform: rotate(45deg);
      }
    }
  }
}

.copyright {
  margin-top: auto;
  padding: 0 20px 32px;
  display: flex;
  justify-content: center;

  .copyright-text {
    font-family: $font-family-title;
    font-weight: 400;
    font-size: 11px;
    line-height: 14px;
    color: $color-text-muted;
    text-align: center;
  }
}
</style>
