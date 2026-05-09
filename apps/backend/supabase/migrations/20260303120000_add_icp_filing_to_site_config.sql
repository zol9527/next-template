-- Migration: Add ICP filing info to site config
-- Date: 2026-03-03

alter table public.site_config
  add column if not exists icp_filing text;

comment on column public.site_config.icp_filing is 'ICP备案信息';
