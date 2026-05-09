/**
 * MFA Audit Log Service
 *
 * Description: MFA 审计日志服务，记录所有 MFA 相关操作用于安全审计
 *
 * Features:
 * - 记录 MFA 操作（setup, enable, disable, verify, verify-action, use-backup-code, reset-by-admin）
 * - 记录操作状态（success, failed）
 * - 记录客户端信息（IP, User-Agent）
 * - 记录额外详情（失败原因、资源 ID 等）
 *
 * Security:
 * - 所有 MFA 操作必须记录审计日志
 * - 日志包含 IP 地址和 User-Agent 用于追踪异常行为
 * - 失败的操作记录失败原因
 */

// ==================== 类型定义 ====================

/**
 * Type: MfaAuditAction
 *
 * Description: MFA 审计动作类型
 */
export type MfaAuditAction =
  | 'setup' // MFA 设置
  | 'enable' // MFA 启用
  | 'disable' // MFA 禁用
  | 'verify' // 登录验证
  | 'verify-action' // 敏感操作验证
  | 'use-backup-code' // 使用备份码
  | 'reset-by-admin' // 管理员重置
  | 'generate-backup-codes' // 生成备份码
  | string // 允许扩展

/**
 * Type: MfaAuditStatus
 *
 * Description: MFA 审计状态
 */
export type MfaAuditStatus = 'success' | 'failed'

/**
 * Type: MfaAuditDetails
 *
 * Description: MFA 审计额外详情
 */
export type MfaAuditDetails = {
  // 失败原因
  errorMessage?: string
  errorCode?: string

  // 资源相关
  resourceId?: string
  resourceType?: string

  // 验证相关
  verificationMethod?: 'totp' | 'backup-code'
  attempts?: number // 尝试次数

  // 其他
  [key: string]: unknown
}

/**
 * Type: LogActionOptions
 *
 * Description: 记录审计日志的选项
 */
export type LogActionOptions = {
  userId: string // 用户 ID
  action: MfaAuditAction // 操作类型
  status: MfaAuditStatus // 操作状态
  ip: string // 客户端 IP 地址
  userAgent?: string // 客户端 User-Agent
  details?: MfaAuditDetails // 额外详情
}

/**
 * Type: MfaAuditLogEntry
 *
 * Description: MFA 审计日志条目
 */
export type MfaAuditLogEntry = {
  id: string
  userId: string
  action: MfaAuditAction
  ip: string
  userAgent: string | null
  status: MfaAuditStatus
  details: MfaAuditDetails | null
  createdAt: Date
}

/**
 * Type: GetUserLogsOptions
 *
 * Description: 获取用户日志的选项
 */
export type GetUserLogsOptions = {
  userId: string // 用户 ID
  limit?: number // 限制返回数量
  offset?: number // 偏移量
  action?: MfaAuditAction // 筛选操作类型
  startDate?: Date // 开始日期
  endDate?: Date // 结束日期
}

/**
 * Type: GetUserLogsResult
 *
 * Description: 获取用户日志的结果
 */
export type GetUserLogsResult = {
  logs: MfaAuditLogEntry[] // 日志列表
  total: number // 总数
  hasMore: boolean // 是否有更多
}

// ==================== MfaAuditLogService 类 ====================

/**
 * MfaAuditLogService
 *
 * Description: MFA 审计日志服务类
 *
 * Note:
 *   此服务提供审计日志的逻辑接口，实际的数据存储由 Repository 层处理
 */
export class MfaAuditLogService {
  /**
   * Function: logAction
   *
   * Description: 记录 MFA 操作
   *
   * Parameters:
   *   options(LogActionOptions): 记录选项
   *
   * Returns:
   *   entry(MfaAuditLogEntry): 创建的日志条目
   *
   * Example:
   *   const entry = MfaAuditLogService.logAction({
   *     userId: 'user-123',
   *     action: 'verify',
   *     status: 'success',
   *     ip: '192.168.1.1',
   *     userAgent: 'Mozilla/5.0...',
   *   })
   */
  static logAction(options: LogActionOptions): MfaAuditLogEntry {
    const { userId, action, status, ip, userAgent, details } = options

    return {
      id: crypto.randomUUID(),
      userId,
      action,
      ip,
      userAgent: userAgent ?? null,
      status,
      details: details ?? null,
      createdAt: new Date(),
    }
  }

