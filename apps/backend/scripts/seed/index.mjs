/**
 * Seed System - Unified Entry Point
 * 统一入口脚本，支持多种执行模式
 *
 * 使用方式:
 *   node scripts/seed/index.mjs --mode=minimal          # 仅核心数据
 *   node scripts/seed/index.mjs --mode=development     # 开发环境
 *   node scripts/seed/index.mjs --mode=full            # 完整数据
 *   node scripts/seed/index.mjs --modules=roles,admin  # 指定模块
 *   node scripts/seed/index.mjs --list                 # 列出所有模块
 */

import { loadEnv } from './lib/env.mjs'
import { createDbClient, disconnectDbClient } from './lib/db.mjs'
import { createLogger, divider } from './lib/logger.mjs'
import { EXECUTION_MODES } from './config.mjs'
import { discoverModules } from './lib/discovery.mjs'
import { resolveExecutionOrder } from './lib/dependency-graph.mjs'
import { SeedContext } from './lib/seed-context.mjs'

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    mode: 'minimal',
    modules: [],
    dryRun: false,
    verbose: false,
    list: false,
    help: false,
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
    } else if (arg === '--list') {
      options.list = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    }
  }

  return options
}

// 打印帮助信息（动态生成）
async function printHelp() {
  const modules = await discoverModules()
  const sorted = resolveExecutionOrder(modules)

  console.log(`
🌱 Seed System - 数据库种子工具

使用方法:
  node scripts/seed/index.mjs [选项]

选项:
  --mode=<mode>          执行模式: minimal | development | full (默认: minimal)
  --modules=<list>       指定模块,逗号分隔 (例如: roles,admin,permissions)
  --dry-run              试运行模式,不实际执行
  --verbose              详细输出
  --list                 列出所有可用模块
  --help, -h             显示帮助

执行模式:
  minimal       仅核心数据
  development   核心数据 + 基础测试数据
  full          所有数据

可用模块:
`)

  const coreModules = sorted.filter(m => m.type === 'core')
  const optionalModules = sorted.filter(m => m.type === 'optional')

  if (coreModules.length > 0) {
    console.log('  Core (核心):')
    for (const mod of coreModules) {
      console.log(`    - ${mod.meta.id.padEnd(25)} ${mod.meta.name}`)
    }
  }

  if (optionalModules.length > 0) {
    console.log('')
    console.log('  Optional (可选):')
    for (const mod of optionalModules) {
      const plugin = mod.meta.plugin ? ` [插件: ${mod.meta.plugin}]` : ''
      console.log(`    - ${mod.meta.id.padEnd(25)} ${mod.meta.name}${plugin}`)
    }
  }

  console.log(`
示例:
  node scripts/seed/index.mjs --mode=minimal
  node scripts/seed/index.mjs --mode=development
  node scripts/seed/index.mjs --modules=roles,admin
  node scripts/seed/index.mjs --list
`)
}

// 列出所有可用模块
async function listModules() {
  const modules = await discoverModules()
  const sorted = resolveExecutionOrder(modules)

  console.log('\n🌱 可用 Seed 模块:\n')
  for (const mod of sorted) {
    const deps = mod.meta.dependsOn?.length > 0
      ? ` (依赖: ${mod.meta.dependsOn.join(', ')})`
      : ''
    const plugin = mod.meta.plugin
      ? ` [插件: ${mod.meta.plugin}]`
      : ''
    console.log(`  ${mod.meta.id.padEnd(25)} ${mod.meta.name}${deps}${plugin}`)
    console.log(`  ${''.padEnd(25)} ${mod.meta.description}`)
  }

  const coreCount = [...modules.values()].filter(m => m.type === 'core').length
  const optionalCount = [...modules.values()].filter(m => m.type === 'optional').length
  console.log(`\n共 ${sorted.length} 个模块 (${coreCount} core + ${optionalCount} optional)\n`)
}

// 判断是否为生产环境
function isProduction() {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production'
}

// 检查插件依赖的模块是否应该跳过
function shouldSkipByPlugin(meta, logger) {
  if (!meta.plugin) return false

  const envKey = `PLUGIN_${meta.plugin.toUpperCase().replace(/-/g, '_')}`
  const enabled = process.env[envKey] === 'true'

  if (!enabled) {
    logger.info(`跳过模块 ${meta.id}: 依赖插件 ${meta.plugin} 未启用 (${envKey} != true)`)
    return true
  }
  return false
}

/**
 * 解析 --modules 参数，自动拉取依赖模块
 *
 * Parameters:
 *   selectedIds(string[]): 用户指定的模块 ID 列表
 *   allModules(Map): 全部可用模块
 *   verbose(boolean): 是否显示详细日志
 *
 * Returns:
 *   resolved(Set<string>): 包含所有依赖的完整模块 ID 集合
 */
