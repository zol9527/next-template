import { z } from 'zod'
import { ApiSuccessResponseSchema } from '@/contracts/api-response.schema'

/**
 * 系统资源监控 Schema
 * 用于收集和验证系统运行时的各项资源指标
 */
export const SystemStatsSchema = z.object({
  cpu: z.object({
    model: z.string().min(1, 'CPU 型号不能为空'),
    cores: z.number().int().positive('CPU 核心数必须为正整数'),
    usage: z.number().min(0, 'CPU 使用率不能小于 0').max(100, 'CPU 使用率不能大于 100'),
    loadAvg: z
      .array(z.number().min(0, '负载平均值不能为负数'))
      .length(3, '负载平均值数组长度必须为 3'),
  }),

  memory: z
    .object({
      total: z.number().int().nonnegative('总内存不能为负数'),
      used: z.number().int().nonnegative('已用内存不能为负数'),
      free: z.number().int().nonnegative('空闲内存不能为负数'),
      usagePercent: z
        .number()
        .min(0, '内存使用率不能小于 0')
        .max(100, '内存使用率不能大于 100'),
      process: z.object({
        rss: z.number().int().nonnegative('进程常驻内存不能为负数'),
        heapTotal: z.number().int().nonnegative('堆总内存不能为负数'),
        heapUsed: z.number().int().nonnegative('已用堆内存不能为负数'),
        external: z.number().int().nonnegative('外部内存不能为负数'),
      }),
    })
    .refine((data) => data.used <= data.total, {
      message: '已用内存不能超过总内存',
      path: ['used'],
    }),

  disk: z
    .object({
      total: z.number().int().nonnegative('磁盘总容量不能为负数'),
      used: z.number().int().nonnegative('已用磁盘不能为负数'),
      free: z.number().int().nonnegative('可用磁盘不能为负数'),
      usagePercent: z
        .number()
        .min(0, '磁盘使用率不能小于 0')
        .max(100, '磁盘使用率不能大于 100'),
    })
    .refine((data) => data.used <= data.total, {
      message: '已用磁盘不能超过磁盘总容量',
      path: ['used'],
    }),

  uptime: z.object({
    system: z.number().nonnegative('系统运行时间不能为负数'),
    process: z.number().nonnegative('进程运行时间不能为负数'),
  }),

  process: z.object({
    pid: z.number().int().positive('进程 ID 必须为正整数'),
    nodeVersion: z.string().min(1, 'Node.js 版本不能为空'),
    platform: z.string().min(1, '平台信息不能为空'),
    arch: z.string().min(1, '架构信息不能为空'),
  }),

  network: z.object({
    hostname: z.string().min(1, '主机名不能为空'),
    interfaces: z.array(
      z.object({
        name: z.string().min(1, '网络接口名称不能为空'),
        address: z.string().min(1, 'IP 地址不能为空'),
        family: z.enum(['IPv4', 'IPv6'], {
          message: '地址族必须是 IPv4 或 IPv6',
        }),
      })
    ),
    publicIp: z.string().nullable().default(null),
  }),

  database: z.object({
    status: z.enum(['connected', 'error'], {
      message: '数据库状态必须是 connected 或 error',
    }),
    responseTime: z.number().nonnegative('数据库响应时间不能为负数'),
    version: z.string().nullable().default(null),
  }),

  timestamp: z.string().datetime('时间戳必须是有效的 ISO 8601 格式'),
})

export type SystemStats = z.infer<typeof SystemStatsSchema>

/**
 * 系统资源监控 API 成功响应 Schema
 */
export const SystemStatsResponseSchema = ApiSuccessResponseSchema(SystemStatsSchema)

export type SystemStatsResponse = z.infer<typeof SystemStatsResponseSchema>
