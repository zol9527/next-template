/**
 * 签到连续天数计算工具
 *
 * 时区：UTC+8 硬编码（决策 D8）
 * 所有日期计算基于北京时间
 */

// 时区偏移：UTC+8
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Function: getTodayInTimezone
 *
 * Description: 获取北京时间今天的日期（去掉时间部分）
 *
 * Returns:
 *     result(Date): Date 对象，时间为当天 00:00:00 UTC（但代表的是北京时间的那一天）
 */
export function getTodayInTimezone(): Date {
  const now = new Date()
  const utcMs = now.getTime() + TIMEZONE_OFFSET_MS
  const beijingNow = new Date(utcMs)
  return new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate()))
}

/**
 * Function: isSameDay
 *
 * Description: 判断两个日期是否是同一天（基于 UTC+8 时区）
 *
 * Parameters:
 *     a(Date): 第一个日期
 *     b(Date): 第二个日期
 *
 * Returns:
 *     result(boolean): 是否是同一天
 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime() // both are normalized to midnight UTC representing Beijing date
}

/**
 * Function: isNextDay
 *
 * Description: 判断 dateB 是否是 dateA 的下一天
 *
 * Parameters:
 *     dateA(Date): 基准日期
 *     dateB(Date): 待判断的日期
 *
 * Returns:
 *     result(boolean): dateB 是否是 dateA 的下一天
 */
export function isNextDay(dateA: Date, dateB: Date): boolean {
  const nextDay = new Date(dateA.getTime() + 24 * 60 * 60 * 1000)
  return dateB.getTime() === nextDay.getTime()
}

/**
 * Function: calculateNewStreak
 *
 * Description: 计算新的连续签到天数
 *
 * Parameters:
 *     currentStreak(number): 当前连续天数
 *     lastCheckinDate(Date | null): 上次签到日期（北京时间）
 *     today(Date): 今天的日期（北京时间）
 *
 * Returns:
 *     result(number): 新的连续天数（如果今天还没签到且在连续中，返回 currentStreak + 1）
 */
export function calculateNewStreak(
  currentStreak: number,
  lastCheckinDate: Date | null,
  today: Date
): number {
  // 首次签到
  if (!lastCheckinDate) {
    return 1
  }

  // 今天已经签到过了（streak 不变）
  if (isSameDay(lastCheckinDate, today)) {
    return currentStreak
  }

  // 昨天签到了 → 连续 +1
  if (isNextDay(lastCheckinDate, today)) {
    return currentStreak + 1
  }

  // 中断了 → 重新开始
  return 1
}

/**
 * Function: parseMonth
 *
 * Description: 验证月份字符串格式
 *
 * Parameters:
 *     month(string): 格式 YYYY-MM
 *
 * Returns:
 *     result({ year: number, month: number } | null): 解析结果，无效时返回 null
 */
export function parseMonth(month: string): { year: number; month: number } | null {
  const match = month.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = parseInt(match[1], 10)
  const monthNum = parseInt(match[2], 10)

  if (monthNum < 1 || monthNum > 12) return null
  if (year < 2000 || year > 2100) return null

  return { year, month: monthNum }
}