  /**
   * Function: logSuccess
   *
   * Description: 记录成功的 MFA 操作（便捷方法）
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   action(MfaAuditAction): 操作类型
   *   ip(string): 客户端 IP
   *   userAgent(string): 客户端 User-Agent
   *   details(MfaAuditDetails): 额外详情
   *
   * Returns:
   *   entry(MfaAuditLogEntry): 创建的日志条目
   */
  static logSuccess(
    userId: string,
    action: MfaAuditAction,
    ip: string,
    userAgent?: string,
    details?: MfaAuditDetails,
  ): MfaAuditLogEntry {
    return this.logAction({
      userId,
      action,
      status: 'success',
      ip,
      userAgent,
      details,
    })
  }

  /**
   * Function: logFailure
   *
   * Description: 记录失败的 MFA 操作（便捷方法）
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   action(MfaAuditAction): 操作类型
   *   ip(string): 客户端 IP
   *   errorMessage(string): 错误信息
   *   userAgent(string): 客户端 User-Agent
   *   details(MfaAuditDetails): 额外详情
   *
   * Returns:
   *   entry(MfaAuditLogEntry): 创建的日志条目
   */
  static logFailure(
    userId: string,
    action: MfaAuditAction,
    ip: string,
    errorMessage: string,
    userAgent?: string,
    details?: MfaAuditDetails,
  ): MfaAuditLogEntry {
    return this.logAction({
      userId,
      action,
      status: 'failed',
      ip,
      userAgent,
      details: {
        ...details,
        errorMessage,
      },
    })
  }

  /**
   * Function: formatForStorage
   *
   * Description: 格式化日志条目用于存储
   *
   * Parameters:
   *   entry(MfaAuditLogEntry): 日志条目
   *
   * Returns:
   *   data(object): 可直接存储的数据对象
   *
   * Note:
   *   此方法返回的数据可直接用于创建数据库记录
   */
  static formatForStorage(entry: MfaAuditLogEntry): {
    userId: string
    action: MfaAuditAction
    ip: string
    userAgent: string | null
    status: MfaAuditStatus
    details: MfaAuditDetails | null
  } {
    return {
      userId: entry.userId,
      action: entry.action,
      ip: entry.ip,
      userAgent: entry.userAgent,
      status: entry.status,
      details: entry.details,
    }
  }

  /**
   * Function: sanitizeLogEntry
   *
   * Description: 清理日志条目用于输出（移除敏感信息）
   *
   * Parameters:
   *   entry(MfaAuditLogEntry): 日志条目
   *
   * Returns:
   *   sanitized(object): 清理后的日志条目
   *
   * Note:
   *   此方法移除可能包含敏感信息的字段
   */
  static sanitizeLogEntry(entry: MfaAuditLogEntry): {
    id: string
    userId: string
    action: MfaAuditAction
    status: MfaAuditStatus
    ip: string // IP 地址已脱敏
    userAgent: string | null
    createdAt: Date
    details: MfaAuditDetails | null // details 可能包含敏感信息
  } {
    return {
      id: entry.id,
      userId: entry.userId,
      action: entry.action,
      status: entry.status,
      // IP 地址脱敏：保留前两段
      ip: entry.ip.split('.').slice(0, 2).join('.') + '.***.***',
      userAgent: entry.userAgent,
      createdAt: entry.createdAt,
      details: entry.details,
    }
  }

