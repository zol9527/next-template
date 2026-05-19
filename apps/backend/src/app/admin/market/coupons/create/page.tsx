import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { isPluginEnabled } from '@/plugins/registry'
import { CreateCouponPage } from './create-coupon-page'

/**
 * 创建优惠券全页面表单
 *
 * 设计规范:
 *   - 不显示 TabBar，显示面包屑：优惠券管理 > 创建优惠券
 *   - 右上角：取消(描边) + 保存并发布(橙色实心)
 *   - 分段表单：基本信息、使用规则、其他设置
 */
export default async function CreateCouponRoute() {
  void (await connection())

  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <CreateCouponPage />
}
