-- ═══════════════════════════════════════════════════════════════
-- THE ULTIMATE SCHEMA EXPANSION
-- User accounts, alerts, saved searches, reports, subscriptions
-- ═══════════════════════════════════════════════════════════════

-- 1. USER PROFILES (extends Supabase auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company TEXT,
  job_title TEXT,
  phone TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  searches_this_month INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 10,
  api_key TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SAVED SEARCHES (watchlists)
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  schedule TEXT,
  last_run TIMESTAMPTZ,
  last_result_count INTEGER,
  notify_on_change BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ALERTS
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  entity_id UUID REFERENCES core_entities(id),
  conditions JSONB NOT NULL,
  channels JSONB DEFAULT '["in_app"]',
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES user_alerts(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GENERATED REPORTS
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  entity_id UUID REFERENCES core_entities(id),
  content JSONB NOT NULL,
  pdf_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENTITY WATCHLIST
CREATE TABLE IF NOT EXISTS entity_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'watching',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_id)
);

-- 7. OPPORTUNITY PIPELINE
CREATE TABLE IF NOT EXISTS opportunity_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES core_entities(id),
  title TEXT NOT NULL,
  description TEXT,
  stage TEXT DEFAULT 'identified',
  estimated_value NUMERIC,
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SEARCH HISTORY
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB,
  result_count INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. API USAGE TRACKING
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  api_key TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  searches_per_month INTEGER,
  saved_searches_limit INTEGER,
  alerts_limit INTEGER,
  api_access BOOLEAN DEFAULT FALSE,
  export_pdf BOOLEAN DEFAULT FALSE,
  team_members INTEGER DEFAULT 1,
  priority_support BOOLEAN DEFAULT FALSE,
  custom_integrations BOOLEAN DEFAULT FALSE,
  features JSONB,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, searches_per_month, saved_searches_limit, alerts_limit, api_access, export_pdf, team_members) VALUES
  ('free', 'Free', 'Get started with basic access', 0, 0, 10, 3, 1, FALSE, FALSE, 1),
  ('starter', 'Starter', 'For individuals and small teams', 99, 990, 100, 25, 10, FALSE, TRUE, 3),
  ('professional', 'Professional', 'For growing businesses', 499, 4990, 1000, 100, 50, TRUE, TRUE, 10),
  ('enterprise', 'Enterprise', 'For large organizations', 2499, 24990, -1, -1, -1, TRUE, TRUE, -1)
ON CONFLICT (id) DO NOTHING;

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON user_alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON entity_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_user ON opportunity_pipeline(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON opportunity_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);

-- 12. ROW LEVEL SECURITY
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can manage own searches" ON saved_searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON user_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reports" ON generated_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public reports viewable" ON generated_reports FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can manage own watchlist" ON entity_watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pipeline" ON opportunity_pipeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own history" ON search_history FOR ALL USING (auth.uid() = user_id);

-- 13. FUNCTIONS
CREATE OR REPLACE FUNCTION increment_search_count(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  SELECT searches_limit, searches_this_month INTO v_limit, v_current
  FROM user_profiles WHERE id = p_user_id;
  
  IF v_limit = -1 OR v_current < v_limit THEN
    UPDATE user_profiles SET searches_this_month = searches_this_month + 1 WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly counts
CREATE OR REPLACE FUNCTION reset_monthly_search_counts()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET searches_this_month = 0;
END;
$$ LANGUAGE plpgsql;

-- Get user dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'profile', (SELECT row_to_json(p) FROM user_profiles p WHERE id = p_user_id),
    'saved_searches', (SELECT COUNT(*) FROM saved_searches WHERE user_id = p_user_id),
    'watchlist_count', (SELECT COUNT(*) FROM entity_watchlist WHERE user_id = p_user_id),
    'pipeline_count', (SELECT COUNT(*) FROM opportunity_pipeline WHERE user_id = p_user_id),
    'pipeline_value', (SELECT COALESCE(SUM(estimated_value), 0) FROM opportunity_pipeline WHERE user_id = p_user_id AND stage NOT IN ('closed_won', 'closed_lost')),
    'unread_notifications', (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND read = FALSE),
    'recent_searches', (SELECT json_agg(row_to_json(s)) FROM (SELECT query, result_count, created_at FROM search_history WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 5) s)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();