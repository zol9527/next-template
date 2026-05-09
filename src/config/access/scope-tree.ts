export const SCOPE_TREE = {
  account: {
    description: '当前账户信息与设置',
    children: {
      mfa: { description: 'MFA 多因素认证管理' },
    },
  },
  users: { description: '用户管理（管理员操作他人）' },
  products: { description: '商品管理' },
  orders: {
    description: '订单管理',
    children: {
      promoter: { description: '订单推广人绑定' },
    },
  },
  categories: { description: '分类管理' },
  coupons: {
    description: '优惠券管理',
    children: {
      redemptions: { description: '优惠券核销记录' },
    },
  },
  settlements: {
    description: '结算管理',
    children: {
      applications: { description: '结算申请审核' },
    },
  },
  promoters: {
    description: '推广员管理',
    children: {
      levels: { description: '推广员等级' },
    },
  },
  commissions: {
    description: '佣金',
    children: {
      rules: { description: '佣金规则管理' },
    },
  },
  'user-documents': { description: '用户文档管理' },
  media: { description: '媒体资源管理' },
  storage: { description: '文件上传与存储' },
  miniprogram: {
    description: '小程序管理',
    children: {
      carousels: { description: '轮播图管理' },
      'shop-config': { description: '商城设置管理' },
      'home-config': { description: '首页 Banner 配置管理' },
    },
  },
  agreements: { description: '协议管理' },
  announcements: { description: '公告管理' },
  blog: {
    description: '博客管理',
    children: {
      articles: { description: '博客文章管理' },
      categories: { description: '博客分类管理' },
      tags: { description: '博客标签管理' },
      analytics: { description: '博客阅读数据' },
    },
  },
  rbac: { description: '权限管理' },
  mfa: { description: 'MFA 策略管理（全局）' },
  'site-config': { description: '站点配置' },
  'feature-flags': { description: '功能开关' },
  'version-releases': { description: '版本发布' },
  logs: { description: '日志管理' },
  sessions: { description: '会话管理（全局）' },
  exports: { description: '导出管理' },
  backup: { description: '数据备份与恢复管理' },
  dashboard: { description: '仪表盘' },
  health: { description: '健康检查' },
  ai: {
    description: 'AI 功能管理',
    children: {
      settings: { description: 'AI 提供商与模型配置' },
      templates: { description: 'AI 提示词模板管理' },
      generate: { description: 'AI 内容生成' },
      logs: { description: 'AI 使用日志查看' },
    },
  },
  feedback: { description: '反馈管理' },
  checkin: { description: '签到管理' },
} as const
