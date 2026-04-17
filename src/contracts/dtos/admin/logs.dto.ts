import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 日志级别枚举
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']).openapi({
  description: '日志级别',
  example: 'info',
})

export type LogLevel = z.infer<typeof LogLevelSchema>

/**
 * 单条日志条目
 */
export const LogEntrySchema = z
  .object({
    time: z.string().openapi({ description: '日志时间 ISO 格式' }),
    level: LogLevelSchema.openapi({ description: '日志级别' }),
    msg: z.string().openapi({ description: '日志消息' }),
    traceId: z.string().optional().openapi({ description: '请求追踪 ID' }),
    userId: z.string().optional().openapi({ description: '用户 ID' }),
    method: z.string().optional().openapi({ description: 'HTTP 方法' }),
    pathname: z.string().optional().openapi({ description: '请求路径' }),
    ip: z.string().optional().openapi({ description: '客户端 IP' }),
    action: z.string().optional().openapi({ description: '操作标识' }),
    layer: z.string().optional().openapi({ description: '架构层级' }),
    statusCode: z.number().optional().openapi({ description: 'HTTP 状态码（请求完成时）' }),
    durationMs: z.number().optional().openapi({ description: '请求耗时（毫秒）' }),
    errorCode: z.string().optional().openapi({ description: '错误码' }),
    errorMessage: z.string().optional().openapi({ description: '错误描述' }),
    err: z
      .object({
        message: z.string(),
        stack: z.string().optional(),
      })
      .optional()
      .openapi({ description: '错误信息' }),
    request: z.unknown().optional().openapi({ description: '请求详情（可能包含 headers/query/body 等）' }),
    response: z.unknown().optional().openapi({ description: '响应详情（可能包含 headers/payload 等）' }),
    actions: z
      .array(
        z.object({
          time: z.string().openapi({ description: '动作发生时间 ISO 格式' }),
          level: LogLevelSchema.openapi({ description: '动作日志级别' }),
          action: z.string().optional().openapi({ description: '动作标识（若有）' }),
          msg: z.string().openapi({ description: '动作日志消息' }),
          layer: z.string().optional().openapi({ description: '所属层级' }),
          statusCode: z.number().optional().openapi({ description: '该动作关联状态码（若有）' }),
        }),
      )
      .optional()
      .openapi({ description: '请求内动作时间线（按时间顺序）' }),
  })
  .openapi({ description: '单条日志条目' })

export type LogEntry = z.infer<typeof LogEntrySchema>

/**
 * 获取日志列表请求参数
 */
export const GetLogsQuerySchema = z
  .object({
    level: LogLevelSchema.optional().openapi({ description: '按级别过滤（可选）' }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(200)
      .openapi({ description: '返回条数限制，默认 200，最大 500' }),
  })
  .openapi({ description: '获取日志列表请求参数' })

export type GetLogsQuery = z.infer<typeof GetLogsQuerySchema>

/**
 * 获取日志列表响应
 */
export const GetLogsResponseSchema = z
  .object({
    logs: z.array(LogEntrySchema).openapi({ description: '日志列表' }),
    currentLevel: LogLevelSchema.openapi({ description: '当前日志级别' }),
    logFile: z.string().openapi({ description: '当前读取的日志文件名' }),
    totalRead: z.number().openapi({ description: '实际读取的条数' }),
  })
  .openapi({ description: '获取日志列表响应' })

export type GetLogsResponse = z.infer<typeof GetLogsResponseSchema>

/**
 * 调整日志级别请求
 */
export const SetLogLevelBodySchema = z
  .object({
    level: LogLevelSchema.openapi({ description: '新的日志级别' }),
  })
  .openapi({ description: '调整日志级别请求' })

export type SetLogLevelBody = z.infer<typeof SetLogLevelBodySchema>

/**
 * 调整日志级别响应
 */
export const SetLogLevelResponseSchema = z
  .object({
    previousLevel: LogLevelSchema.openapi({ description: '变更前的日志级别' }),
    currentLevel: LogLevelSchema.openapi({ description: '当前日志级别' }),
    effectiveAt: z.string().openapi({ description: '生效时间 ISO 格式' }),
  })
  .openapi({ description: '调整日志级别响应' })

export type SetLogLevelResponse = z.infer<typeof SetLogLevelResponseSchema>

/**
 * 日志配置信息响应
 */
export const LogConfigResponseSchema = z
  .object({
    currentLevel: LogLevelSchema.openapi({ description: '当前日志级别' }),
    availableLevels: z.array(LogLevelSchema).openapi({ description: '可用的日志级别列表' }),
    logDirectory: z.string().openapi({ description: '日志目录路径' }),
    currentLogFile: z.string().openapi({ description: '当前活跃的日志文件名' }),
  })
  .openapi({ description: '日志配置信息响应' })

export type LogConfigResponse = z.infer<typeof LogConfigResponseSchema>
