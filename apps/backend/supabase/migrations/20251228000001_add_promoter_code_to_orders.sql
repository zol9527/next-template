-- ============================================
-- Add promoter_code_id to orders table
-- 为订单表添加推广码字段
-- ============================================

-- 添加 promoter_code_id 字段
alter table public.orders
  add column if not exists promoter_code_id uuid references public.promoter_codes(id) on delete set null;

-- 添加索引
create index if not exists orders_promoter_code_id_idx
  on public.orders (promoter_code_id);

-- 添加注释
comment on column public.orders.promoter_code_id is '下单时使用的推广码 ID（可为空）';
