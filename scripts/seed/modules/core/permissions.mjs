/**
 * Core Seed Module: 03-permissions
 * 初始化角色授权（RoleAccess）
 *
 * Function: seedPermissions
 *
 * Description: 同步角色授权到数据库（仅写入 RoleAccess）
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *   roles(Map): 角色名称到 ID 的映射对象
 *
 * Returns:
 *   void
 */

export const meta = { id: 'permissions', name: '权限系统', description: '初始化权限配置并绑定角色权限', type: 'core', category: 'foundation', dependsOn: ['roles'], plugin: null }

/**
 * Function: flattenScopeTree
 *
 * Description: 从 SCOPE_TREE 镜像中递归扁平化所有 scope key。
 *              需与 src/config/access/scope-tree.ts 保持同步。
 *
 * Returns:
 *     string[]: 所有 scope key 列表
 */
function flattenScopeTree() {
  // ⚠️ 此对象必须与 src/config/access/scope-tree.ts 保持同步
  const SCOPE_TREE = {
    account: { description: '当前账户信息与设置', children: { mfa: { description: 'MFA 多因素认证管理' } } },
    users: { description: '用户管理（管理员操作他人）' },
    products: { description: '商品管理' },
    orders: { description: '订单管理', children: { promoter: { description: '订单推广人绑定' } } },
    categories: { description: '分类管理' },
    coupons: { description: '优惠券管理', children: { redemptions: { description: '优惠券核销记录' } } },
    settlements: { description: '结算管理', children: { applications: { description: '结算申请审核' } } },
    promoters: { description: '推广员管理', children: { levels: { description: '推广员等级' } } },
    commissions: { description: '佣金', children: { rules: { description: '佣金规则管理' } } },
    'user-documents': { description: '用户文档管理' },
    media: { description: '媒体资源管理' },
    storage: { description: '文件上传与存储' },
    miniprogram: { description: '小程序管理', children: { carousels: { description: '轮播图管理' }, 'shop-config': { description: '商城设置管理' }, 'home-config': { description: '首页 Banner 配置管理' }, faq: { description: '常见问题管理' } } },
    agreements: { description: '协议管理' },
    announcements: { description: '公告管理' },
    blog: { description: '博客管理', children: { articles: { description: '博客文章管理' }, categories: { description: '博客分类管理' }, tags: { description: '博客标签管理' }, analytics: { description: '博客阅读数据' } } },
    rbac: { description: '权限管理' },
    mfa: { description: 'MFA 策略管理（全局）' },
    'site-config': { description: '站点配置' },
    'feature-flags': { description: '功能开关' },
    'version-releases': { description: '版本发布' },
    logs: { description: '日志管理' },
    sessions: { description: '会话管理（全局）' },
    exports: { description: '导出管理' },
    backup: { description: '数据备份与恢复管理' },
    dashboard: { description: '仪表盘' },
    health: { description: '健康检查' },
    ai: { description: 'AI 功能管理', children: { settings: { description: 'AI 提供商与模型配置' }, templates: { description: 'AI 提示词模板管理' }, generate: { description: 'AI 内容生成' }, logs: { description: 'AI 使用日志查看' } } },
    feedback: { description: '反馈管理' },
    checkin: { description: '签到管理' },
  }

  const result = []
  function walk(node, prefix = '') {
    for (const [key, value] of Object.entries(node)) {
      const scopeKey = `${prefix}${key}`
      result.push(scopeKey)
      if (value.children) {
        walk(value.children, `${scopeKey}.`)
      }
    }
  }
  walk(SCOPE_TREE)
  return result
}

export default async function seedPermissions(db, logger, ctx) {
  logger.info('开始同步角色授权（RoleAccess）...')

  // Admin gets ALL grants from scope tree (full access)
  const adminRole = await db.role.findUnique({ where: { name: 'admin' } })
  if (adminRole) {
    // 从 SCOPE_TREE 镜像动态生成 scope 列表，新增 scope 时无需手动维护
    const allScopes = flattenScopeTree()
    const allActions = ['read', 'write', 'execute']

    await db.roleAccess.deleteMany({ where: { roleId: adminRole.id } })
    const adminGrants = allScopes.flatMap(scope =>
      allActions.map(action => ({ roleId: adminRole.id, action, scope }))
    )
    await db.roleAccess.createMany({ data: adminGrants, skipDuplicates: true })
    logger.info(`角色 admin: 写入 ${adminGrants.length} 条 RoleAccess`)
  }

  // Promoter gets limited grants
  const promoterRole = await db.role.findUnique({ where: { name: 'promoter' } })
  if (promoterRole) {
    await db.roleAccess.deleteMany({ where: { roleId: promoterRole.id } })
    const promoterGrants = [
      { roleId: promoterRole.id, action: 'read', scope: 'commissions' },
      { roleId: promoterRole.id, action: 'read', scope: 'orders' },
    ]
    await db.roleAccess.createMany({ data: promoterGrants, skipDuplicates: true })
    logger.info(`角色 promoter: 写入 ${promoterGrants.length} 条 RoleAccess`)
  }

  // User gets basic grants
  const userRole = await db.role.findUnique({ where: { name: 'user' } })
  if (userRole) {
    await db.roleAccess.deleteMany({ where: { roleId: userRole.id } })
    const userGrants = [
      { roleId: userRole.id, action: 'read', scope: 'account' },
      { roleId: userRole.id, action: 'write', scope: 'account' },
      { roleId: userRole.id, action: 'execute', scope: 'account.mfa' },
    ]
    await db.roleAccess.createMany({ data: userGrants })
    logger.info(`角色 user: 写入 ${userGrants.length} 条 RoleAccess`)
  }

  logger.success('角色授权同步完成')
}
