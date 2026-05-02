/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'
import type { ServiceContext } from '@/types/service/service-context'
import type { LogLevel, LogEntry } from '@/contracts/dtos/admin/logs.dto'

// 使用 vi.hoisted 来定义 mock 函数，避免 hoisting 问题
const mockExistsSync = vi.hoisted(() => vi.fn())
const mockReaddirSync = vi.hoisted(() => vi.fn())
const mockStatSync = vi.hoisted(() => vi.fn())
const mockCreateReadStream = vi.hoisted(() => vi.fn())
const mockCreateInterface = vi.hoisted(() => vi.fn())
const mockGetLogLevel = vi.hoisted(() => vi.fn(() => 'info'))
const mockSetLogLevel = vi.hoisted(() => vi.fn(() => 'info'))
const mockGetLogConfig = vi.hoisted(() => vi.fn(() => ({ logDir: './logs' })))
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(function (this: any) {
    return this
  }),
}))

// Mock fs 模块
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  createReadStream: mockCreateReadStream,
}))

// Mock readline 模块
vi.mock('readline', () => ({
  createInterface: mockCreateInterface,
}))

// Mock level-manager
vi.mock('@/lib/logger/level-manager', () => ({
  getLogLevel: mockGetLogLevel,
  setLogLevel: mockSetLogLevel,
  getLogConfig: mockGetLogConfig,
}))

// 创建服务上下文
const mockServiceContext: ServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger as any,
  userAgent: null,
  clientIp: null,
}

/**
 * 服务层测试: LogViewerService
 *
 * Description: 测试日志查看服务的核心功能
 */
