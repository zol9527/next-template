/**
 * File: src/lib/storage/types/image-processing.ts
 * Description: OSS 图片处理相关类型定义
 */

/**
 * 图片尺寸预设
 */
export type ImageSizePreset =
  | 'thumbnail'   // 缩略图 150x150
  | 'small'       // 小图 300x300
  | 'medium'      // 中图 600x600
  | 'large'       // 大图 1200x1200
  | 'xlarge'      // 超大图 1920x1920

/**
 * 图片格式
 */
export type ImageFormat = 'jpg' | 'png' | 'webp' | 'bmp' | 'gif' | 'tiff'

/**
 * 图片质量模式
 */
export type ImageQualityMode = 'relative' | 'absolute'

/**
 * 图片缩放模式
 */
export type ImageResizeMode =
  | 'lfit'   // 等比缩放，限制在指定区域内（默认）
  | 'mfit'   // 等比缩放，延伸覆盖指定区域
  | 'fill'   // 等比缩放 + 居中裁剪
  | 'pad'    // 等比缩放 + 填充背景
  | 'fixed'  // 强制缩放到指定尺寸（可能变形）

/**
 * 图片处理选项
 */
export interface ImageProcessingOptions {
  /**
   * 图片尺寸预设
   * 如果指定，将忽略 width/height 参数
   */
  size?: ImageSizePreset

  /**
   * 目标宽度（px）
   * 范围：1-16384
   */
  width?: number

  /**
   * 目标高度（px）
   * 范围：1-16384
   */
  height?: number

  /**
   * 缩放模式
   * @default 'lfit'
   */
  mode?: ImageResizeMode

  /**
   * 目标格式
   * @default 'webp'（推荐）
   */
  format?: ImageFormat

  /**
   * 质量模式
   * - relative: 相对质量（按百分比压缩原图）
   * - absolute: 绝对质量（指定目标质量值）
   * @default 'absolute'
   */
  qualityMode?: ImageQualityMode

  /**
   * 质量值
   * - relative 模式：1-100，表示原质量的百分比
   * - absolute 模式：1-100，表示绝对质量值
   * @default 85
   */
  quality?: number

  /**
   * 填充颜色（仅 pad 模式有效）
   * RGB 格式，如 'FF0000' 表示红色
   * @default 'FFFFFF'（白色）
   */
  fillColor?: string

  /**
   * 是否允许放大图片
   * @default false
   */
  allowUpscale?: boolean
}

/**
 * 图片处理结果
 */
export interface ImageProcessingResult {
  /** 原图 URL */
  originalUrl: string
  /** 处理后的 URL（带图片处理参数） */
  processedUrl: string
  /** 处理参数（用于调试） */
  processParams: string
}
