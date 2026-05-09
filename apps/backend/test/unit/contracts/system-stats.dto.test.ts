/**
 * Unit: 系统资源监控 DTO 测试
 *
 * Description: 测试系统资源监控相关的 Zod Schema 验证和类型推断
 */

import { describe, it, expect } from 'vitest'
import { SystemStatsSchema, SystemStats } from '@/contracts/dtos/admin/system-stats.dto'

describe('SystemStatsSchema', () => {
  describe('完整有效数据验证', () => {
    it('应该接受完整有效的系统资源数据', () => {
      const validData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
            {
              name: 'eth1',
              address: '2001:db8::1',
              family: 'IPv6',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
      }
    })

    it('应该接受 network.publicIp 为 null', () => {
      const validData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: null,
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.network.publicIp).toBeNull()
      }
    })

    it('应该接受 database.version 为 null', () => {
      const validData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'error',
          responseTime: 0,
          version: null,
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.database.version).toBeNull()
      }
    })
  })

  describe('必填字段验证', () => {
    it('应该拒绝缺少必填字段', () => {
      const invalidData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        // 缺少 memory
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该验证所有 8 个顶层字段存在', () => {
      const data = {
        cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50,
          process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
        },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: { hostname: 'server', interfaces: [], publicIp: null },
        database: { status: 'connected' as const, responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        const keys = Object.keys(result.data)
        expect(keys).toEqual(expect.arrayContaining(['cpu', 'memory', 'disk', 'uptime', 'process', 'network', 'database', 'timestamp']))
        expect(keys).toHaveLength(8)
      }
    })
  })

  describe('CPU 使用率验证', () => {
    it('应该拒绝 cpu.usage 大于 100', () => {
      const invalidData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 150.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝 cpu.usage 小于 0', () => {
      const invalidData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: -10.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('内存验证', () => {
    it('应该拒绝 memory.used 大于 memory.total', () => {
      const invalidData = {
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 20000000000,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('已用内存不能超过总内存')
      }
    })
  })

  describe('数据库状态验证', () => {
    it('应该只接受 connected 或 error 状态', () => {
      const validStatuses: Array<'connected' | 'error'> = ['connected', 'error']

      validStatuses.forEach((status) => {
        const data = {
          cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
          memory: {
            total: 17179869184,
            used: 8589934592,
            free: 8589934592,
            usagePercent: 50,
            process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
          },
          disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
          uptime: { system: 86400, process: 3600 },
          process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
          network: { hostname: 'server', interfaces: [], publicIp: null },
          database: { status, responseTime: 15.5, version: '8.0.32' },
          timestamp: '2024-01-01T12:00:00.000Z',
        }

        const result = SystemStatsSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.database.status).toBe(status)
        }
      })
    })

    it('应该拒绝无效的数据库状态', () => {
      const invalidData = {
        cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50,
          process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
        },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: { hostname: 'server', interfaces: [], publicIp: null },
        database: { status: 'disconnected' as const, responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('网络接口验证', () => {
    it('应该只接受 IPv4 或 IPv6 地址族', () => {
      const validFamilies = ['IPv4', 'IPv6']

      validFamilies.forEach((family) => {
        const data = {
          cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
          memory: {
            total: 17179869184,
            used: 8589934592,
            free: 8589934592,
            usagePercent: 50,
            process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
          },
          disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
          uptime: { system: 86400, process: 3600 },
          process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
          network: {
            hostname: 'server',
            interfaces: [{ name: 'eth0', address: '192.168.1.1', family: family as 'IPv4' | 'IPv6' }],
            publicIp: null,
          },
          database: { status: 'connected' as const, responseTime: 15.5, version: '8.0.32' },
          timestamp: '2024-01-01T12:00:00.000Z',
        }

        const result = SystemStatsSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('应该拒绝无效的地址族', () => {
      const invalidData = {
        cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50,
          process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
        },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: {
          hostname: 'server',
          interfaces: [{ name: 'eth0', address: '192.168.1.1', family: 'IPv3' as 'IPv4' | 'IPv6' }],
          publicIp: null,
        },
        database: { status: 'connected' as const, responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('类型推断', () => {
    it('应该正确推断 SystemStats 类型', () => {
      const data: SystemStats = SystemStatsSchema.parse({
        cpu: {
          model: 'Intel Core i7-9700K',
          cores: 8,
          usage: 45.5,
          loadAvg: [0.5, 0.8, 1.2],
        },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50.0,
          process: {
            rss: 524288000,
            heapTotal: 268435456,
            heapUsed: 134217728,
            external: 10485760,
          },
        },
        disk: {
          total: 500000000000,
          used: 250000000000,
          free: 250000000000,
          usagePercent: 50.0,
        },
        uptime: {
          system: 86400,
          process: 3600,
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        network: {
          hostname: 'server.example.com',
          interfaces: [
            {
              name: 'eth0',
              address: '192.168.1.100',
              family: 'IPv4',
            },
          ],
          publicIp: '203.0.113.1',
        },
        database: {
          status: 'connected',
          responseTime: 15.5,
          version: '8.0.32',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      })

      expect(data).toBeDefined()
      expect(data.cpu.cores).toBe(8)
      expect(data.memory.usagePercent).toBe(50.0)
      expect(data.disk.total).toBe(500000000000)
      expect(data.uptime.system).toBe(86400)
      expect(data.process.pid).toBe(12345)
      expect(data.network.hostname).toBe('server.example.com')
      expect(data.database.status).toBe('connected')
      expect(data.timestamp).toBe('2024-01-01T12:00:00.000Z')
    })

    it('应该正确推断 database.status 为字面量类型', () => {
      const data: SystemStats = SystemStatsSchema.parse({
        cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50,
          process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
        },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: { hostname: 'server', interfaces: [], publicIp: null },
        database: { status: 'connected', responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      })

      const status: 'connected' | 'error' = data.database.status
      expect(status).toBe('connected')
    })

    it('应该正确推断 network.family 为字面量类型', () => {
      const data: SystemStats = SystemStatsSchema.parse({
        cpu: { model: 'Intel Core i7', cores: 8, usage: 50, loadAvg: [0.5, 0.8, 1.2] },
        memory: {
          total: 17179869184,
          used: 8589934592,
          free: 8589934592,
          usagePercent: 50,
          process: { rss: 100, heapTotal: 100, heapUsed: 50, external: 10 },
        },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: {
          hostname: 'server',
          interfaces: [{ name: 'eth0', address: '192.168.1.1', family: 'IPv4' }],
          publicIp: null,
        },
        database: { status: 'connected', responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      })

      const family: 'IPv4' | 'IPv6' = data.network.interfaces[0].family
      expect(family).toBe('IPv4')
    })
  })

  describe('边界值验证', () => {
    it('应该接受 cpu.usage 为 0', () => {
      const data = {
        cpu: { model: 'Intel Core i7', cores: 8, usage: 0, loadAvg: [0, 0, 0] },
        memory: {
          total: 17179869184,
          used: 0,
          free: 17179869184,
          usagePercent: 0,
          process: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
        },
        disk: { total: 500000000000, used: 0, free: 500000000000, usagePercent: 0 },
        uptime: { system: 0, process: 0 },
        process: { pid: 1, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: { hostname: 'server', interfaces: [], publicIp: null },
        database: { status: 'connected' as const, responseTime: 0, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该接受 cpu.usage 为 100', () => {
      const data = {
        cpu: { model: 'Intel Core i7', cores: 8, usage: 100, loadAvg: [8, 8, 8] },
        memory: {
          total: 17179869184,
          used: 17179869184,
          free: 0,
          usagePercent: 100,
          process: { rss: 1000000000, heapTotal: 500000000, heapUsed: 400000000, external: 50000000 },
        },
        disk: { total: 500000000000, used: 500000000000, free: 0, usagePercent: 100 },
        uptime: { system: 86400, process: 3600 },
        process: { pid: 12345, nodeVersion: 'v18.17.0', platform: 'linux', arch: 'x64' },
        network: { hostname: 'server', interfaces: [], publicIp: null },
        database: { status: 'connected' as const, responseTime: 15.5, version: '8.0.32' },
        timestamp: '2024-01-01T12:00:00.000Z',
      }

      const result = SystemStatsSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
