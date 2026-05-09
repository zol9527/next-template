<template>
  <view class="page-container">
    <!-- Header — 使用 NavBar 组件 -->
    <NavBar title="证件预览">
      <template #right>
        <view class="header-actions" @tap="toggleActions">
          <text class="action-icon">⋮</text>
        </view>
      </template>
    </NavBar>

    <!-- Preview Area -->
    <view class="preview-stage" @tap="toggleActions">
      <image :src="documentUrl" mode="aspectFit" class="preview-img" v-if="document"></image>
      <view class="stage-placeholder" v-else>
        <view class="spinner"></view>
        <text class="placeholder-text">正在加载证件...</text>
      </view>
    </view>

    <!-- Info Card -->
    <view class="info-card-wrapper" v-if="document">
      <view class="info-card">
        <view class="info-header">
          <view class="info-icon-box">
            <text class="info-icon">📄</text>
          </view>
          <text class="info-name">{{ document.documentName || getDocumentTypeName(document.documentType) }}</text>
        </view>

        <view class="info-list">
          <view class="info-item">
            <text class="label">证件类型</text>
            <text class="value">{{ getDocumentTypeName(document.documentType) }}</text>
          </view>
          <view class="info-item">
            <text class="label">上传时间</text>
            <text class="value">{{ formatDate(document.createdAt) }}</text>
          </view>
          <view class="info-item">
            <text class="label">文件大小</text>
            <text class="value">{{ formatFileSize(document.fileSize) }}</text>
          </view>
        </view>
      </view>

      <!-- Bottom Actions -->
      <view class="bottom-btns">
        <view class="btn-group">
          <view class="secondary-btn" @tap="downloadDocument">
            <text class="btn-text">保存图片</text>
          </view>
          <view class="danger-btn" @tap="showDeleteConfirm">
            <text class="btn-text">删除证件</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Actions Popup (Native style) -->
    <view class="mask" v-if="showActions" @tap="closeActions"></view>
    <view class="popup-panel" :class="{ 'popup-show': showActions }">
      <view class="popup-header">
        <text class="popup-title">更多操作</text>
        <view class="popup-close" @tap="closeActions">
          <text class="close-icon">×</text>
        </view>
      </view>
      <view class="popup-content">
        <view class="action-row" @tap="downloadDocument">
          <view class="action-icon-box download"><text>↓</text></view>
          <text class="action-label">保存到相册</text>
        </view>
        <view class="action-row" @tap="showDeleteConfirm">
          <view class="action-icon-box delete"><text>×</text></view>
          <text class="action-label danger">彻底删除</text>
        </view>
      </view>
    </view>

    <!-- Global Loading -->
    <view class="loading-mask" v-if="loading">
      <view class="loading-box">
        <view class="spinner"></view>
        <text class="loading-msg">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserDocumentsStore } from '@/stores'
import { UserDocumentsService, DocumentTypeLabels } from '@/services/user-documents'
import { showSuccess, showError, showConfirm } from '@/utils/toast'
import { useSafeArea } from '@/hooks/useSafeArea'

const safeArea = useSafeArea()
const documentsStore = useUserDocumentsStore()

interface DocumentInfo {
  id: string
  documentName?: string
  documentType?: string
  createdAt?: string
  fileSize?: number
}

const documentId = ref('')
const document = ref<DocumentInfo | null>(null)
const documentUrl = ref('')
const showActions = ref(false)
const loading = ref(false)
const loadingText = ref('')

const getPageOptions = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> }
  return (currentPage?.options || {}) as Record<string, string>
}

onMounted(async () => {
  const options = getPageOptions()
  if (options.id) {
    documentId.value = options.id
  }

  if (!documentId.value) {
    showError('缺少文档ID')
    setTimeout(() => goBack(), 1500)
    return
  }

  await loadDocument()
})

const loadDocument = async () => {
  loading.value = true
  loadingText.value = '加载中...'

  try {
    const docs = documentsStore.documents as DocumentInfo[]
    let found = docs.find(doc => doc.id === documentId.value)

    if (!found) {
      await documentsStore.fetchDocuments()
      found = (documentsStore.documents as DocumentInfo[]).find(doc => doc.id === documentId.value)
    }

    if (found) {
      document.value = found
      try {
        documentUrl.value = await UserDocumentsService.downloadDocumentFile(documentId.value)
      } catch (downloadErr) {
        console.error('Failed to download document file:', downloadErr)
        documentUrl.value = UserDocumentsService.getDocumentFileUrl(documentId.value)
      }
    } else {
      showError('文档不存在')
      setTimeout(() => goBack(), 1500)
    }
  } catch (err) {
    console.error('Failed to load document:', err)
    showError('加载文档失败')
  } finally {
    loading.value = false
  }
}

