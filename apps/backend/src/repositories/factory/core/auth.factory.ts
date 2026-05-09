/**
 * Auth Repositories
 *
 * @module repositories/factory/auth
 * @description 认证与授权相关的 Repository 工厂函数
 *
 * 包含:
 * - UserRepository: 用户数据访问
 * - SessionRepository: 会话管理
 * - RbacRepository: 基于角色的权限控制
 * - WechatAccountRepository: 微信账号管理
 */

import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import { createPrismaUserRepository } from '@/repositories/prisma/core/user.repository'
import { createPrismaSessionRepository } from '@/repositories/prisma/core/session.repository'
import { createPrismaRbacRepository } from '@/repositories/prisma/core/rbac.repository'
import { createPrismaWechatAccountRepository } from '@/plugins/wechat/repositories/prisma/wechat-account.repository'
import { getProvider, PROVIDER_NAMES } from './core.factory'

/**
 * 创建用户仓库实例
 *
 * 根据环境变量 DATABASE_PROVIDER 动态选择底层实现:
 * - prisma: 使用 Prisma ORM (生产环境推荐)
 * - supabase: 使用 Supabase 客户端
 *
 * @returns Promise<UserRepository> 用户仓库实例
 */
export async function createUserRepository(): Promise<UserRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaUserRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseUserRepository } = await import(
      /* @vite-ignore */ '@/repositories/supabase/core/user.repository'
    )
    return createSupabaseUserRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建会话仓库实例
 *
 * @returns Promise<SessionRepository> 会话仓库实例
 */
export async function createSessionRepository(): Promise<SessionRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaSessionRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseSessionRepository } = await import(
      /* @vite-ignore */ '@/repositories/supabase/core/session.repository'
    )
    return createSupabaseSessionRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建 RBAC 仓库实例
 *
 * 基于角色的访问控制 (Role-Based Access Control) 仓库
 *
 * @returns Promise<RbacRepository> RBAC 仓库实例
 */
export async function createRbacRepository(): Promise<RbacRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaRbacRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseRbacRepository } = await import(
      /* @vite-ignore */ '@/repositories/supabase/core/rbac.repository'
    )
    return createSupabaseRbacRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建微信账号仓库实例
 *
 * @returns Promise<WechatAccountRepository> 微信账号仓库实例
 */
export async function createWechatAccountRepository(): Promise<WechatAccountRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaWechatAccountRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseWechatAccountRepository } = await import(
      /* @vite-ignore */ '@/plugins/wechat/repositories/supabase/wechat-account.repository'
    )
    return createSupabaseWechatAccountRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
