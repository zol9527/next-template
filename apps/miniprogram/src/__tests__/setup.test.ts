import { describe, it, expect, beforeEach } from 'vitest'
import { getNavigationLogs, getToastLogs, clearLogs, clearStorage } from './mocks/uni'

describe('uni API Mock', () => {
  beforeEach(() => {
    clearLogs()
    clearStorage()
  })

  describe('系统信息', () => {
    it('getSystemInfoSync 应该返回正确的设备信息', () => {
      const systemInfo = uni.getSystemInfoSync()

      expect(systemInfo).toBeDefined()
      expect(systemInfo.statusBarHeight).toBe(44)
      expect(systemInfo.windowWidth).toBe(375)
      expect(systemInfo.windowHeight).toBe(812)
      expect(systemInfo.safeArea).toBeDefined()
      expect(systemInfo.safeArea.top).toBe(44)
      expect(systemInfo.safeArea.bottom).toBe(812)
    })

    it('getSystemInfo 应该调用 success 回调', () => {
      let successCalled = false
      let receivedInfo: any

      uni.getSystemInfo({
        success: (res) => {
          successCalled = true
          receivedInfo = res
        },
        complete: () => {},
      })

      expect(successCalled).toBe(true)
      expect(receivedInfo.windowWidth).toBe(375)
    })
  })

  describe('本地存储', () => {
    it('setStorageSync 和 getStorageSync 应该正常工作', () => {
      uni.setStorageSync('testKey', 'testValue')
      const value = uni.getStorageSync('testKey')

      expect(value).toBe('testValue')
    })

    it('setStorageSync 应该支持对象存储', () => {
      const testObject = { name: 'test', count: 42 }
      uni.setStorageSync('objectKey', testObject)
      const value = uni.getStorageSync('objectKey')

      expect(value).toEqual(testObject)
    })

    it('removeStorageSync 应该删除存储的值', () => {
      uni.setStorageSync('deleteKey', 'deleteValue')
      expect(uni.getStorageSync('deleteKey')).toBe('deleteValue')

      uni.removeStorageSync('deleteKey')
      expect(uni.getStorageSync('deleteKey')).toBe('')
    })

    it('getStorageSync 应该返回空字符串当键不存在时', () => {
      const value = uni.getStorageSync('nonExistentKey')
      expect(value).toBe('')
    })
  })

  describe('导航', () => {
    it('navigateTo 应该记录导航日志', () => {
      uni.navigateTo({
        url: '/pages/test/test',
        success: () => {},
        complete: () => {},
      })

      const logs = getNavigationLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('navigateTo: /pages/test/test')
    })

    it('redirectTo 应该记录导航日志', () => {
      uni.redirectTo({
        url: '/pages/home/home',
        success: () => {},
        complete: () => {},
      })

      const logs = getNavigationLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('redirectTo: /pages/home/home')
    })

    it('switchTab 应该记录导航日志', () => {
      uni.switchTab({
        url: '/pages/index/index',
        success: () => {},
        complete: () => {},
      })

      const logs = getNavigationLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('switchTab: /pages/index/index')
    })

    it('navigateBack 应该记录导航日志（默认 delta=1）', () => {
      uni.navigateBack({
        success: () => {},
        complete: () => {},
      })

      const logs = getNavigationLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('navigateBack: delta=1')
    })

    it('navigateBack 应该记录自定义 delta', () => {
      uni.navigateBack({
        delta: 2,
        success: () => {},
        complete: () => {},
      })

      const logs = getNavigationLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('navigateBack: delta=2')
    })
  })

  describe('提示和加载', () => {
    it('showToast 应该记录提示日志', () => {
      uni.showToast({
        title: '操作成功',
        icon: 'success',
        success: () => {},
        complete: () => {},
      })

      const logs = getToastLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toBe('showToast: 操作成功')
    })

    it('showLoading 和 hideLoading 应该记录日志', () => {
      uni.showLoading({ title: '加载中' })
      uni.hideLoading()

      const logs = getToastLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0]).toBe('showLoading: 加载中')
      expect(logs[1]).toBe('hideLoading')
    })
  })

  describe('模态框', () => {
    it('showModal 应该返回 confirm: true', async () => {
      let result: any

      uni.showModal({
        title: '提示',
        content: '确定要删除吗？',
        success: (res) => {
          result = res
        },
        complete: () => {},
      })

      expect(result).toBeDefined()
      expect(result.confirm).toBe(true)
      expect(result.cancel).toBe(false)
    })
  })

  describe('菜单按钮位置', () => {
    it('getMenuButtonBoundingClientRect 应该返回正确的位置信息', () => {
      const buttonRect = uni.getMenuButtonBoundingClientRect()

      expect(buttonRect).toBeDefined()
      expect(buttonRect.width).toBe(87)
      expect(buttonRect.height).toBe(32)
      expect(buttonRect.top).toBe(8)
      expect(buttonRect.right).toBe(8)
    })
  })

  describe('网络请求', () => {
    it('request 应该模拟成功响应', (done) => {
      uni.request({
        url: 'https://api.example.com/test',
        method: 'GET',
        success: (res) => {
          expect(res.statusCode).toBe(200)
          expect(res.data).toBeDefined()
          done()
        },
        fail: () => {
          done(new Error('Request should succeed'))
        },
        complete: () => {},
      })
    })
  })
})
