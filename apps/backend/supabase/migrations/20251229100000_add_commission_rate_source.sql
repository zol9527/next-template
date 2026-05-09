-- Migration: Add commission rate source tracking
-- Description: Track whether commission rates come from promoter levels or global rules
-- Date: 2025-12-29

-- Add rate_source column with check constraint
ALTER TABLE public.commission_records
ADD COLUMN IF NOT EXISTS rate_source text
CHECK (rate_source IN ('promoter_level', 'global_rule'));

-- Create index for rate_source queries
CREATE INDEX IF NOT EXISTS commission_records_rate_source_idx
  ON public.commission_records(rate_source);

-- Set default value for existing records (historical records used global rules)
UPDATE public.commission_records
SET rate_source = 'global_rule'
WHERE rate_source IS NULL;

-- Add column comment
COMMENT ON COLUMN public.commission_records.rate_source IS
  '佣金费率来源：promoter_level（推广员等级）或 global_rule（全局规则）。历史记录标记为 global_rule。';
