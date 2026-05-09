-- ============================================
-- Promoter Levels Tables
-- 推广员等级相关表
-- ============================================

-- Promoter 等级配置表
create table if not exists public.promoter_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level integer not null unique,
  commission_rate numeric(8,6) not null,
  min_sales_count integer default 0,
  min_sales_amount numeric(12,2) default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 注释
comment on table public.promoter_levels is '推广员等级配置表';
comment on column public.promoter_levels.name is '等级名称（青铜/白银/黄金/钻石）';
comment on column public.promoter_levels.level is '等级序号（1-4）';
comment on column public.promoter_levels.commission_rate is '佣金比例（0.05-0.20）';
comment on column public.promoter_levels.min_sales_count is '升级条件：最小销售数量';
comment on column public.promoter_levels.min_sales_amount is '升级条件：最小销售金额';

-- Promoter 等级变更记录表
create table if not exists public.promoter_level_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  promoter_level_id uuid not null references public.promoter_levels(id) on delete restrict,
  effective_at timestamptz not null default now(),
  inactive_at timestamptz,
  created_at timestamptz not null default now()
);

-- 注释
comment on table public.promoter_level_records is '推广员等级变更记录';
comment on column public.promoter_level_records.effective_at is '生效时间';
comment on column public.promoter_level_records.inactive_at is '失效时间（null 表示当前生效）';

-- 索引
create index if not exists promoter_level_records_user_id_idx
  on public.promoter_level_records (user_id);
create index if not exists promoter_level_records_effective_at_idx
  on public.promoter_level_records (effective_at);

-- 初始等级数据
insert into public.promoter_levels (name, level, commission_rate, min_sales_count, min_sales_amount, description) values
  ('青铜', 1, 0.05, 0, 0, '初始等级，5% 佣金'),
  ('白银', 2, 0.10, 10, 1000, '销售 10 单或 1000 元，10% 佣金'),
  ('黄金', 3, 0.15, 50, 5000, '销售 50 单或 5000 元，15% 佣金'),
  ('钻石', 4, 0.20, 100, 10000, '销售 100 单或 10000 元，20% 佣金')
on conflict (name) do nothing;
