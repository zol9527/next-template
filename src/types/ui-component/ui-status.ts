/**
 * File: ui-status.ts
 * Description: UI 业务状态到颜色角色的映射
 */

import type { ColorRole } from "./semantics"

/**
 * Constant: STATUS_COLOR_MAP
 *
 * Description: 业务状态到颜色角色的映射表
 *
 * Details:
 *     定义了各种业务状态对应的颜色角色
 *     用于 Badge 等组件的自动着色
 */
export const STATUS_COLOR_MAP: Record<string, ColorRole> = {
  // 商品/内容状态
  published: 'success',
  draft: 'neutral',
  unpublished: 'warning',
  archived: 'error',

  // 优惠券状态
  active: 'success',
  scheduled: 'info',
  paused: 'warning',
  expired: 'error',
  disabled: 'neutral',

  // 佣金/结算状态
  frozen: 'info',
  payable: 'success',
  settling: 'warning',
  settled: 'neutral',
  failed: 'error',
  voided: 'neutral',

  // 通用状态
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  paid: 'success',
  processing: 'info',

  // 推广员等级
  level_bronze: 'neutral',
  level_silver: 'info',
  level_gold: 'warning',
  level_diamond: 'error',
}

/**
 * Type: BusinessStatus
 *
 * Description: 业务状态类型
 *
 * Details:
 *     包含所有业务领域的状态值
 */
export type BusinessStatus =
  // 商品/内容状态
  | 'published' | 'draft' | 'unpublished' | 'archived'
  // 优惠券状态
  | 'active' | 'scheduled' | 'paused' | 'expired' | 'disabled'
  // 佣金/结算状态
  | 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided'
  // 通用状态
  | 'pending' | 'approved' | 'rejected' | 'paid' | 'processing'
  // 推广员等级
  | 'level_bronze' | 'level_silver' | 'level_gold' | 'level_diamond'

/**
 * Function: getStatusColor
 *
 * Description: 根据业务状态获取对应的颜色角色
 *
 * Parameters:
 *     status(string): 业务状态值
 *
 * Returns:
 *     ColorRole: 对应的颜色角色，默认为 'neutral'
 *
 * Example:
 *     getStatusColor('published') // 'success'
 *     getStatusColor('draft') // 'neutral'
 *     getStatusColor('unknown') // 'neutral'
 */
export function getStatusColor(status: string): ColorRole {
  return STATUS_COLOR_MAP[status] || 'neutral'
}

/**
 * Function: isValidBusinessStatus
 *
 * Description: 检查值是否为有效的业务状态
 *
 * Parameters:
 *     value(unknown): 待检查的值
 *
 * Returns:
 *     boolean: 是否为有效的业务状态
 */
export function isValidBusinessStatus(value: unknown): value is BusinessStatus {
  return typeof value === 'string' && value in STATUS_COLOR_MAP
}
