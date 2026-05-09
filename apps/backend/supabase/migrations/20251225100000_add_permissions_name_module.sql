-- 添加 name 和 module 字段到 permissions 表
alter table public.permissions
  add column if not exists name text,
  add column if not exists module text;

-- 为现有数据更新默认值
update public.permissions
set name = slug, module = split_part(slug, ':', 1)
where name is null;

-- 添加索引以提升查询性能
create index if not exists permissions_module_idx on public.permissions(module);
