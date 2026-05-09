/**
 * 文件上传相关的常量定义
 */

/**
 * 允许的 MIME 类型列表
 * 与 AdminMediaContentTypeSchema 保持一致
 *
 * @see src/contracts/dtos/admin/media-assets.dto.ts:24-26
 */
export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
] as const

/**
 * 允许的 MIME 类型（用于运行时检查）
 */
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number]

/**
 * HTML input accept 属性值
 *
 * 注意：
 * - 使用通配符语法提供更好的用户体验
 * - 排除 application/octet-stream（仅作为后备类型）
 * - 浏览器会在文件选择对话框中过滤文件类型
 */
export const FILE_INPUT_ACCEPT_VALUE = 'image/*,video/mp4'

/**
 * 验证 MIME 类型是否在允许列表中
 *
 * @param mimeType - 要验证的 MIME 类型
 * @returns 是否允许
 */
export function isAllowedMediaType(mimeType: string): mimeType is AllowedMediaType {
  return ALLOWED_MEDIA_TYPES.includes(mimeType as AllowedMediaType)
}
