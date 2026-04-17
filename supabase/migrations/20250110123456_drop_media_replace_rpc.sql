-- Drop media_asset_delete_and_replace RPC function
-- This migration removes the unused delete-and-replace function

drop function if exists public.media_asset_delete_and_replace(old_asset_id uuid, replacement_asset_id uuid);
