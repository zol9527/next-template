export type DecimalParseOptions = {
  scale: number
  allowZero?: boolean
}

export class DecimalParseError extends Error {
  public readonly code: 'INVALID_SCALE' | 'INVALID_FORMAT' | 'INVALID_AMOUNT'

  constructor(code: DecimalParseError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
Function: pow10BigInt

Description: 计算 10 的 scale 次方并返回 bigint，用于十进制缩放与格式化

Parameters:
	scale(number): 10 的指数（必须为非负整数）

Returns:
	result(bigint): 10^scale 的 bigint 值
*/
function pow10BigInt(scale: number): bigint {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new DecimalParseError('INVALID_SCALE', 'Invalid scale')
  }

  let result = BigInt(1)
  for (let i = 0; i < scale; i += 1) {
    result *= BigInt(10)
  }

  return result
}

/**
Function: parseDecimalToScaledInt

Description: 将非负十进制金额字符串按指定精度转换为缩放后的 bigint（例如 scale=2 表示分）

Parameters:
	value(string): 十进制字符串（仅允许非负，最多 scale 位小数）
	options(DecimalParseOptions): 解析选项（精度与是否允许 0）

Returns:
	scaled(bigint): 按 10^scale 缩放后的整数值
*/
export function parseDecimalToScaledInt(value: string, options: DecimalParseOptions): bigint {
  if (!Number.isInteger(options.scale) || options.scale < 0) {
    throw new DecimalParseError('INVALID_SCALE', 'Invalid scale')
  }

  const trimmed = value.trim()
  const re = new RegExp(`^\\d+(\\.\\d{1,${options.scale}})?$`)
  if (!re.test(trimmed)) {
    throw new DecimalParseError('INVALID_FORMAT', 'Invalid decimal format')
  }

  const [intPart, fracRaw] = trimmed.split('.')
  const fracPart = (fracRaw ?? '').padEnd(options.scale, '0').slice(0, options.scale)

  const scaled = BigInt(intPart) * pow10BigInt(options.scale) + BigInt(fracPart || '0')

  const allowZero = options.allowZero ?? false
  if (!allowZero && scaled <= BigInt(0)) {
    throw new DecimalParseError('INVALID_AMOUNT', 'Invalid amount')
  }

  return scaled
}

/**
Function: scaledIntToDecimalString

Description: 将缩放后的 bigint 转换为固定小数位的十进制字符串（例如 scale=2 输出两位小数）

Parameters:
	scaled(bigint): 按 10^scale 缩放后的整数值
	scale(number): 小数位数（必须为非负整数）

Returns:
	value(string): 十进制字符串（固定 scale 位小数）
*/
export function scaledIntToDecimalString(scaled: bigint, scale: number): string {
  const base = pow10BigInt(scale)
  const intPart = scaled / base
  const fracPart = scaled % base
  const fracStr = fracPart.toString().padStart(scale, '0')
  return `${intPart.toString()}.${fracStr}`
}
