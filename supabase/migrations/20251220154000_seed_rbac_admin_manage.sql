-- Seed RBAC permissions for managing RBAC itself

insert into public.permissions (slug, description)
values
  ('rbac.read', 'RBAC management read access'),
  ('rbac.write', 'RBAC management write access')
on conflict (slug) do update set description = excluded.description;

-- Bind to admin role
with admin_role as (
  select id
  from public.roles
  where name = 'admin'
  limit 1
), perms as (
  select id, slug
  from public.permissions
  where slug in ('rbac.read', 'rbac.write')
)
insert into public.role_permissions (role_id, permission_id)
select admin_role.id, perms.id
from admin_role
cross join perms
on conflict do nothing;
