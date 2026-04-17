/**
 * Optional Seed Module: 02-test-users
 * 创建测试用户
 *
 * Function: seedTestUsers
 *
 * Description: 创建测试用户用于开发和测试
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   users(Array): 创建的用户列表
 */

// 固定的测试用户 ID
const TEST_USERS = [
  {
    id: '5fe52e6f-e008-48ab-bbaf-3e892cb6a3ca',
    username: 'test_user_1',
    email: 'test1@example.com',
    phone: '13800138001',
    password: 'EduTest#12345',
    canUpload: true,
  },
  {
    id: '9ad07202-d4ae-483b-ba9d-9106f1034c36',
    username: 'test_user_2',
    email: 'test2@example.com',
    phone: '13800138002',
    password: 'EduTest#12345',
    canUpload: false,
  },
]

export default async function seedTestUsers(db, logger) {
  logger.info('开始创建测试用户...')

  const bcrypt = (await import('bcrypt')).default
  const users = []

  for (const testUser of TEST_USERS) {
    const passwordHash = await bcrypt.hash(testUser.password, 12)

    const existing = await db.user.findUnique({
      where: { username: testUser.username }
    })

    if (existing) {
      // 更新现有用户
      const updated = await db.user.update({
        where: { username: testUser.username },
        data: {
          email: testUser.email,
          phone: testUser.phone,
          passwordHash,
          canUpload: testUser.canUpload,
          status: 'active',
        }
      })
      logger.info(`更新测试用户: ${testUser.username}`, { userId: updated.id })
      users.push(updated)
    } else {
      // 创建新用户
      const created = await db.user.create({
        data: {
          id: testUser.id,
          username: testUser.username,
          email: testUser.email,
          phone: testUser.phone,
          passwordHash,
          canUpload: testUser.canUpload,
          status: 'active',
          failedLoginCount: 0,
        }
      })
      logger.success(`创建测试用户: ${testUser.username}`, { userId: created.id })
      users.push(created)
    }
  }

  logger.success('测试用户创建完成', { count: users.length })
  return users
}
