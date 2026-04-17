/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 保存原始环境变量
const originalLogDir = process.env.LOG_DIR

/**
 * 单元测试: LevelManager
 *
 * Description: 测试日志级别管理器的核心功能
 */
describe('LevelManager', () => {
  // 在测试前先清除模块缓存
  beforeEach(async () => {
    vi.resetModules()
  })

  afterEach(() => {
    // 恢复环境变量
    if (originalLogDir === undefined) {
      delete process.env.LOG_DIR
    } else {
      process.env.LOG_DIR = originalLogDir
    }
  })

  describe('getLogLevel', () => {
    /**
     * Function: getLogLevel
     *
     * Description: 获取当前运行时日志级别
     *
     * Parameters: 无
     *
     * Returns:
     *   level(LogLevel): 当前日志级别
     */
    it('MGR-001: 应该返回有效的日志级别', async () => {
      const { getLogLevel } = await import('@/lib/logger/level-manager')
      const level = getLogLevel()

      expect(level).toBeDefined()
      expect(['debug', 'info', 'warn', 'error']).toContain(level)
    })
  })

  describe('setLogLevel', () => {
    /**
     * Function: setLogLevel
     *
     * Description: 动态设置运行时日志级别
     *
     * Parameters:
     *   level(LogLevel): 新的日志级别
     *
     * Returns:
     *   previousLevel(LogLevel): 变更前的日志级别
     */
    it('MGR-002: 应该返回变更前的级别', async () => {
      const { setLogLevel } = await import('@/lib/logger/level-manager')

      // 设置一个已知级别
      setLogLevel('info')
      const previousLevel = setLogLevel('debug')

      expect(previousLevel).toBe('info')
    })

    it('MGR-003: 设置后级别应立即生效', async () => {
      const { setLogLevel, getLogLevel } = await import('@/lib/logger/level-manager')

      setLogLevel('warn')
      const currentLevel = getLogLevel()

      expect(currentLevel).toBe('warn')
    })

    it('MGR-004: 应该更新 pino logger 实例的级别', async () => {
      const { setLogLevel } = await import('@/lib/logger/level-manager')
      const { logger } = await import('@/lib/logger')

      setLogLevel('error')

      // 验证 pino logger 的级别也被更新
      expect(logger.level).toBe('error')
    })
  })

  describe('onLogLevelChange', () => {
    /**
     * Function: onLogLevelChange
     *
     * Description: 注册日志级别变更监听器
     *
     * Parameters:
     *   listener(LogLevelChangeListener): 监听器函数
     *
     * Returns:
     *   unsubscribe(() => void): 取消订阅函数
     */
    it('MGR-005: 级别变更时应该触发监听器', async () => {
      const { setLogLevel, onLogLevelChange } = await import('@/lib/logger/level-manager')

      const listener = vi.fn()
      onLogLevelChange(listener)

      setLogLevel('debug')

      expect(listener).toHaveBeenCalledWith('debug', expect.any(String))
    })

    it('MGR-006: 多个监听器都应该被触发', async () => {
      const { setLogLevel, onLogLevelChange } = await import('@/lib/logger/level-manager')

      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      onLogLevelChange(listener1)
      onLogLevelChange(listener2)
      onLogLevelChange(listener3)

      setLogLevel('warn')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()
    })

    it('MGR-007: 取消订阅后不应再触发', async () => {
      const { setLogLevel, onLogLevelChange } = await import('@/lib/logger/level-manager')

      const listener = vi.fn()
      const unsubscribe = onLogLevelChange(listener)

      // 取消订阅
      unsubscribe()

      setLogLevel('error')

      expect(listener).not.toHaveBeenCalled()
    })

    it('MGR-008: 监听器抛错不应影响主流程', async () => {
      const { setLogLevel, onLogLevelChange } = await import('@/lib/logger/level-manager')

      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()

      onLogLevelChange(errorListener)
      onLogLevelChange(normalListener)

      // 不应该抛出错误
      expect(() => setLogLevel('debug')).not.toThrow()

      // 正常监听器仍应被调用
      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('getLogConfig', () => {
    /**
     * Function: getLogConfig
     *
     * Description: 获取日志系统配置信息
     *
     * Parameters: 无
     *
     * Returns:
     *   config(object): 包含 logDir 等配置信息
     */
    it('MGR-009: 应该返回包含 logDir 的配置对象', async () => {
      const { getLogConfig } = await import('@/lib/logger/level-manager')

      const config = getLogConfig()

      expect(config).toBeDefined()
      expect(config.logDir).toBeDefined()
      expect(typeof config.logDir).toBe('string')
    })

    it('MGR-010: 应该优先使用 LOG_DIR 环境变量', async () => {
      // 设置环境变量
      process.env.LOG_DIR = '/custom/log/path'

      // 重置模块以读取新的环境变量
      vi.resetModules()
      const { getLogConfig } = await import('@/lib/logger/level-manager')

      const config = getLogConfig()

      expect(config.logDir).toBe('/custom/log/path')
    })

    it('应该使用默认值当 LOG_DIR 未设置', async () => {
      delete process.env.LOG_DIR

      vi.resetModules()
      const { getLogConfig } = await import('@/lib/logger/level-manager')

      const config = getLogConfig()

      expect(config.logDir).toBe('./logs')
    })
  })
})
