/**
 * Core Seed Module: notifications
 * 初始化测试通知数据
 *
 * Function: seedNotifications
 *
 * Description: 创建一组全局广播的测试通知，用于开发阶段验证通知中心功能。
 * 所有通知均为 SYSTEM 类型，isGlobal=true，支持重复执行（跳过已存在的标题）。
 *
 * Parameters:
 *   db(Object): PrismaClient 实例
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   notifications(Array): 已创建的通知列表
 */

export const meta = {
  id: 'notifications',
  name: '测试通知',
  description: '初始化通知中心测试数据',
  type: 'core',
  category: 'test-data',
  dependsOn: [],
  plugin: null,
}

const TEST_NOTIFICATIONS = [
  {
    type: 'SYSTEM',
    title: '欢迎使用通知中心',
    content: '通知中心已上线，你可以在这里查看所有系统通知和重要提醒。我们将通过这里推送课程更新、活动优惠等重要信息。',
    summary: '通知中心已上线，你可以在这里查看所有系统通知和重要提醒。',
    icon: 'bell',
    isGlobal: true,
    priority: 100,
    isActive: true,
  },
  {
    type: 'SYSTEM',
    title: '账号安全提醒',
    content: '为了保障您的账号安全，建议定期修改密码并开启多因素认证。如发现异常登录，请立即联系客服。',
    summary: '建议定期修改密码并开启多因素认证，保障账号安全。',
    icon: 'shield',
    isGlobal: true,
    priority: 50,
    isActive: true,
  },
  {
    type: 'SYSTEM',
    title: '系统维护通知',
    content: '系统将于本周六凌晨 2:00-4:00 进行例行维护升级，届时部分功能可能暂时不可用，请提前做好准备。',
    summary: '本周六凌晨 2:00-4:00 例行维护，部分功能可能暂时不可用。',
    icon: 'tool',
    isGlobal: true,
    priority: 30,
    isActive: true,
  },
]

export async function seedNotifications(db, logger) {
  const results = []

  for (const notification of TEST_NOTIFICATIONS) {
    // 检查是否已存在相同标题的通知（幂等）
    const existing = await db.notification.findFirst({
      where: { title: notification.title },
    })

    if (existing) {
      logger.info(`跳过已存在的通知: ${notification.title}`)
      results.push(existing)
      continue
    }

    const created = await db.notification.create({
      data: notification,
    })

    logger.info(`创建测试通知: ${notification.title}`)
    results.push(created)
  }

  return results
}
