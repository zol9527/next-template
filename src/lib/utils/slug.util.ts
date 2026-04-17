/**
 * Module: slug
 *
 * Description: Slug 生成工具 - 将标题转换为 URL 友好的 slug
 *
 * =============================================================================
 *
 * 功能说明：
 * - generateSlug: 将中英文标题转换为拼音 slug
 * - resolveSlugConflict: 处理 slug 碰撞问题
 *
 * =============================================================================
 */

import { transliterate, slugify } from 'transliteration'

const MAX_SLUG_LENGTH = 100
const MAX_CONFLICT_ATTEMPTS = 100

/**
 * Function: generateSlug
 *
 * Description: 将标题转换为 URL 友好的 slug
 *
 * Parameters:
 *   title(string): 原始标题（支持中英文）
 *
 * Returns:
 *   string: 转换后的 slug
 *
 * 转换规则：
 *   - 中文转为拼音
 *   - 移除非 ASCII 字符（除短横线和字母数字）
 *   - 转小写，空格替换为短横线
 *   - 合并连续短横线
 *   - 截取最大长度 100 字符
 *   - 空输入返回 'untitled'
 */
export function generateSlug(title: string): string {
  if (!title || typeof title !== 'string') {
    return 'untitled'
  }

  // 使用 transliteration 将中文转为拼音
  let slug = transliterate(title)

  // 移除非 ASCII 字符（保留字母、数字、短横线）
  slug = slug.replace(/[^\x00-\x7F-]/g, '')

  // 转小写
  slug = slug.toLowerCase()

  // 空格替换为短横线
  slug = slug.replace(/\s+/g, '-')

  // 移除非字母数字和短横线的字符
  slug = slug.replace(/[^a-z0-9-]/g, '')

  // 合并连续短横线
  slug = slug.replace(/-+/g, '-')

  // 去除首尾短横线
  slug = slug.replace(/^-+|-+$/g, '')

  // 截取最大长度
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.substring(0, MAX_SLUG_LENGTH)
    // 截断后可能产生尾随短横线，需要清理
    slug = slug.replace(/-+$/g, '')
  }

  // 空输入返回 'untitled'
  return slug || 'untitled'
}

/**
 * Function: resolveSlugConflict
 *
 * Description: 处理 slug 碰撞问题
 *
 * Parameters:
 *   slug(string): 原始 slug
 *   checkFn(function): 检查 slug 是否已存在的函数
 *     - 返回 true 表示 slug 已存在
 *     - 返回 false 表示 slug 可用
 *
 * Returns:
 *   Promise<string>: 不冲突的 slug
 *
 * 处理逻辑：
 *   - 如果 slug 不存在（checkFn 返回 false），直接返回
 *   - 如果存在，追加 -2, -3, -4... 直到找到不冲突的
 *   - 最大尝试 100 次，超过抛出错误
 */
export async function resolveSlugConflict(
  slug: string,
  checkFn: (s: string) => Promise<boolean>
): Promise<string> {
  if (!slug) {
    throw new Error('slug 不能为空')
  }

  // 首先检查原始 slug 是否冲突
  const isConflict = await checkFn(slug)
  if (!isConflict) {
    return slug
  }

  // 尝试追加数字后缀
  for (let i = 2; i <= MAX_CONFLICT_ATTEMPTS; i++) {
    const newSlug = `${slug}-${i}`
    const exists = await checkFn(newSlug)
    if (!exists) {
      return newSlug
    }
  }

  // 超过最大尝试次数
  throw new Error(`无法为 slug "${slug}" 找到不冲突的名称，已尝试 ${MAX_CONFLICT_ATTEMPTS} 次`)
}
