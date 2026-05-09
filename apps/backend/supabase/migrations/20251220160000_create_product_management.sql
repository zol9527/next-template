-- Product management schema (products / categories / media assets)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  description text,
  product_kind text not null,
  status text not null default 'draft',
  price numeric(12,2) not null,
  currency_code text not null,
  extensions jsonb,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_kind_idx on public.products (product_kind);
create index if not exists products_created_at_idx on public.products (created_at);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_status_idx on public.categories (status);
create index if not exists categories_sort_order_idx on public.categories (sort_order);

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index if not exists product_categories_category_id_idx on public.product_categories (category_id);
create index if not exists product_categories_product_id_idx on public.product_categories (product_id);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  bucket text not null,
  object_key text not null,
  url text,
  content_type text not null,
  size_bytes bigint not null,
  etag text,
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists media_assets_unique_object_uq on public.media_assets (provider, bucket, object_key);
create index if not exists media_assets_status_idx on public.media_assets (status);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at);

create table if not exists public.product_media_attachments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  usage text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_media_attachments_product_id_idx on public.product_media_attachments (product_id);
create index if not exists product_media_attachments_asset_id_idx on public.product_media_attachments (asset_id);
create index if not exists product_media_attachments_usage_idx on public.product_media_attachments (usage);
