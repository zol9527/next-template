-- Seed RBAC permissions for order / payment / distribution / settlement

insert into public.permissions (slug, description)
values
  ('orders.read', '读取订单列表/详情'),
  ('orders.write', '修改订单状态（确认完成等）'),
  ('commissions.read', '读取佣金列表/详情'),
  ('settlements.write', '创建与执行结算')
on conflict (slug)
do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id as role_id, p.id as permission_id
from public.roles r
join public.permissions p on p.slug in (
  'orders.read',
  'orders.write',
  'commissions.read',
  'settlements.write'
)
where r.name = 'admin'
on conflict (role_id, permission_id) do nothing;
