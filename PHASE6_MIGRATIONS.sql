-- PHASE 6 MIGRATIONS
-- Run in Supabase SQL Editor

-- A/B Testing
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  variant_a_title TEXT NOT NULL,
  variant_b_title TEXT NOT NULL,
  variant_a_thumbnail_url TEXT,
  variant_b_thumbnail_url TEXT,
  current_variant TEXT DEFAULT 'a' CHECK (current_variant IN ('a', 'b')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused')),
  winner TEXT CHECK (winner IN ('a', 'b', 'inconclusive')),
  ctr_a DECIMAL(5,4),
  ctr_b DECIMAL(5,4),
  impressions_a BIGINT DEFAULT 0,
  impressions_b BIGINT DEFAULT 0,
  rotate_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ab_tests_owner" ON ab_tests FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ab_tests_user_status ON ab_tests(user_id, status);
CREATE INDEX IF NOT EXISTS ab_tests_rotate ON ab_tests(status, rotate_at) WHERE status = 'running';

-- Bulk Operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('add_title_prefix', 'add_title_suffix', 'replace_tag', 'add_tag', 'remove_tag', 'update_description_footer')),
  params JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_videos INT DEFAULT 0,
  processed_videos INT DEFAULT 0,
  failed_videos INT DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_ops_owner" ON bulk_operations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS bulk_ops_user ON bulk_operations(user_id, created_at DESC);

-- Channel Health History
CREATE TABLE IF NOT EXISTS channel_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  health_score INT NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  score_breakdown JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channel_health_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_owner" ON channel_health_history FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS health_user_channel ON channel_health_history(user_id, channel_id, calculated_at DESC);

-- Warmup Progress
CREATE TABLE IF NOT EXISTS warmup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completed_tasks JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE warmup_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warmup_owner" ON warmup_progress FOR ALL USING (auth.uid() = user_id);