describe('LogViewerService', () => {
  let service: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // 重置 mock 返回值
    mockGetLogConfig.mockReturnValue({ logDir: './logs' })
    mockGetLogLevel.mockReturnValue('info')
    mockSetLogLevel.mockReturnValue('info')

    // 动态导入服务以应用 mocks
    const { createLogViewerService } = await import('@/services/core/log-viewer.service')
    service = createLogViewerService(mockServiceContext)
  })

  describe('getConfig', () => {
    /**
     * Function: getConfig
     *
     * Description: 获取当前日志配置信息
     *
     * Parameters: 无
     *
     * Returns:
     *   config(LogConfigResponse): 日志配置信息
     */
    it('SVC-001: 应该返回完整的配置对象', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['app.log'])
      mockStatSync.mockReturnValue({ mtime: new Date() })

      const config = service.getConfig()

      expect(config).toHaveProperty('currentLevel')
      expect(config).toHaveProperty('availableLevels')
      expect(config).toHaveProperty('logDirectory')
      expect(config).toHaveProperty('currentLogFile')
      expect(config.availableLevels).toEqual(['debug', 'info', 'warn', 'error'])
    })
  })

  describe('getCurrentLogFile', () => {
    /**
     * Function: getCurrentLogFile
     *
     * Description: 获取当前活跃的日志文件路径
     *
     * Parameters: 无
     *
     * Returns:
     *   filePath(string | null): 当前日志文件名
     */
    it('SVC-002: 目录不存在时应该返回 null', () => {
      mockExistsSync.mockReturnValue(false)

      const result = service.getCurrentLogFile()

      expect(result).toBeNull()
    })

    it('SVC-003: 空目录时应该返回 null', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([])

      const result = service.getCurrentLogFile()

      expect(result).toBeNull()
    })

    it('读取目录失败时应该返回 null', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Read error')
      })

      const result = service.getCurrentLogFile()

      expect(result).toBeNull()
    })

  })

  describe('getRecentLogs', () => {
    /**
     * Function: getRecentLogs
     *
     * Description: 读取最近的日志条目
     *
     * Parameters:
     *   level(LogLevel | undefined): 可选的日志级别过滤
     *   limit(number): 返回条数限制
     *
     * Returns:
     *   result(GetLogsResponse): 日志列表和元数据
     */
    it('SVC-006: 无日志文件时应该返回空数组', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await service.getRecentLogs()

      expect(result.logs).toEqual([])
      expect(result.logFile).toBe('无日志文件')
      expect(result.totalRead).toBe(0)
    })

    it('SVC-007: 应该成功调用 getRecentLogs 方法', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['app.log'])
      mockStatSync.mockReturnValue({ mtime: new Date() })

      // 创建模拟的 readline 接口
      const mockRl = {
        on: vi.fn((event: string, callback: any) => {
          if (event === 'close') {
            // 立即触发 close 事件
            setTimeout(() => callback(), 0)
          }
          return mockRl
        }),
        close: vi.fn(),
      }
      mockCreateInterface.mockReturnValue(mockRl)
      mockCreateReadStream.mockReturnValue(new Readable({ read() {} }))

      const result = await service.getRecentLogs()

      // 验证返回结构正确
      expect(result).toHaveProperty('logs')
      expect(result).toHaveProperty('currentLevel')
      expect(result).toHaveProperty('logFile')
      expect(result).toHaveProperty('totalRead')
      expect(Array.isArray(result.logs)).toBe(true)
    })

    it('SVC-009: 应该限制返回条数', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['app.log'])
      mockStatSync.mockReturnValue({ mtime: new Date() })

      const mockRl = {
        on: vi.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(), 0)
          }
          return mockRl
        }),
        close: vi.fn(),
      }
      mockCreateInterface.mockReturnValue(mockRl)
      mockCreateReadStream.mockReturnValue(new Readable({ read() {} }))

      const result = await service.getRecentLogs(undefined, 5)

      expect(result.logs.length).toBeLessThanOrEqual(5)
    })
  })

  describe('parseLogLine', () => {
    /**
     * Function: parseLogLine
     *
     * Description: 解析单行 JSON 格式日志
     *
     * Parameters:
     *   line(string): 日志行内容
     *
     * Returns:
     *   entry(LogEntry | null): 解析后的日志条目
     */
    it('SVC-013: 有效 JSON 应该解析成功', () => {
      const line = '{"time":"2026-03-01T10:00:00.000Z","level":30,"msg":"Test message"}'

      const result = service.parseLogLine(line)

      expect(result).not.toBeNull()
      expect(result?.time).toBe('2026-03-01T10:00:00.000Z')
      expect(result?.level).toBe('info')
      expect(result?.msg).toBe('Test message')
    })

    it('SVC-014: 应该正确转换数字级别', () => {
      const testCases = [
        { level: 10, expected: 'debug' },
        { level: 20, expected: 'debug' },
        { level: 30, expected: 'info' },
        { level: 40, expected: 'warn' },
        { level: 50, expected: 'error' },
        { level: 60, expected: 'error' },
      ]

      testCases.forEach(({ level, expected }) => {
        const line = `{"time":"2026-03-01T10:00:00.000Z","level":${level},"msg":"Test"}`
        const result = service.parseLogLine(line)
        expect(result?.level).toBe(expected)
      })
    })

    it('SVC-015: 字符串级别应该直接返回', () => {
      const line = '{"time":"2026-03-01T10:00:00.000Z","level":"warn","msg":"Test"}'

      const result = service.parseLogLine(line)

      expect(result?.level).toBe('warn')
    })

    it('SVC-016: 空行应该返回 null', () => {
      expect(service.parseLogLine('')).toBeNull()
      expect(service.parseLogLine('   ')).toBeNull()
    })

    it('SVC-017: 无效 JSON 应该返回 null', () => {
      expect(service.parseLogLine('not json')).toBeNull()
      expect(service.parseLogLine('{invalid}')).toBeNull()
    })

    it('SVC-018: 缺少 level 字段应该返回 null', () => {
      const line = '{"time":"2026-03-01T10:00:00.000Z","msg":"Test"}'

      const result = service.parseLogLine(line)

      expect(result).toBeNull()
    })

    it('SVC-019: 应该正确解析 err 字段', () => {
      const line =
        '{"time":"2026-03-01T10:00:00.000Z","level":50,"msg":"Error","err":{"message":"Test error","stack":"Error stack"}}'

      const result = service.parseLogLine(line)

      expect(result?.err).toBeDefined()
      expect(result?.err?.message).toBe('Test error')
      expect(result?.err?.stack).toBe('Error stack')
    })

    it('应该正确处理可选字段', () => {
      const line =
        '{"time":"2026-03-01T10:00:00.000Z","level":30,"msg":"Test","traceId":"trace-001","userId":"user-123","method":"GET","pathname":"/api/test","ip":"127.0.0.1"}'

      const result = service.parseLogLine(line)

      expect(result?.traceId).toBe('trace-001')
      expect(result?.userId).toBe('user-123')
      expect(result?.method).toBe('GET')
      expect(result?.pathname).toBe('/api/test')
      expect(result?.ip).toBe('127.0.0.1')
    })

    it('缺少 time 或 msg 时应该使用默认值', () => {
      const line = '{"level":30}'

      const result = service.parseLogLine(line)

      expect(result).not.toBeNull()
      expect(result?.time).toBeDefined()
      expect(result?.msg).toBe('')
    })
  })

  describe('levelNumToString', () => {
    /**
     * Function: levelNumToString
     *
     * Description: 将 pino 数字级别转换为字符串
     *
     * Parameters:
     *   levelNum(number | string): 日志级别数字或字符串
     *
     * Returns:
     *   level(LogLevel): 日志级别字符串
     */
    it('SVC-020: pino 级别映射应该正确', () => {
      expect(service.levelNumToString(10)).toBe('debug')
      expect(service.levelNumToString(20)).toBe('debug')
      expect(service.levelNumToString(30)).toBe('info')
      expect(service.levelNumToString(40)).toBe('warn')
      expect(service.levelNumToString(50)).toBe('error')
      expect(service.levelNumToString(60)).toBe('error')
    })

    it('SVC-021: 未知数字应该返回 info', () => {
      expect(service.levelNumToString(99)).toBe('info')
      expect(service.levelNumToString(0)).toBe('info')
    })

    it('有效的字符串级别应该直接返回', () => {
      expect(service.levelNumToString('debug')).toBe('debug')
      expect(service.levelNumToString('info')).toBe('info')
      expect(service.levelNumToString('warn')).toBe('warn')
      expect(service.levelNumToString('error')).toBe('error')
    })

    it('无效的字符串级别应该返回 info', () => {
      expect(service.levelNumToString('invalid')).toBe('info')
      expect(service.levelNumToString('')).toBe('info')
    })
  })

  describe('setLogLevel', () => {
    /**
     * Function: setLogLevel
     *
     * Description: 设置运行时日志级别
     *
     * Parameters:
     *   level(LogLevel): 新的日志级别
     *
     * Returns:
     *   result(SetLogLevelResponse): 级别变更结果
     */
    it('SVC-022: 应该返回变更前后级别', () => {
      mockSetLogLevel.mockReturnValue('info')

      const result = service.setLogLevel('debug')

      expect(result.previousLevel).toBe('info')
      expect(result.currentLevel).toBe('debug')
      expect(result.effectiveAt).toBeDefined()
    })

    it('应该调用 level-manager 的 setLogLevel', () => {
      service.setLogLevel('warn')

      expect(mockSetLogLevel).toHaveBeenCalledWith('warn')
    })

    it('应该记录级别变更日志', () => {
      service.setLogLevel('error')

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          previousLevel: expect.any(String),
          newLevel: 'error',
        }),
        '日志级别已更新',
      )
    })
  })
})
