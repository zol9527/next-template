import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { DashboardStats } from '@/plugins/ecommerce/contracts/dashboard.dto'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { DashboardWidgetRegistry } from '@/services/core/dashboard-widget.interface'
import { DashboardWidgetRegistry as DashboardWidgetRegistryClass } from '@/services/core/dashboard-widget.interface'
import { memoryCache, CACHE_TTL } from '@/lib/cache/memory-cache'

export function createAdminDashboardService(
  deps: {
    orders: OrderRepository
    users: UserRepository
    products: ProductRepository
    /** 外部传入的 Widget 注册表，如果不传则自动创建并注册电商统计 Widget */
    widgetRegistry?: DashboardWidgetRegistry
  },
  ctx: ServiceContext,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  // 初始化 Widget 注册表
  const widgetRegistry = deps.widgetRegistry ?? new DashboardWidgetRegistryClass()

  // 当没有外部注册表时，自动注册电商统计 Widget
  if (!deps.widgetRegistry) {
    widgetRegistry.register({
      id: 'commerce-stats',
      name: '电商统计',
      async fetchData() {
        const [orderStats, productStats] = await Promise.all([
          deps.orders.getDashboardStats(repoCtx),
          deps.products.getGlobalStats(repoCtx),
        ])
        return {
          totalSales: orderStats.totalSales,
          totalOrders: orderStats.totalOrders,
          salesOverview: orderStats.monthlySales,
          dailyRevenue: orderStats.dailyRevenue,
          totalProducts: productStats.totalProducts,
          successRate: orderStats.successRate,
        }
      },
    })
  }

  return {
    async getStats(): Promise<DashboardStats> {
      const cacheKey = 'dashboard:stats'
      const cached = memoryCache.get<DashboardStats>(cacheKey)
      if (cached) {
        ctx.logger.debug({ action: 'admin_dashboard.get_stats', cacheHit: true })
        return cached
      }

      // 并行获取核心统计和 Widget 数据
      const [userStats, widgetData] = await Promise.all([
        deps.users.getGlobalStats(repoCtx),
        widgetRegistry.fetchAll(),
      ])

      const { items: recentUsers } = await deps.users.listUsers(repoCtx, { limit: 4, offset: 0 })

      const recentCustomers = recentUsers.map((u) => ({
        name: u.username || u.phone || u.email || 'Unknown',
        activity: u.userType === 'admin' ? 'Admin Action' : 'Customer Activity',
        time: new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: (u.username?.[0] || u.email?.[0] || 'U').toUpperCase(),
      }))

      const growth = '+12.5%'

      // 从 Widget 数据中提取电商统计（如果存在）
      const commerce = widgetData['commerce-stats'] ?? {}

      const result: DashboardStats = {
        totalSales: commerce.totalSales ?? '0',
        totalOrders: commerce.totalOrders ?? 0,
        growth,
        salesOverview: commerce.salesOverview ?? [],
        recentCustomers,
        dailyRevenue: commerce.dailyRevenue ?? '0',
        totalProducts: commerce.totalProducts ?? 0,
        totalUsers: userStats.totalUsers,
        successRate: commerce.successRate ?? 0,
      }

      memoryCache.set(cacheKey, result, CACHE_TTL.DASHBOARD_STATS)

      return result
    },
  }
}
