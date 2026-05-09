-- Seed baseline RBAC permissions and bindings for local development
-- 使用 canonical 权限 slug 格式

insert into public.roles (name, description)
values
  ('user', '默认普通用户'),
  ('admin', '管理员')
on conflict (name)
do update set description = excluded.description;

insert into public.permissions (slug, description)
values
  ('account.read', '读取当前管理员信息'),
  ('health.read', '管理员健康检查'),
  ('users.read', '读取用户列表/详情'),
  ('users.write', '修改用户状态（启用/禁用）'),
  ('user-documents.read', '查看用户文档'),
  ('user-documents.write', '管理用户文档')
on conflict (slug)
do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id as role_id, p.id as permission_id
from public.roles r
join public.permissions p on p.slug in (
  'account.read',
  'health.read',
  'users.read',
  'users.write',
  'user-documents.read',
  'user-documents.write'
)
where r.name = 'admin'
on conflict (role_id, permission_id) do nothing;
