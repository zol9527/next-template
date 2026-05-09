import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// 签到统计 Schema
export const CheckinStatsSchema = z
  .object({
    todayCount: z.number().int().openapi({ description: '今日签到人数' }),
    activeStreakUsers: z.number().int().openapi({ description: '活跃连续签到用户数' }),
    totalCheckinUsers: z.number().int().openapi({ description: '累计签到用户数' }),
    trend: z
      .array(
        z.object({
          date: z.string().openapi({ description: '日期（YYYY-MM-DD）' }),
          count: z.number().int().openapi({ description: '该日签到人数' }),
        })
      )
      .openapi({ description: '签到趋势（按日期聚合）' }),
  })
  .openapi({ description: '签到统计响应' })

export type CheckinStats = z.infer<typeof CheckinStatsSchema>
