import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { UserDocumentsService } from '../services/user-documents'
import { logger } from '../utils/logger'

export const useUserDocumentsStore = defineStore('userDocuments', () => {
  const documents = ref([])
  const loading = ref(false)
  const error = ref(null)

  const hasDocuments = computed(() => documents.value.length > 0)
  
  const documentsByType = computed(() => {
    const result = {}
    documents.value.forEach(doc => {
      if (!result[doc.documentType]) {
        result[doc.documentType] = []
      }
      result[doc.documentType].push(doc)
    })
    return result
  })

  async function fetchDocuments() {
    loading.value = true
    error.value = null
    
    try {
      const response = await UserDocumentsService.getDocuments()
      
      // httpClient 已解包 data，response 格式为 { documents: [] }
      const docs = response?.documents || response?.data?.documents || []
      documents.value = docs
      logger.info('获取证件列表成功', { count: documents.value.length })
    } catch (err) {
      logger.error('获取证件列表失败', err)
      error.value = '网络错误，请稍后再试'
    } finally {
      loading.value = false
    }
  }

  async function uploadDocument(formData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await UserDocumentsService.uploadDocument(formData)
      
      if (response.success) {
        // 上传成功后刷新文档列表
        await fetchDocuments()
        return response.data
      } else {
        const message = response.error?.message || '上传失败'
        error.value = message
        throw new Error(message)
      }
    } catch (err) {
      logger.error('上传证件失败', err)
      const message = err?.message || '网络错误，请稍后再试'
      error.value = message
      throw err instanceof Error ? err : new Error(message)
    } finally {
      loading.value = false
    }
  }

  async function deleteDocument(id) {
    loading.value = true
    error.value = null
    
    try {
      const response = await UserDocumentsService.deleteDocument(id)
      
      if (response.success) {
        const index = documents.value.findIndex(doc => doc.id === id)
        if (index !== -1) {
          documents.value.splice(index, 1)
        }
        
        uni.showToast({
          title: '删除成功',
          icon: 'success'
        })
      } else {
        error.value = response.error?.message || '删除失败'
      }
    } catch (err) {
      logger.error('删除证件失败', err)
      error.value = '网络错误，请稍后再试'
    } finally {
      loading.value = false
    }
  }

  return {
    documents,
    documentsByType,
    loading,
    error,
    hasDocuments,
    fetchDocuments,
    uploadDocument,
    deleteDocument
  }
})
