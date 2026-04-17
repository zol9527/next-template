import { stringify } from 'csv-stringify/sync'

/**
 * CSV 列定义
 * @template T - 数据行类型
 */
export type CsvColumn<T> = {
  /** 列键（对应对象的属性名） */
  key: keyof T | string
  /** 表头名称 */
  header: string
  /** 可选的格式化函数 */
  formatter?: (value: unknown, row: T) => string
}

/**
 * CSV Writer 类
 * 用于将对象数组转换为 CSV 格式字符串
 * @template T - 数据行类型
 */
export class CsvWriter<T = Record<string, unknown>> {
  private columns: ReadonlyArray<CsvColumn<T>>

  /**
   * Function: constructor
   *
   * Description: 创建 CSV Writer 实例
   *
   * Parameters:
   * 	columns(Array<CsvColumn<T>>): CSV 列定义
   */
  constructor(columns: ReadonlyArray<CsvColumn<T>>) {
    this.columns = columns
  }

  /**
   * Function: toString
   *
   * Description: 将数据转换为 CSV 格式字符串
   *
   * Parameters:
   * 	data(Array<T>): 数据数组
   *
   * Returns:
   * 	csvString(string): CSV 字符串
   */
  toString(data: T[]): string {
    if (data.length === 0) {
      // 即使没有数据也返回表头
      return this.columns.map(c => c.header).join(',') + '\n'
    }

    const headers = this.columns.map(c => c.header)
    const rows = data.map(row =>
      this.columns.map(col => {
        const value = (row as Record<string, unknown>)[String(col.key)]
        return col.formatter ? col.formatter(value, row) : this.formatValue(value)
      })
    )

    return stringify([headers, ...rows])
  }

  /**
   * Function: formatValue
   *
   * Description: 格式化单个值为 CSV 安全字符串
   * - 处理 null/undefined
   * - 处理包含逗号/引号/换行的字符串
   *
   * Parameters:
   * 	value(unknown): 要格式化的值
   *
   * Returns:
   * 	formatted(string): CSV 安全字符串
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return ''
    }

    let str = String(value)

    // 防止 CSV 注入攻击（Formula Injection）
    // 如果以 =, +, -, @ 开头，Excel 会将其作为公式执行
    // 通过在前面添加单引号，强制将其作为文本处理
    if (/^[=\+\-@]/.test(str)) {
      str = `'${str}`
    }

    // 如果包含逗号、引号、换行，需要用引号包裹并转义内部引号
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  /**
   * Function: toBomString
   *
   * Description: 生成带 BOM 的 CSV 字符串（Excel 识别 UTF-8 需要）
   *
   * Parameters:
   * 	data(Array<T>): 数据数组
   *
   * Returns:
   * 	csvWithBom(string): 带 BOM 的 CSV 字符串
   */
  toBomString(data: T[]): string {
    return '\uFEFF' + this.toString(data)
  }

  /**
   * Function: getHeaderString
   *
   * Description: 获取 CSV 表头行字符串
   *
   * Returns:
   * 	headerLine(string): CSV 表头行（含换行符）
   */
  getHeaderString(): string {
    const headers = this.columns.map(c => c.header)
    return stringify([headers])
  }

  /**
   * Function: formatRows
   *
   * Description: 仅格式化数据行（不含表头），用于流式分批写入场景
   *
   * Parameters:
   * 	data(Array<T>): 数据数组
   *
   * Returns:
   * 	rowsString(string): CSV 数据行字符串
   */
  formatRows(data: T[]): string {
    if (data.length === 0) return ''

    const rows = data.map(row =>
      this.columns.map(col => {
        const value = (row as Record<string, unknown>)[String(col.key)]
        return col.formatter ? col.formatter(value, row) : this.formatValue(value)
      })
    )

    return stringify(rows)
  }
}

/**
 * Function: formatFenToYuan
 *
 * Description: 格式化金额（分转元，保留两位小数）
 *
 * Parameters:
 * 	fen(number | string): 金额（分）
 *
 * Returns:
 * 	yuan(string): 金额（元，两位小数）
 */
export function formatFenToYuan(fen: number | string): string {
  const yuan = typeof fen === 'string' ? parseFloat(fen) : fen
  return (yuan / 100).toFixed(2)
}

/**
 * Function: formatDateToYYYYMMDD
 *
 * Description: 格式化日期为 YYYY-MM-DD
 *
 * Parameters:
 * 	dateStr(string | null | undefined): ISO 日期字符串
 *
 * Returns:
 * 	formatted(string): 格式化后的日期 (YYYY-MM-DD)
 */
export function formatDateToYYYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

/**
 * Function: formatDateTime
 *
 * Description: 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 *
 * Parameters:
 * 	dateStr(string | null | undefined): ISO 日期时间字符串
 *
 * Returns:
 * 	formatted(string): 格式化后的日期时间
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', '')
}
