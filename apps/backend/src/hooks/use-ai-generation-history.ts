'use client'

import * as React from 'react'

export interface AiGenerationRecord {
  id: string          // crypto.randomUUID()
  timestamp: number   // Date.now()
  prompt: string      // user's input prompt
  name?: string
  summary?: string
  description?: string
  priceAmount?: string
  coverUrl?: string
  coverAssetId?: string
}

const STORAGE_KEY = 'ai-generation-history'
const MAX_RECORDS = 50

/**
 * Function: useAiGenerationHistory
 * 
 * Description: 管理AI生成历史记录的React hook，使用localStorage持久化存储
 * 
 * Returns:
 *   - history: AiGenerationRecord[] - 历史记录数组
 *   - addRecord: (record: Omit<AiGenerationRecord, 'id' | 'timestamp'>) => void - 添加新记录
 *   - deleteRecord: (id: string) => void - 删除指定ID的记录
 *   - clearHistory: () => void - 清空所有历史记录
 *   - applyRecord: (record: AiGenerationRecord) => AiGenerationRecord - 应用记录（返回记录数据）
 */
export function useAiGenerationHistory() {
  const [history, setHistory] = React.useState<AiGenerationRecord[]>([])

  // 初始化时从localStorage读取历史记录
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AiGenerationRecord[]
        setHistory(parsed)
      }
    } catch (error) {
      console.error('Failed to read AI generation history from localStorage:', error)
      // 如果解析失败，清空可能损坏的数据
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // 保存历史记录到localStorage
  const saveToStorage = React.useCallback((records: AiGenerationRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (error) {
      console.error('Failed to save AI generation history to localStorage:', error)
    }
  }, [])

  // 添加记录
  const addRecord = React.useCallback((record: Omit<AiGenerationRecord, 'id' | 'timestamp'>) => {
    const newRecord: AiGenerationRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    setHistory(prev => {
      const updated = [newRecord, ...prev]
      // 限制最大记录数
      if (updated.length > MAX_RECORDS) {
        updated.length = MAX_RECORDS
      }
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // 删除记录
  const deleteRecord = React.useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(record => record.id !== id)
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // 清空历史
  const clearHistory = React.useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // 应用记录（返回记录数据，不修改表单状态）
  const applyRecord = React.useCallback((record: AiGenerationRecord): AiGenerationRecord => {
    return record
  }, [])

  return {
    history,
    addRecord,
    deleteRecord,
    clearHistory,
    applyRecord,
  }
}