function resolveWithDependencies(selectedIds, allModules, verbose = false) {
  const resolved = new Set()

  function addWithDeps(id) {
    if (resolved.has(id)) return
    const mod = allModules.get(id)
    if (!mod) throw new Error(`Unknown module: ${id}`)

    // 先解析依赖（递归）
    for (const depId of (mod.meta.dependsOn || [])) {
      addWithDeps(depId)
    }

    if (!resolved.has(id)) {
      resolved.add(id)
    }
  }

  for (const id of selectedIds) {
    const mod = allModules.get(id)
    if (!mod) throw new Error(`Unknown module: ${id}`)

    // 检查新增的依赖（verbose 时显示）
    const newDeps = (mod.meta.dependsOn || []).filter(d => !resolved.has(d))
    if (verbose && newDeps.length > 0) {
      console.log(`  自动包含依赖模块: ${newDeps.join(', ')}（${id} 的依赖）`)
    }

    addWithDeps(id)
  }

  return resolved
}

/**
 * 获取要执行的模块列表（已排序）
 *
 * Parameters:
 *   options(Object): 命令行参数
 *   allModules(Map): discovery 返回的全部模块
 *
 * Returns:
 *   modules(Array): 按依赖顺序排列的要执行的模块列表
 */
function getModulesToExecute(options, allModules) {
  let targetIds

  if (options.modules.length > 0) {
    // 指定模块模式：自动解析依赖
    targetIds = resolveWithDependencies(options.modules, allModules, options.verbose)
  } else {
    // 模式模式：使用 filter 函数
    const mode = EXECUTION_MODES[options.mode]
    if (!mode) {
      throw new Error(`Unknown mode: ${options.mode}. Available: ${Object.keys(EXECUTION_MODES).join(', ')}`)
    }
    targetIds = new Set()
    for (const [id, mod] of allModules) {
      if (mode.filter(mod.meta)) {
        targetIds.add(id)
      }
    }
  }

  // 生产环境安全检查
  if (isProduction()) {
    const optionalIds = [...targetIds].filter(id => allModules.get(id)?.type === 'optional')
    if (optionalIds.length > 0) {
      throw new Error(
        `[SECURITY] 生产环境禁止执行 optional 测试模块: ${optionalIds.join(', ')}。\n` +
        `测试数据模块仅允许在本地或测试服务器环境中运行。`
      )
    }
  }

  // 从全量排序结果中筛选目标模块
  const sortedAll = resolveExecutionOrder(allModules)
  return sortedAll.filter(mod => targetIds.has(mod.meta.id))
}

// 主函数
async function main() {
  const options = parseArgs()
  const logger = createLogger('Seed')

  // --help 模式：显示帮助后退出（async，需在 main 中 await）
  if (options.help) {
    await printHelp()
    process.exit(0)
  }

  // --list 模式：列出模块后退出
  if (options.list) {
    await listModules()
    process.exit(0)
  }

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

  // 发现所有模块
  const allModules = await discoverModules()
  logger.info(`已发现 ${allModules.size} 个模块`)

  // 获取要执行的模块（已排序）
  const modulesToExecute = getModulesToExecute(options, allModules)
  logger.info(`将执行 ${modulesToExecute.length} 个模块`)

  if (options.verbose) {
    for (const mod of modulesToExecute) {
      logger.info(`  → ${mod.meta.id} (${mod.meta.name})`)
    }
  }

  // 创建数据库连接
  divider('连接数据库')
  const db = await createDbClient()
  logger.success(`数据库连接成功: ${db.type}`)

  // 创建上下文
  const ctx = new SeedContext(db, logger, options)

  // 执行模块
  divider('执行 Seed 模块')

  let successCount = 0
  let failCount = 0
  let skipCount = 0

  for (const mod of modulesToExecute) {
    const { meta } = mod

    // 设置初始状态为 running
    ctx.setState(meta.id, 'running')

    // 检查插件依赖：如果模块依赖的插件未启用，跳过
    if (shouldSkipByPlugin(meta, logger)) {
      ctx.setState(meta.id, 'skipped')
      skipCount++
      continue
    }

    // 试运行模式：跳过实际执行
    if (options.dryRun) {
      logger.info(`[Dry Run] 跳过执行: ${meta.name} (${meta.id})`)
      ctx.setState(meta.id, 'skipped')
      skipCount++
      continue
    }

    try {
      logger.info(`执行模块: ${meta.name} (${meta.id})`)
      const result = await mod.module.default(db, logger, ctx)
      ctx.setResult(meta.id, result)
      successCount++
      logger.success(`模块执行完成: ${meta.name}`)
    } catch (err) {
      ctx.setState(meta.id, 'failed')
      failCount++
      logger.error(`模块执行失败: ${meta.name}`, err)
      // 继续执行其他模块（保持当前行为）
    }
  }

  // 断开数据库连接
  await disconnectDbClient(db)

  // 输出结果
  divider('执行结果')

  logger.info(`成功: ${successCount} 个模块`)
  if (skipCount > 0) {
    logger.info(`跳过: ${skipCount} 个模块`)
  }
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
