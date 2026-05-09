/**
 * API: GET /api/v1/admin/dashboard/system-stats
 *
 * Description: 系统资源监控 API 路由的集成测试
 * 测试不同角色用户的权限控制、响应数据结构以及错误处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/app-error'
import { SystemStatsSchema } from '@/contracts/dtos/admin/system-stats.dto'

// ==================== Mocks ====================

const mockCollect = vi.hoisted(() => vi.fn())

// Mock logger 避免文件系统写入
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext 提供有效的上下文
vi.mock('@/types/service/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createServiceContext: vi.fn(() => ({
      traceId: 'test-trace-id',
      logger: mockLogger,
      userAgent: null,
      clientIp: null,
    })),
  }
})

// Mock 系统资源采集服务
vi.mock('@/services/core/system-stats.service', () => ({
  createSystemStatsService: vi.fn(() => ({
    collect: mockCollect,
  })),
}))

// Mock 认证模块
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => ['ecommerce']),
}))

// Mock 系统设置仓库和 feature flag 服务（维护模式检查需要）
vi.mock('@/repositories/factory', () => ({
  createSystemSettingsRepository: vi.fn(() => ({})),
}))

vi.mock('@/services/core/admin-feature-flag.service', () => ({
  createAdminFeatureFlagService: vi.fn(() => ({
    isMaintenanceMode: vi.fn(() => Promise.resolve(false)),
  })),
}))

// Mock prisma（避免数据库连接）
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

// 动态导入路由
const { GET } = await import(
  '@/app/api/v1/admin/dashboard/system-stats/route'
)

// ==================== 测试数据 ====================

/**
 * Function: createMockSystemStats
 *
 * Description: 创建符合 SystemStatsSchema 的完整模拟数据
 *
 * Returns:
 *     stats(object): 完整的系统资源指标数据
 */
function createMockSystemStats() {
  return {
    cpu: {
      model: 'Apple M1 Pro',
      cores: 10,
      usage: 25.5,
      loadAvg: [1.5, 1.2, 1.0],
    },
    memory: {
      total: 17179869184,
      used: 8589934592,
      free: 8589934592,
      usagePercent: 50.0,
      process: {
        rss: 100_000_000,
        heapTotal: 80_000_000,
        heapUsed: 60_000_000,
        external: 5_000_000,
      },
    },
    disk: {
      total: 500_000_000_000,
      used: 250_000_000_000,
      free: 250_000_000_000,
      usagePercent: 50.0,
    },
    uptime: {
      system: 86400,
      process: 3600,
    },
    process: {
      pid: 12345,
      nodeVersion: 'v20.11.0',
      platform: 'darwin',
      arch: 'arm64',
    },
    network: {
      hostname: 'test-host',
      interfaces: [
        { name: 'en0', address: '192.168.1.1', family: 'IPv4' as const },
      ],
      publicIp: '1.2.3.4',
    },
    database: {
      status: 'connected' as const,
      responseTime: 5.2,
      version: '8.0.35',
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文（拥有所有权限）
 *
 * Parameters:
 *     overrides(object): 可选的覆盖属性
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertPermission: vi.fn(),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      check: vi.fn(() => true),
    },
    ...overrides,
  }
}

/**
 * Function: createPromoterAuth
 *
 * Description: 创建推广员认证上下文（拥有 dashboard read 权限）
 *
 * Returns:
 *     auth(object): 推广员认证上下文
 */
function createPromoterAuth() {
  return createAdminAuth({
    userId: 'promoter-id',
    roles: ['promoter'],
  })
}

/**
 * Function: createUserWithoutDashboardAuth
 *
 * Description: 创建无 dashboard read 权限的普通用户认证上下文
 * access.assert 会抛出 ForbiddenError
 *
 * Returns:
 *     auth(object): 普通用户认证上下文
 */
function createUserWithoutDashboardAuth() {
  const auth = createAdminAuth({
    userId: 'user-id',
    roles: ['user'],
  })
  auth.access.assert = vi.fn(() => {
    throw new ForbiddenError('无权访问 dashboard')
  })
  return auth
}

// ==================== 测试套件 ====================

describe('GET /api/v1/admin/dashboard/system-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
    mockCollect.mockResolvedValue(createMockSystemStats())
  })

  describe('权限控制', () => {
    it('admin 用户应该能成功获取系统资源数据 (200)', async () => {
      mockUseApiAuth.mockResolvedValue(createAdminAuth())

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    it('promoter 用户应该能成功获取系统资源数据 (200) [有 dashboard read]', async () => {
      mockUseApiAuth.mockResolvedValue(createPromoterAuth())

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    it('无 dashboard read 权限的用户应该被拒绝 (403)', async () => {
      mockUseApiAuth.mockResolvedValue(createUserWithoutDashboardAuth())

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('未认证用户应该被拒绝 (401)', async () => {
      mockUseApiAuth.mockRejectedValue(
        new UnauthorizedError('认证已过期'),
      )

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('响应数据', () => {
    it('应该返回 success: true 和完整的 data 对象', async () => {
      const mockData = createMockSystemStats()
      mockCollect.mockResolvedValue(mockData)

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data).toEqual(mockData)
    })

    it('data 应该包含 cpu, memory, disk, uptime, process, network, database, timestamp', async () => {
      const mockData = createMockSystemStats()
      mockCollect.mockResolvedValue(mockData)

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()

      // 验证返回数据符合 SystemStatsSchema
      const parseResult = SystemStatsSchema.safeParse(json.data)
      expect(parseResult.success).toBe(true)

      // 验证所有顶层字段都存在
      const data = json.data
      expect(data).toHaveProperty('cpu')
      expect(data).toHaveProperty('memory')
      expect(data).toHaveProperty('disk')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('process')
      expect(data).toHaveProperty('network')
      expect(data).toHaveProperty('database')
      expect(data).toHaveProperty('timestamp')
    })

    it('不应该受 ecommerce 插件状态影响 (无 pluginGuard)', async () => {
      // 即使 mock isPluginEnabled 返回 false，路由仍然应该正常工作
      // 因为路由没有 pluginGuard
      const { isPluginEnabled } = await import('@/plugins/registry')
      vi.mocked(isPluginEnabled).mockReturnValue(false)

      mockCollect.mockResolvedValue(createMockSystemStats())

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      // 路由应该正常返回 200，不受插件禁用影响
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('Service 异常时应该返回 500 INTERNAL_ERROR', async () => {
      mockCollect.mockRejectedValue(new Error('系统信息采集失败'))

      const req = new NextRequest(
        'http://localhost/api/v1/admin/dashboard/system-stats',
      )
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
