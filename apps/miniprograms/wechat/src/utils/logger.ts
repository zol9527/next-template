/**
 * Function: createLogger
 *
 * Description: 创建结构化日志记录器，支持敏感信息脱敏、子日志器、请求追踪等功能
 *
 * Parameters:
 *   context(object): 上下文信息
 *
 * Returns:
 *   logger(object): 日志记录器实例
 */

import { SENSITIVE_KEYS, LogLevel as LogLevelConst, type LogLevelType } from '../config/constants';

// 导出类型别名，保持向后兼容
export type LogLevel = LogLevelType;

export interface LoggerOptions {
  /** 日志级别 */
  level?: LogLevel;
  /** 上下文信息 */
  context?: Record<string, unknown>;
  /** 是否启用颜色输出（开发环境） */
  enableColors?: boolean;
  /** 是否启用时间戳 */
  enableTimestamp?: boolean;
}

export interface LoggerInstance {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): LoggerInstance;
  setLevel(level: LogLevel): void;
  getTraceId(): string | undefined;
  withTraceId(traceId: string): LoggerInstance;
}

// 敏感字段列表（从统一配置导入）
const SENSITIVE_FIELDS = SENSITIVE_KEYS;

// 日志级别优先级
const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevelConst.DEBUG]: 0,
  [LogLevelConst.INFO]: 1,
  [LogLevelConst.WARN]: 2,
  [LogLevelConst.ERROR]: 3,
};

// 控制台颜色（仅开发环境）
const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

/**
 * Function: sanitize
 *
 * Description: 脱敏处理敏感字段
 *
 * Parameters:
 *   obj(Record<string, unknown>): 待处理对象
 *   depth(number): 递归深度，默认最大 5 层
 *
 * Returns:
 *   result(Record<string, unknown>): 脱敏后的对象
 */
function sanitize(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 5) return obj; // 防止无限递归

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitize(value as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitize(item as Record<string, unknown>, depth + 1) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Function: formatError
 *
 * Description: 格式化错误对象
 *
 * Parameters:
 *   error(unknown): 错误对象
 *
 * Returns:
 *   result(Record<string, unknown>): 格式化后的错误信息
 */
function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // 只取前 5 行堆栈
    };
  }
  return { error: String(error) };
}

/**
 * Function: createLogger
 *
 * Description: 创建日志记录器实例
 *
 * Parameters:
 *   options(LoggerOptions): 配置选项
 *
 * Returns:
 *   logger(LoggerInstance): 日志记录器实例
 */
export function createLogger(options: LoggerOptions = {}): LoggerInstance {
  const { level = 'debug', context = {}, enableColors = true, enableTimestamp = true } = options;

  let currentLevel = level;
  let currentContext = { ...context };

  /**
   * 检查是否应该记录该级别的日志
   */
  const shouldLog = (logLevel: LogLevel): boolean => {
    return LOG_LEVELS[logLevel] >= LOG_LEVELS[currentLevel];
  };

  /**
   * 格式化日志消息
   */
  const formatMessage = (
    logLevel: LogLevel,
    message: string,
    ctx?: Record<string, unknown>
  ): { formatted: string; data: Record<string, unknown> } => {
    const timestamp = enableTimestamp ? new Date().toISOString() : '';
    const mergedContext = sanitize({ ...currentContext, ...ctx });

    // 结构化日志数据
    const data: Record<string, unknown> = {
      timestamp,
      level: logLevel,
      message,
      ...mergedContext,
    };

    // 格式化输出字符串
    const contextStr = Object.keys(mergedContext).length ? ` ${JSON.stringify(mergedContext)}` : '';
    const color = enableColors ? COLORS[logLevel] : '';
    const reset = enableColors ? COLORS.reset : '';
    const levelTag = `[${logLevel.toUpperCase()}]`.padEnd(7);
    const formatted = `${color}${timestamp} ${levelTag}${reset} ${message}${contextStr}`;

    return { formatted, data };
  };

  const instance: LoggerInstance = {
    debug(message: string, ctx?: Record<string, unknown>) {
      if (!shouldLog('debug')) return;
      const { formatted } = formatMessage('debug', message, ctx);
      console.debug(formatted);
    },

    info(message: string, ctx?: Record<string, unknown>) {
      if (!shouldLog('info')) return;
      const { formatted } = formatMessage('info', message, ctx);
      console.info(formatted);
    },

    warn(message: string, ctx?: Record<string, unknown>) {
      if (!shouldLog('warn')) return;
      const { formatted } = formatMessage('warn', message, ctx);
      console.warn(formatted);
    },

    error(message: string, error?: unknown, ctx?: Record<string, unknown>) {
      if (!shouldLog('error')) return;
      const errorInfo = error ? formatError(error) : {};
      const { formatted } = formatMessage('error', message, { ...ctx, ...errorInfo });
      console.error(formatted);
    },

    child(ctx: Record<string, unknown>): LoggerInstance {
      return createLogger({
        level: currentLevel,
        context: { ...currentContext, ...ctx },
        enableColors,
        enableTimestamp,
      });
    },

    setLevel(newLevel: LogLevel) {
      currentLevel = newLevel;
    },

    getTraceId(): string | undefined {
      return currentContext.traceId as string | undefined;
    },

    withTraceId(traceId: string): LoggerInstance {
      return this.child({ traceId });
    },
  };

  return instance;
}

/**
 * 全局默认日志器实例
 */
export const logger = createLogger();

/**
 * Function: createRequestLogger
 *
 * Description: 创建请求日志器，自动添加 traceId
 *
 * Parameters:
 *   traceId(string): 请求追踪 ID
 *   context(Record<string, unknown>): 额外上下文
 *
 * Returns:
 *   logger(LoggerInstance): 带有 traceId 的日志器
 */
export function createRequestLogger(traceId: string, context?: Record<string, unknown>): LoggerInstance {
  return createLogger({
    context: {
      traceId,
      ...context,
    },
  });
}
