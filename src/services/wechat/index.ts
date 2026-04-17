/**
 * Wechat 模块 barrel export
 *
 * 导出所有微信相关服务：支付、小程序轮播等
 * 已迁移至 src/plugins/wechat/，此处保留 re-export 兼容
 */

export * from '@/plugins/wechat/services/wechat-pay.service';
export * from '@/plugins/wechat/services/admin-miniprogram-carousel.service';
