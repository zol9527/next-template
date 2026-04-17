-- Add slug column to products table for SEO-friendly URLs

-- Add slug column (nullable initially for backward compatibility)
alter table public.products
add column if not exists slug text;

-- Create unique index on slug (only for non-null values)
create unique index if not exists products_slug_idx on public.products (slug) where slug is not null;

-- Add comment for documentation
comment on column public.products.slug is 'URL-friendly identifier for SEO and sharing (e.g., pmp-certification)';
