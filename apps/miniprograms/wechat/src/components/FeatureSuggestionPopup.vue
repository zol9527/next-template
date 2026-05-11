<template>
  <popup-sheet
    :model-value="modelValue"
    title="功能建议"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <view class="suggestion-form">
      <!-- 建议标题 -->
      <view class="form-item">
        <text class="form-label">建议标题</text>
        <view class="input-container">
          <input
            v-model="formData.title"
            class="form-input"
            placeholder="简要描述你的建议"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <!-- 详细描述 -->
      <view class="form-item">
        <text class="form-label">详细描述</text>
        <view class="textarea-container">
          <textarea
            v-model="formData.content"
            class="form-textarea"
            placeholder="请详细描述你希望新增或改进的功能..."
            placeholder-class="placeholder"
            maxlength="500"
          />
          <text class="char-count">{{ formData.content.length }}/500</text>
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
          提交建议
        </button>
      </view>
    </view>
  </popup-sheet>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import PopupSheet from '@/components/PopupSheet.vue'
import { feedbackService, FeedbackType } from '@/services/feedback'
import { showSuccess, showError } from '@/utils/toast'
import { getErrorMessage } from '@/utils/error-handler'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

/** 表单数据 */
const formData = reactive({
  title: '',
  content: ''
})

/** 提交状态 */
const submitting = ref(false)

/** 表单校验 */
const isFormValid = computed(() => {
  return formData.title.trim().length > 0 && formData.content.trim().length > 0
})

/** 处理提交 */
const handleSubmit = async () => {
  if (!isFormValid.value || submitting.value) return

  submitting.value = true
  try {
    const res = await feedbackService.submitFeedback({
      type: FeedbackType.SUGGESTION,
      title: formData.title.trim(),
      content: formData.content.trim()
    })

    if (res.success) {
      showSuccess('感谢您的建议')
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
  formData.title = ''
  formData.content = ''
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-tokens.scss';

.suggestion-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-20;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-8;
}

.form-label {
  font-family: map-get($typography-card-title, font-family);
  font-weight: map-get($typography-card-title, font-weight);
  font-size: map-get($typography-card-title, font-size);
  line-height: map-get($typography-card-title, line-height);
  color: $color-text-primary;
}

.input-container {
  background-color: $color-background;
  border: 1.5px solid $color-border;
  border-radius: $radius-20;
  padding: $spacing-10 $spacing-16;
}

.form-input {
  font-size: 14px;
  color: $color-text-primary;
  height: 24px;
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
  min-height: 120px;
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

.form-footer {
  margin-top: $spacing-12;
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
