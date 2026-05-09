/**
 * 链路追踪工具模块
 */

/**
 * Function: generateTraceId
 *
 * Description: 生成链路追踪 ID，用于请求追踪和日志关联
 *
 * Returns:
 *   traceId(string): 符合 UUID v4 格式的追踪 ID
 */

/**
 * 生成 UUID v4 格式的链路追踪 ID
 * 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * @returns 追踪 ID
 */
export function generateTraceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成短格式的追踪 ID（16位）
 * 用于需要较短 ID 的场景
 * @returns 短格式追踪 ID
 */
export function generateShortTraceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * 请求头类型
 */
type Headers = Record<string, string>;

/**
 * Function: extractTraceId
 *
 * Description: 从请求头中提取 TraceId
 *
 * Parameters:
 *   headers(Headers): 请求头对象
 *
 * Returns:
 *   traceId(string | null): 追踪 ID
 */
export function extractTraceId(headers: Headers | null): string | null {
  if (!headers) return null;

  // 支持多种常见的追踪 ID 头部名称
  const traceIdKeys = [
    'x-trace-id',
    'x-request-id',
    'trace-id',
    'request-id',
    'x-traceid',
  ];

  for (const key of traceIdKeys) {
    const id = headers[key] || headers[key.toUpperCase()];
    if (id) {
      return id;
    }
  }

  return null;
}

/**
 * Function: isValidTraceId
 *
 * Description: 验证 TraceId 格式是否有效
 *
 * Parameters:
 *   traceId(string): 追踪 ID
 *
 * Returns:
 *   boolean: 是否有效
 */
export function isValidTraceId(traceId: string): boolean {
  if (typeof traceId !== 'string') return false;

  // UUID v4 格式验证
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(traceId);
}
