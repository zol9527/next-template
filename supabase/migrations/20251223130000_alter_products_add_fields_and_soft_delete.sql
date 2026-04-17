-- Add enterprise product management fields + soft delete

alter table public.products
  add column if not exists original_price numeric(12,2),
  add column if not exists stock_quantity integer,
  add column if not exists is_featured boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists deleted_at timestamptz;

alter table public.products
  drop constraint if exists products_stock_quantity_nonnegative,
  add constraint products_stock_quantity_nonnegative
    check (stock_quantity is null or stock_quantity >= 0);

create index if not exists products_deleted_at_idx on public.products (deleted_at);
