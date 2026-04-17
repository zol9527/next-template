/**
 * Seed System - Unified Entry Point
 * 统一入口脚本，支持多种执行模式
 *
 * 使用方式:
 *   node scripts/seed/index.mjs --mode=minimal          # 仅核心数据
 *   node scripts/seed/index.mjs --mode=development     # 开发环境
 *   node scripts/seed/index.mjs --mode=full            # 完整数据
 *   node scripts/seed/index.mjs --modules=roles,admin  # 指定模块
 */

import { loadEnv } from './lib/env.mjs'
import { createDbClient, disconnectDbClient } from './lib/db.mjs'
import { createLogger, divider } from './lib/logger.mjs'
import {
  EXECUTION_MODES,
  getModulePath,
  getModuleMeta,
} from './config.mjs'

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    mode: 'minimal', // minimal | development | full
    modules: [], // 指定模块列表
    dryRun: false, // 试运行模式
    verbose: false, // 详细输出
  }

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      options.mode = arg.replace('--mode=', '')
    } else if (arg.startsWith('--modules=')) {
      options.modules = arg.replace('--modules=', '').split(',').map(s => s.trim())
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--verbose') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return options
}

// 打印帮助信息
function printHelp() {
  console.log(`
🌱 Seed System - 数据库种子工具

使用方法:
  node scripts/seed/index.mjs [选项]

选项:
  --mode=<mode>          执行模式: minimal | development | full (默认: minimal)
  --modules=<list>       指定模块,逗号分隔 (例如: roles,admin,permissions)
  --dry-run              试运行模式,不实际执行
  --verbose              详细输出
  --help, -h             显示帮助

执行模式:
  minimal       仅核心数据 (roles, admin, permissions, promoter-levels, agreements)
  development   核心数据 + 基础测试数据
  full          所有数据

可用模块:
  Core (核心):
    - roles          角色创建
    - admin          初始管理员
    - permissions    权限系统
    - promoter-levels 推广员等级
    - agreements     站点协议（用户协议/隐私政策）

  Optional (可选):
    - test-users           测试用户
    - test-products        测试产品
    - test-promoter-data   推广员测试数据
    - test-commission-data 佣金测试数据

示例:
  # 执行 minimal 模式
  node scripts/seed/index.mjs --mode=minimal

  # 执行 development 模式
  node scripts/seed/index.mjs --mode=development

  # 只执行指定模块
  node scripts/seed/index.mjs --modules=roles,admin
`)
}

// 判断是否为生产环境
function isProduction() {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production'
}

// 获取要执行的模块列表
function getModulesToExecute(options) {
  // 如果指定了 --modules，使用指定的模块
  if (options.modules.length > 0) {
    return options.modules.map(id => {
      const meta = getModuleMeta(id)
      if (!meta) {
        throw new Error(`Unknown module: ${id}`)
      }
      // 生产环境禁止执行 optional 模块
      if (meta.type === 'optional' && isProduction()) {
        throw new Error(
          `[SECURITY] 生产环境禁止执行 optional 测试模块: ${id}。\n` +
          `测试数据模块仅允许在本地或测试服务器环境中运行。`
        )
      }
      return meta
    })
  }

  // 根据 mode 获取模块
  const mode = EXECUTION_MODES[options.mode]
  if (!mode) {
    throw new Error(`Unknown mode: ${options.mode}. Available: ${Object.keys(EXECUTION_MODES).join(', ')}`)
  }

  const modules = mode.modules.map(id => {
    const meta = getModuleMeta(id)
    if (!meta) {
      throw new Error(`Module ${id} not found in configuration`)
    }
    return meta
  })

  // 生产环境：如果 mode 包含 optional 模块，直接报错阻断
  if (isProduction()) {
    const optionalModules = modules.filter(m => m.type === 'optional')
    if (optionalModules.length > 0) {
      throw new Error(
        `[SECURITY] 生产环境禁止使用包含 optional 模块的 mode: ${options.mode}。\n` +
        `涉及模块: ${optionalModules.map(m => m.id).join(', ')}\n` +
        `生产环境只能使用 --mode=minimal。`
      )
    }
  }

  return modules
}

