/**
Function: formatDateTime

Description: 将 ISO 时间字符串格式化为本地日期时间字符串

Parameters:
    isoString(string): ISO 8601 格式的时间字符串

Returns:
    result(string): 格式化后的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
*/
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
Function: formatDate

Description: 将 ISO 时间字符串格式化为本地日期字符串

Parameters:
    isoString(string): ISO 8601 格式的时间字符串

Returns:
    result(string): 格式化后的日期字符串 (YYYY-MM-DD)
*/
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
