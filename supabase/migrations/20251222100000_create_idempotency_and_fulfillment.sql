-- Idempotency + async fulfillment schema
--
-- This migration is introduced by specs/004-order-tx-idempotency.

create table if not exists public.idempotency_requests (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.users(id) on delete cascade,
	action text not null,
	idempotency_key text not null,
	request_hash text not null,
	status text not null default 'in_progress',
	resource_type text,
	resource_id uuid,
	response_code integer,
	response_body jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	expires_at timestamptz not null default (now() + interval '24 hours'),
	constraint idempotency_requests_status_chk check (status in ('in_progress', 'succeeded', 'failed'))
);

create unique index if not exists idempotency_requests_user_action_key_uq
	on public.idempotency_requests (user_id, action, idempotency_key);
create index if not exists idempotency_requests_expires_at_idx on public.idempotency_requests (expires_at);

-- Cleanup helper for idempotency_requests
--
-- This function is intentionally simple and can be wired to pg_cron (or an external scheduler)
-- to keep the table size under control.

create or replace function public.cleanup_idempotency_requests(
	p_now timestamptz default now(),
	p_retention interval default interval '7 days'
)
returns bigint
language plpgsql
as $$
declare
	v_deleted bigint;
begin
	delete from public.idempotency_requests
	where expires_at < (p_now - p_retention);

	get diagnostics v_deleted = row_count;
	return v_deleted;
end;
$$;

create table if not exists public.order_fulfillment_jobs (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	payment_id uuid not null references public.payments(id) on delete restrict,
	status text not null default 'pending',
	attempt_count integer not null default 0,
	available_at timestamptz not null default now(),
	started_at timestamptz,
	finished_at timestamptz,
	last_error text,
	last_error_at timestamptz,
	manual_required_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint order_fulfillment_jobs_status_chk check (status in ('pending', 'processing', 'retrying', 'succeeded', 'manual_required'))
);

create unique index if not exists order_fulfillment_jobs_payment_id_uq on public.order_fulfillment_jobs (payment_id);
create index if not exists order_fulfillment_jobs_order_id_idx on public.order_fulfillment_jobs (order_id);
create index if not exists order_fulfillment_jobs_status_available_at_idx
	on public.order_fulfillment_jobs (status, available_at);

-- RPC for atomic fulfillment apply (commission + entitlement)
--
-- Note:
-- - entitlement insert is executed via dynamic SQL so this function can be created
--   before the course_entitlements migration runs.
-- - commission insert is idempotent via unique constraint (order_id, promoter_user_id)

create or replace function public.order_fulfillment_apply(
	p_order_id uuid,
	p_payment_id uuid
)
returns jsonb
language plpgsql
as $$
declare
	v_order record;
	v_payment record;
	v_relation record;
	v_rule record;
	v_base_amount numeric(12,2);
	v_commission_amount numeric(12,2);
	v_entitlement_inserted bigint;
	v_commission_inserted bigint;
begin
	if p_order_id is null or p_payment_id is null then
		raise exception 'order_id and payment_id required' using errcode = '22000';
	end if;

	select * into v_order from public.orders where id = p_order_id;
	if not found then
		raise exception 'order not found' using errcode = 'P0002';
	end if;

	select * into v_payment from public.payments where id = p_payment_id;
	if not found then
		raise exception 'payment not found' using errcode = 'P0002';
	end if;

	if v_payment.order_id is distinct from v_order.id then
		raise exception 'payment does not belong to order' using errcode = '22000';
	end if;

	if v_payment.status is distinct from 'succeeded' or v_payment.confirmed_at is null then
		raise exception 'payment not confirmed' using errcode = '22000';
	end if;

	-- 1) entitlement (idempotent by unique(user_id, product_id))
	execute '
		insert into public.course_entitlements (
			user_id,
			product_id,
			granted_by_order_id,
			status,
			granted_at,
			created_at,
			updated_at
		) values ($1, $2, $3, ''active'', now(), now(), now())
		on conflict (user_id, product_id) do nothing
	'
	using v_order.user_id, v_order.product_id, v_order.id;

	get diagnostics v_entitlement_inserted = row_count;

	-- 2) commission (optional; idempotent by unique(order_id, promoter_user_id))
	select * into v_relation
		from public.distribution_relations
		where user_id = v_order.user_id
		limit 1;

	if found then
		select * into v_rule
			from public.commission_rules
			where scope = 'global'
				and active_from <= v_payment.confirmed_at
				and (active_to is null or active_to > v_payment.confirmed_at)
			order by active_from desc
			limit 1;

		if found then
			v_base_amount := coalesce(v_order.paid_amount, v_order.price_amount) - v_order.refunded_amount;

			if v_base_amount > 0 then
				v_commission_amount := (v_base_amount * v_rule.rate);

				insert into public.commission_records (
					order_id,
					promoter_user_id,
					base_amount,
					rate,
					commission_amount,
					status,
					created_at,
					updated_at
				) values (
					v_order.id,
					v_relation.promoter_user_id,
					v_base_amount,
					v_rule.rate,
					v_commission_amount,
					'frozen',
					now(),
					now()
				) on conflict (order_id, promoter_user_id) do nothing;

				get diagnostics v_commission_inserted = row_count;
			else
				v_commission_inserted := 0;
			end if;
		else
			v_commission_inserted := 0;
		end if;
	else
		v_commission_inserted := 0;
	end if;

	return jsonb_build_object(
		'entitlementInserted', (v_entitlement_inserted = 1),
		'commissionInserted', (v_commission_inserted = 1)
	);
end;
$$;
