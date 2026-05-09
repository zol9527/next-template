/**
 * Function: api
 *
 * Description: API 服务统一导出入口
 *
 * Returns:
 *	auth(object): 认证服务
 *	user(object): 用户服务
 *	order(object): 订单服务
 *	distribution(object): 分销服务
 *	payment(object): 支付服务
 */

import { authService } from './auth'
import { userService } from './user'
import { orderService } from './orders'
import { distributionService } from './distribution'
import { paymentService } from './payment'
import { productService } from './products'
import { agreementService } from './agreement'

export { authService, userService, orderService, distributionService, paymentService, productService, agreementService }

/**
 * API 服务聚合对象
 */
export const api = {
  auth: authService,
  user: userService,
  order: orderService,
  distribution: distributionService,
  payment: paymentService,
  product: productService,
  agreement: agreementService
}

export default api
