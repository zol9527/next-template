-- Course entitlements schema
--
-- This migration is introduced by specs/004-order-tx-idempotency.

create table if not exists public.course_entitlements (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.users(id) on delete cascade,
	product_id uuid not null references public.products(id) on delete restrict,
	granted_by_order_id uuid not null references public.orders(id) on delete restrict,
	status text not null default 'active',
	granted_at timestamptz not null default now(),
	revoked_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint course_entitlements_status_chk check (status in ('active', 'revoked'))
);

create unique index if not exists course_entitlements_user_product_uq on public.course_entitlements (user_id, product_id);
create index if not exists course_entitlements_user_id_idx on public.course_entitlements (user_id);
create index if not exists course_entitlements_product_id_idx on public.course_entitlements (product_id);
