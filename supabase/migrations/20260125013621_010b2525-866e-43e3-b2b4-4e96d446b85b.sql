-- Create app_role enum only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles table (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view own roles') THEN
    CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can manage all roles') THEN
    CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Fix flywheel_discovery_queue missing column
ALTER TABLE public.flywheel_discovery_queue 
ADD COLUMN IF NOT EXISTS target_value TEXT;

-- API Monetization tables
CREATE TABLE IF NOT EXISTS public.api_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  requests_per_month INTEGER NOT NULL DEFAULT 100,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing tiers
INSERT INTO public.api_pricing_tiers (name, price_monthly, requests_per_month, rate_limit_per_minute, features) VALUES
('free', 0, 100, 10, '["entity_lookup", "basic_search"]'::jsonb),
('starter', 49, 5000, 60, '["entity_lookup", "basic_search", "health_scores", "insights"]'::jsonb),
('pro', 199, 50000, 300, '["entity_lookup", "basic_search", "health_scores", "insights", "win_predictions", "relationship_graph"]'::jsonb),
('enterprise', 999, 500000, 1000, '["all_features", "priority_support", "custom_integrations", "bulk_exports"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add tier reference to api_keys
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.api_pricing_tiers(id);

-- API request logs for metering
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  request_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_key_date ON public.api_request_logs(api_key_id, created_at);

-- RLS for API tables
ALTER TABLE public.api_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_pricing_tiers' AND policyname = 'Anyone can view pricing tiers') THEN
    CREATE POLICY "Anyone can view pricing tiers" ON public.api_pricing_tiers FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_request_logs' AND policyname = 'Users can view own API logs') THEN
    CREATE POLICY "Users can view own API logs" ON public.api_request_logs FOR SELECT USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));
  END IF;
END $$;