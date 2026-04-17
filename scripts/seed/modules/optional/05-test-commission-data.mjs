/**
 * Optional Seed Module: 05-test-commission-data
 * 创建测试佣金数据
 *
 * Function: seedTestCommissionData
 *
 * Description: 创建测试订单和佣金数据
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   result(Object): 创建的订单和佣金统计
 */

import { randomUUID } from 'node:crypto'

/**
 * 生成订单号
 */
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const datePart = `${year}${month}${day}`
  const timePart = `${hours}${minutes}${seconds}`

  // 生成6位随机字母数字组合（去除易混淆字符 0OIl1）
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const randomPart = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  return `ORD-${datePart}-${timePart}-${randomPart}`
}

/**
 * 计算佣金
 */
function computeCommission(baseAmount, rate) {
  const base = parseFloat(baseAmount)
  const rateVal = parseFloat(rate)
  return (base * rateVal).toFixed(2)
}

export default async function seedTestCommissionData(db, logger) {
  logger.info('开始创建测试佣金数据...')

  // 1. 获取必要的引用数据
  const buyer = await db.user.findUnique({ where: { username: 'test_user_1' } })
  if (!buyer) {
    logger.warn('test_user_1 不存在，跳过佣金数据创建')
    return { orders: 0, commissions: 0 }
  }

  const promoter = await db.user.findUnique({ where: { username: 'test_promoter' } })
  if (!promoter) {
    logger.warn('test_promoter 不存在，跳过佣金数据创建')
    return { orders: 0, commissions: 0 }
  }

  const promoterRecord = await db.promoter.findUnique({ where: { userId: promoter.id } })
  if (!promoterRecord) {
    logger.warn('推广员记录不存在，跳过佣金数据创建')
    return { orders: 0, commissions: 0 }
  }

  // 获取产品
  const products = await db.product.findMany({
    where: { status: 'published' },
    take: 10,
  })
  const validProducts = products.filter(p => p.price != null)
  if (validProducts.length === 0) {
    logger.warn('没有可用产品，跳过佣金数据创建')
    return { orders: 0, commissions: 0 }
  }

  // 2. 创建测试订单
  logger.info('创建测试订单...')
  const commissionRate = 0.05 // 5% 佣金率
  let orderCount = 0
  let commissionCount = 0

  // 创建 5 个测试订单
  for (let i = 0; i < 5; i++) {
    const product = validProducts[i % validProducts.length]
    const orderNo = generateOrderNo()
    const baseAmount = product.price.toString()
    const commissionAmount = computeCommission(baseAmount, commissionRate)

    // 检查订单是否已存在
    const existingOrder = await db.order.findUnique({ where: { orderNo } })
    if (existingOrder) {
      logger.info(`订单 ${orderNo} 已存在，跳过`)
      continue
    }

    // 创建订单
    const order = await db.order.create({
      data: {
        id: randomUUID(),
        orderNo,
        userId: buyer.id,
        productId: product.id,
        totalAmount: baseAmount,
        currencyCode: 'CNY',
        status: 'completed',
        promoterId: promoterRecord.id,
        promoterCode: 'TEST2024',
        commissionAmount,
        createdAt: new Date(Date.now() - i * 86400000), // 分散在几天内
      }
    })

    // 创建佣金记录
    await db.commission.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        promoterId: promoterRecord.id,
        commissionAmount,
        rate: commissionRate,
        baseAmount,
        status: 'pending',
        createdAt: order.createdAt,
      }
    })

    logger.info(`创建订单和佣金`, {
      orderNo: order.orderNo,
      amount: baseAmount,
      commission: commissionAmount
    })

    orderCount++
    commissionCount++
  }

  logger.success('测试佣金数据创建完成', { orders: orderCount, commissions: commissionCount })

  return { orders: orderCount, commissions: commissionCount }
}
