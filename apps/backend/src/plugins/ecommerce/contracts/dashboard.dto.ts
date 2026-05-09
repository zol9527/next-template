import { z } from 'zod'

export const DashboardStatsSchema = z.object({
  totalSales: z.string(),
  totalOrders: z.number(),
  growth: z.string(),
  salesOverview: z.array(z.object({
    name: z.string(),
    value: z.number(),
  })),
  recentCustomers: z.array(z.object({
    name: z.string(),
    activity: z.string(),
    time: z.string(),
    avatar: z.string(),
  })),
  dailyRevenue: z.string(),
  totalProducts: z.number(),
  totalUsers: z.number(),
  successRate: z.number(),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>
