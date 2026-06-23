-- ── Admin Panel Tables ──────────────────────────────────────────────────────
-- Run this in Supabase SQL editor after PHASE6_MIGRATIONS.sql

-- Activity log for all admin actions
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  admin_email text not null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}',
  ip_address text,
  result text default 'success'
);

-- API key pool (admin visibility into configured keys)
create table if not exists api_key_pool (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  service text not null,
  key_name text not null,
  api_key_last4 text,
  is_active boolean default true,
  daily_limit integer,
  units_used_today integer default 0,
  last_reset_date date default current_date,
  notes text,
  unique(service, key_name)
);

-- Daily API costs tracking
create table if not exists daily_costs (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  service text not null,
  units_used integer default 0,
  estimated_cost_usd numeric(10,4) default 0,
  free_tier_used integer default 0,
  paid_tier_used integer default 0,
  unique(date, service)
);

-- Monthly revenue tracking
create table if not exists monthly_revenue (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  gross_revenue_usd numeric(10,2) default 0,
  lemonsqueezy_fees_usd numeric(10,2) default 0,
  api_costs_usd numeric(10,2) default 0,
  infra_costs_usd numeric(10,2) default 0,
  net_revenue_usd numeric(10,2) default 0,
  new_subscribers integer default 0,
  churned_subscribers integer default 0,
  free_count integer default 0,
  creator_count integer default 0,
  pro_count integer default 0,
  agency_count integer default 0
);

-- Security events
create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  details jsonb default '{}',
  ip_address text,
  is_resolved boolean default false,
  resolved_at timestamptz,
  resolved_by text,
  action_taken text
);

-- User IP log
create table if not exists user_ip_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  country text,
  city text,
  device_type text,
  user_agent text,
  session_id text
);

-- Rate limit log
create table if not exists rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text,
  requests_this_minute integer default 1,
  was_blocked boolean default false
);

-- Test accounts managed by admin
create table if not exists test_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade unique,
  account_label text not null,
  plan_to_simulate text default 'free',
  created_by_admin text,
  notes text
);

-- System health log
create table if not exists system_health_log (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz default now(),
  service text not null,
  status text not null check (status in ('ok','degraded','down','unknown')),
  response_time_ms integer,
  error_message text,
  details jsonb default '{}'
);

-- ── Add security columns to profiles ────────────────────────────────────────

alter table profiles
  add column if not exists is_test_account boolean default false,
  add column if not exists security_risk_score integer default 0,
  add column if not exists is_suspended boolean default false,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists rate_limit_override integer,
  add column if not exists quota_override integer,
  add column if not exists notes_internal text;

-- ── RLS: All admin tables are service-role only (no direct client access) ───

alter table admin_activity_log enable row level security;
drop policy if exists "Admin only aal" on admin_activity_log;
create policy "Admin only aal" on admin_activity_log for all using (false);

alter table api_key_pool enable row level security;
drop policy if exists "Admin only akp" on api_key_pool;
create policy "Admin only akp" on api_key_pool for all using (false);

alter table daily_costs enable row level security;
drop policy if exists "Admin only dc" on daily_costs;
create policy "Admin only dc" on daily_costs for all using (false);

alter table monthly_revenue enable row level security;
drop policy if exists "Admin only mr" on monthly_revenue;
create policy "Admin only mr" on monthly_revenue for all using (false);

alter table security_events enable row level security;
drop policy if exists "Admin only se" on security_events;
create policy "Admin only se" on security_events for all using (false);

alter table user_ip_log enable row level security;
drop policy if exists "Admin only uil" on user_ip_log;
create policy "Admin only uil" on user_ip_log for all using (false);

alter table rate_limit_log enable row level security;
drop policy if exists "Admin only rll" on rate_limit_log;
create policy "Admin only rll" on rate_limit_log for all using (false);

alter table test_accounts enable row level security;
drop policy if exists "Admin only ta" on test_accounts;
create policy "Admin only ta" on test_accounts for all using (false);

alter table system_health_log enable row level security;
drop policy if exists "Admin only shl" on system_health_log;
create policy "Admin only shl" on system_health_log for all using (false);

-- ── Phase 6+ Admin Tables ────────────────────────────────────────────────────

-- Announcements (site-wide banners)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  text text not null,
  is_active boolean default true,
  link text,
  link_text text,
  bg_color text default '#FFD200'
);

alter table announcements enable row level security;
drop policy if exists "Admin only ann" on announcements;
create policy "Admin only ann" on announcements for all using (false);

-- Testimonials (landing page social proof)
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  role text,
  quote text not null,
  avatar_url text,
  rating integer default 5,
  is_featured boolean default false,
  sort_order integer default 0
);

alter table testimonials enable row level security;
drop policy if exists "Admin only test" on testimonials;
create policy "Admin only test" on testimonials for all using (false);

-- Hero videos (landing page video section)
create table if not exists hero_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  video_url text not null,
  thumbnail_url text,
  is_active boolean default false
);

alter table hero_videos enable row level security;
drop policy if exists "Admin only hv" on hero_videos;
create policy "Admin only hv" on hero_videos for all using (false);

-- Feature flags (platform feature toggles)
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  key text unique not null,
  label text not null,
  description text,
  is_enabled boolean default true,
  updated_at timestamptz default now()
);

alter table feature_flags enable row level security;
drop policy if exists "Admin only ff" on feature_flags;
create policy "Admin only ff" on feature_flags for all using (false);

insert into feature_flags (key, label, description, is_enabled) values
  ('bulk_operations',      'Bulk Operations',       'Allow users to run bulk video operations', true),
  ('shorts_factory',       'Shorts Factory',         'AI-powered Shorts content generation', true),
  ('ab_testing',           'A/B Testing',            'Thumbnail and title A/B testing', true),
  ('social_publishing',    'Social Publishing',      'Schedule and publish to social platforms', true),
  ('audio_studio',         'Audio Studio',           'AI voiceover and audio generation', true),
  ('broll_studio',         'B-Roll Studio',          'AI B-roll video generation', true),
  ('warmup_guide',         'Channel Warmup Guide',   'Guided warmup for new channels', true),
  ('comments_intelligence','Comments Intelligence',  'AI comment analysis and replies', true),
  ('retention_analysis',   'Retention Analysis',     'Video retention curve analysis', true),
  ('niche_intelligence',   'Niche Intelligence',     'Market research and niche scoring', true)
on conflict (key) do nothing;

-- Plan limits (quota caps per plan tier)
create table if not exists plan_limits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  plan text unique not null,
  daily_scans integer default 500,
  monthly_scans integer default 15000,
  channels integer default 1,
  ai_scripts integer default 10,
  bulk_limit integer default 0,
  updated_at timestamptz default now()
);

alter table plan_limits enable row level security;
drop policy if exists "Admin only pl" on plan_limits;
create policy "Admin only pl" on plan_limits for all using (false);

insert into plan_limits (plan, daily_scans, monthly_scans, channels, ai_scripts, bulk_limit) values
  ('free',    500,    5000,   1,  5,   0),
  ('creator', 2000,   20000,  2,  30,  10),
  ('pro',     8000,   80000,  5,  100, 50),
  ('agency',  15000,  150000, 20, 500, 200)
on conflict (plan) do nothing;
