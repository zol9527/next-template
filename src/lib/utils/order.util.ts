import crypto from 'node:crypto'
import type { Order } from '@/plugins/ecommerce/contracts/orders.dto'
import type { FulfillmentStatus } from '@/plugins/ecommerce/contracts/orders.dto'

/**
 * 订单号常量配置
 */
const ORDER_NO_CONFIG = {
	PREFIX: 'ORD',
	DATE_LENGTH: 8, // YYYYMMDD
	TIME_LENGTH: 6, // HHmmss
	RANDOM_LENGTH: 6, // 随机字符数
	SEPARATOR: '-',
} as const

/**
 * Function: generateOrderNo
 *
 * Description: 生成唯一的订单号，使用分段格式提高可读性
 *
 * 格式：ORD-YYYYMMDD-HHmmss-XXXXXX
 * 示例：ORD-20250122-143052-A3F9B2
 *
 * 分段说明：
 * - ORD: 固定前缀（Order 缩写）
 * - 20250122: 订单日期（YYYYMMDD）
 * - 143052: 订单时间（HHmmss）
 * - A3F9B2: 6位随机字母数字组合（0-9, A-Z，去除易混淆字符）
 *
 * 设计优势：
 * - 分段格式便于人工识别和记录
 * - 包含完整时间便于追溯和排序
 * - 混合字符提供约34亿种组合（34^6）
 * - 去除易混淆字符（0OIl1）减少人工输入错误
 *
 * Returns:
 * 	string: 订单号，固定格式 ORD-YYYYMMDD-HHmmss-XXXXXX
 */
export function generateOrderNo(): string {
	const now = new Date()

	// 生成日期部分：YYYYMMDD
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const datePart = `${year}${month}${day}`

	// 生成时间部分：HHmmss
	const hours = String(now.getHours()).padStart(2, '0')
	const minutes = String(now.getMinutes()).padStart(2, '0')
	const seconds = String(now.getSeconds()).padStart(2, '0')
	const timePart = `${hours}${minutes}${seconds}`

	// 生成随机部分：去除易混淆字符 0OIl1
	const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
	const randomBytes = crypto.randomBytes(ORDER_NO_CONFIG.RANDOM_LENGTH)
	const randomPart = Array.from(randomBytes)
		.map((byte) => chars[byte % chars.length])
		.join('')

	return `${ORDER_NO_CONFIG.PREFIX}${ORDER_NO_CONFIG.SEPARATOR}${datePart}${ORDER_NO_CONFIG.SEPARATOR}${timePart}${ORDER_NO_CONFIG.SEPARATOR}${randomPart}`
}

/**
 * Function: parseOrderNo
 *
 * Description: 解析订单号，提取时间戳和随机部分
 *
 * Parameters:
 * 	orderNo(string): 订单号
 *
 * Returns:
 * 	{ prefix: string; date: string; time: string; randomPart: string; timestamp: Date } | null: 解析结果，格式错误返回 null
 */
export function parseOrderNo(orderNo: string):
	| {
			prefix: string
			date: string
			time: string
			randomPart: string
			timestamp: Date
	  }
	| null {
	const parts = orderNo.split(ORDER_NO_CONFIG.SEPARATOR)
	if (parts.length !== 4) {
		return null
	}

	const [prefix, datePart, timePart, randomPart] = parts

	// 验证前缀
	if (prefix !== ORDER_NO_CONFIG.PREFIX) {
		return null
	}

	// 验证长度
	if (
		datePart.length !== ORDER_NO_CONFIG.DATE_LENGTH ||
		timePart.length !== ORDER_NO_CONFIG.TIME_LENGTH ||
		randomPart.length !== ORDER_NO_CONFIG.RANDOM_LENGTH
	) {
		return null
	}

	// 解析时间戳
	const year = Number(datePart.slice(0, 4))
	const month = Number(datePart.slice(4, 6)) - 1
	const day = Number(datePart.slice(6, 8))
	const hours = Number(timePart.slice(0, 2))
	const minutes = Number(timePart.slice(2, 4))
	const seconds = Number(timePart.slice(4, 6))

	const timestamp = new Date(year, month, day, hours, minutes, seconds)

	// 验证日期有效性
	if (
		isNaN(timestamp.getTime()) ||
		timestamp.getFullYear() !== year ||
		timestamp.getMonth() !== month ||
		timestamp.getDate() !== day
	) {
		return null
	}

	return { prefix, date: datePart, time: timePart, randomPart, timestamp }
}

/**
 * Function: hashCreateOrderPayload
 *
 * Description: 对创建订单的请求载荷进行 SHA256 哈希，用于幂等性校验
 *
 * Parameters:
 * 	payload({ productId: string; userCouponId?: string }): 创建订单的载荷参数
 *
 * Returns:
 * 	string: SHA256 哈希值（十六进制字符串）
 */
export function hashCreateOrderPayload(payload: { productId: string; userCouponId?: string }): string {
	return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

/**
 * Function: fingerprintIdempotencyKey
 *
 * Description: 生成幂等键的不可逆指纹，用于结构化日志与排障
 *
 * Parameters:
 * 	idempotencyKey(string): 客户端传入的 Idempotency-Key
 *
 * Returns:
 * 	string: 幂等键指纹（sha256 前 12 位十六进制）
 */
export function fingerprintIdempotencyKey(idempotencyKey: string): string {
	return crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 12)
}

/**
 * Function: isCompletedWithOrder
 *
 * Description: 判断幂等性请求是否已完成且关联到订单资源
 *
 * Parameters:
 * 	request({ status: string; resourceType?: string | null; resourceId?: string | null }): 幂等性请求对象
 *
 * Returns:
 * 	boolean: 如果请求已成功完成且关联到订单资源，返回 true；否则返回 false
 */
export function isCompletedWithOrder(request: {
	status: string
	resourceType?: string | null
	resourceId?: string | null
}): boolean {
	return request.status === 'succeeded' && request.resourceType === 'order' && !!request.resourceId
}

/**
 * Function: normalizeFulfillmentStatus
 *
 * Description: 标准化并验证履约状态值，确保其符合预定义的状态枚举
 *
 * Parameters:
 * 	value(string | null): 原始履约状态值
 *
 * Returns:
 * 	FulfillmentStatus | null: 标准化后的履约状态，如果值无效则返回 null
 */
export function normalizeFulfillmentStatus(value: string | null): FulfillmentStatus | null {
	if (!value) return null
	const allowed: readonly FulfillmentStatus[] = ['pending', 'processing', 'retrying', 'succeeded', 'manual_required']
	return (allowed as readonly string[]).includes(value) ? (value as FulfillmentStatus) : null
}

/**
 * Function: mapOrder
 *
 * Description: 将订单数据与履约状态映射为完整的订单响应对象
 *
 * Parameters:
 * 	order(Order): 原始订单数据
 * 	fulfillmentStatus(FulfillmentStatus | null): 订单履约状态（如果存在）
 *
 * Returns:
 * 	Order(Order): 包含履约状态的完整订单对象
 */
export function mapOrder(order: Order, fulfillmentStatus: FulfillmentStatus | null): Order {
	return {
		...order,
		fulfillmentStatus,
	}
}
