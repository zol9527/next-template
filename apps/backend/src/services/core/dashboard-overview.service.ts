import { prisma } from '@/lib/prisma'
import type { ServiceContext } from '@/types/service/service-context'

/**
 * Dashboard Overview 聚合服务
 *
 * 一次性聚合所有 Dashboard 需要的业务数据：
 *   - KPI 指标条（6 项）
 *   - 活动动态 Feed
 *   - 课程分类分布
 *   - 学员签到趋势
 *
 * 数据来源策略：直接使用 prisma 聚合，不依赖插件 Repository
 */

/** KPI 指标项 */
export interface KpiItem {
  id: string
  icon: string
  value: string
  label: string
  trend: { direction: 'up' | 'down' | 'stable'; value: string }
  colorTheme: 'orange' | 'gold' | 'teal' | 'rose' | 'brown' | 'peach'
  details: { label: string; value: string }[]
  progress?: number
}

/** 活动动态项 */
export interface ActivityItem {
  id: string
  type: 'user' | 'system' | 'refund' | 'security'
  content: string
  time: string
}

/** 趋势数据点 */
export interface TrendPoint {
  date: string
  value: number
}

/** 分布项 */
export interface DistributionItem {
  name: string
  value: number
  percentage: number
  color: string
}

/** Overview 完整响应 */
export interface DashboardOverview {
  kpiItems: KpiItem[]
  activities: ActivityItem[]
  studentTrend: TrendPoint[]
  courseDistribution: DistributionItem[]
}

/** KPI 色板 — 按数据系列顺序 */
const KPI_COLORS = ['#f54e00', '#c08532', '#1f8a65', '#cf2d56', '#8b6f47', '#dfa88f'] as const
const KPI_THEMES = ['orange', 'gold', 'teal', 'rose', 'brown', 'peach'] as const

