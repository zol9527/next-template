/**
 * Optional Seed Module: 04-test-promoter-data
 * 创建推广员测试数据
 *
 * Function: seedTestPromoterData
 *
 * Description: 设置测试用户为推广员并创建相关数据
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   promoter(Object): 创建的推广员信息
 */

import { randomUUID } from 'node:crypto'

export const meta = { id: 'test-promoter-data', name: '推广员测试数据', description: '创建推广关系和绑定数据', type: 'optional', category: 'test-data', dependsOn: [], plugin: 'promotion' }

// 推广员用户 ID（固定）
const PROMOTER_USER_ID = 'f7a3b1c9-4e2d-8a6f-b5c3-d9e7f1a3b5c7'

export default async function seedTestPromoterData(db, logger, ctx) {
  logger.info('开始创建推广员测试数据...')

  // 1. 检查测试用户是否存在
  let promoterUser = await db.user.findUnique({
    where: { id: PROMOTER_USER_ID }
  })

  // 如果不存在，创建测试用户
  if (!promoterUser) {
    logger.info('创建测试用户作为推广员...')
    const bcrypt = (await import('bcrypt')).default
    const passwordHash = await bcrypt.hash('EduTest#12345', 12)

    promoterUser = await db.user.create({
      data: {
        id: PROMOTER_USER_ID,
        username: 'test_promoter',
        email: 'promoter@test.com',
        phone: '13800138099',
        passwordHash,
        status: 'active',
        failedLoginCount: 0,
      }
    })
    logger.success(`创建推广员用户: ${promoterUser.username}`)
  } else {
    logger.info(`使用现有用户作为推广员: ${promoterUser.username}`)
  }

  // 2. 获取或创建 promoter 角色
  let promoterRole = await db.role.findUnique({
    where: { name: 'promoter' }
  })

  if (!promoterRole) {
    promoterRole = await db.role.create({
      data: {
        id: randomUUID(),
        name: 'promoter',
        description: '推广员',
      }
    })
    logger.success(`创建 promoter 角色`)
  }

  // 3. 分配 promoter 角色给用户
  const existingUserRole = await db.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: promoterUser.id,
        roleId: promoterRole.id,
      }
    }
  })

  if (!existingUserRole) {
    await db.userRole.create({
      data: {
        userId: promoterUser.id,
        roleId: promoterRole.id,
      }
    })
    logger.success(`分配 promoter 角色给用户`)
  } else {
    logger.info(`用户已有 promoter 角色`)
  }

  // 4. 创建推广员记录
  const existingPromoter = await db.promoter.findUnique({
    where: { userId: promoterUser.id }
  })

  if (!existingPromoter) {
    await db.promoter.create({
      data: {
        id: randomUUID(),
        userId: promoterUser.id,
        level: 1,
        totalCommission: '0',
        totalPaidCommission: '0',
        status: 'active',
      }
    })
    logger.success(`创建推广员记录`)
  } else {
    logger.info(`推广员记录已存在`)
  }

  // 5. 创建推广码
  const promoterCode = await db.promoterCode.findUnique({
    where: { code: 'TEST2024' }
  })

  if (!promoterCode) {
    const promoter = await db.promoter.findUnique({
      where: { userId: promoterUser.id }
    })

    await db.promoterCode.create({
      data: {
        id: randomUUID(),
        promoterId: promoter.id,
        code: 'TEST2024',
        type: 'promoter_code',
        status: 'active',
      }
    })
    logger.success(`创建推广码: TEST2024`)
  } else {
    logger.info(`推广码 TEST2024 已存在`)
  }

  logger.success('推广员测试数据创建完成')

  return {
    user: promoterUser,
    role: promoterRole,
  }
}
