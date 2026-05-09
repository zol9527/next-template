import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// 签到状态响应 Schema
export const CheckinStatusSchema = z
  .object({
    todayCheckedIn: z.boolean().openapi({ description: '今日是否已签到' }),
    streakDays: z.number().int().openapi({ description: '连续签到天数' }),
    totalDays: z.number().int().openapi({ description: '累计签到天数' }),
    lastCheckinDate: z.string().nullable().openapi({ description: '上次签到日期（ISO 8601）' }),
  })
  .openapi({ description: '签到状态响应' })

export type CheckinStatus = z.infer<typeof CheckinStatusSchema>

// 签到响应 Schema
export const CheckinResponseSchema = z
  .object({
    success: z.literal(true).openapi({ description: '签到是否成功' }),
    streakDays: z.number().int().openapi({ description: '连续签到天数' }),
    reward: z
      .object({
        points: z.number().openapi({ description: '奖励积分' }),
        coupons: z.array(z.string()).openapi({ description: '奖励优惠券代码列表' }),
      })
      .nullable()
      .optional()
      .openapi({ description: '签到奖励（可选）' }),
  })
  .openapi({ description: '签到响应' })

export type CheckinResponse = z.infer<typeof CheckinResponseSchema>

// 签到历史查询参数 Schema
export const CheckinHistoryQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, '格式: YYYY-MM')
      .openapi({ description: '查询月份，格式：YYYY-MM' }),
  })
  .openapi({ description: '签到历史查询参数' })

export type CheckinHistoryQuery = z.infer<typeof CheckinHistoryQuerySchema>

// 签到历史响应 Schema
export const CheckinHistorySchema = z
  .object({
    month: z.string().openapi({ description: '月份（YYYY-MM）' }),
    days: z.array(z.string()).openapi({ description: '已签到的日期列表（YYYY-MM-DD 格式）' }),
  })
  .openapi({ description: '签到历史响应' })

export type CheckinHistory = z.infer<typeof CheckinHistorySchema>
