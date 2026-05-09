-- Migration: Site Management (Site Config, Announcements, Agreements)
-- Description: Create tables for site configuration, announcement management, and legal content management
-- Date: 2026-01-03

-- ============================================================================
-- Site Config Table (singleton mode - only one record)
-- ============================================================================
create table if not exists public.site_config (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  logo_url text,
  contact_phone text,
  contact_wechat text,
  copyright text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.site_config is '站点配置表（单例模式，仅一条记录）';
comment on column public.site_config.site_name is '站点名称';
comment on column public.site_config.logo_url is 'Logo URL 或品牌图片地址';
comment on column public.site_config.contact_phone is '客服联系电话';
comment on column public.site_config.contact_wechat is '客服微信号';
comment on column public.site_config.copyright is '版权信息';

-- ============================================================================
-- Announcement Type Enum
-- ============================================================================
create type public.announcement_type as enum ('NOTICE', 'ACTIVITY', 'MAINTENANCE');

comment on type public.announcement_type is '公告类型：NOTICE（通知）、ACTIVITY（活动）、MAINTENANCE（维护）';

-- ============================================================================
-- Announcements Table
-- ============================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type announcement_type not null default 'NOTICE',
  is_active boolean not null default true,
  priority integer not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for common queries
create index if not exists announcements_is_active_priority_idx on public.announcements (is_active, priority desc);
create index if not exists announcements_start_end_at_idx on public.announcements (start_at, end_at);

-- Add table and column comments
comment on table public.announcements is '公告表';
comment on column public.announcements.title is '公告标题';
comment on column public.announcements.content is '公告内容（富文本）';
comment on column public.announcements.type is '公告类型';
comment on column public.announcements.is_active is '是否启用';
comment on column public.announcements.priority is '优先级（数字越大优先级越高）';
comment on column public.announcements.start_at is '生效开始时间';
comment on column public.announcements.end_at is '生效结束时间';

-- ============================================================================
-- Agreement Type Enum
-- ============================================================================
create type public.agreement_type as enum ('USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US');

comment on type public.agreement_type is '协议类型：USER_AGREEMENT（用户协议）、PRIVACY_POLICY（隐私政策）、ABOUT_US（关于我们）';

-- ============================================================================
-- Agreements Table
-- ============================================================================
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  type agreement_type not null unique,
  title text not null,
  content text not null,
  version text not null,
  is_active boolean not null default true,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for type lookup
create index if not exists agreements_type_idx on public.agreements (type);

-- Add table and column comments
comment on table public.agreements is '法律协议表（用户协议、隐私政策、关于我们）';
comment on column public.agreements.type is '协议类型（唯一）';
comment on column public.agreements.title is '协议标题';
comment on column public.agreements.content is '协议内容（富文本）';
comment on column public.agreements.version is '版本号';
comment on column public.agreements.is_active is '是否启用';
comment on column public.agreements.effective_at is '生效日期';

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
alter table public.site_config enable row level security;
alter table public.announcements enable row level security;
alter table public.agreements enable row level security;

-- Site Config policies
create policy "Site config is viewable by everyone" on public.site_config
  for select using (true);

create policy "Only admins can update site config" on public.site_config
  for update using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'site-config.write'
    )
  );

create policy "Only admins can insert site config" on public.site_config
  for insert with check (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'site-config.write'
    )
  );

-- Announcements policies
create policy "Active announcements are viewable by everyone" on public.announcements
  for select using (is_active = true);

create policy "All announcements viewable by admins" on public.announcements
  for select using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug in ('announcement.read', 'announcement.update')
    )
  );

create policy "Only admins can insert announcements" on public.announcements
  for insert with check (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'announcement.create'
    )
  );

create policy "Only admins can update announcements" on public.announcements
  for update using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'announcement.update'
    )
  );

create policy "Only admins can delete announcements" on public.announcements
  for delete using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'announcement.delete'
    )
  );

-- Agreements policies
create policy "Active agreements are viewable by everyone" on public.agreements
  for select using (is_active = true);

create policy "All agreements viewable by admins" on public.agreements
  for select using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug in ('agreement.read', 'agreement.update')
    )
  );

create policy "Only admins can insert agreements" on public.agreements
  for insert with check (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'agreement.create'
    )
  );

create policy "Only admins can update agreements" on public.agreements
  for update using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'agreement.update'
    )
  );

create policy "Only admins can delete agreements" on public.agreements
  for delete using (
    exists (
      select 1 from public.users
      inner join public.user_roles on public.users.id = public.user_roles.user_id
      inner join public.roles on public.user_roles.role_id = public.roles.id
      inner join public.role_permissions on public.roles.id = public.role_permissions.role_id
      inner join public.permissions on public.role_permissions.permission_id = public.permissions.id
      where public.users.id = auth.uid()
        and public.permissions.slug = 'agreement.delete'
    )
  );

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

-- Site config updated_at trigger
create or replace function public.handle_site_config_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger site_config_updated_at
  before update on public.site_config
  for each row execute function public.handle_site_config_updated_at();

-- Announcements updated_at trigger
create or replace function public.handle_announcements_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.handle_announcements_updated_at();

-- Agreements updated_at trigger
create or replace function public.handle_agreements_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agreements_updated_at
  before update on public.agreements
  for each row execute function public.handle_agreements_updated_at();

-- ============================================================================
-- Seed Initial Site Config Record
-- ============================================================================

insert into public.site_config (site_name)
values ('默认站点')
on conflict do nothing;
