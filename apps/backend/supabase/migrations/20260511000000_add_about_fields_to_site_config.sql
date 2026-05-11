-- Migration: Add about page fields to site config
-- Date: 2026-05-11

alter table public.site_config
  add column if not exists site_slogan text,
  add column if not exists about_stats jsonb;

comment on column public.site_config.site_slogan is '站点标语';
comment on column public.site_config.about_stats is '关于页统计卡片配置';

