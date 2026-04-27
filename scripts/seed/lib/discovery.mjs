/**
 * 模块自动发现引擎
 * 扫描 modules/core/ 和 modules/optional/ 目录，动态加载模块并提取 meta 信息
 *
 * Function: discoverModules
 *
 * Description: 扫描固定目录下的所有 .mjs 文件，动态 import 提取 meta export 和 default 函数。
 *   返回以 meta.id 为 key 的 Map，包含模块元信息、文件路径、default 函数和类型。
 *   提供重复 ID 检测、缺失 ID 检测、缺失 default 函数检测等错误处理。
 *
 * Returns:
 *   modules(Map<string, {meta, filePath, module, type}>): 以 meta.id 为 key 的模块映射
 */

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 需要扫描的模块目录及其类型映射
 */
const MODULE_DIRS = [
  { dir: 'core', type: 'core' },
  { dir: 'optional', type: 'optional' },
]

/**
 * 扫描指定目录下的所有 .mjs 文件
 *
 * Parameters:
 *   dirPath(string): 目录绝对路径
 *
 * Returns:
 *   files(string[]): 目录下的 .mjs 文件名列表
 */
function scanDir(dirPath) {
  try {
    return readdirSync(dirPath)
      .filter(file => file.endsWith('.mjs'))
      .sort()
  } catch {
    return []
  }
}

/**
 * 自动发现所有 seed 模块
 * 扫描 modules/core/ 和 modules/optional/ 两个固定目录，
 * 动态 import 每个 .mjs 文件，提取 meta export 和 default 函数
 *
 * Returns:
 *   modules(Map<string, {meta, filePath, module, type}>): 以 meta.id 为 key 的模块映射
 *
 * Throws:
 *   Error: 当存在重复 meta.id、缺失 meta.id、或缺失 default 函数时抛出
 */
export async function discoverModules() {
  const modules = new Map()
  const modulesBaseDir = join(__dirname, '..', 'modules')

  for (const { dir, type } of MODULE_DIRS) {
    const dirPath = join(modulesBaseDir, dir)
    const files = scanDir(dirPath)

    for (const file of files) {
      const filePath = join(dirPath, file)
      const relativePath = `modules/${dir}/${file}`

      // 动态 import 模块
      const fileUrl = new URL(`file://${filePath}`).href
      const loadedModule = await import(fileUrl)

      // 检测 meta export
      if (!loadedModule.meta) {
        throw new Error(`Module ${relativePath} is missing required meta.id`)
      }

      const meta = loadedModule.meta

      // 校验 meta.id 类型
      if (typeof meta.id !== 'string' || !meta.id) {
        throw new Error(`Module ${relativePath} meta.id must be a non-empty string`)
      }

      // 检测重复 meta.id
      if (modules.has(meta.id)) {
        const existing = modules.get(meta.id)
        throw new Error(
          `Duplicate module ID: '${meta.id}' found in ${existing.filePath} and ${relativePath}`
        )
      }

      // 检测 default 函数
      if (typeof loadedModule.default !== 'function') {
        throw new Error(`Module ${relativePath} does not export a default function`)
      }

      modules.set(meta.id, {
        meta,
        filePath: relativePath,
        module: loadedModule,
        type,
      })
    }
  }

  return modules
}
