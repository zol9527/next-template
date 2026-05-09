/**
 * 测试用日志数据
 *
 * Description: 为日志查看器测试提供标准化的测试数据
 */

import type { LogEntry, LogLevel } from '@/contracts/dtos/admin/logs.dto'

/**
 * 标准日志条目数组（不同级别）
 */
export const sampleLogEntries: LogEntry[] = [
  {
    time: '2026-03-01T10:00:00.000Z',
    level: 'info',
    msg: 'Request completed',
    traceId: 'trace-001',
    method: 'GET',
    pathname: '/api/v1/users',
    ip: '127.0.0.1',
  },
  {
    time: '2026-03-01T10:01:00.000Z',
    level: 'warn',
    msg: 'Rate limit approaching',
    traceId: 'trace-002',
    action: 'rate_limit.check',
  },
  {
    time: '2026-03-01T10:02:00.000Z',
    level: 'error',
    msg: 'Database connection failed',
    traceId: 'trace-003',
    err: {
      message: 'Connection timeout',
      stack: 'Error: Connection timeout\n    at connect (db.js:10)\n    at init (app.js:5)',
    },
  },
  {
    time: '2026-03-01T10:03:00.000Z',
    level: 'debug',
    msg: 'Debug information',
    traceId: 'trace-004',
    userId: 'user-123',
    layer: 'service',
  },
]

/**
 * Pino 原始格式日志行（JSON 字符串，数字级别）
 */
export const samplePinoLogLines = [
  '{"time":"2026-03-01T10:00:00.000Z","level":30,"msg":"Info message","traceId":"trace-001"}',
  '{"time":"2026-03-01T10:01:00.000Z","level":40,"msg":"Warn message","traceId":"trace-002"}',
  '{"time":"2026-03-01T10:02:00.000Z","level":50,"msg":"Error message","traceId":"trace-003","err":{"message":"Error occurred","stack":"Error stack"}}',
  '{"time":"2026-03-01T10:03:00.000Z","level":20,"msg":"Debug message","traceId":"trace-004"}',
  '{"time":"2026-03-01T10:04:00.000Z","level":60,"msg":"Fatal message","traceId":"trace-005"}',
  '{"time":"2026-03-01T10:05:00.000Z","level":10,"msg":"Trace message","traceId":"trace-006"}',
]

/**
 * 字符串级别格式的日志行
 */
export const sampleStringLevelLogLines = [
  '{"time":"2026-03-01T10:00:00.000Z","level":"info","msg":"Info message"}',
  '{"time":"2026-03-01T10:01:00.000Z","level":"warn","msg":"Warn message"}',
  '{"time":"2026-03-01T10:02:00.000Z","level":"error","msg":"Error message"}',
  '{"time":"2026-03-01T10:03:00.000Z","level":"debug","msg":"Debug message"}',
]

/**
 * 无效日志行（用于测试解析健壮性）
 */
export const invalidLogLines = [
  '',                          // 空行
  '   ',                       // 空白行
  'not json',                  // 非 JSON
  '{"time":"2026-03-01T10:00:00.000Z"}', // 缺少 level 和 msg
  '{"level":30}',              // 缺少 time 和 msg
  '{"time":"2026-03-01","level":null,"msg":"test"}', // level 为 null
  '{"time":"2026-03-01","level":"invalid","msg":"test"}', // 无效级别字符串
]

/**
 * 生成批量日志
 *
 * Parameters:
 *   count(number): 生成数量
 *   level(LogLevel | undefined): 可选的日志级别
 *
 * Returns:
 *   logs(LogEntry[]): 日志条目数组
 */
export function generateManyLogs(count: number, level?: LogLevel): LogEntry[] {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']

  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.now() - (count - i) * 1000).toISOString(),
    level: level ?? levels[i % 4],
    msg: `Log message ${i}`,
    traceId: `trace-${String(i).padStart(3, '0')}`,
  }))
}

/**
 * 生成批量 Pino 格式 JSON 日志行
 *
 * Parameters:
 *   count(number): 生成数量
 *
 * Returns:
 *   lines(string[]): JSON 日志行数组
 */
export function generatePinoLogLines(count: number): string[] {
  const levels = [10, 20, 30, 40, 50, 60]

  return Array.from({ length: count }, (_, i) =>
    JSON.stringify({
      time: new Date(Date.now() - (count - i) * 1000).toISOString(),
      level: levels[i % 6],
      msg: `Log message ${i}`,
      traceId: `trace-${String(i).padStart(3, '0')}`,
    }),
  )
}

/**
 * Mock 日志文件信息
 */
export const mockLogFiles = [
  { name: 'app-2026-02-28.log', mtime: new Date('2026-02-28T23:59:59') },
  { name: 'app-2026-03-01.log', mtime: new Date('2026-03-01T10:00:00') }, // 最新
  { name: 'error-2026-03-01.log', mtime: new Date('2026-03-01T09:00:00') },
]

/**
 * 非日志文件（应被忽略）
 */
export const nonLogFiles = ['readme.txt', 'config.json', '.gitkeep']