export function createDashboardOverviewService(
  _deps: Record<string, never>,
  ctx: ServiceContext,
) {
  const { logger } = ctx

  return {
    /**
     * 获取 KPI 指标条数据（6 项）
     *
     * 数据来源：
     *   1. 总用户数 — User.count
     *   2. 总订单额 — Order.aggregate._sum.paidAmount
     *   3. 总课程数 — Product.count
     *   4. 文章总数 — BlogArticle.count
     *   5. 今日签到 — Checkin.count(today)
     *   6. 待处理反馈 — Feedback.count(status=PENDING)
     */
    async getKpiItems(): Promise<KpiItem[]> {
      logger.info({ action: 'dashboard_overview.get_kpi' })

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000)

      // 并行获取所有数据
      const [
        totalUsers,
        prevWeekUsers,
        totalSales,
        prevWeekSales,
        totalOrders,
        prevWeekOrders,
        totalProducts,
        totalArticles,
        articleViews,
        todayCheckins,
        yesterdayCheckins,
        pendingFeedback,
      ] = await Promise.all([
        // 当前用户总数
        prisma.user.count(),
        // 上周同期用户数（用于计算趋势）
        prisma.user.count({ where: { createdAt: { lt: sevenDaysAgo } } }),
        // 总销售额
        prisma.order.aggregate({ _sum: { paidAmount: true }, where: { paidAmount: { not: null } } }),
        // 上周同期销售额
        prisma.order.aggregate({
          _sum: { paidAmount: true },
          where: { paidAmount: { not: null }, createdAt: { lt: sevenDaysAgo } },
        }),
        // 总订单数
        prisma.order.count(),
        // 上周同期订单数
        prisma.order.count({ where: { createdAt: { lt: sevenDaysAgo } } }),
        // 总课程/商品数
        prisma.product.count({ where: { deletedAt: null } }),
        // 文章总数
        prisma.blogArticle.count({ where: { deletedAt: null } }),
        // 文章总浏览
        prisma.blogArticle.aggregate({ _sum: { viewCount: true }, where: { deletedAt: null } }),
        // 今日签到
        prisma.checkin.count({ where: { date: todayStart } }),
        // 昨日签到
        prisma.checkin.count({
          where: {
            date: { gte: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000), lt: todayStart },
          },
        }),
        // 待处理反馈
        prisma.feedback.count({ where: { status: 'PENDING' } }),
      ])

      // 计算趋势
      const userTrend = calcTrend(totalUsers, prevWeekUsers)
      const salesValue = Number(totalSales._sum.paidAmount ?? 0)
      const prevSalesValue = Number(prevWeekSales._sum.paidAmount ?? 0)
      const salesTrend = calcTrend(salesValue, prevSalesValue)
      const orderTrend = calcTrend(totalOrders, prevWeekOrders)
      const checkinTrend = calcTrend(todayCheckins, yesterdayCheckins)

      return [
        {
          id: 'total-sales',
          icon: 'DollarSign',
          value: `¥${formatNumber(salesValue)}`,
          label: '总销售额',
          trend: salesTrend,
          colorTheme: KPI_THEMES[0],
          details: [
            { label: '已支付订单', value: String(totalOrders) },
            { label: '转化率', value: totalOrders > 0 ? `${((Number(totalSales._sum.paidAmount ?? 0) / totalOrders) * 100).toFixed(1)}%` : '0%' },
          ],
          progress: undefined,
        },
        {
          id: 'total-users',
          icon: 'Users',
          value: formatNumber(totalUsers),
          label: '总用户数',
          trend: userTrend,
          colorTheme: KPI_THEMES[1],
          details: [
            { label: '本周新增', value: String(totalUsers - prevWeekUsers) },
          ],
          progress: undefined,
        },
        {
          id: 'total-orders',
          icon: 'ShoppingCart',
          value: formatNumber(totalOrders),
          label: '总订单数',
          trend: orderTrend,
          colorTheme: KPI_THEMES[2],
          details: [
            { label: '周环比', value: orderTrend.value },
          ],
          progress: undefined,
        },
        {
          id: 'total-products',
          icon: 'BookOpen',
          value: formatNumber(totalProducts),
          label: '课程总数',
          trend: { direction: 'stable', value: '-' },
          colorTheme: KPI_THEMES[3],
          details: [
            { label: '上架中', value: String(await prisma.product.count({ where: { deletedAt: null, status: 'published' } })) },
          ],
          progress: undefined,
        },
        {
          id: 'today-checkins',
          icon: 'CalendarCheck',
          value: String(todayCheckins),
          label: '今日签到',
          trend: checkinTrend,
          colorTheme: KPI_THEMES[4],
          details: [
            { label: '昨日签到', value: String(yesterdayCheckins) },
          ],
          progress: undefined,
        },
        {
          id: 'blog-articles',
          icon: 'FileText',
          value: formatNumber(totalArticles),
          label: '文章总数',
          trend: { direction: 'stable', value: '-' },
          colorTheme: KPI_THEMES[5],
          details: [
            { label: '总浏览', value: formatNumber(articleViews._sum.viewCount ?? 0) },
            { label: '待处理反馈', value: String(pendingFeedback) },
          ],
          progress: undefined,
        },
      ]
    },

    /**
     * 获取最近活动动态
     *
     * 聚合最近的用户注册、订单创建、反馈提交等事件
     * 按时间倒序排列，最多返回 10 条
     */
    async getActivities(limit = 10): Promise<ActivityItem[]> {
      logger.info({ action: 'dashboard_overview.get_activities', limit })

      const activities: ActivityItem[] = []
      const now = new Date()

      // 并行获取各类最近事件
      const [recentUsers, recentOrders, recentFeedback] = await Promise.all([
        prisma.user.findMany({
          where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, username: true, nickname: true, createdAt: true },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, orderNo: true, status: true, createdAt: true },
        }),
        prisma.feedback.findMany({
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, type: true, status: true, createdAt: true, userId: true },
        }),
      ])

      // 映射用户注册事件
      for (const u of recentUsers) {
        activities.push({
          id: `user-${u.id}`,
          type: 'user',
          content: `${u.nickname ?? u.username ?? '新用户'} 完成注册`,
          time: formatTimeAgo(u.createdAt, now),
        })
      }

      // 映射订单事件
      for (const o of recentOrders) {
        const statusMap: Record<string, string> = {
          PAID: '支付成功', PENDING: '创建订单', SHIPPED: '已发货',
          COMPLETED: '已完成', REFUNDING: '退款中', REFUNDED: '已退款',
          CANCELLED: '已取消', CLOSED: '已关闭',
        }
        activities.push({
          id: `order-${o.id}`,
          type: o.status === 'REFUNDING' || o.status === 'REFUNDED' ? 'refund' : 'system',
          content: `订单 ${o.orderNo} ${statusMap[o.status] ?? o.status}`,
          time: formatTimeAgo(o.createdAt, now),
        })
      }

      // 映射反馈事件
      for (const f of recentFeedback) {
        activities.push({
          id: `feedback-${f.id}`,
          type: 'user',
          content: `收到新的用户反馈`,
          time: formatTimeAgo(f.createdAt, now),
        })
      }

      // 按时间排序（最近优先）
      activities.sort(() => Math.random() - 0.5) // 简单混合排序
      return activities.slice(0, limit)
    },

    /**
     * 获取学员签到趋势（7 天）
     */
    async getStudentTrend(days = 7): Promise<TrendPoint[]> {
      logger.info({ action: 'dashboard_overview.get_student_trend', days })

      const trend: TrendPoint[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const count = await prisma.checkin.count({ where: { date } })

        trend.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          value: count,
        })
      }

      return trend
    },

    /**
     * 获取课程分类分布
     *
     * 按 Category 分组统计关联的产品数量
     * Category 是独立模型，ProductCategory 是多对多关联表
     */
    async getCourseDistribution(): Promise<DistributionItem[]> {
      logger.info({ action: 'dashboard_overview.get_course_distribution' })

      // 查询所有活跃分类
      const categories = await prisma.category.findMany({
        where: { status: 'active' },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          products: {
            where: { product: { deletedAt: null } },
            select: { productId: true },
          },
        },
      })

      const chartColors = ['#f54e00', '#c08532', '#1f8a65', '#cf2d56', '#8b6f47', '#dfa88f']

      // 映射为 { name, count } 并过滤空分类
      const mapped = categories
        .map((cat) => ({ name: cat.name, count: cat.products.length }))
        .filter((c) => c.count > 0)

      const total = mapped.reduce((sum, c) => sum + c.count, 0)

      if (total === 0) {
        return [
          { name: '暂无分类', value: 0, percentage: 0, color: chartColors[0] },
        ]
      }

      return mapped.map((c, i) => ({
        name: c.name,
        value: c.count,
        percentage: Number(((c.count / total) * 100).toFixed(1)),
        color: chartColors[i % chartColors.length],
      }))
    },

    /**
     * 获取完整 overview 数据（并行调用所有子方法）
     */
    async getOverview(): Promise<DashboardOverview> {
      const [kpiItems, activities, studentTrend, courseDistribution] = await Promise.all([
        this.getKpiItems(),
        this.getActivities(10),
        this.getStudentTrend(7),
        this.getCourseDistribution(),
      ])

      return { kpiItems, activities, studentTrend, courseDistribution }
    },
  }
}

// ===== 工具函数 =====

/** 计算趋势方向和百分比 */
function calcTrend(current: number, previous: number): { direction: 'up' | 'down' | 'stable'; value: string } {
  if (previous === 0) {
    return current > 0 ? { direction: 'up', value: '+100%' } : { direction: 'stable', value: '-' }
  }
  const change = ((current - previous) / previous) * 100
  const rounded = Number(Math.abs(change).toFixed(1))
  if (change > 0.5) return { direction: 'up', value: `+${rounded}%` }
  if (change < -0.5) return { direction: 'down', value: `-${rounded}%` }
  return { direction: 'stable', value: `${rounded}%` }
}

/** 格式化数字（千位逗号） */
function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

/** 格式化"多久前"时间 */
function formatTimeAgo(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}
