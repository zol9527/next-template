/**
 * Module: sanitize-html
 *
 * Description: HTML 消毒工具 - 封装 sanitize-html 库，提供安全的 HTML 白名单过滤
 *
 * =============================================================================
 *
 * 功能说明：
 * - 移除危险标签（script, iframe, object, embed, form 等）
 * - 过滤所有 on* 事件属性
 * - 保留安全的标签和属性
 *
 * =============================================================================
 */

import sanitizeHtmlLib from 'sanitize-html'

/**
 * 白名单标签列表
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'div',
  'span',
  'hr',
]

/**
 * 白名单属性映射
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  '*': ['class'],
}

/**
 * Function: sanitizeHtml
 *
 * Description: 对 HTML 内容进行消毒，过滤危险标签和事件属性
 *
 * Parameters:
 *   html(string): 原始 HTML 字符串
 *
 * Returns:
 *   string: 消毒后的安全 HTML 字符串
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // 移除所有脚本相关标签的内容
    disallowedTagsMode: 'discard',
    // 不允许相对 URL
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
