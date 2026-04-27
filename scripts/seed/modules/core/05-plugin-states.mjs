/**
 * Core Seed Module: 05-plugin-states
 * 初始化插件激活状态数据
 *
 * Function: seedPluginStates
 *
 * Description: 根据环境变量初始化插件的激活状态到 SystemSetting 表。
 *   key 格式: plugin.{name}.active，value: "true" / "false"
 *   使用 upsert 确保不覆盖已存在的状态（管理员可能在后台修改过）
 *
 * Parameters:
 *   db(Object): Prisma 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   states(Map): 插件名称到 key 的映射对象
 */

export const meta = { id: 'plugin-states', name: '插件状态初始化', description: '初始化已启用插件的基础状态，确保缓存系统正常工作', type: 'core', category: 'config', dependsOn: [], plugin: null }

const PLUGINS = [
  { name: 'wechat', envVar: 'PLUGIN_WECHAT' },
  { name: 'ecommerce', envVar: 'PLUGIN_ECOMMERCE' },
  { name: 'promotion', envVar: 'PLUGIN_PROMOTION' },
]

export default async function seedPluginStates(db, logger) {
  logger.info('开始初始化插件激活状态...')

  const states = new Map()

  for (const plugin of PLUGINS) {
    const isInstalled = process.env[plugin.envVar] === 'true'
    const settingKey = `plugin.${plugin.name}.active`

    // 使用 upsert：已存在的记录不覆盖（保留管理员的运行时配置）
    const record = await db.systemSetting.upsert({
      where: { key: settingKey },
      update: {}, // 不更新已存在的值
      create: {
        key: settingKey,
        value: isInstalled ? 'true' : 'false',
        description: `插件 ${plugin.name} 激活状态（初始值来自环境变量 ${plugin.envVar}）`,
      },
    })

    logger.info(`插件激活状态: ${plugin.name} (installed=${isInstalled}, active=${record.value})`, {
      key: settingKey,
      installed: isInstalled,
      active: record.value,
    })

    states.set(plugin.name, record.key)
  }

  logger.success('插件激活状态初始化完成', {
    count: states.size,
    installedCount: PLUGINS.filter(p => process.env[p.envVar] === 'true').length,
  })

  return states
}
