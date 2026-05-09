<template>
  <view class="page-container">
    <NavBar title="帮助与反馈" title-align="left" />

    <!-- Content Area -->
    <scroll-view scroll-y class="content-scroll">
      <!-- FAQ Section -->
      <view class="section faq-section">
        <text class="section-title">常见问题</text>
        <view class="faq-list">
          <!-- 加载中 -->
          <view v-if="loading" class="faq-loading">
            <text class="status-text">加载中...</text>
          </view>

          <!-- 加载失败 -->
          <view v-else-if="loadError" class="faq-error">
            <text class="status-text">加载失败，</text>
            <text class="retry-link" @tap="loadFaqData">点击重试</text>
          </view>

          <!-- 暂无数据 -->
          <view v-else-if="faqList.length === 0" class="faq-empty">
            <text class="status-text">暂无常见问题</text>
          </view>

          <!-- FAQ 列表 -->
          <template v-else>
            <view 
              v-for="(item, index) in faqList" 
              :key="index" 
              class="faq-card"
              :class="{ active: item.expanded }"
              @tap="toggleFaq(index)"
            >
              <view class="faq-header">
                <view class="icon-q">
                  <text class="q-text">Q</text>
                </view>
                <text class="question">{{ item.question }}</text>
                <view class="arrow-container" :class="{ rotated: item.expanded }">
                  <image src="/static/icons/faq-arrow.svg" class="arrow-icon" mode="aspectFit" />
                </view>
              </view>
              <view class="faq-answer-container" :style="{ height: item.expanded ? item.answerHeight + 'px' : '0px' }">
                <view :id="'answer-' + index" class="faq-answer">
                  <text class="answer-text">{{ item.answer }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- Feedback Section -->
      <view class="section feedback-section">
        <text class="section-title">意见反馈</text>
        <view class="feedback-grid">
          <view class="feedback-item" @tap="handleFeedback('suggestion')">
            <view class="icon-wrapper">
              <image src="/static/icons/feedback-suggestion.svg" class="feedback-icon" mode="aspectFit" />
            </view>
            <text class="label">功能建议</text>
          </view>
          <view class="feedback-item" @tap="handleFeedback('bug')">
            <view class="icon-wrapper">
              <image src="/static/icons/feedback-bug.svg" class="feedback-icon" mode="aspectFit" />
            </view>
            <text class="label">问题反馈</text>
          </view>
          <view class="feedback-item" @tap="handleFeedback('support')">
            <view class="icon-wrapper">
              <image src="/static/icons/feedback-support.svg" class="feedback-icon" mode="aspectFit" />
            </view>
            <text class="label">联系客服</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { faqService } from '@/services/api/faq'
import type { FaqItem } from '@/services/api/faq'
import { logger } from '@/utils/logger'

interface DisplayFaqItem {
  question: string
  answer: string
  expanded: boolean
  answerHeight: number
}

/** 页面加载状态 */
const loading = ref(true)
/** FAQ 列表（展示用） */
const faqList = ref<DisplayFaqItem[]>([])
/** 是否加载失败 */
const loadError = ref(false)

/**
 * 从 API 加载 FAQ 数据并转换为展示格式
 */
async function loadFaqData() {
  loading.value = true
  loadError.value = false

  try {
    const faqs = await faqService.getFaqList()

    faqList.value = faqs.map((item, index) => ({
      question: item.question,
      answer: item.answer,
      expanded: index === 0,
      answerHeight: 0,
    }))

    await nextTick()
    calculateAnswerHeights()
  } catch (error) {
    logger.error('加载 FAQ 数据失败', error as Record<string, unknown>)
    loadError.value = true
    faqList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 计算每个回答区域的高度，用于展开/收起动画
 */
function calculateAnswerHeights() {
  faqList.value.forEach((_, index) => {
    const query = uni.createSelectorQuery().in(null)
    query.select(`#answer-${index}`).boundingClientRect((data) => {
      if (data) {
        faqList.value[index].answerHeight = (data as any).height
      }
    }).exec()
  })
}

const toggleFaq = (index: number) => {
  faqList.value[index].expanded = !faqList.value[index].expanded;
};

const handleFeedback = (type: string) => {
  // TODO: Task 25 Placeholder
  uni.showToast({ title: '功能开发中...', icon: 'none' });
};

onMounted(() => {
  loadFaqData()
})
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F5F7F6;
  box-sizing: border-box;
}

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.section {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 12px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: #1A2E35;
  font-family: "PingFang SC", system-ui, sans-serif;
  margin-bottom: 4px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.faq-loading,
.faq-error,
.faq-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background-color: #FFFFFF;
  border: 1px solid #E2EBED;
  border-radius: 16px;
}

.status-text {
  font-size: 13px;
  color: #6B8A94;
}

.retry-link {
  font-size: 13px;
  color: #009666;
  font-weight: 500;
}

.faq-card {
  background-color: #FFFFFF;
  border: 1px solid #E2EBED;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;

  .faq-header {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    gap: 10px;

    .icon-q {
      width: 24px;
      height: 24px;
      background-color: #E8F7F0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .q-text {
        font-size: 12px;
        font-weight: 600;
        color: #009666;
      }
    }

    .question {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: #1A2E35;
      line-height: 20px;
    }

    .arrow-container {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;

      .arrow-icon {
        width: 14px;
        height: 14px;
      }

      &.rotated {
        transform: rotate(90deg);
      }
    }
  }

  .faq-answer-container {
    transition: height 0.3s ease;
    overflow: hidden;
  }

  .faq-answer {
    padding: 0 16px 14px 50px; // 50px offset to align with text after Q icon

    .answer-text {
      font-size: 13px;
      line-height: 20px;
      color: #1A2E35;
      background-color: #F5F7F6;
      padding: 12px 14px;
      border-radius: 12px;
      display: block;
    }
  }
}

.feedback-grid {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.feedback-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #FFFFFF;
  border: 1px solid #E2EBED;
  border-radius: 16px;
  padding: 16px;
  gap: 8px;

  .icon-wrapper {
    width: 40px;
    height: 40px;
    background-color: #E8F7F0;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    .feedback-icon {
      width: 18px;
      height: 18px;
    }
  }

  .label {
    font-size: 13px;
    font-weight: 500;
    color: #1A2E35;
  }
}

</style>
