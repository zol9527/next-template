/**
 * Function: services/api/index
 *
 * Description: API 服务统一导出入口，提供所有业务服务的集中访问点
 *
 * Returns:
 *   exports(object): 导出的所有服务和类型
 */

// HTTP 客户端
export { HttpClient, httpClient } from '../../core/http-client';
export type { RequestOptions, ResponseWrapper } from '../../core/http-client';
export { RequestError } from '../../core/http-client';

// 认证服务
import { authService as _authService } from './auth.service';
export { authService } from './auth.service';
export type { LoginParams, WechatLoginParams, UserInfo, LoginResponse } from '../../types';

// 用户服务
import { userService as _userService } from './user';
export { userService } from './user';

// 订单服务
import { orderService as _orderService } from './orders';
export { orderService } from './orders';

// 分销服务
import { distributionService as _distributionService } from './distribution';
export { distributionService } from './distribution';

// 支付服务
import { paymentService as _paymentService } from './payment';
export { paymentService } from './payment';

// 商品服务
import { productService as _productService } from './products';
export { productService } from './products';

// 站点配置服务
import { siteConfigService as _siteConfigService } from './site-config';
export { siteConfigService } from './site-config';

// 轮播图服务
import { bannerService as _bannerService } from './banner';
export { bannerService } from './banner';
export type { Banner } from './banner';

// 优惠券服务
import { couponService as _couponService } from './coupons';
export { couponService } from './coupons';
export type { Coupon } from './coupons';

// 常见问题服务
import { faqService as _faqService } from './faq';
export { faqService } from './faq';
export type { FaqItem } from './faq';

// 协议服务
import { agreementService as _agreementService } from './agreement';
export { agreementService } from './agreement';

// 文件上传服务
import { uploadService as _uploadService } from './upload';
export { uploadService } from './upload';
export type { UploadImageResponse } from './upload';

// 通知服务
import { notificationService as _notificationService } from './notifications';
export { notificationService } from './notifications';
export type { NotificationItem, NotificationListResponse, UnreadCountResponse, NotificationType } from './notifications';

/**
 * API 服务聚合对象 - 便于统一访问
 */
export const api = {
  auth: _authService,
  user: _userService,
  order: _orderService,
  distribution: _distributionService,
  payment: _paymentService,
  product: _productService,
  siteConfig: _siteConfigService,
  banner: _bannerService,
  coupon: _couponService,
  faq: _faqService,
  agreement: _agreementService,
  upload: _uploadService,
  notification: _notificationService,
};

export default api;
