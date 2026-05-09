-- Order / payment / distribution / commission / settlement schema

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  user_id uuid not null references public.users(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  price_amount numeric(12,2) not null,
  currency_code text not null default 'CNY',
  paid_amount numeric(12,2),
  refunded_amount numeric(12,2) not null default 0,
  status text not null default 'pending_payment',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists orders_order_no_uq on public.orders (order_no);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- =========================================
-- 订单状态（orders.status）与单向推进规则说明
--
-- 目标：通过触发器 `orders_status_guard` 防止“回退状态”，确保状态单向推进。
-- 实现方式：使用 `order_status_rank(status)` 将状态映射为递增的整数 rank；当且仅当
-- NEW.rank >= OLD.rank 时允许更新。它是一种“按顺序号单向前进”的守卫，而不是严格
-- 的“有限状态机(FSM)白名单”。
--
-- 当前已定义状态与 rank（见函数 `order_status_rank`）：
-- - pending_payment(10)：待支付
-- - paid(20)：已支付
-- - completed(30)：已完成（履约完成）
-- - refunding(40)：退款中
-- - refunded(50)：已退款
-- - cancelled(60)：已取消（例如未支付超时 / 主动取消）
-- - closed(70)：已关闭（流程终态，通常不再变更）
--
-- 典型允许路径（示例）：
-- - 正常成交：pending_payment -> paid -> completed -> closed
-- - 未支付取消：pending_payment -> cancelled -> closed
-- - 支付后退款：paid -> refunding -> refunded -> closed
--
-- 注意：由于当前守卫仅基于 rank 单调递增，任何“非回退”的跃迁（例如 pending_payment ->
-- completed）在技术上也会被允许。若后续需要更严格的业务约束（只允许白名单跃迁），
-- 建议将守卫升级为显式的状态转换表/枚举校验（FSM）而不仅是 rank 比较。
-- =========================================

create or replace function public.order_status_rank(s text)
returns integer
language sql
immutable
as $$
  select case s
    when 'pending_payment' then 10
    when 'paid' then 20
    when 'completed' then 30
    when 'refunding' then 40
    when 'refunded' then 50
    when 'cancelled' then 60
    when 'closed' then 70
    else 0
  end;
$$;

comment on function public.order_status_rank(text)
  is '订单状态排序函数：将 orders.status 映射为单调递增的 rank（用于 orders_status_guard 单向推进校验）。';

create or replace function public.orders_status_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if public.order_status_rank(new.status) < public.order_status_rank(old.status) then
      raise exception 'Invalid order status transition: % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.orders_status_guard()
  is '订单状态守卫触发器函数：当 UPDATE 且 status 变更时，拒绝 NEW.rank < OLD.rank 的回退更新（基于 order_status_rank）。';

drop trigger if exists orders_status_guard on public.orders;
create trigger orders_status_guard
before update on public.orders
for each row
execute function public.orders_status_guard();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null default 'wechat',
  status text not null default 'pending',
  amount numeric(12,2) not null,
  currency_code text not null default 'CNY',
  provider_trade_no text,
  provider_payer_id text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_created_at_idx on public.payments (created_at);
create unique index if not exists payments_provider_trade_no_uq
  on public.payments (provider_trade_no)
  where provider_trade_no is not null;

create table if not exists public.distribution_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id) on delete restrict,
  effective_at timestamptz not null default now(),
  inactive_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists distribution_relations_user_id_uq on public.distribution_relations (user_id);
create index if not exists distribution_relations_promoter_user_id_idx on public.distribution_relations (promoter_user_id);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  scope_id uuid,
  rate numeric(8,6) not null,
  active_from timestamptz not null default now(),
  active_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commission_rules_scope_idx on public.commission_rules (scope);
create index if not exists commission_rules_active_from_idx on public.commission_rules (active_from);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  total_amount numeric(12,2) not null,
  currency_code text not null default 'CNY',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists settlements_status_idx on public.settlements (status);
create index if not exists settlements_created_at_idx on public.settlements (created_at);

create table if not exists public.commission_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id) on delete restrict,
  base_amount numeric(12,2) not null,
  rate numeric(8,6) not null,
  commission_amount numeric(12,2) not null,
  status text not null default 'frozen',
  settlement_id uuid references public.settlements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists commission_records_order_promoter_uq on public.commission_records (order_id, promoter_user_id);
create index if not exists commission_records_promoter_user_id_idx on public.commission_records (promoter_user_id);
create index if not exists commission_records_status_idx on public.commission_records (status);

create table if not exists public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  commission_record_id uuid not null references public.commission_records(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists settlement_items_commission_record_id_uq on public.settlement_items (commission_record_id);
create index if not exists settlement_items_settlement_id_idx on public.settlement_items (settlement_id);
