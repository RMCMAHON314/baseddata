-- =============================================
-- BASED DATA - Complete Database Schema
-- =============================================

-- 1. Transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'usage', 'bonus', 'refund');

-- 2. Dataset status enum  
CREATE TYPE public.dataset_status AS ENUM ('pending', 'processing', 'complete', 'failed');

-- =============================================
-- PROFILES TABLE - User data with credits
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 100,
  auto_topoff_enabled BOOLEAN DEFAULT false,
  auto_topoff_threshold INTEGER DEFAULT 10,
  auto_topoff_amount INTEGER DEFAULT 100,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DATASETS TABLE - Generated datasets
-- =============================================
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status public.dataset_status DEFAULT 'pending',
  row_count INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  schema_definition JSONB,
  data JSONB,
  insights JSONB,
  sources JSONB,
  processing_log JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CREDIT TRANSACTIONS TABLE - Track all credit activity
-- =============================================
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type public.transaction_type NOT NULL,
  description TEXT,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SCHEMA REGISTRY TABLE - Self-healing schema tracking
-- =============================================
CREATE TABLE public.schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT UNIQUE NOT NULL,
  description TEXT,
  columns JSONB NOT NULL,
  sample_queries TEXT[],
  row_count INTEGER DEFAULT 0,
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DATA SOURCES TABLE - Track crawl sources
-- =============================================
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  source_type TEXT,
  reliability_score FLOAT DEFAULT 0.5,
  last_crawled TIMESTAMPTZ,
  crawl_frequency INTERVAL DEFAULT '7 days',
  content_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX idx_datasets_status ON public.datasets(status);
CREATE INDEX idx_datasets_is_public ON public.datasets(is_public);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_data_sources_domain ON public.data_sources(domain);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schema_registry_updated_at
  BEFORE UPDATE ON public.schema_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP WITH 100 FREE CREDITS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with 100 free credits
  INSERT INTO public.profiles (user_id, full_name, avatar_url, credits_balance)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    100
  );
  
  -- Record the bonus credits as a transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (
    NEW.id,
    100,
    'bonus',
    'Welcome bonus - 100 free credits!'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CREDIT DEDUCTION FUNCTION (for dataset generation)
-- =============================================
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_dataset_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if sufficient credits
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, dataset_id)
  VALUES (p_user_id, -p_amount, 'usage', p_description, p_dataset_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- ADD CREDITS FUNCTION (for purchases)
-- =============================================
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type public.transaction_type,
  p_description TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add credits
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, stripe_payment_id)
  VALUES (p_user_id, p_amount, p_transaction_type, p_description, p_stripe_payment_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - DATASETS
-- =============================================
CREATE POLICY "Users can view own datasets"
  ON public.datasets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public datasets"
  ON public.datasets FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can create own datasets"
  ON public.datasets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON public.datasets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON public.datasets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - CREDIT TRANSACTIONS
-- =============================================
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Note: INSERT handled by security definer functions

-- =============================================
-- RLS POLICIES - SCHEMA REGISTRY (read-only for users)
-- =============================================
CREATE POLICY "Users can view schema registry"
  ON public.schema_registry FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- RLS POLICIES - DATA SOURCES (read-only for users)
-- =============================================
CREATE POLICY "Users can view data sources"
  ON public.data_sources FOR SELECT
  TO authenticated
  USING (true);