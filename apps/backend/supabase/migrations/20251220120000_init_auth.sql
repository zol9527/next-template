-- Minimal auth+RBAC schema for local Supabase development

create extension if not exists pgcrypto;

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  email text unique,
  phone text unique,
  avatar_url text,
  user_type text,
  password_hash text,
  password_updated_at timestamptz,
  status text not null default 'active',
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Permissions
create table if not exists public.permissions (
  id bigserial primary key,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- User roles (M:N)
create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- Role permissions (M:N)
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id bigint not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

-- Sessions (refresh token hash)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_token_hash text not null,
  replaced_by_session_id uuid references public.sessions(id) on delete set null,
  rotated_at timestamptz,
  user_agent text,
  client_ip text,
  is_revoked boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists sessions_refresh_token_hash_uq on public.sessions (refresh_token_hash);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- WeChat accounts
create table if not exists public.wechat_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  openid text not null unique,
  unionid text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