// 执行单个模块
async function executeModule(moduleMeta, db, logger, options, extraArgs = []) {
  const modulePath = getModulePath(moduleMeta.id)
  const fullPath = new URL(modulePath, import.meta.url).href

  logger.info(`加载模块: ${moduleMeta.name} (${moduleMeta.id})`)

  if (options.dryRun) {
    logger.info('[Dry Run] 跳过执行', { module: moduleMeta.id })
    return
  }

  try {
    const loadedModule = await import(fullPath)
    const seedFn = loadedModule.default

    if (typeof seedFn !== 'function') {
      throw new Error(`Module ${moduleMeta.id} does not export a default function`)
    }

    // 执行 seed 函数，传递额外参数
    const result = await seedFn(db, logger, ...extraArgs)

    logger.success(`模块执行完成: ${moduleMeta.name}`)
    return result
  } catch (err) {
    logger.error(`模块执行失败: ${moduleMeta.name}`, err)
    throw err
  }
}

// 检查插件依赖的模块是否应该跳过
function shouldSkipByPlugin(moduleMeta, logger) {
  if (!moduleMeta.plugin) return false

  const envKey = `PLUGIN_${moduleMeta.plugin.toUpperCase().replace(/-/g, '_')}`
  const enabled = process.env[envKey] === 'true'

  if (!enabled) {
    logger.info(`跳过模块 ${moduleMeta.id}: 依赖插件 ${moduleMeta.plugin} 未启用 (${envKey} != true)`)
    return true
  }
  return false
}

// 主函数
async function main() {
  const options = parseArgs()
  const logger = createLogger('Seed')

  divider('🌱 Seed System 启动')

  // 加载环境变量
  loadEnv()

  // 显示执行信息
  logger.info(`执行模式: ${options.mode}`)
  if (options.modules.length > 0) {
    logger.info(`指定模块: ${options.modules.join(', ')}`)
  }
  if (options.dryRun) {
    logger.info('试运行模式: 不会实际修改数据库')
  }

  // 获取要执行的模块
  const modulesToExecute = getModulesToExecute(options)
  logger.info(`将执行 ${modulesToExecute.length} 个模块`)

  // 创建数据库连接
  divider('连接数据库')
  const db = await createDbClient()
  logger.success(`数据库连接成功: ${db.type}`)

  // 执行模块
  divider('执行 Seed 模块')

  const results = []
  let successCount = 0
  let failCount = 0

  // 存储模块结果，用于依赖传递
  const moduleResults = new Map()

  for (const moduleMeta of modulesToExecute) {
    try {
      // 检查插件依赖：如果模块依赖的插件未启用，跳过
      if (shouldSkipByPlugin(moduleMeta, logger)) {
        results.push({ module: moduleMeta.id, success: true, skipped: true, reason: 'plugin_disabled' })
        continue
      }

      // 传递之前模块的执行结果（简单的依赖传递策略）
      // 如果模块需要 roles，则传递 roles 模块的结果
      let extraArgs = []
      if (['admin', 'permissions', 'e2e-test-users'].includes(moduleMeta.id)) {
        const rolesResult = moduleResults.get('roles')
        if (rolesResult) {
          extraArgs.push(rolesResult)
        }
      }

      const result = await executeModule(moduleMeta, db, logger, options, extraArgs)
      moduleResults.set(moduleMeta.id, result)
      results.push({ module: moduleMeta.id, success: true, result })
      successCount++
    } catch (err) {
      results.push({ module: moduleMeta.id, success: false, error: err.message })
      failCount++
      // 如果某个模块失败，继续执行其他模块
    }
  }

  // 断开数据库连接
  await disconnectDbClient(db)

  // 输出结果
  divider('执行结果')

  logger.info(`成功: ${successCount} 个模块`)
  if (failCount > 0) {
    logger.warn(`失败: ${failCount} 个模块`)
  }

  // 如果有失败，退出码非零
  if (failCount > 0) {
    process.exit(1)
  }

  logger.success('🎉 Seed 执行完成！')
}

main().catch(err => {
  console.error('Seed 系统错误:', err)
  process.exit(1)
})
