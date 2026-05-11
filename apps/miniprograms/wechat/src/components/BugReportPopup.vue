<template>
  <popup-sheet
    :model-value="modelValue"
    title="问题反馈"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <view class="bug-form">
      <!-- 问题类型 -->
      <view class="form-item">
        <text class="form-label">问题类型</text>
        <view class="type-tags">
          <view
            v-for="type in bugTypes"
            :key="type.value"
            class="type-tag"
            :class="{ active: formData.type === type.value }"
            @tap="formData.type = type.value"
          >
            {{ type.label }}
          </view>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="form-item">
        <text class="form-label">问题描述</text>
        <view class="textarea-container">
          <textarea
            v-model="formData.content"
            class="form-textarea"
            placeholder="请描述遇到的问题，包括操作步骤和现象..."
            placeholder-class="placeholder"
            maxlength="500"
          />
          <text class="char-count">{{ formData.content.length }}/500</text>
        </view>
      </view>

      <!-- 上传截图 -->
      <view class="form-item">
        <text class="form-label">上传截图（选填）</text>
        <view class="upload-area">
          <view
            v-for="(img, index) in formData.images"
            :key="index"
            class="upload-item"
          >
            <image :src="img" mode="aspectFill" class="preview-img" @tap="previewImage(index)" />
            <view class="remove-btn" @tap.stop="removeImage(index)">×</view>
          </view>
          <view
            v-if="formData.images.length < 3"
            class="upload-btn"
            @tap="handleUpload"
          >
            <text class="plus-icon">+</text>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="form-footer">
        <button
          class="submit-btn"
          :loading="submitting"
          :disabled="!isFormValid || submitting"
          @tap="handleSubmit"
        >
          提交反馈
        </button>
      </view>
    </view>
  </popup-sheet>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import PopupSheet from '@/components/PopupSheet.vue'
import { feedbackService, FeedbackType } from '@/services/feedback'
import { showSuccess, showError, showLoading, hideLoading } from '@/utils/toast'
import { getErrorMessage } from '@/utils/error-handler'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

/** 问题类型选项 */
const bugTypes = [
  { label: '功能异常', value: 'playback' },
  { label: '界面问题', value: 'ui' },
  { label: '支付异常', value: 'payment' },
  { label: '其他', value: 'other' }
]

/** 表单数据 */
const formData = reactive({
  type: 'playback',
  content: '',
  images: [] as string[]
})

/** 提交状态 */
const submitting = ref(false)

/** 表单校验 */
const isFormValid = computed(() => {
  return formData.content.trim().length > 0
})

/** 处理上传 */
const handleUpload = () => {
  uni.chooseImage({
    count: 3 - formData.images.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 实际项目中这里应该调用上传接口
      // 现在直接模拟添加本地路径
      formData.images.push(...res.tempFilePaths)
    }
  })
}

/** 预览图片 */
const previewImage = (index: number) => {
  uni.previewImage({
    current: formData.images[index],
    urls: formData.images
  })
}

/** 移除图片 */
const removeImage = (index: number) => {
  formData.images.splice(index, 1)
}

/** 处理提交 */
const handleSubmit = async () => {
  if (!isFormValid.value || submitting.value) return

  submitting.value = true
  try {
    const res = await feedbackService.submitFeedback({
      type: FeedbackType.BUG,
      title: `[${formData.type}] 问题反馈`,
      content: formData.content.trim(),
      images: formData.images
    })

    if (res.success) {
      showSuccess('感谢您的反馈')
      resetForm()
      emit('update:modelValue', false)
      emit('success')
    }
  } catch (error) {
    showError(getErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.type = 'playback'
  formData.content = ''
  formData.images = []
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.bug-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-20;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-12;
}

.form-label {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  line-height: map-get($typography-card-title, line-height);
  color: $color-text-primary;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-12;
}

.type-tag {
  padding: $spacing-6 $spacing-16;
  border-radius: $radius-20;
  font-size: 13px;
  background-color: $color-background;
  color: $color-text-muted;
  border: 1px solid $color-border;
  transition: all 0.2s ease;

  &.active {
    background-color: $color-primary;
    color: $color-surface;
    border-color: $color-primary;
    font-weight: 600;
  }
}

.textarea-container {
  background-color: $color-background;
  border: 1.5px solid $color-border;
  border-radius: $radius-16;
  padding: $spacing-12 $spacing-16;
  position: relative;
}

.form-textarea {
  width: 100%;
  min-height: 100px;
  font-size: 14px;
  color: $color-text-primary;
  line-height: 1.5;
}

.placeholder {
  color: $color-text-muted;
  font-size: 14px;
}

.char-count {
  position: absolute;
  right: $spacing-16;
  bottom: $spacing-12;
  font-size: 12px;
  color: $color-text-muted;
}

.upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-12;
}

.upload-item {
  width: 72px;
  height: 72px;
  border-radius: $radius-12;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 100%;
  border-radius: $radius-12;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background-color: rgba(0, 0, 0, 0.5);
  color: $color-surface;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}

.upload-btn {
  width: 72px;
  height: 72px;
  border-radius: $radius-12;
  border: 1.5px dashed $color-border;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-background;
}

.plus-icon {
  font-size: 24px;
  color: $color-text-muted;
}

.form-footer {
  margin-top: $spacing-4;
  padding-bottom: $spacing-20;
}

.submit-btn {
  background-color: $color-primary;
  color: $color-surface;
  border-radius: $radius-20;
  font-size: 16px;
  font-weight: 600;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &:after {
    border: none;
  }

  &[disabled] {
    opacity: 0.6;
    background-color: $color-text-muted;
  }
}
</style>
