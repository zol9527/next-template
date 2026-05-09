<template>
  <view class="page-container">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar title="上传证件" />

    <!-- Content -->
    <scroll-view scroll-y class="content-scroll">
      <view class="content-wrapper">
        <!-- Already uploaded warning -->
        <view class="warning-card" v-if="existingDocument">
          <view class="warning-content">
            <text class="warning-title">已存在证件</text>
            <text class="warning-desc">您已上传过{{ getDocumentTypeName(formData.documentType) }}，上传新文件将覆盖原有证件</text>
          </view>
        </view>

        <!-- Form Card -->
        <view class="form-card">
          <!-- Document Type Picker -->
          <view class="form-item">
            <text class="form-label">证件类型 <text class="required">*</text></text>
            <picker :value="selectedTypeIndex" :range="documentTypeOptions" range-key="name" @change="onTypeChange">
              <view class="picker-field" :class="{ 'placeholder': !formData.documentType }">
                <text>{{ selectedTypeName || '请选择证件类型' }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- Custom Name Input -->
          <view class="form-item">
            <text class="form-label">自定义名称</text>
            <input 
              class="input-field" 
              type="text" 
              v-model="formData.documentName" 
              placeholder="如：我的身份证"
              placeholder-class="input-placeholder" 
            />
          </view>

          <!-- Image Upload Area -->
          <view class="form-item">
            <text class="form-label">证件图片 <text class="required">*</text></text>
            <view class="upload-area" @tap="chooseImage">
              <view v-if="!previewUrl" class="upload-placeholder">
                <text class="upload-icon-text">+</text>
                <text class="upload-text">点击选择图片</text>
                <text class="upload-hint">支持 jpg、png 格式</text>
              </view>
              <image v-else :src="previewUrl" mode="aspectFit" class="preview-image"></image>
              <view v-if="previewUrl" class="remove-badge" @tap.stop="removeImage">
                <text class="remove-icon">×</text>
              </view>
            </view>
          </view>

          <!-- File Info -->
          <view class="file-info-bar" v-if="selectedFile">
            <view class="file-details">
              <text class="file-name">{{ selectedFile.name }}</text>
              <text class="file-size">{{ formatFileSize(selectedFile.size) }}</text>
            </view>
            <view class="remove-text-btn" @tap="removeImage">
              <text>移除</text>
            </view>
          </view>
        </view>

        <!-- Submit Button -->
        <view class="submit-container">
          <view 
            class="primary-pill-btn" 
            :class="{ 'btn-disabled': !canSubmit || uploading }" 
            @tap="handleSubmit"
          >
            <text class="btn-text">{{ uploading ? '正在上传...' : (existingDocument ? '确认更换' : '立即上传') }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Loading Overlay -->
    <view class="loading-mask" v-if="uploading">
      <view class="loading-box">
        <view class="spinner"></view>
        <text class="loading-msg">正在努力上传...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserDocumentsStore } from '@/stores'
import { DocumentType, DocumentTypeLabels } from '@/services/user-documents'
import { showSuccess, showError } from '@/utils/toast'
import { useSafeArea } from '@/hooks/useSafeArea'

const safeArea = useSafeArea()
const documentsStore = useUserDocumentsStore()

const documentTypeOptions = [
  { type: DocumentType.ID_CARD, name: '身份证' },
  { type: DocumentType.UNEMPLOYMENT_PROOF, name: '失业证明' },
  { type: DocumentType.MEDICAL_INSURANCE, name: '医疗保险' }
]

const formData = ref({
  documentType: '',
  documentName: ''
})

interface SelectedFile {
  path: string
  name: string
  size: number
}

interface DocumentInfo {
  id: string
  documentType?: string
}

const selectedFile = ref<SelectedFile | null>(null)
const previewUrl = ref('')
const uploading = ref(false)
const existingDocument = ref<DocumentInfo | null>(null)

const selectedTypeIndex = computed(() => {
  return documentTypeOptions.findIndex(opt => opt.type === formData.value.documentType)
})

const selectedTypeName = computed(() => {
  if (!formData.value.documentType) return ''
  const option = documentTypeOptions.find(opt => opt.type === formData.value.documentType)
  return option ? option.name : ''
})

const canSubmit = computed(() => {
  return !!(formData.value.documentType && selectedFile.value)
})

const getPageOptions = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> }
  return (currentPage?.options || {}) as Record<string, string>
}

onMounted(async () => {
  const options = getPageOptions()
  if (options.documentType) {
    formData.value.documentType = options.documentType
  }

  // Check if document already exists
  await checkExistingDocument()
})

const checkExistingDocument = async () => {
  if (formData.value.documentType) {
    const docs = documentsStore.documents as DocumentInfo[]
    const existing = docs.find(doc => doc.documentType === formData.value.documentType)
    if (existing) {
      existingDocument.value = existing
    }
  }
}

const onTypeChange = (e: any) => {
  const index = parseInt(e.detail.value)
  formData.value.documentType = documentTypeOptions[index].type
  formData.value.documentName = ''
  existingDocument.value = null

  // Check for existing document when type changes
  const docs = documentsStore.documents as DocumentInfo[]
  const existing = docs.find(doc => doc.documentType === formData.value.documentType)
  if (existing) {
    existingDocument.value = existing
  }
}

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      const tempFiles = res.tempFiles as any[]
      const tempFile = tempFiles?.[0]

      selectedFile.value = {
        path: tempFilePath,
        name: tempFile?.name || 'image.jpg',
        size: tempFile?.size || 0
      }
      previewUrl.value = tempFilePath
    },
    fail: (err) => {
      console.error('Choose image failed:', err)
      if (err.errMsg.indexOf('cancel') === -1) {
        showError('选择图片失败')
      }
    }
  })
}

