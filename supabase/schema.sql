-- ============================================================
-- TUBETARZAN — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================

-- ============================================================
-- TABLE: profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  full_name text,
  email text unique not null,

  -- LemonSqueezy
  lemonsqueezy_customer_id text unique,
  lemonsqueezy_subscription_id text unique,
  subscription_status text default 'inactive'
    check (subscription_status in
      ('inactive','trialing','active','past_due','canceled','paused')),
  subscription_plan text
    check (subscription_plan in ('free','creator','pro','agency')),
  subscription_period_end timestamptz,
  subscription_renews_at timestamptz,

  -- YouTube API Key (Free and Creator users bring their own)
  youtube_api_key text,
  youtube_api_key_verified boolean default false,

  -- Channel Lock
  locked_channel_id text,
  locked_channel_handle text,
  locked_channel_name text,
  locked_channel_thumbnail text,
  locked_channel_subscriber_count bigint,
  channel_connected_at timestamptz,
  channel_lock_until timestamptz,

  -- Agency: multiple channels
  allowed_channel_ids text[] default '{}',
  allowed_channel_data jsonb default '[]',

  -- YouTube OAuth tokens (encrypted, server-side only)
  youtube_access_token text,
  youtube_refresh_token text,
  youtube_token_expires_at timestamptz,

  -- Usage tracking
  scans_today integer default 0,
  scans_reset_date date default current_date,

  -- Quota tracking (per user's own API key)
  youtube_quota_used_today integer default 0,
  youtube_quota_reset_date date default current_date,

  -- Onboarding
  onboarding_completed boolean default false,
  api_key_setup_completed boolean default false
);

-- Enable RLS
alter table profiles enable row level security;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();


-- ============================================================
-- TABLE: viral_ideas
-- ============================================================
create table viral_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),

  -- Search context
  niche text not null,
  search_session_id uuid default gen_random_uuid(),

  -- AI generated content
  video_title text not null,
  thumbnail_text text not null,
  hook_line text not null,
  click_confirmation text,
  sub_niche_keyword text not null,
  packaging_notes text,
  title_score integer check (title_score between 0 and 100),

  -- Source data from YouTube API
  source_video_id text,
  source_video_url text,
  source_video_title text,
  source_channel_name text,
  source_channel_id text,
  source_views bigint,
  source_vph numeric(10,2),
  source_outlier_ratio numeric(6,2),
  source_tags text[],

  -- Status tracking
  status text default 'pending'
    check (status in ('pending','scripting','recorded','uploaded','done')),
  is_done boolean default false,
  done_at timestamptz,
  notes text
);

alter table viral_ideas enable row level security;
create policy "Users manage own ideas"
  on viral_ideas for all using (auth.uid() = user_id);

create index on viral_ideas(user_id, created_at desc);
create index on viral_ideas(user_id, is_done);


-- ============================================================
-- TABLE: search_cache
-- ============================================================
create table search_cache (
  id uuid primary key default gen_random_uuid(),
  niche_key text unique not null,
  raw_results jsonb not null,
  total_videos integer,
  cached_at timestamptz default now()
);
-- No RLS needed — shared cache across all users


-- ============================================================
-- TABLE: competitors
-- ============================================================
create table competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),

  channel_id text not null,
  channel_handle text,
  channel_name text not null,
  channel_thumbnail text,
  subscriber_count bigint,
  video_count integer,
  total_views bigint,
  avg_views_per_video numeric(12,2),

  top_videos jsonb,
  title_patterns jsonb,
  niche_consistency_score integer,
  last_analyzed_at timestamptz,

  unique(user_id, channel_id)
);

alter table competitors enable row level security;
create policy "Users manage own competitors"
  on competitors for all using (auth.uid() = user_id);


-- ============================================================
-- TABLE: channel_video_cache
-- ============================================================
create table channel_video_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  channel_id text not null,

  video_id text not null,
  title text not null,
  description text,
  tags text[],
  thumbnail_url text,
  published_at timestamptz,

  view_count bigint,
  like_count bigint,
  comment_count bigint,
  duration_seconds integer,
  vph numeric(10,2),
  outlier_ratio numeric(6,2),
  optimization_score integer,

  -- AI suggestions
  suggested_title text,
  suggested_description text,
  suggested_tags text[],
  suggested_thumbnail_text text,
  optimization_notes text,
  suggestions_generated_at timestamptz,
  applied_at timestamptz,

  last_synced_at timestamptz default now(),
  unique(user_id, video_id)
);

alter table channel_video_cache enable row level security;
create policy "Users manage own video cache"
  on channel_video_cache for all using (auth.uid() = user_id);


-- ============================================================
-- TABLE: lemonsqueezy_events
-- ============================================================
create table lemonsqueezy_events (
  id text primary key,
  event_name text not null,
  data jsonb not null,
  processed_at timestamptz default now()
);


-- ============================================================
-- TABLE: admin_settings
-- ============================================================
create table admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed default values
insert into admin_settings (key, value) values
  ('hero_video_url', 'https://www.youtube.com/embed/your-demo-video-id'),
  ('hero_video_title', 'See TubeTarzan in Action'),
  ('announcement_bar_text', ''),
  ('announcement_bar_active', 'false'),
  ('maintenance_mode', 'false');


-- ============================================================
-- TABLE: leads
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text unique not null,
  name text,
  source text,
  niche_interest text,
  country text,
  status text default 'captured'
    check (status in
      ('captured','trial_started','paid','churned','unsubscribed')),
  notes text,
  last_activity timestamptz default now()
);


-- ============================================================
-- FUNCTION: handle_new_user
-- Auto-creates profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, subscription_plan, subscription_status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'free',
    'inactive'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- FUNCTION: reset_daily_scans
-- Run this as a cron job daily at midnight
-- In Supabase: go to Edge Functions or pg_cron
-- ============================================================
create or replace function reset_daily_scans()
returns void as $$
begin
  update profiles
  set
    scans_today = 0,
    scans_reset_date = current_date,
    youtube_quota_used_today = 0,
    youtube_quota_reset_date = current_date
  where scans_reset_date < current_date;
end;
$$ language plpgsql security definer;
