-- Create handle_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create settlement_applications table
CREATE TABLE IF NOT EXISTS public.settlement_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id uuid NOT NULL REFERENCES public.users(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid, failed
  payment_method text NOT NULL DEFAULT 'wechat_transfer', -- wechat_transfer, bank_card
  payment_account text, -- 提现账号信息
  rejection_reason text, -- 审核拒绝原因
  settlement_id uuid REFERENCES public.settlements(id), -- 最终关联的批次结算单
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS for settlement_applications
ALTER TABLE public.settlement_applications ENABLE ROW LEVEL SECURITY;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default min_withdrawal_amount
INSERT INTO public.system_settings (key, value, description)
VALUES ('min_withdrawal_amount', '100', '最低提现金额（元）')
ON CONFLICT (key) DO NOTHING;

-- Add updated_at trigger for settlement_applications
DROP TRIGGER IF EXISTS handle_updated_at_settlement_applications ON public.settlement_applications;
CREATE TRIGGER handle_updated_at_settlement_applications
  BEFORE UPDATE ON public.settlement_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for system_settings
DROP TRIGGER IF EXISTS handle_updated_at_system_settings ON public.system_settings;
CREATE TRIGGER handle_updated_at_system_settings
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add permissions for settlement applications
INSERT INTO public.permissions (slug, description) VALUES
  ('settlement-applications.read', '查看结算申请列表'),
  ('settlement-applications.review', '审核结算申请'),
  ('system-settings.write', '管理系统设置'),
  ('commission-rules.write', '管理佣金规则')
ON CONFLICT (slug) DO NOTHING;
