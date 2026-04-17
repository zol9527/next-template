/**
 * Core Seed Module: 02-admin
 * 创建初始管理员账户
 *
 * Function: seedAdmin
 *
 * Description: 创建初始管理员账户并分配 admin 角色
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *   roles(Map): 角色名称到 ID 的映射对象（来自 01-roles）
 *
 * Returns:
 *   admin(Object): 创建的管理员用户对象
 */

// 固定 ID 确保可重复执行时不会创建重复数据
const ADMIN_USER_ID = 'b5bd0ecf-69af-4c48-a89a-eb3d9bef0f91'

export default async function seedAdmin(db, logger, roles) {
  logger.info('开始创建初始管理员...')

  // 获取环境变量
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin'
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassw0rd!'

  // 密码哈希
  const bcrypt = (await import('bcrypt')).default
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  // 检查是否已存在
  const existing = await db.user.findUnique({
    where: { id: ADMIN_USER_ID }
  })

  let admin

  if (existing) {
    logger.info('管理员已存在，更新信息', { userId: existing.id })
    admin = await db.user.update({
      where: { id: ADMIN_USER_ID },
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        status: 'active',
      }
    })
  } else {
    logger.info('创建新管理员', { username: adminUsername, email: adminEmail })
    admin = await db.user.create({
      data: {
        id: ADMIN_USER_ID,
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        status: 'active',
        failedLoginCount: 0,
      }
    })
  }

  // 分配 admin 角色
  const adminRoleId = roles.get('admin')
  if (adminRoleId) {
    const existingRole = await db.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRoleId
        }
      }
    })

    if (!existingRole) {
      await db.userRole.create({
        data: {
          userId: admin.id,
          roleId: adminRoleId
        }
      })
      logger.success('已分配 admin 角色', { userId: admin.id, roleId: adminRoleId })
    } else {
      logger.info('admin 角色已存在', { userId: admin.id })
    }
  }

  logger.success('初始管理员创建完成', {
    userId: admin.id,
    username: admin.username,
    email: admin.email
  })

  return admin
}
