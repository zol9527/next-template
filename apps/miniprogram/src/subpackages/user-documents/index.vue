<template>
  <view class="container">
    <!-- 导航栏（右侧自定义：添加证件按钮） -->
    <NavBar title="我的证件">
      <template #right>
        <view class="add-btn" @tap="goToUpload">
          <text class="add-text">添加证件</text>
        </view>
      </template>
    </NavBar>

    <!-- Loading State -->
    <view class="loading-section" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Error State -->
    <view class="error-section" v-else-if="error">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="loadDocuments">
        <text>重试</text>
      </view>
    </view>

    <!-- Empty State -->
    <view class="empty-section" v-else-if="!hasDocuments">
      <!-- <view class="empty-icon">📋</view> -->
      <text class="empty-text">暂无证件</text>
      <text class="empty-desc">点击右上角添加您的证件信息</text>
      <view class="add-first-btn" @tap="goToUpload">
        <text>添加证件</text>
      </view>
    </view>

    <!-- Document Cards -->
    <view class="documents-section" v-else>
      <view v-for="docType in documentTypes" :key="docType.type" class="document-card" @tap="goToUpload(docType.type)">
        <view class="card-icon-wrapper">
          <text class="card-icon">{{ docType.icon }}</text>
        </view>

        <view class="card-content">
          <text class="card-name">{{ docType.name }}</text>
          <text class="card-status" :class="{ 'status-uploaded': hasDocumentType(docType.type) }">
            {{ hasDocumentType(docType.type) ? '已上传' : '未上传' }}
          </text>
        </view>

        <view class="card-action">
          <text class="action-text">{{ hasDocumentType(docType.type) ? '更换' : '上传' }}</text>
          <text class="action-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Already uploaded documents list -->
    <view class="uploaded-section" v-if="hasDocuments">
      <view class="section-title">已上传的证件</view>
      <view v-for="doc in documents" :key="doc.id" class="uploaded-card" @tap="goToPreview(doc)">
        <!-- <view class="uploaded-icon">📄</view> -->
        <view class="uploaded-content">
          <text class="uploaded-name">{{ doc.documentName || getDocumentTypeName(doc.documentType) }}</text>
          <text class="uploaded-date">{{ formatDate(doc.createdAt) }}</text>
        </view>
        <view class="uploaded-arrow">›</view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useUserDocumentsStore } from '@/stores'
import { DocumentType, DocumentTypeLabels } from '@/services/user-documents'
export default {
  setup() {
    const documentsStore = useUserDocumentsStore()

    const documentTypes = [
      { type: DocumentType.ID_CARD, name: '身份证', icon: '🪪' },
      { type: DocumentType.UNEMPLOYMENT_PROOF, name: '失业证明', icon: '📋' },
      { type: DocumentType.MEDICAL_INSURANCE, name: '医疗保险', icon: '💊' }
    ]

    const documents = computed(() => documentsStore.documents)
    const loading = computed(() => documentsStore.loading)
    const error = computed(() => documentsStore.error)
    const hasDocuments = computed(() => documentsStore.hasDocuments)

    onMounted(async () => {
      await loadDocuments()
    })

    onActivated(async () => {
      // Refresh documents when returning from upload page
      await loadDocuments()
    })

    const loadDocuments = async () => {
      await documentsStore.fetchDocuments()
    }

    const hasDocumentType = (type) => {
      return documents.value.some(doc => doc.documentType === type)
    }

    const getDocumentTypeName = (type) => {
      return DocumentTypeLabels[type] || '未知证件'
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const goToUpload = (documentType = '') => {
      const url = documentType
        ? `/subpackages/user-documents/upload?documentType=${documentType}`
        : '/subpackages/user-documents/upload'
      uni.navigateTo({ url })
    }

    const goToPreview = (doc) => {
      uni.navigateTo({
        url: `/subpackages/user-documents/preview?id=${doc.id}`
      })
    }

    return {
      documentsStore,
      documentTypes,
      documents,
      loading,
      error,
      hasDocuments,
      loadDocuments,
      hasDocumentType,
      getDocumentTypeName,
      formatDate,
      goToUpload,
      goToPreview,
    }
  },
}
</script>

<style lang="scss" scoped>

.container {
  padding: 0 30rpx 180rpx;
  min-height: 100vh;
  background-color: #F7F8FA;
  box-sizing: border-box;
}

/* 添加证件按钮（NavBar 右侧 slot） */
.add-btn {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #80CBC4 0%, #4DB6AC 100%);
  padding: 16rpx 24rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(77, 182, 172, 0.3);

  .add-text {
    font-size: 26rpx;
    font-weight: 600;
    color: #fff;
  }
}

/* Loading Section */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 6rpx solid #E0E0E0;
    border-top-color: #4DB6AC;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    margin-top: 20rpx;
    font-size: 26rpx;
    color: $plant-text-grey;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error Section */
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;

  .error-text {
    font-size: 28rpx;
    color: $plant-text-grey;
    margin-bottom: 30rpx;
  }

  .retry-btn {
    background-color: #fff;
    padding: 20rpx 50rpx;
    border-radius: 40rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

    text {
      font-size: 28rpx;
      font-weight: 600;
      color: #4DB6AC;
    }
  }
}