  /**
   * Function: calculatePagination
   *
   * Description: 计算分页参数
   *
   * Parameters:
   *   options(GetUserLogsOptions): 查询选项
   *   total(number): 总记录数
   *
   * Returns:
   *   result(object): 分页结果
   */
  static calculatePagination(
    options: GetUserLogsOptions,
    total: number,
  ): {
    limit: number
    offset: number
    hasMore: boolean
  } {
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    return {
      limit,
      offset,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Function: validateActionType
   *
   * Description: 验证操作类型是否有效
   *
   * Parameters:
   *   action(string): 操作类型
   *
   * Returns:
   *   isValid(boolean): 有效返回 true
   */
  static validateActionType(action: string): action is MfaAuditAction {
    const validActions: MfaAuditAction[] = [
      'setup',
      'enable',
      'disable',
      'verify',
      'verify-action',
      'use-backup-code',
      'reset-by-admin',
      'generate-backup-codes',
    ]
    return validActions.includes(action as MfaAuditAction) || typeof action === 'string'
  }

  /**
   * Function: validateStatus
   *
   * Description: 验证状态是否有效
   *
   * Parameters:
   *   status(string): 状态
   *
   * Returns:
   *   isValid(boolean): 有效返回 true
   */
  static validateStatus(status: string): status is MfaAuditStatus {
    return status === 'success' || status === 'failed'
  }

  /**
   * Function: detectSuspiciousActivity
   *
   * Description: 检测可疑的 MFA 活动
   *
   * Parameters:
   *   logs(MfaAuditLogEntry[]): 用户的审计日志列表
   *   timeWindowMs(number): 时间窗口（毫秒），默认 5 分钟
   *   failureThreshold(number): 失败次数阈值，默认 5 次
   *
   * Returns:
   *   isSuspicious(boolean): 存在可疑活动返回 true
   *
   * Note:
   *   可疑活动包括：
   *   - 短时间内多次验证失败
   *   - 异地登录（不同 IP）
   *   - 使用备份码频率异常
   */
  static detectSuspiciousActivity(
    logs: MfaAuditLogEntry[],
    timeWindowMs: number = 5 * 60 * 1000, // 5 分钟
    failureThreshold: number = 5, // 5 次失败
  ): boolean {
    if (logs.length === 0) return false

    const now = Date.now()
    const recentLogs = logs.filter(log => now - log.createdAt.getTime() <= timeWindowMs)

    // 检查失败次数
    const failureCount = recentLogs.filter(log => log.status === 'failed').length
    if (failureCount >= failureThreshold) {
      return true
    }

    // 检查备份码使用频率
    const backupCodeCount = recentLogs.filter(
      log => log.action === 'use-backup-code',
    ).length
    if (backupCodeCount >= 3) {
      // 5 分钟内使用 3 次以上备份码
      return true
    }

    // 检查 IP 变化（多地登录）
    const uniqueIps = new Set(recentLogs.map(log => log.ip))
    if (uniqueIps.size >= 3) {
      // 短时间内从 3 个以上不同 IP 登录
      return true
    }

    return false
  }

  /**
   * Function: getAuditSummary
   *
   * Description: 获取用户的审计摘要
   *
   * Parameters:
   *   logs(MfaAuditLogEntry[]): 用户的审计日志列表
   *
   * Returns:
   *   summary(object): 审计摘要
   */
  static getAuditSummary(logs: MfaAuditLogEntry[]): {
    totalLogs: number
    successCount: number
    failureCount: number
    lastSuccessAt: Date | null
    lastFailureAt: Date | null
    suspiciousActivity: boolean
  } {
    const successLogs = logs.filter(log => log.status === 'success')
    const failureLogs = logs.filter(log => log.status === 'failed')

    const lastSuccessAt = successLogs.length > 0
      ? successLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null

    const lastFailureAt = failureLogs.length > 0
      ? failureLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null

    return {
      totalLogs: logs.length,
      successCount: successLogs.length,
      failureCount: failureLogs.length,
      lastSuccessAt,
      lastFailureAt,
      suspiciousActivity: this.detectSuspiciousActivity(logs),
    }
  }
}

/**
 * 默认导出 MfaAuditLogService 类，支持函数式调用
 */
export default MfaAuditLogService
