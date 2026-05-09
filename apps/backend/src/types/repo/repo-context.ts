import type { Logger } from 'pino'

/**
 * Repository 层执行上下文
 * 用于在 Service 层与 Repository 层之间传播 traceId 和 logger
 */
export interface RepoContext {
  /** 链路追踪 ID */
  traceId: string
  /** 已绑定 traceId 的 logger 实例，用于创建子 logger */
  logger: Logger
}
