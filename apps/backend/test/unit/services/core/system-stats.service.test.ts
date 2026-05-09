/**
 * Unit: SystemStatsService
 *
 * Description: 系统资源指标采集服务的单元测试
 * 测试 collect() 方法返回的完整系统资源数据结构，包括 CPU、内存、磁盘、
 * 运行时间、数据库状态、网络信息和进程信息等
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ServiceContext } from '@/types/service/service-context'

// ====== Mock 依赖 ======

// Mock 环境变量配置（@/lib/prisma 依赖 @/config）
vi.mock('@/config/env.mjs', () => ({
  env: {
    DATABASE_PROVIDER: 'prisma',
    DATABASE_URL: 'mysql://root:password@127.0.0.1:3306/test',
    NODE_ENV: 'test',
  },
}))

vi.mock('@/config', () => ({
  env: {
    DATABASE_PROVIDER: 'prisma',
    DATABASE_URL: 'mysql://root:password@127.0.0.1:3306/test',
    NODE_ENV: 'test',
  },
}))

// Mock node:os
vi.mock('node:os', () => ({
  default: {
    cpus: vi.fn(() => [
      {
        model: 'Apple M1 Pro',
        times: { user: 100, nice: 10, sys: 50, idle: 800, irq: 5 },
      },
      {
        model: 'Apple M1 Pro',
        times: { user: 120, nice: 15, sys: 60, idle: 750, irq: 8 },
      },
    ]),
    totalmem: vi.fn(() => 17179869184),
    freemem: vi.fn(() => 8589934592),
    loadavg: vi.fn(() => [1.5, 2.0, 2.5]),
    uptime: vi.fn(() => 86400),
    hostname: vi.fn(() => 'test-host.local'),
    networkInterfaces: vi.fn(() => ({
      en0: [
        { address: '192.168.1.100', family: 'IPv4', internal: false },
        { address: 'fe80::1', family: 'IPv6', internal: false },
      ],
      lo0: [
        { address: '127.0.0.1', family: 'IPv4', internal: true },
      ],
    })),
  },
}))

// Mock node:process (仅覆盖部分属性)
vi.mock('node:process', async () => {
  const actual = await vi.importActual('node:process')
  return {
    ...actual,
    default: {
      ...(typeof actual === 'object' && actual !== null ? actual : {}),
      pid: 12345,
      version: 'v20.10.0',
      platform: 'darwin',
      arch: 'arm64',
      uptime: vi.fn(() => 3600),
      memoryUsage: vi.fn(() => ({
        rss: 524288000,
        heapTotal: 268435456,
        heapUsed: 134217728,
        external: 10485760,
      })),
    },
  }
})

// Mock node:child_process
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

// 可控制的 mock execAsync — 服务模块加载时 promisify(exec) 会获取此函数
const mockExecAsync = vi.fn((cmd: string) => {
  if (cmd.startsWith('df')) {
    return Promise.resolve({
      stdout: 'Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/disk1 488245312 244122656 244122656 50% /',
      stderr: '',
    })
  }
  if (cmd.includes('ipify')) {
    return Promise.resolve({ stdout: '203.0.113.1', stderr: '' })
  }
  return Promise.resolve({ stdout: '', stderr: '' })
})

vi.mock('node:util', async () => ({
  promisify: vi.fn(() => mockExecAsync),
}))

// Mock @/lib/prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(() => Promise.resolve([{ '1': 1 }])),
  },
}))

// ====== 测试用例 ======

describe('SystemStatsService', () => {
  let service: ReturnType<typeof import('@/services/core/system-stats.service').createSystemStatsService>
  let ctx: ServiceContext

  beforeEach(async () => {
    vi.clearAllMocks()
    // 重置 mockExecAsync 到默认行为
    mockExecAsync.mockReset()
    mockExecAsync.mockImplementation((cmd: string) => {
      if (cmd.startsWith('df')) {
        return Promise.resolve({
          stdout: 'Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/disk1 488245312 244122656 244122656 50% /',
          stderr: '',
        })
      }
      if (cmd.includes('ipify')) {
        return Promise.resolve({ stdout: '203.0.113.1', stderr: '' })
      }
      return Promise.resolve({ stdout: '', stderr: '' })
    })

    ctx = {
      traceId: 'test-trace-id',
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(() => ({
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          child: vi.fn(),
        })),
      } as unknown as ServiceContext['logger'],
    }

    const { createSystemStatsService } = await import('@/services/core/system-stats.service')
    service = createSystemStatsService({}, ctx)
  })

  describe('collect()', () => {
    it('应该返回完整的系统资源指标数据', async () => {
      const result = await service.collect()

      expect(result).toHaveProperty('cpu')
      expect(result).toHaveProperty('memory')
      expect(result).toHaveProperty('disk')
      expect(result).toHaveProperty('uptime')
      expect(result).toHaveProperty('process')
      expect(result).toHaveProperty('network')
      expect(result).toHaveProperty('database')
      expect(result).toHaveProperty('timestamp')
    })

    it('cpu.usage 应该在 0-100 范围内', async () => {
      const result = await service.collect()

      expect(result.cpu.usage).toBeGreaterThanOrEqual(0)
      expect(result.cpu.usage).toBeLessThanOrEqual(100)
    })

    it('memory.used 应该小于等于 memory.total', async () => {
      const result = await service.collect()

      expect(result.memory.used).toBeLessThanOrEqual(result.memory.total)
    })

    it('disk.usagePercent 应该在 0-100 范围内', async () => {
      const result = await service.collect()

      expect(result.disk.usagePercent).toBeGreaterThanOrEqual(0)
      expect(result.disk.usagePercent).toBeLessThanOrEqual(100)
    })

    it('uptime.system 和 uptime.process 应该大于 0', async () => {
      const result = await service.collect()

      expect(result.uptime.system).toBeGreaterThan(0)
      expect(result.uptime.process).toBeGreaterThan(0)
    })

    it('database.status 应该为 connected 或 error', async () => {
      const result = await service.collect()

      expect(['connected', 'error']).toContain(result.database.status)
    })

    it('network 应该包含 hostname', async () => {
      const result = await service.collect()

      expect(result.network.hostname).toBeTruthy()
      expect(typeof result.network.hostname).toBe('string')
    })

    it('process 应该包含 pid 和 nodeVersion', async () => {
      const result = await service.collect()

      expect(result.process.pid).toBeDefined()
      expect(typeof result.process.pid).toBe('number')
      expect(result.process.nodeVersion).toBeTruthy()
      expect(typeof result.process.nodeVersion).toBe('string')
    })

    it('timestamp 应该是有效的 ISO 时间字符串', async () => {
      const result = await service.collect()

      const parsed = Date.parse(result.timestamp)
      expect(parsed).not.toBeNaN()
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('错误处理', () => {
    it('child_process 超时时应该返回降级数据', async () => {
      // 让所有 execAsync 调用都抛出超时错误
      mockExecAsync.mockRejectedValue(new Error('Command timed out after 5000ms'))

      const result = await service.collect()

      expect(result.disk.total).toBe(-1)
      expect(result.disk.used).toBe(-1)
      expect(result.disk.free).toBe(-1)
      expect(result.disk.usagePercent).toBe(-1)
    })

    it('单个指标采集失败不应该导致整体崩溃', async () => {
      const os = await import('node:os')
      vi.mocked(os.default.cpus).mockImplementationOnce(() => {
        throw new Error('CPU info unavailable')
      })

      const result = await service.collect()

      expect(result).toHaveProperty('cpu')
      expect(result).toHaveProperty('memory')
      expect(result).toHaveProperty('disk')
      expect(result).toHaveProperty('timestamp')
    })

    it('数据库连接失败时应该返回 status=error', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection refused'))

      const result = await service.collect()

      expect(result.database.status).toBe('error')
      expect(result.database.responseTime).toBe(-1)
    })

    it('公网 IP 获取失败时应该返回 null', async () => {
      // df 成功，curl 失败
      mockExecAsync.mockImplementation((cmd: string) => {
        if (cmd.startsWith('df')) {
          return Promise.resolve({
            stdout: 'Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/disk1 488245312 244122656 244122656 50% /',
            stderr: '',
          })
        }
        if (cmd.includes('ipify')) {
          return Promise.reject(new Error('curl failed'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      })

      const result = await service.collect()

      expect(result.network.publicIp).toBeNull()
    })
  })
})