const getDocumentTypeName = (type?: string) => {
  return (type && DocumentTypeLabels[type]) || '未知证件'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const toggleActions = () => {
  showActions.value = !showActions.value
}

const closeActions = () => {
  showActions.value = false
}

const goBack = () => {
  uni.navigateBack()
}

const downloadDocument = () => {
  closeActions()
  if (!documentUrl.value) return

  uni.downloadFile({
    url: documentUrl.value,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            showSuccess('保存成功')
          },
          fail: (err) => {
            console.error('Save to album failed:', err)
            uni.openDocument({
              filePath: res.tempFilePath,
              showMenu: true,
              fail: () => {
                showError('下载失败，请稍后重试')
              }
            })
          }
        })
      } else {
        showError('下载失败')
      }
    },
    fail: (err) => {
      console.error('Download failed:', err)
      showError('下载失败，请稍后重试')
    }
  })
}

const showDeleteConfirm = async () => {
  closeActions()

  const confirmed = await showConfirm('确定要删除这个证件吗？删除后无法恢复')
  if (confirmed) {
    await deleteDocument()
  }
}

const deleteDocument = async () => {
  if (!documentId.value) return

  loading.value = true
  loadingText.value = '删除中...'

  try {
    await documentsStore.deleteDocument(documentId.value)
    showSuccess('已删除')
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (err) {
    console.error('Delete failed:', err)
    showError('删除失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/design-tokens.scss";

.page-container {
  min-height: 100vh;
  background-color: #000; // 预览页面背景深色更好看，但指示要求 F5F7F6
  background-color: $color-background;
  display: flex;
  flex-direction: column;
}

/* NavBar slot styles */
.header-actions {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .action-icon {
    font-size: 40rpx;
    color: $color-text-primary;
  }
}

/* Preview Stage */
.preview-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-20;
  background-color: #000; // 证件展示区保持深色背景突出证件

  .preview-img {
    width: 100%;
    height: 100%;
  }

  .stage-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;

    .spinner {
      width: 60rpx;
      height: 60rpx;
      border: 6rpx solid rgba(255, 255, 255, 0.1);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: $spacing-16;
    }

    .placeholder-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    }
  }
}

/* Info Card */
.info-card-wrapper {
  background-color: $color-surface;
  border-radius: $radius-20 $radius-20 0 0;
  padding: $spacing-24 $spacing-20;
  padding-bottom: calc($spacing-24 + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-card {
  margin-bottom: $spacing-32;

  .info-header {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-20;

    .info-icon-box {
      width: 72rpx;
      height: 72rpx;
      background-color: $color-primary-light;
      border-radius: $radius-12;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: $spacing-12;

      .info-icon {
        font-size: 32rpx;
      }
    }

    .info-name {
      font-size: 16px;
      font-weight: 600;
      color: $color-text-primary;
    }
  }

  .info-list {
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-12 0;
      border-bottom: 1px solid $color-border;

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-size: 13px;
        color: $color-text-muted;
      }

      .value {
        font-size: 13px;
        font-weight: 500;
        color: $color-text-primary;
      }
    }
  }
}

/* Bottom Btns */
.bottom-btns {
  .btn-group {
    display: flex;
    gap: $spacing-12;

    .secondary-btn, .danger-btn {
      flex: 1;
      height: 88rpx;
      border-radius: $radius-20;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      .btn-text {
        font-size: 14px;
        font-weight: 600;
      }
    }

    .secondary-btn {
      background-color: $color-primary-light;
      .btn-text { color: $color-primary; }
    }

    .danger-btn {
      background-color: #FFF0F0;
      border: 1px solid #FFE2E2;
      .btn-text { color: #ff4d4f; }
    }
  }
}

/* Popup Panel */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.popup-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: $color-surface;
  border-radius: $radius-20 $radius-20 0 0;
  padding: $spacing-24;
  padding-bottom: calc($spacing-24 + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  z-index: 201;

  &.popup-show {
    transform: translateY(0);
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-24;

    .popup-title {
      font-size: 15px;
      font-weight: 600;
      color: $color-text-primary;
    }

    .popup-close {
      width: 48rpx;
      height: 48rpx;
      background-color: $color-background;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      .close-icon { font-size: 32rpx; color: $color-text-muted; }
    }
  }

  .popup-content {
    .action-row {
      display: flex;
      align-items: center;
      padding: $spacing-16 0;
      border-bottom: 1px solid $color-border;

      &:active { opacity: 0.7; }
      &:last-child { border-bottom: none; }

      .action-icon-box {
        width: 64rpx;
        height: 64rpx;
        border-radius: $radius-12;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: $spacing-16;
        font-weight: bold;

        &.download { background-color: $color-primary-light; color: $color-primary; }
        &.delete { background-color: #FFF0F0; color: #ff4d4f; }
      }

      .action-label {
        font-size: 14px;
        color: $color-text-primary;
        &.danger { color: #ff4d4f; }
      }
    }
  }
}

/* Loading mask */
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
