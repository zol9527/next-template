/**
 * 备份 Manifest 生成器
 * @module lib/backup/manifest-generator
 *
 * 功能：
 * 1. 自动收集备份所需的所有元数据（表列表、插件状态、schema hash 等）
 * 2. 生成结构化 manifest JSON，用于备份 ZIP 的完整性校验和恢复时的环境检查
 * 3. 提供 schema 快照能力（SHA256 hash）
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

import { getSkipList, getTableNameMapping } from './schema-analyzer'
import { getEnabledPlugins } from '@/plugins/registry'

/**
 * Prisma 客户端最小接口约束
 *
 * 仅需要 $queryRaw 方法来执行原始 SQL 查询
 */
export interface PrismaClientLike {
  $queryRaw: <T>(query: TemplateStringsArray | string, ...values: unknown[]) => Promise<T>
}

/**
 * 备份中的单个文件条目
 */
export interface ManifestFileEntry {
  /** ZIP 内相对路径 */
  path: string
  /** 文件 SHA256 哈希（hex） */
  sha256: string
  /** 文件大小（字节） */
  size: number
  /** 行数（仅 db 表文件有值） */
  rows?: number
}

/**
 * generateManifest 函数的输入参数
 */
export interface ManifestParams {
  /** 备份类型 */
  type: 'db_backup' | 'file_backup'
  /** 备份中的文件列表 */
  files: ManifestFileEntry[]
  /** Prisma 客户端实例，用于获取表信息 */
  prisma: PrismaClientLike
  /** 数据库名称 */
  databaseName: string
  /** 当前存储提供者标识（如 'local'、'ali-oss'） */
  sourceProvider: string
  /** 当前存储 endpoint */
  sourceEndpoint: string
}

/**
 * 完整的备份 Manifest 对象
 */
export interface BackupManifest {
  /** Manifest 格式版本 */
  version: string
  /** 备份类型 */
  type: 'db_backup' | 'file_backup'
  /** Manifest 创建时间（ISO 8601） */
  createdAt: string
  /** 数据快照时间（ISO 8601） */
  snapshotTime: string
  /** 需要备份的数据库表名列表（已过滤 ephemeral） */
  tables: string[]
  /** 表名对应的首字母大写模型名列表 */
  models: string[]
  /** 当前启用的插件映射 */
  plugins: Record<string, boolean>
  /** Prisma 版本号 */
  prismaVersion: string
  /** Prisma schema 文件的 SHA256 哈希 */
  schemaHash: string
  /** 备份源存储提供者 */
  sourceProvider: string
  /** 备份源存储 endpoint */
  sourceEndpoint: string
  /** 恢复时需要 URL 重映射的字段 */
  remappingFields: Record<string, string[]>
  /** 不参与备份的临时/ephemeral 表列表 */
  ephemeralTables: string[]
  /** 恢复前需要检查的环境变量清单 */
  envChecklist: string[]
  /** 文件路径 → SHA256 映射（用于完整性校验） */
  files: Record<string, string>
  /** 文件详细信息列表 */
  fileDetails: ManifestFileEntry[]
}

/**
 * URL 重映射字段静态定义
 *
 * 恢复时，这些表中对应字段的 URL 需要根据目标环境进行重写。
 * 键为表名（snake_case），值为该表中包含 URL 的字段列表。
 */
const REMAPPING_FIELDS: Record<string, string[]> = {
  'users': ['avatar_url'],
  'site_config': ['logo_url'],
  'blog_articles': ['cover_image', 'og_image'],
  'miniprogram_carousels': ['image_url'],
}

/**
 * 恢复前必须检查的环境变量
 */
const ENV_CHECKLIST = ['DATABASE_URL', 'OSS_PROVIDER', 'BACKUP_MAX_RETENTION']

/**
 * Function: getSchemaHash
 *
 * Description: 计算 prisma/schema.prisma 文件的 SHA256 哈希值。
 *   用于 manifest 中的 schema 快照，以便恢复时校验 schema 一致性。
 *
 * Returns:
 *   string: SHA256 hex 哈希值，文件不存在时返回空字符串
 */
export function getSchemaHash(): string {
  try {
    const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma')
    const content = readFileSync(schemaPath, 'utf-8')
    return createHash('sha256').update(content).digest('hex')
  } catch {
    return ''
  }
}

/**
 * Function: getPrismaVersion
 *
 * Description: 从 prisma 包的 package.json 中读取版本号。
 *   尝试动态 require prisma 包，获取其版本信息。
 *
 * Returns:
 *   string: Prisma 版本号（如 '6.7.0'），获取失败时返回 'unknown'
 */
export function getPrismaVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('prisma/package.json')
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Function: capitalizeFirst
 *
 * Description: 将字符串首字母大写，用于将表名转换为模型名。
 *   例如 'users' → 'Users', 'blog_articles' → 'Blog_articles'
 *
 * Parameters:
 *   str(string): 待转换的字符串
 *
 * Returns:
 *   string: 首字母大写后的字符串
 */
function capitalizeFirst(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Function: generateManifest
 *
 * Description: 生成备份 manifest 对象。
 *   自动收集所有元数据：表列表、插件状态、schema hash、文件映射等。
 *   从 schema-analyzer 动态获取表名列表，过滤 skipList 中的临时表。
 *
 * Parameters:
 *   params(ManifestParams): manifest 生成参数
 *   params.type: 备份类型 'db_backup' 或 'file_backup'
 *   params.files: 备份中的文件列表
 *   params.prisma: Prisma 客户端实例
 *   params.databaseName: 数据库名称
 *   params.sourceProvider: 当前存储提供者
 *   params.sourceEndpoint: 当前存储 endpoint
 *
 * Returns:
 *   Promise<BackupManifest>: 完整的备份 manifest 对象
 */
export async function generateManifest(params: ManifestParams): Promise<BackupManifest> {
  const { type, files, prisma, databaseName, sourceProvider, sourceEndpoint } = params

  const skipList = getSkipList()
  const now = new Date().toISOString()

  // 从数据库动态获取表名映射，过滤 skipList
  const tableMapping = await getTableNameMapping(prisma, databaseName)
  const tables = Array.from(tableMapping.keys()).filter(
    (table) => !skipList.includes(table)
  )

  // 表名转首字母大写模型名
  const models = tables.map(capitalizeFirst)

  // 获取插件启用状态
  const plugins = getEnabledPlugins()

  // 构建 文件路径 → SHA256 映射
  const filesMap: Record<string, string> = {}
  for (const file of files) {
    filesMap[file.path] = file.sha256
  }

  return {
    version: '1.0',
    type,
    createdAt: now,
    snapshotTime: now,
    tables,
    models,
    plugins,
    prismaVersion: getPrismaVersion(),
    schemaHash: getSchemaHash(),
    sourceProvider,
    sourceEndpoint,
    remappingFields: { ...REMAPPING_FIELDS },
    ephemeralTables: skipList,
    envChecklist: [...ENV_CHECKLIST],
    files: filesMap,
    fileDetails: files,
  }
}
