/**
 * Unit: 插件激活状态管理服务测试
 *
 * Description: 测试 createPluginActivateService 的核心功能，包括
 *   getActivationStatus (cache → DB → default 三级回退)、
 *   setActivationStatus (写入 DB + 失效缓存)、
 *   getAllActivationStatuses 和 isPluginActive
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPluginActivateService } from '@/plugins/plugin-activate.service'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { PluginName } from '@/plugins/plugin-definitions'

// ---------------------------------------------------------------------------
// Mock: memoryCache — 可控的 get/set/invalidate
// ---------------------------------------------------------------------------
vi.mock('@/lib/cache/memory-cache', () => ({
  memoryCache: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
  },
  CACHE_TTL: { FEATURE_FLAG: 60_000 },
}))

// ---------------------------------------------------------------------------
// Mock: plugin-definitions — 提供可控的 PLUGIN_DEFINITIONS 和 getInstalledPlugins
// ---------------------------------------------------------------------------
vi.mock('@/plugins/plugin-definitions', () => ({
  PLUGIN_DEFINITIONS: {
    wechat: { name: 'wechat', defaultActive: true, envKey: 'PLUGIN_WECHAT' },
    ecommerce: { name: 'ecommerce', defaultActive: true, envKey: 'PLUGIN_ECOMMERCE' },
    promotion: { name: 'promotion', defaultActive: true, envKey: 'PLUGIN_PROMOTION' },
  },
  ALL_PLUGIN_NAMES: ['wechat', 'ecommerce', 'promotion'],
  getInstalledPlugins: vi.fn().mockReturnValue(['wechat']),
}))

// 导入 mock 后的模块以获取引用
import { memoryCache } from '@/lib/cache/memory-cache'

// ---------------------------------------------------------------------------
// 共享 mock 对象
// ---------------------------------------------------------------------------

/** 模拟 logger */
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
}

/** 模拟 ServiceContext */
const mockCtx: ServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger as unknown as ServiceContext['logger'],
}

/** 创建模拟 SystemSettingsRepository */
function createMockSystemSettingsRepository(
  overrides?: Partial<SystemSettingsRepository>,
): SystemSettingsRepository {
  return {
    getSetting: vi.fn().mockResolvedValue(null),
    updateSetting: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 测试
// ---------------------------------------------------------------------------
describe('createPluginActivateService', () => {
  let mockRepo: SystemSettingsRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = createMockSystemSettingsRepository()
  })

  // -----------------------------------------------------------------------
  // getActivationStatus
  // -----------------------------------------------------------------------
  describe('getActivationStatus', () => {
    it('returns cached value on cache hit', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(true)

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = await service.getActivationStatus('wechat')

      expect(result).toBe(true)
      // 不应调用 DB
      expect(mockRepo.getSetting).not.toHaveBeenCalled()
    })

    it('reads from DB on cache miss and caches result', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      vi.mocked(mockRepo.getSetting).mockResolvedValue('true')

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = await service.getActivationStatus('wechat')

      expect(result).toBe(true)
      // 验证 DB 调用
      expect(mockRepo.getSetting).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        { key: 'plugin.wechat.active' },
      )
      // 验证结果被写入缓存
      expect(memoryCache.set).toHaveBeenCalledWith(
        'plugin-activate:wechat',
        true,
        60_000,
      )
    })

    it('returns defaultActive when DB returns null', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      vi.mocked(mockRepo.getSetting).mockResolvedValue(null)

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = await service.getActivationStatus('wechat')

      // wechat 的 defaultActive 为 true
      expect(result).toBe(true)
    })

    it('returns defaultActive on DB error', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      vi.mocked(mockRepo.getSetting).mockRejectedValue(new Error('DB connection failed'))

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = await service.getActivationStatus('wechat')

      // wechat 的 defaultActive 为 true，DB 异常时回退
      expect(result).toBe(true)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'plugin_activate.get',
          pluginName: 'wechat',
        }),
        expect.stringContaining('获取插件激活状态失败'),
      )
    })

    it('returns false for unknown plugin name', async () => {
      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      // 使用 'nonexistent' 类型断言为 PluginName 进行测试
      const result = await service.getActivationStatus('nonexistent' as PluginName)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'plugin_activate.get',
          pluginName: 'nonexistent',
        }),
        expect.stringContaining('未知的插件'),
      )
    })
  })

  // -----------------------------------------------------------------------
  // setActivationStatus
  // -----------------------------------------------------------------------
  describe('setActivationStatus', () => {
    it('updates DB and invalidates cache', async () => {
      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      await service.setActivationStatus('wechat', false)

      // 验证 DB 写入
      expect(mockRepo.updateSetting).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        { key: 'plugin.wechat.active', value: 'false' },
      )
      // 验证缓存失效
      expect(memoryCache.invalidate).toHaveBeenCalledWith('plugin-activate:wechat')
      // 验证日志记录
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'plugin_activate.set',
          pluginName: 'wechat',
          active: false,
        }),
      )
    })

    it('throws for unknown plugin name', async () => {
      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)

      await expect(
        service.setActivationStatus('nonexistent' as PluginName, true),
      ).rejects.toThrow('Unknown plugin: nonexistent')

      try {
        await service.setActivationStatus('nonexistent' as PluginName, true)
      } catch (error) {
        expect((error as Error & { code?: string }).code).toBe('INVALID_PLUGIN')
      }
    })
  })

  // -----------------------------------------------------------------------
  // getAllActivationStatuses
  // -----------------------------------------------------------------------
  describe('getAllActivationStatuses', () => {
    it('returns statuses for all installed plugins', async () => {
      // getInstalledPlugins mock 返回 ['wechat']
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      vi.mocked(mockRepo.getSetting).mockResolvedValue('true')

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = await service.getAllActivationStatuses()

      // 应包含 wechat 的状态
      expect(result).toHaveProperty('wechat')
      expect(result.wechat).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // isPluginActive
  // -----------------------------------------------------------------------
  describe('isPluginActive', () => {
    it('returns cached value', () => {
      vi.mocked(memoryCache.get).mockReturnValue(false)

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = service.isPluginActive('wechat')

      expect(result).toBe(false)
    })

    it('returns true on cache miss', () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)

      const service = createPluginActivateService({ systemSettings: mockRepo }, mockCtx)
      const result = service.isPluginActive('wechat')

      // cache miss 默认返回 true
      expect(result).toBe(true)
    })
  })
})
