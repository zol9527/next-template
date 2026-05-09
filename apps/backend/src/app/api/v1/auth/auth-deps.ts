import { createAuthService, type WechatOauthProvider } from '@/services/core/auth.service'
import { createUserRepository, createSessionRepository, createWechatAccountRepository, createRbacRepository } from '@/repositories/factory'
import { code2Session } from '@/lib/wechat/oauth'
import type { ServiceContext } from '@/types/service/service-context'

/**
 * 认证服务依赖注入工厂
 *
 * @param ctx - Service 上下文，包含 traceId 和 logger
 * @returns 已配置上下文的 AuthService 实例
 */
export async function createAuth(ctx: ServiceContext) {
  const [users, sessions, wechatAccounts, rbac] = await Promise.all([
    createUserRepository(),
    createSessionRepository(),
    createWechatAccountRepository(),
    createRbacRepository(),
  ])

  const wechatOauth: WechatOauthProvider = { code2Session }

  return createAuthService(
    {
      users,
      sessions,
      wechatAccounts,
      rbac,
      wechatOauth,
    },
    ctx,
  )
}