const removeImage = () => {
  selectedFile.value = null
  previewUrl.value = ''
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDocumentTypeName = (type: string) => {
  return DocumentTypeLabels[type] || '未知证件'
}

const goBack = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!canSubmit.value || uploading.value || !selectedFile.value) return

  uploading.value = true

  try {
    await documentsStore.uploadDocument({
      file: selectedFile.value.path,
      documentType: formData.value.documentType,
      documentName: formData.value.documentName || getDocumentTypeName(formData.value.documentType)
    })

    showSuccess(existingDocument.value ? '更换成功' : '上传成功')
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (err: any) {
    console.error('Upload failed:', err)
    const message = err.message || '上传失败，请重试'
    showError(message)
  } finally {
    uploading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.page-container {
  min-height: 100vh;
  background-color: $color-background;
  display: flex;
  flex-direction: column;
}

/* Content */
.content-scroll {
  flex: 1;
}

.content-wrapper {
  padding: $spacing-20;
}

/* Warning Card */
.warning-card {
  background-color: $color-warm-bg;
  border-radius: $radius-16;
  padding: $spacing-16;
  margin-bottom: $spacing-20;
  border: 1px solid rgba($color-accent, 0.2);

  .warning-content {
    .warning-title {
      font-size: 14px;
      font-weight: 600;
      color: $color-accent;
      margin-bottom: $spacing-4;
      display: block;
    }

    .warning-desc {
      font-size: 12px;
      color: $color-text-muted;
      line-height: 1.6;
    }
  }
}

/* Form Card */
.form-card {
  background-color: $color-surface;
  border-radius: $radius-16;
  padding: $spacing-20;
  border: 1px solid $color-border;
}

.form-item {
  margin-bottom: $spacing-24;

  &:last-child {
    margin-bottom: 0;
  }

  .form-label {
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-12;
    display: block;

    .required {
      color: #ff4d4f;
      margin-left: $spacing-4;
    }
  }

  .picker-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: $color-background;
    border-radius: $radius-12;
    padding: $spacing-12 $spacing-16;
    font-size: 13px;
    color: $color-text-primary;
    border: 1px solid transparent;

    &.placeholder {
      color: $color-text-muted;
    }

    .picker-arrow {
      font-size: 18px;
      color: $color-text-muted;
    }
  }

  .input-field {
    background-color: $color-background;
    border-radius: $radius-12;
    padding: $spacing-12 $spacing-16;
    font-size: 13px;
    color: $color-text-primary;
    height: 80rpx;
  }

  .input-placeholder {
    color: $color-text-muted;
  }
}

/* Upload Area */
.upload-area {
  position: relative;
  background-color: $color-background;
  border: 2rpx dashed $color-border;
  border-radius: $radius-16;
  height: 320rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;

    .upload-icon-text {
      font-size: 60rpx;
      color: $color-text-muted;
      margin-bottom: $spacing-8;
    }

    .upload-text {
      font-size: 13px;
      font-weight: 500;
      color: $color-text-primary;
      margin-bottom: $spacing-4;
    }

    .upload-hint {
      font-size: 11px;
      color: $color-text-muted;
    }
  }

  .preview-image {
    width: 100%;
    height: 100%;
  }

  .remove-badge {
    position: absolute;
    top: $spacing-12;
    right: $spacing-12;
    width: 44rpx;
    height: 44rpx;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .remove-icon {
      font-size: 28rpx;
      color: #fff;
    }
  }
}

/* File Info Bar */
.file-info-bar {
  display: flex;
  align-items: center;
  background-color: $color-primary-light;
  border-radius: $radius-12;
  padding: $spacing-12;
  margin-top: $spacing-12;

  .file-details {
    flex: 1;
    overflow: hidden;

    .file-name {
      font-size: 12px;
      font-weight: 500;
      color: $color-text-primary;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 11px;
      color: $color-text-muted;
      margin-top: $spacing-2;
      display: block;
    }
  }

  .remove-text-btn {
    padding: $spacing-8;

    text {
      font-size: 12px;
      color: #ff4d4f;
      font-weight: 500;
    }
  }
}

/* Submit Section */
.submit-container {
  margin-top: $spacing-32;
  padding: 0 $spacing-8;
}

.primary-pill-btn {
  height: 88rpx;
  background-color: $color-primary;
  border-radius: $radius-20;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &.btn-disabled {
    background-color: $color-border;
    opacity: 0.7;
  }

  .btn-text {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
}

/* Loading Mask */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .loading-box {
    background-color: $color-surface;
    border-radius: $radius-16;
    padding: $spacing-32 $spacing-24;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 280rpx;

    .spinner {
      width: 50rpx;
      height: 50rpx;
      border: 4rpx solid $color-border;
      border-top-color: $color-primary;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: $spacing-16;
    }

    .loading-msg {
      font-size: 12px;
      color: $color-text-primary;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
