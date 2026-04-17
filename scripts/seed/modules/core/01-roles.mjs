/**
 * Core Seed Module: 01-roles
 * 创建系统基础角色
 *
 * Function: seedRoles
 *
 * Description: 创建系统基础角色（user, admin, promoter）
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   roles(Map): 角色名称到 ID 的映射对象
 */

import { randomUUID } from 'node:crypto'

const ROLES = [
  { name: 'user', description: '普通用户', isDefault: true },
  { name: 'admin', description: '管理员', isDefault: true },
  { name: 'promoter', description: '推广员', isDefault: true },
]

export default async function seedRoles(db, logger) {
  logger.info('开始创建角色...')

  const roles = new Map()

  for (const role of ROLES) {
    const existing = await db.role.findUnique({
      where: { name: role.name }
    })

    if (existing) {
      logger.info(`角色已存在: ${role.name}`, { roleId: existing.id })
      roles.set(role.name, existing.id)
    } else {
      const id = randomUUID()
      await db.role.create({
        data: {
          id,
          name: role.name,
          description: role.description,
        }
      })
      logger.success(`创建角色: ${role.name}`, { roleId: id })
      roles.set(role.name, id)
    }
  }

  logger.success('角色创建完成', { count: roles.size })
  return roles
}
