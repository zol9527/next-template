-- Seed RBAC permissions for product management

insert into public.permissions (slug, description)
values
  ('products.read', '读取商品列表/详情'),
  ('products.write', '创建/更新商品、上下架'),
  ('categories.read', '读取分类树'),
  ('categories.write', '创建/更新/删除分类（按规则）'),
  ('media.read', '读取媒体资源列表'),
  ('media.write', '登记媒体、删除并替换'),
  ('storage.write', '获取 OSS 直传签名（upload policy）')
on conflict (slug)
do update set description = excluded.description;

-- Bind to admin role
with admin_role as (
  select id
  from public.roles
  where name = 'admin'
  limit 1
), perms as (
  select id
  from public.permissions
  where slug in (
    'products.read',
    'products.write',
    'categories.read',
    'categories.write',
    'media.read',
    'media.write',
    'storage.write'
  )
)
insert into public.role_permissions (role_id, permission_id)
select admin_role.id, perms.id
from admin_role
cross join perms
on conflict do nothing;
