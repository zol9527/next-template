/**
 * Core Seed Module: 04-promoter-levels
 * 创建推广员等级配置
 *
 * Function: seedPromoterLevels
 *
 * Description: 创建推广员等级配置（青铜、白银、黄金、钻石）
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   levels(Array): 创建的等级列表
 */

import { randomUUID } from 'node:crypto'

const LEVELS = [
  {
    level: 1,
    name: '青铜',
    commissionRate: 0.05,
    minSalesCount: 0,
    minSalesAmount: '0',
    description: '无门槛，5% 佣金',
  },
  {
    level: 2,
    name: '白银',
    commissionRate: 0.10,
    minSalesCount: 10,
    minSalesAmount: '1000',
    description: '10 单或 1000 元，10% 佣金',
  },
  {
    level: 3,
    name: '黄金',
    commissionRate: 0.15,
    minSalesCount: 50,
    minSalesAmount: '5000',
    description: '50 单或 5000 元，15% 佣金',
  },
  {
    level: 4,
    name: '钻石',
    commissionRate: 0.20,
    minSalesCount: 100,
    minSalesAmount: '10000',
    description: '100 单或 10000 元，20% 佣金',
  },
]

export default async function seedPromoterLevels(db, logger) {
  logger.info('开始创建推广员等级...')

  const levels = []

  for (const config of LEVELS) {
    const existing = await db.promoterLevel.findUnique({
      where: { level: config.level }
    })

    if (existing) {
      // 更新现有等级
      const updated = await db.promoterLevel.update({
        where: { level: config.level },
        data: {
          name: config.name,
          commissionRate: config.commissionRate,
          minSalesCount: config.minSalesCount,
          minSalesAmount: config.minSalesAmount,
          description: config.description,
        }
      })
      logger.info(`更新等级: ${config.name} (Level ${config.level})`)
      levels.push(updated)
    } else {
      // 创建新等级
      const created = await db.promoterLevel.create({
        data: {
          id: randomUUID(),
          level: config.level,
          name: config.name,
          commissionRate: config.commissionRate,
          minSalesCount: config.minSalesCount,
          minSalesAmount: config.minSalesAmount,
          description: config.description,
        }
      })
      logger.success(`创建等级: ${config.name} (Level ${config.level})`)
      levels.push(created)
    }
  }

  logger.success('推广员等级创建完成', { count: levels.length })

  // 输出等级概览
  logger.info('等级配置概览:')
  for (const level of levels.sort((a, b) => a.level - b.level)) {
    const rate = (level.commissionRate * 100).toFixed(0)
    const requirement = level.level === 1
      ? '无门槛'
      : `${level.minSalesCount} 单或 ¥${level.minSalesAmount}`
    logger.info(`  ${level.name} (Lv${level.level}): ${rate}% 佣金，${requirement}`)
  }

  return levels
}
