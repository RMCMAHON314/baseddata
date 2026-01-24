-- ═══════════════════════════════════════════════════════════════
-- MORE EVERYTHING - NUCLEAR DATABASE EXPANSION
-- ═══════════════════════════════════════════════════════════════

-- 1. AI CHAT CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENTITY PROFILES (rich dossiers)
CREATE TABLE IF NOT EXISTS entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  key_facts JSONB DEFAULT '[]',
  financial_summary JSONB,
  relationship_summary JSONB,
  risk_factors JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  news_mentions JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  competitors JSONB DEFAULT '[]',
  market_position TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  auto_generated BOOLEAN DEFAULT TRUE
);

-- 3. SHARED LINKS (public sharing)
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  data JSONB NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EMBEDDABLE WIDGETS
CREATE TABLE IF NOT EXISTS embed_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  config JSONB NOT NULL,
  allowed_domains TEXT[],
  api_key TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WEBHOOKS
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT DEFAULT gen_random_uuid()::TEXT,
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WEBHOOK LOGS
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  reward_type TEXT,
  reward_amount NUMERIC,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

-- 8. USER FEEDBACK
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL,
  page TEXT,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0,
  user_ids UUID[],
  subscription_tiers TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SYSTEM ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  target_tiers TEXT[],
  is_dismissible BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. USER DISMISSED ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS dismissed_announcements (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

-- 13. DATA EXPORTS
CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  format TEXT NOT NULL,
  filters JSONB,
  status TEXT DEFAULT 'pending',
  file_url TEXT,
  file_size INTEGER,
  row_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 14. SCHEDULED REPORTS
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  schedule TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME DEFAULT '09:00',
  recipients TEXT[],
  format TEXT DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent TIMESTAMPTZ,
  next_send TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TEAM INVITATIONS
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- 16. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_slug ON shared_links(slug);
CREATE INDEX IF NOT EXISTS idx_shared_links_user ON shared_links(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_exports_user ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next ON scheduled_reports(next_send) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_profiles_entity ON entity_profiles(entity_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);

-- RLS ENABLE
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users own conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Entity profiles public read" ON entity_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users own shared links" ON shared_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public links viewable" ON shared_links FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
CREATE POLICY "Users own widgets" ON embed_widgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own webhooks" ON webhooks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own webhook logs" ON webhook_logs FOR SELECT USING (webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.uid()));
CREATE POLICY "Users own referrals" ON referrals FOR ALL USING (auth.uid() = referrer_id);
CREATE POLICY "Users own feedback" ON user_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own exports" ON data_exports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own scheduled reports" ON scheduled_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own team invitations" ON team_invitations FOR ALL USING (auth.uid() = inviter_id);
CREATE POLICY "Team owners manage teams" ON teams FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Team members view own teams" ON team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users dismiss announcements" ON dismissed_announcements FOR ALL USING (auth.uid() = user_id);

-- Add columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS credits NUMERIC DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Generate referral codes for existing users
UPDATE user_profiles 
SET referral_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Function to generate entity profile
CREATE OR REPLACE FUNCTION generate_entity_profile(p_entity_id UUID)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
  v_entity RECORD;
  v_facts JSONB;
  v_relationships JSONB;
  v_summary TEXT;
BEGIN
  SELECT * INTO v_entity FROM core_entities WHERE id = p_entity_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  SELECT jsonb_agg(jsonb_build_object(
    'type', fact_type,
    'value', fact_value,
    'confidence', confidence
  )) INTO v_facts
  FROM core_facts
  WHERE entity_id = p_entity_id
  ORDER BY confidence DESC NULLS LAST
  LIMIT 20;
  
  SELECT jsonb_agg(jsonb_build_object(
    'type', relationship_type,
    'target', e.canonical_name,
    'strength', strength
  )) INTO v_relationships
  FROM core_relationships r
  JOIN core_entities e ON r.to_entity_id = e.id
  WHERE r.from_entity_id = p_entity_id
  ORDER BY strength DESC NULLS LAST
  LIMIT 10;
  
  v_summary := v_entity.canonical_name || ' is a ' || COALESCE(v_entity.entity_type, 'organization');
  
  INSERT INTO entity_profiles (entity_id, summary, key_facts, relationship_summary, last_updated)
  VALUES (p_entity_id, v_summary, COALESCE(v_facts, '[]'), v_relationships, NOW())
  ON CONFLICT (entity_id) DO UPDATE SET
    summary = EXCLUDED.summary,
    key_facts = EXCLUDED.key_facts,
    relationship_summary = EXCLUDED.relationship_summary,
    last_updated = NOW()
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create shared link
CREATE OR REPLACE FUNCTION create_shared_link(
  p_user_id UUID,
  p_link_type TEXT,
  p_title TEXT,
  p_data JSONB,
  p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  v_slug := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));
  
  IF p_expires_in_days IS NOT NULL THEN
    v_expires := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  
  INSERT INTO shared_links (user_id, link_type, slug, title, data, expires_at)
  VALUES (p_user_id, p_link_type, v_slug, p_title, p_data, v_expires);
  
  RETURN v_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin stats function
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'total_users', (SELECT COUNT(*) FROM user_profiles),
    'active_users_24h', (SELECT COUNT(DISTINCT user_id) FROM search_history WHERE created_at > NOW() - INTERVAL '24 hours'),
    'active_users_7d', (SELECT COUNT(DISTINCT user_id) FROM search_history WHERE created_at > NOW() - INTERVAL '7 days'),
    'total_searches_today', (SELECT COUNT(*) FROM search_history WHERE created_at > NOW() - INTERVAL '24 hours'),
    'total_searches_week', (SELECT COUNT(*) FROM search_history WHERE created_at > NOW() - INTERVAL '7 days'),
    'users_by_tier', (SELECT COALESCE(jsonb_object_agg(subscription_tier, cnt), '{}'::jsonb) FROM (SELECT subscription_tier, COUNT(*) as cnt FROM user_profiles GROUP BY subscription_tier) t),
    'total_entities', (SELECT COUNT(*) FROM core_entities),
    'total_facts', (SELECT COUNT(*) FROM core_facts),
    'total_relationships', (SELECT COUNT(*) FROM core_relationships),
    'queue_pending', (SELECT COUNT(*) FROM flywheel_discovery_queue WHERE status = 'pending'),
    'active_alerts', (SELECT COUNT(*) FROM user_alerts WHERE is_active = TRUE),
    'total_watchlist_items', (SELECT COUNT(*) FROM entity_watchlist),
    'total_pipeline_value', (SELECT COALESCE(SUM(estimated_value), 0) FROM opportunity_pipeline WHERE stage NOT IN ('closed_won', 'closed_lost'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default feature flags
INSERT INTO feature_flags (id, name, description, is_enabled, subscription_tiers) VALUES
  ('ai_chat', 'AI Chat Assistant', 'Natural language data exploration', TRUE, ARRAY['professional', 'enterprise']),
  ('pdf_export', 'PDF Export', 'Export reports as PDF', TRUE, ARRAY['starter', 'professional', 'enterprise']),
  ('api_access', 'API Access', 'Programmatic API access', TRUE, ARRAY['professional', 'enterprise']),
  ('webhooks', 'Webhooks', 'Real-time event notifications', TRUE, ARRAY['professional', 'enterprise']),
  ('team_features', 'Team Features', 'Invite team members', TRUE, ARRAY['starter', 'professional', 'enterprise']),
  ('white_label', 'White Label', 'Custom branding', FALSE, ARRAY['enterprise']),
  ('priority_support', 'Priority Support', '24/7 priority support', TRUE, ARRAY['enterprise'])
ON CONFLICT (id) DO NOTHING;