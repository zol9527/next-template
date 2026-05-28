/**
 * File: src/app/api/v1/_shared/use-api-auth.ts
 * Description: API 层语义化认证 Hook，提供类似前端 useAuth 的调用体验
 *
 * NOTE: 虽然函数名以 'use' 开头，但这是 API 层的工具函数，不是 React Hook
 */

/* eslint-disable react-hooks/rules-of-hooks */

import type { NextRequest } from 'next/server'
import type { ServiceContext } from '@/types/service/service-context'
import { createServiceContext } from '@/types/service/service-context'
import type { MeResponse } from '@/contracts/dtos/auth/me.dto'
import { UnauthorizedError, ForbiddenError, MfaRequiredError } from '@/lib/errors/app-error'
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/token'
import { TokenManager } from '@/lib/security/token-manager'
import { createAuth } from '../auth/auth-deps'
import { createAccessManager, type AccessManager } from '@/lib/auth/access-manager'
import type { Grant } from '@/config/access'

function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/v1/admin')
}

function isMfaExemptAdminApiPath(pathname: string): boolean {
  // 允许在“被强制 MFA”时仍可访问的接口：MFA 设置/豁免/角色策略，以及个人 MFA 设置流程。
  // 否则用户将无法完成 MFA 绑定，形成死锁。
  return (
    pathname.startsWith('/api/v1/admin/me/mfa') ||
    pathname.startsWith('/api/v1/admin/mfa')
  )
}

/**
 * Interface: ApiAuthContext
 *
 * Description: API 认证上下文，提供用户信息和权限检查方法
 *
 * Properties:
 *     userId(string): 用户 ID
 *     sessionId(string): 会话 ID
 *     roles(string[]): 用户角色列表
 *     access(AccessManager): 结构化访问控制管理器
 *     hasRole(function): 角色检查方法
 *     assertRole(function): 角色断言方法（失败抛出 403）
 *     getMe(function): 获取完整用户信息
 */
export interface ApiAuthContext {
  userId: string
  sessionId: string
  roles: string[]
  access: AccessManager

  hasRole: (role: string) => boolean
  assertRole: (role: string) => void
  getMe: () => Promise<MeResponse>
}

/**
 * Function: useApiAuth
 *
 * Description: 创建 API 认证上下文（类似前端 useAuth）
 *              验证用户身份并返回权限检查方法
 *
 * Parameters:
 *     req(NextRequest): Next.js 请求对象
 *     ctx(ServiceContext): Service 上下文（可选，向后兼容）
 *
 * Returns:
 *     ApiAuthContext: API 认证上下文
 *
 * Throws:
 *     UnauthorizedError: 未登录或 token 无效
 *
 * Example:
 *     const auth = await useApiAuth(req)
 *     await auth.assertPermission('users.read')
 */
export async function useApiAuth(
  req: NextRequest,
  ctx?: ServiceContext
): Promise<ApiAuthContext> {
  // 从 Cookie 或 Authorization Header 获取 token
  const cookieToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const authHeader = req.headers.get('authorization')
  const bearerToken = (() => {
    if (!authHeader) return undefined
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() !== 'bearer') return undefined
    return token
  })()

  const token = cookieToken || bearerToken
  if (!token) {
    throw new UnauthorizedError()
  }

  // 验证 token
  let tokenResult: Awaited<ReturnType<typeof TokenManager.verifyAccessToken>>
  try {
    tokenResult = await TokenManager.verifyAccessToken(token)
  } catch {
    throw new UnauthorizedError('登录已过期，请重新登录')
  }
  if (!tokenResult.userId || !tokenResult.sessionId) {
    throw new UnauthorizedError()
  }

  // 类型守卫：确保 userId 和 sessionId 是 string
  const userId: string = tokenResult.userId
  const sessionId: string = tokenResult.sessionId

  // 如果没有提供 ctx，创建一个临时的（向后兼容）
  const serviceCtx = ctx || createServiceContext(
    'temp',
    (await import('@/lib/logger')).createRequestLogger({
      traceId: 'temp',
      method: req.method,
      pathname: req.nextUrl.pathname,
      ip: null,
      action: null,
    }),
    req
  )

  // 创建 AuthService
  const auth = await createAuth(serviceCtx)

  // 校验 session 仍然有效
  await auth.assertAccessSessionActive({
    userId,
    sessionId,
  })

  // ==================== 管理后台 MFA 强制策略检查 ====================
  // 说明：这是 API 层的"最后一道门"。当全局/角色策略要求 MFA，但用户未启用 MFA 时，
  // 除 MFA 相关接口外，直接拒绝访问。
  const pathname = req.nextUrl.pathname
  const roles = tokenResult.roles || []

  // 本地开发跳过开关：避免不必要的数据库查询
  const { env: appEnv } = await import('@/config')
  const mfaSkipEnabled = appEnv.MFA_SKIP_ENABLED && process.env.NODE_ENV !== 'production'

  if (
    !mfaSkipEnabled &&
    isAdminApiPath(pathname) &&
    roles.includes('admin') &&
    !isMfaExemptAdminApiPath(pathname)
  ) {
    const { createMfaPolicyRepository } = await import('@/repositories/factory/core/mfa-policy.factory')
    const { createMfaRepository } = await import('@/repositories/factory')
    const { createMfaPolicyService } = await import('@/services/core/mfa-policy.service')

    const mfaPolicyRepo = createMfaPolicyRepository()
    const mfaPolicyService = createMfaPolicyService({ mfaRepo: mfaPolicyRepo }, serviceCtx)

    const required = await mfaPolicyService.checkMfaRequired(userId, roles)
    if (required) {
      const mfaRepo = await createMfaRepository()
      const mfaData = await mfaRepo.getUserMfaData(serviceCtx, { userId })

      if (!mfaData?.mfaEnabled) {
        throw new MfaRequiredError('系统已启用多因素认证，请先完成 MFA 设置')
      }
    }
  }

  // 内部缓存
  let _me: MeResponse | null = null

  const { createRbacRepository } = await import('@/repositories/factory/core/auth.factory')
  const rbacRepo = await createRbacRepository()
  const rbacCtx = { traceId: serviceCtx.traceId, logger: serviceCtx.logger }

  // 从数据库加载角色和权限，避免使用 JWT 中可能过期的角色信息
  const [_grants, _roleRecords] = await Promise.all([
    rbacRepo.getGrantsForUser(rbacCtx, { userId }),
    rbacRepo.getRolesForUser(rbacCtx, { userId }),
  ])
  const _dbRoleNames = _roleRecords.map((r) => r.name)
  const _accessManager = createAccessManager(_grants)

  return {
    userId,
    sessionId,
    roles: _dbRoleNames,
    access: _accessManager,

    hasRole: (role: string) => {
      return _dbRoleNames.includes(role)
    },

    assertRole: (role: string) => {
      if (!_dbRoleNames.includes(role)) {
        throw new ForbiddenError()
      }
    },

    getMe: async () => {
      if (_me) return _me
      _me = await auth.getMe(userId)
      return _me
    },
  }
}
