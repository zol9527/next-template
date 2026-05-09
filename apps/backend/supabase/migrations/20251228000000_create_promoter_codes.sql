-- ============================================
-- Promoter Codes Table
-- 推广员推广码表
-- ============================================

create table if not exists public.promoter_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  promoter_user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'auto',
  status text not null default 'active',
  usage_count integer not null default 0,
  active_from timestamptz not null default now(),
  active_to timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promoter_codes_type_chk check (type in ('auto', 'custom')),
  constraint promoter_codes_status_chk check (status in ('active', 'inactive', 'disabled'))
);

-- 注释
comment on table public.promoter_codes is '推广员推广码表';
comment on column public.promoter_codes.code is '推广码（唯一标识）';
comment on column public.promoter_codes.promoter_user_id is '推广员用户 ID';
comment on column public.promoter_codes.type is '类型：auto=自动生成，custom=用户自定义';
comment on column public.promoter_codes.status is '状态：active=可用，inactive=不可用，disabled=已禁用';
comment on column public.promoter_codes.usage_count is '使用次数（成功绑定的用户数）';
comment on column public.promoter_codes.active_from is '生效时间';
comment on column public.promoter_codes.active_to is '失效时间（可选，永久有效则不填）';
comment on column public.promoter_codes.metadata is '扩展元数据（JSON 格式）';

-- 唯一索引：code 全局唯一（仅对 active 和 inactive 状态）
create unique index if not exists promoter_codes_code_uq
  on public.promoter_codes (code)
  where status in ('active', 'inactive');

-- 索引：按推广员查询
create index if not exists promoter_codes_promoter_user_id_idx
  on public.promoter_codes (promoter_user_id);

-- 索引：状态和时间（用于清理过期码）
create index if not exists promoter_codes_status_active_to_idx
  on public.promoter_codes (status, active_to);

-- 索引：创建时间（用于列表排序）
create index if not exists promoter_codes_created_at_idx
  on public.promoter_codes (created_at desc);
