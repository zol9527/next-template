/**
 * 弹窗工具函数
 *
 * 提供通用的确认弹窗逻辑，避免在多个页面重复实现。
 */

import { orderService } from '@/services/api/orders'
import { logger } from '@/utils/logger'
import { showSuccess, showError } from '@/utils/toast'

/**
 * 取消订单确认弹窗
 *
 * 显示确认弹窗，用户确认后调用取消订单 API。
 * 提取为共享工具函数，避免在多个页面重复实现。
 *
 * @param orderId 订单 ID
 * @returns Promise<boolean> 用户确认并取消成功返回 true，否则返回 false
 */
export async function confirmCancelOrder(orderId: string): Promise<boolean> {
  // 弹出确认弹窗，防止误操作
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？取消后不可恢复。',
      confirmText: '确定取消',
      confirmColor: '#e74c3c',
      success: (res) => resolve(res.confirm),
    })
  })

  if (!confirmed) return false

  try {
    await orderService.cancelOrder(orderId)
    showSuccess('订单已取消')
    return true
  } catch (error: any) {
    logger.error('取消订单失败:', error)
    showError(error.message || '取消订单失败')
    return false
  }
}
