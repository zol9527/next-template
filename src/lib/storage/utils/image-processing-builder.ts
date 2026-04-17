/**
 * File: src/lib/storage/utils/image-processing-builder.ts
 * Description: OSS 图片处理参数构建工具
 */

import type { ImageProcessingOptions, ImageSizePreset } from '@/lib/storage/types/image-processing'

/**
 * 图片尺寸预设配置（单位：px）
 */
const SIZE_PRESETS: Record<ImageSizePreset, { width: number; height: number }> = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
  xlarge: { width: 1920, height: 1920 },
} as const

/**
 * 构建阿里云 OSS 图片处理参数
 *
 * @param options - 图片处理选项
 * @returns OSS 图片处理参数字符串（不含 `?x-oss-process=image/` 前缀）
 *
 * @example
 * ```ts
 * buildImageProcessingParams({ size: 'thumbnail', format: 'webp', quality: 85 })
 * // 返回: "resize,w_150,h_150,m_lfit/format,webp/quality,Q_85"
 * ```
 */
export function buildImageProcessingParams(options: ImageProcessingOptions): string {
  const params: string[] = []

  // 1. 处理缩放参数
  const resizeParams = buildResizeParams(options)
  if (resizeParams) {
    params.push(`resize,${resizeParams}`)
  }

  // 2. 处理格式转换（放在缩放之后）
  const formatParams = buildFormatParams(options)
  if (formatParams) {
    params.push(`format,${formatParams}`)
  }

  // 3. 处理质量参数（放在格式之后）
  const qualityParams = buildQualityParams(options)
  if (qualityParams) {
    params.push(`quality,${qualityParams}`)
  }

  return params.join('/')
}

/**
 * 构建缩放参数
 */
function buildResizeParams(options: ImageProcessingOptions): string | null {
  // 如果指定了预设尺寸，使用预设值
  if (options.size) {
    const { width, height } = SIZE_PRESETS[options.size]
    return `w_${width},h_${height},m_${options.mode || 'lfit'}`
  }

  // 如果指定了宽高
  if (options.width || options.height) {
    const parts: string[] = []

    if (options.width) {
      parts.push(`w_${options.width}`)
    }
    if (options.height) {
      parts.push(`h_${options.height}`)
    }

    // 默认使用 lfit 模式
    parts.push(`m_${options.mode || 'lfit'}`)

    // 如果允许放大，添加 limit_0
    if (options.allowUpscale) {
      parts.push('limit_0')
    }

    return parts.join(',')
  }

  return null
}

/**
 * 构建格式转换参数
 */
function buildFormatParams(options: ImageProcessingOptions): string | null {
  const format = options.format ?? 'webp' // 默认转换为 WebP
  return format
}

/**
 * 构建质量参数
 */
function buildQualityParams(options: ImageProcessingOptions): string | null {
  const quality = options.quality ?? 85 // 默认质量 85
  const mode = options.qualityMode ?? 'absolute' // 默认绝对质量

  // 绝对质量使用 Q，相对质量使用 q
  return mode === 'absolute' ? `Q_${quality}` : `q_${quality}`
}
