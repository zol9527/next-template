/**
 * Unit: 插件注册表测试
 *
 * Description: 测试 registry 模块的核心导出函数：
 *   isPluginEnabled (同步，双重检查)、
 *   getEnabledPlugins (同步，批量状态映射)、
 *   refreshPluginCache (异步，从 DB 加载到缓存)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock: plugin-definitions
// ---------------------------------------------------------------------------
vi.mock('@/plugins/plugin-definitions', () => ({
  isPluginInstalled: vi.fn().mockReturnValue(false),
  ALL_PLUGIN_NAMES: ['wechat', 'ecommerce', 'promotion'],
}))

// ---------------------------------------------------------------------------
// Mock: memoryCache
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
// Mock: plugin-activate.service — 动态 import 场景
// ---------------------------------------------------------------------------
const mockGetAllActivationStatuses = vi.fn()

vi.mock('@/plugins/plugin-activate.service', () => ({
  createPluginActivateService: vi.fn().mockReturnValue({
    getAllActivationStatuses: mockGetAllActivationStatuses,
  }),
}))

// ---------------------------------------------------------------------------
// Mock: repositories/factory
// ---------------------------------------------------------------------------
vi.mock('@/repositories/factory', () => ({
  createSystemSettingsRepository: vi.fn().mockResolvedValue({
    getSetting: vi.fn(),
    updateSetting: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Mock: service-context
// ---------------------------------------------------------------------------
vi.mock('@/types/service/service-context', () => ({
  createServiceContext: vi.fn().mockReturnValue({
    traceId: 'plugin-registry',
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  }),
}))

// ---------------------------------------------------------------------------
// Mock: logger
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

// 导入被测模块（必须在所有 vi.mock 之后）
import { isPluginEnabled, getEnabledPlugins, refreshPluginCache } from '@/plugins/registry'
import { memoryCache } from '@/lib/cache/memory-cache'
import { isPluginInstalled } from '@/plugins/plugin-definitions'

// ---------------------------------------------------------------------------
// 测试
// ---------------------------------------------------------------------------
describe('isPluginEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when plugin is not installed', () => {
    vi.mocked(isPluginInstalled).mockReturnValue(false)

    expect(isPluginEnabled('wechat')).toBe(false)
  })

  it('returns cached value when installed and cache hit', () => {
    vi.mocked(isPluginInstalled).mockReturnValue(true)
    vi.mocked(memoryCache.get).mockReturnValue(false)

    expect(isPluginEnabled('wechat')).toBe(false)
  })

  it('returns true when installed but cache miss', () => {
    vi.mocked(isPluginInstalled).mockReturnValue(true)
    vi.mocked(memoryCache.get).mockReturnValue(undefined)

    // cache miss 默认返回 true（安全降级）
    expect(isPluginEnabled('wechat')).toBe(true)
  })
})

describe('getEnabledPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapping for all plugins', () => {
    vi.mocked(isPluginInstalled).mockImplementation(
      (name: string) => name === 'wechat',
    )
    vi.mocked(memoryCache.get).mockReturnValue(true)

    const result = getEnabledPlugins()

    expect(result).toHaveProperty('wechat')
    expect(result).toHaveProperty('ecommerce')
    expect(result).toHaveProperty('promotion')
    // wechat 已安装且缓存命中 → true
    expect(result.wechat).toBe(true)
    // ecommerce 未安装 → false
    expect(result.ecommerce).toBe(false)
  })
})

describe('refreshPluginCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(memoryCache.get).mockReturnValue(undefined)
  })

  it('loads statuses from service and caches them', async () => {
    mockGetAllActivationStatuses.mockResolvedValue({ wechat: true })

    await refreshPluginCache()

    expect(memoryCache.set).toHaveBeenCalledWith(
      'plugin-activate:wechat',
      true,
      60_000,
    )
  })

  it('handles service creation failure gracefully', async () => {
    // 让动态 import 失败，tryGetActivationService 返回 null
    vi.doMock('@/plugins/plugin-activate.service', () => {
      throw new Error('import failed')
    })

    // refreshPluginCache 内部 catch 后静默返回，不应抛出
    await expect(refreshPluginCache()).resolves.toBeUndefined()
  })
})
