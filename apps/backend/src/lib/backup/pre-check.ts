/**
 * 备份恢复预检模块
 * @module lib/backup/pre-check
 *
 * 功能：
 * 1. ZIP 完整性校验 — 解析 manifest 并验证文件哈希
 * 2. Schema 兼容性检查 — 对比备份数据与当前系统的 model 列表
 * 3. 插件状态检查 — 对比备份中的插件与当前系统启用状态
 * 4. 数据库连通性 — 执行 SELECT 1 验证数据库可达
 * 5. 并发检查 — 确保没有其他恢复任务在运行
 *
 * 检查结果分为 errors（阻止恢复）和 warnings（仅提示）两类。
 */

import {
  parseManifestFromZip,
  verifyZipIntegrity,
  checkSchemaCompatibility,
  checkPluginState,
  type BackupManifest,
} from './integrity-check'
import { getTableNameMapping } from './schema-analyzer'
import { getEnabledPlugins } from '@/plugins/registry'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ─── 类型定义 ───────────────────────────────────────────

/**
 * Prisma 客户端最小接口
 *
 * 仅声明预检所需的方法，降低对具体 Prisma 实例的耦合。
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
  $queryRaw: <T>(query: TemplateStringsArray | string, ...values: unknown[]) => Promise<T>
}

/**
 * 预检参数
 */
export interface PreCheckParams {
  /** 备份 ZIP 文件路径 */
  zipPath: string
  /** Prisma 客户端实例 */
  prisma: PrismaClientLike
  /** 存储提供者（用于连通性测试，预留扩展） */
  provider: ObjectStorageProvider
  /** 当前活跃 Job 数量 */
  activeJobCount: number
  /** 数据库名称（用于 information_schema 查询） */
  databaseName: string
}

/**
 * 预检报告
 */
export interface PreCheckReport {
  /** 是否可以继续恢复（errors 为空时为 true） */
  canProceed: boolean
  /** 警告列表（不阻止恢复） */
  warnings: string[]
  /** 错误列表（阻止恢复） */
  errors: string[]
  /** 各检查项的详细结果 */
  checks: {
    zipIntegrity: { passed: boolean; details: string }
    schemaCompatibility: { passed: boolean; missingModels: string[]; extraModels: string[] }
    pluginState: { passed: boolean; missingPlugins: string[]; extraPlugins: string[] }
    databaseConnection: { passed: boolean }
    concurrentJob: { passed: boolean; activeJobCount: number }
  }
}

// ─── 主函数 ─────────────────────────────────────────────

/**
 * Function: preCheck
 *
 * Description: 执行备份恢复前的全部预检项，返回完整的预检报告。
 *   检查项包括：ZIP 完整性、Schema 兼容性、插件状态、数据库连通性、并发检查。
 *   每个检查项独立执行，互不阻塞；即使前置检查失败也会继续后续检查。
 *
 * Parameters:
 *   params(PreCheckParams): 预检参数集合
 *
 * Returns:
 *   Promise<PreCheckReport>: 包含 canProceed、warnings、errors 及各项检查详情的报告
 */
export async function preCheck(params: PreCheckParams): Promise<PreCheckReport> {
  const { zipPath, prisma, activeJobCount, databaseName } = params

  const warnings: string[] = []
  const errors: string[] = []

  // 初始化检查结果（全部默认未通过）
  const checks: PreCheckReport['checks'] = {
    zipIntegrity: { passed: false, details: '' },
    schemaCompatibility: { passed: false, missingModels: [], extraModels: [] },
    pluginState: { passed: false, missingPlugins: [], extraPlugins: [] },
    databaseConnection: { passed: false },
    concurrentJob: { passed: false, activeJobCount },
  }

  // ── 1. ZIP 完整性检查 ──────────────────────────────────
  let manifest: BackupManifest | null = null

  try {
    manifest = await parseManifestFromZip(zipPath)
    const report = await verifyZipIntegrity(zipPath, manifest)

    if (report.valid) {
      checks.zipIntegrity = {
        passed: true,
        details: `所有 ${report.checkedFiles} 个文件校验通过`,
      }
    } else {
      const details: string[] = []
      if (report.mismatchedFiles.length > 0) {
        details.push(`哈希不匹配: ${report.mismatchedFiles.join(', ')}`)
      }
      if (report.missingFiles.length > 0) {
        details.push(`文件缺失: ${report.missingFiles.join(', ')}`)
      }
      checks.zipIntegrity = { passed: false, details: details.join('; ') }
      errors.push(`ZIP 完整性校验失败: ${details.join('; ')}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    checks.zipIntegrity = { passed: false, details: msg }
    errors.push(`ZIP 解析失败: ${msg}`)
  }

  // ── 2. Schema 兼容性检查（依赖 manifest） ──────────────
  if (manifest) {
    try {
      const tableMapping = await getTableNameMapping(prisma, databaseName)
      const currentModels = Array.from(tableMapping.keys())
      const report = checkSchemaCompatibility(manifest.models, currentModels)

      checks.schemaCompatibility = {
        passed: report.compatible,
        missingModels: report.missingModels,
        extraModels: report.extraModels,
      }

      if (report.missingModels.length > 0) {
        warnings.push(`Schema 缺失 model: ${report.missingModels.join(', ')}`)
      }
      if (report.extraModels.length > 0) {
        warnings.push(`Schema 多余 model: ${report.extraModels.join(', ')}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      checks.schemaCompatibility = { passed: false, missingModels: [], extraModels: [] }
      errors.push(`Schema 检查失败: ${msg}`)
    }
  }

  // ── 3. 插件状态检查（依赖 manifest） ──────────────────
  if (manifest) {
    try {
      const enabledMap = getEnabledPlugins()
      const enabledList = Object.entries(enabledMap)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)

      const report = checkPluginState(manifest.plugins, enabledList)

      checks.pluginState = {
        passed: report.compatible,
        missingPlugins: report.missingPlugins,
        extraPlugins: report.extraPlugins,
      }

      if (report.missingPlugins.length > 0) {
        warnings.push(`缺失插件: ${report.missingPlugins.join(', ')}`)
      }
      if (report.extraPlugins.length > 0) {
        warnings.push(`多余插件: ${report.extraPlugins.join(', ')}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      checks.pluginState = { passed: false, missingPlugins: [], extraPlugins: [] }
      errors.push(`插件检查失败: ${msg}`)
    }
  }

  // ── 4. 数据库连通性检查 ────────────────────────────────
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    checks.databaseConnection = { passed: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    checks.databaseConnection = { passed: false }
    errors.push(`数据库不可达: ${msg}`)
  }

  // ── 5. 并发检查 ────────────────────────────────────────
  if (activeJobCount === 0) {
    checks.concurrentJob = { passed: true, activeJobCount }
  } else {
    checks.concurrentJob = { passed: false, activeJobCount }
    errors.push(`存在 ${activeJobCount} 个活跃任务，无法并发执行恢复操作`)
  }

  return {
    canProceed: errors.length === 0,
    warnings,
    errors,
    checks,
  }
}
