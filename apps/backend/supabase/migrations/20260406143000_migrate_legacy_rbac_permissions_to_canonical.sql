create temporary table tmp_rbac_permission_mapping (
  legacy_slug text primary key,
  canonical_slug text not null,
  canonical_name text not null,
  canonical_description text not null,
  canonical_module text not null
) on commit drop;

insert into tmp_rbac_permission_mapping (
  legacy_slug,
  canonical_slug,
  canonical_name,
  canonical_description,
  canonical_module
)
values
  ('admin:me', 'account.read', 'account.read', '读取当前账户信息', '账户'),
  ('admin:me:mfa', 'account.mfa.read', 'account.mfa.read', '读取当前账户 MFA 状态', '账户'),
  ('admin:me:mfa:setup', 'account.mfa.setup', 'account.mfa.setup', '设置 MFA (生成 TOTP 密钥)', '账户'),
  ('admin:me:mfa:disable', 'account.mfa.disable', 'account.mfa.disable', '禁用 MFA', '账户'),
  ('admin:me:mfa:verify', 'account.mfa.verify', 'account.mfa.verify', '验证 MFA', '账户'),
  ('admin:ping', 'health.read', 'health.read', '健康检查', '系统'),
  ('admin:dashboard:read', 'dashboard.read', 'dashboard.read', '读取仪表盘数据', '仪表盘'),
  ('admin:users:read', 'users.read', 'users.read', '读取用户列表/详情', '用户'),
  ('admin:users:write', 'users.write', 'users.write', '修改用户状态（启用/禁用）', '用户'),
  ('admin:rbac:read', 'rbac.read', 'rbac.read', '读取 RBAC 权限配置', '权限'),
  ('admin:rbac:write', 'rbac.write', 'rbac.write', '管理 RBAC 权限配置', '权限'),
  ('admin:mfa:view', 'mfa.read', 'mfa.read', '查看 MFA 策略配置', 'MFA'),
  ('admin:mfa:manage', 'mfa.write', 'mfa.write', '管理 MFA 策略配置', 'MFA'),
  ('admin:agreement:view', 'agreement.read', 'agreement.read', '查看协议', '协议'),
  ('admin:agreement:create', 'agreement.create', 'agreement.create', '创建协议', '协议'),
  ('admin:agreement:update', 'agreement.update', 'agreement.update', '更新协议', '协议'),
  ('admin:agreement:delete', 'agreement.delete', 'agreement.delete', '删除协议', '协议'),
  ('admin:announcement:view', 'announcement.read', 'announcement.read', '查看公告', '公告'),
  ('admin:announcement:create', 'announcement.create', 'announcement.create', '创建公告', '公告'),
  ('admin:announcement:update', 'announcement.update', 'announcement.update', '更新公告', '公告'),
  ('admin:announcement:delete', 'announcement.delete', 'announcement.delete', '删除公告', '公告'),
  ('admin:site:config:view', 'site-config.read', 'site-config.read', '查看站点配置', '配置'),
  ('admin:site:config:update', 'site-config.write', 'site-config.write', '更新站点配置', '配置'),
  ('admin:export:create', 'export.create', 'export.create', '创建导出任务', '导出'),
  ('admin:export:read', 'export.read', 'export.read', '读取导出任务', '导出'),
  ('admin:sessions:read', 'sessions.read', 'sessions.read', '读取会话列表', '会话'),
  ('admin:sessions:delete', 'sessions.delete', 'sessions.delete', '删除会话', '会话'),
  ('admin:products:read', 'products.read', 'products.read', '读取商品列表/详情', '商品'),
  ('admin:products:write', 'products.write', 'products.write', '创建/更新商品、上下架', '商品'),
  ('admin:product:read', 'product.read', 'product.read', '读取单个商品详情', '商品'),
  ('admin:product:update', 'product.update', 'product.update', '更新单个商品', '商品'),
  ('admin:product:delete', 'product.delete', 'product.delete', '删除商品', '商品'),
  ('admin:categories:read', 'categories.read', 'categories.read', '读取分类树', '分类'),
  ('admin:categories:write', 'categories.write', 'categories.write', '创建/更新/删除分类（按规则）', '分类'),
  ('admin:media:read', 'media.read', 'media.read', '读取媒体资源列表', '媒体'),
  ('admin:media:write', 'media.write', 'media.write', '登记媒体、删除并替换', '媒体'),
  ('admin:storage:read', 'storage.read', 'storage.read', '读取媒体文件（缩略图/预览）', '媒体'),
  ('admin:storage:write', 'storage.write', 'storage.write', '获取上传策略/直传签名（OSS/本地）', '媒体'),
  ('admin:miniprogram:view', 'miniprogram.read', 'miniprogram.read', '查看小程序管理入口', '小程序'),
  ('admin:miniprogram:banner:view', 'miniprogram.banner.read', 'miniprogram.banner.read', '读取轮播图列表/详情', '小程序'),
  ('admin:miniprogram:banner:create', 'miniprogram.banner.create', 'miniprogram.banner.create', '创建轮播图', '小程序'),
  ('admin:miniprogram:banner:update', 'miniprogram.banner.update', 'miniprogram.banner.update', '更新轮播图（含启用/排序）', '小程序'),
  ('admin:miniprogram:banner:delete', 'miniprogram.banner.delete', 'miniprogram.banner.delete', '删除轮播图', '小程序'),
  ('admin:orders:read', 'orders.read', 'orders.read', '读取订单列表/详情', '订单'),
  ('admin:orders:detail', 'orders.detail.read', 'orders.detail.read', '读取订单详细信息', '订单'),
  ('admin:orders:write', 'orders.write', 'orders.write', '修改订单状态（确认完成等）', '订单'),
  ('admin:orders:bind_promoter', 'orders.promoter.bind', 'orders.promoter.bind', '为订单绑定推广人', '订单'),
  ('admin:commissions:read', 'commissions.read', 'commissions.read', '读取佣金列表/详情', '佣金'),
  ('admin:commission-rules:read', 'commission-rules.read', 'commission-rules.read', '读取佣金规则列表', '佣金'),
  ('admin:commission-rule:manage', 'commission-rules.write', 'commission-rules.write', '管理佣金规则', '佣金'),
  ('admin:settlements:read', 'settlements.read', 'settlements.read', '读取结算列表/详情', '结算'),
  ('admin:settlements:write', 'settlements.write', 'settlements.write', '创建与执行结算', '结算'),
  ('admin:settlement-application:list', 'settlement-applications.read', 'settlement-applications.read', '查看结算申请列表', '结算'),
  ('admin:settlement-application:review', 'settlement-applications.review', 'settlement-applications.review', '审核结算申请', '结算'),
  ('admin:promoters:read', 'promoters.read', 'promoters.read', '读取推广员列表/详情', '推广员'),
  ('admin:promoters:update', 'promoters.write', 'promoters.write', '更新推广员信息', '推广员'),
  ('admin:promoter-levels:read', 'promoter-levels.read', 'promoter-levels.read', '读取推广员等级列表', '推广员'),
  ('admin:promoter-levels:write', 'promoter-levels.write', 'promoter-levels.write', '管理推广员等级', '推广员'),
  ('admin:system-settings:manage', 'system-settings.write', 'system-settings.write', '管理系统设置', '系统'),
  ('admin:feature_flags:view', 'feature-flags.read', 'feature-flags.read', '查看功能开关', '系统'),
  ('admin:feature_flags:update', 'feature-flags.write', 'feature-flags.write', '更新功能开关', '系统'),
  ('admin:logs', 'logs.read', 'logs.read', '查看日志管理（仅管理员）', '系统'),
  ('admin:rate_limit:manage', 'rate-limits.write', 'rate-limits.write', '管理 Rate Limit 配置', '系统'),
  ('admin:coupons:read', 'coupons.read', 'coupons.read', '读取优惠券列表/详情', '优惠券'),
  ('admin:coupons:write', 'coupons.write', 'coupons.write', '创建/更新/删除/发放优惠券', '优惠券'),
  ('admin:coupon-redemptions:read', 'coupon-redemptions.read', 'coupon-redemptions.read', '读取核销记录列表', '优惠券'),
  ('admin:version_release:read', 'version-releases.read', 'version-releases.read', '读取版本发布列表/详情', '版本'),
  ('admin:version_release:write', 'version-releases.write', 'version-releases.write', '同步版本发布记录', '版本'),
  ('user_document:read', 'user-documents.read', 'user-documents.read', '查看用户文档', '文档'),
  ('user_document:manage', 'user-documents.write', 'user-documents.write', '管理用户文档', '文档');

insert into public.permissions (slug, name, module, description)
select canonical_slug, canonical_name, canonical_module, canonical_description
from tmp_rbac_permission_mapping
on conflict (slug) do update
set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select distinct rp.role_id, canonical_permissions.id
from public.role_permissions rp
inner join public.permissions legacy_permissions on legacy_permissions.id = rp.permission_id
inner join tmp_rbac_permission_mapping mapping on mapping.legacy_slug = legacy_permissions.slug
inner join public.permissions canonical_permissions on canonical_permissions.slug = mapping.canonical_slug
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.permissions legacy_permissions, tmp_rbac_permission_mapping mapping
where rp.permission_id = legacy_permissions.id
  and legacy_permissions.slug = mapping.legacy_slug;

delete from public.permissions legacy_permissions
using tmp_rbac_permission_mapping mapping
where legacy_permissions.slug = mapping.legacy_slug;