/* Empty Section */
.empty-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
  background-color: #fff;
  border-radius: 24rpx;
  margin-top: 20rpx;

  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 30rpx;
  }

  .empty-text {
    font-size: 32rpx;
    font-weight: 600;
    color: $plant-text-main;
    margin-bottom: 10rpx;
  }

  .empty-desc {
    font-size: 26rpx;
    color: $plant-text-grey;
    margin-bottom: 40rpx;
  }

  .add-first-btn {
    background: linear-gradient(135deg, #80CBC4 0%, #4DB6AC 100%);
    padding: 24rpx 60rpx;
    border-radius: 40rpx;
    box-shadow: 0 4rpx 16rpx rgba(77, 182, 172, 0.3);

    text {
      font-size: 28rpx;
      font-weight: 600;
      color: #fff;
    }
  }
}

/* Documents Section */
.documents-section {
  margin-top: 20rpx;
}

.document-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-icon-wrapper {
    width: 80rpx;
    height: 80rpx;
    background: linear-gradient(135deg, #80CBC4 0%, #4DB6AC 100%);
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;

    .card-icon {
      font-size: 40rpx;
    }
  }

  .card-content {
    flex: 1;

    .card-name {
      font-size: 30rpx;
      font-weight: 600;
      color: $plant-text-main;
      display: block;
    }

    .card-status {
      font-size: 24rpx;
      color: $plant-text-grey;
      margin-top: 4rpx;
      display: block;

      &.status-uploaded {
        color: $plant-secondary;
      }
    }
  }

  .card-action {
    display: flex;
    align-items: center;

    .action-text {
      font-size: 26rpx;
      color: #4DB6AC;
      margin-right: 8rpx;
    }

    .action-arrow {
      font-size: 32rpx;
      color: #ccc;
    }
  }
}

/* Uploaded Section */
.uploaded-section {
  margin-top: 40rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: $plant-text-main;
    margin-bottom: 20rpx;
    padding: 0 10rpx;
  }

  .uploaded-card {
    display: flex;
    align-items: center;
    background-color: #fff;
    border-radius: 24rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

    .uploaded-icon {
      font-size: 40rpx;
      margin-right: 20rpx;
    }

    .uploaded-content {
      flex: 1;

      .uploaded-name {
        font-size: 28rpx;
        font-weight: 500;
        color: $plant-text-main;
        display: block;
      }

      .uploaded-date {
        font-size: 24rpx;
        color: $plant-text-grey;
        margin-top: 4rpx;
        display: block;
      }
    }

    .uploaded-arrow {
      font-size: 32rpx;
      color: #ccc;
    }
  }
}
</style>
