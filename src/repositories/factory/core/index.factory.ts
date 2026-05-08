/**
 * Repository Factory - Unified Entry Point
 *
 * @module repositories/factory
 * @description 统一 Repository 工厂入口，提供所有 Repository 的获取方法
 *
 * =============================================================================
 *
 * 架构设计:
 * - 根据 DATABASE_PROVIDER 环境变量动态选择底层实现
 * - 使用策略模式支持多种数据库提供商 (supabase / prisma / memory)
 * - 所有方法返回 Promise，支持异步操作
 *
 * =============================================================================
 *
 * 文件结构:
 * ```
 * factory/
 *   ├── index.factory.ts   # 统一导出入口
 *   ├── core.factory.ts    # 核心工具函数
 *   ├── auth.factory.ts    # 认证相关 (User, Session, RBAC, WeChat)
 *   ├── commerce.factory.ts# 电商相关 (Product, Category, MediaAsset)
 *   ├── coupon.factory.ts  # 优惠券相关 (Coupon, UserCoupon, Redemption)
 *   ├── order.factory.ts   # 订单相关 (Order, Payment, Idempotency, Fulfillment)
 *   ├── distribution.factory.ts # 分销相关 (Commission, Promoter, Code, Distribution)
 *   ├── settlement.factory.ts # 结算相关 (Settlement, Application)
 *   ├── system.factory.ts  # 系统相关 (SystemSettings)
 *   ├── site-management.factory.ts # 站点管理相关 (SiteConfig, Announcement, Agreement)
 *   ├── version-release.factory.ts # 版本发布相关 (VersionRelease)
 *   ├── user-document.factory.ts # 用户证件相关 (UserDocument)
 *   ├── miniprogram.factory.ts # 小程序相关 (MiniprogramCarousel)
 * ```
 *
 * =============================================================================
 *
 * 使用方式:
 *
 * 1. 直接导入需要的 Repository
 * ```typescript
 * import { getUserRepository, getOrderRepository } from '@/repositories/factory'
 *
 * const userRepo = await getUserRepository()
 * const orderRepo = await getOrderRepository()
 * ```
 *
 * 2. 按模块导入
 * ```typescript
 * import { getUserRepository } from '@/repositories/factory/core/auth.factory'
 * import { getOrderRepository } from '@/repositories/factory/commerce/order.factory'
 * ```
 *
 * =============================================================================
 */

export * from './core.factory'
export * from './admin.factory'
export * from './ai.factory'
export * from './auth.factory'
export * from './mfa.factory'
export * from '../commerce/commerce.factory'
export * from '../commerce/coupon.factory'
export * from '../commerce/order.factory'
export * from '../promotion/distribution.factory'
export * from '../promotion/settlement.factory'
export * from './system.factory'
export * from './site-management.factory'
export * from './export.factory'
export * from './backup-job.factory'
export * from './version-release.factory'
export * from './user-document.factory'
export * from './favorite.factory'
export * from './checkin.factory'
export * from './rate-limit.factory'
export * from '../wechat/miniprogram.factory'
export * from '../content/blog.factory'
export * from './feedback.factory'
