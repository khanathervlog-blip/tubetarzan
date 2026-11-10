-- ── Phase 8: One Go Automation + Viral Score Upgrade ─────────────────────────
-- Run AFTER PHASE7_MIGRATIONS.sql in Supabase SQL editor

-- One Go config (one row per installation)
create table if not exists one_go_config (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  channel_id text,
  channel_handle text,
  channel_niche text not null default '',

  face_video_url text not null default '',
  voice_preset_id text default 'en-US-Neural2-J',
  caption_style text default 'word_highlight',

  auto_post boolean default false,
  post_platforms text[] default '{}',
  weekly_schedule_active boolean default false,
  post_day_of_week integer default 5,   -- 5 = Friday
  post_hour_utc integer default 3,      -- 3 AM UTC = 8 AM PKT = 7 PM EST prior day

  max_runs_per_month integer default 8
);

-- One Go jobs (each automated run)
create table if not exists one_go_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  completed_at timestamptz,

  -- config snapshot at time of run
  channel_id text,
  channel_handle text,
  channel_niche text not null default '',
  face_video_url text not null default '',
  voice_preset_id text,
  caption_style text,
  auto_post boolean default false,
  post_platforms text[] default '{}',

  -- pipeline status
  overall_status text default 'running' check (overall_status in ('running','complete','failed')),
  current_step text default 'Starting...',
  progress_percent integer default 0,
  error_message text,

  -- step outputs
  selected_video_id text,
  selected_video_title text,
  viral_score numeric(5,2),
  viral_tier text,
  selection_reason text,
  generated_idea jsonb,
  script_text text,
  audio_url text,
  broll_urls text[] default '{}',
  lipsync_url text,
  captions_url text,
  final_video_url text
);

-- No RLS on one_go_jobs — admin-only, protected by ADMIN_EMAIL env check in API routes

-- Add viral score columns to viral_ideas if not already present
alter table viral_ideas
  add column if not exists viral_score_total numeric(5,2),
  add column if not exists viral_score_breakdown jsonb,
  add column if not exists viral_tier text,
  add column if not exists days_old_when_found numeric(7,2),
  add column if not exists selection_reason text;

-- Index for monthly run count queries
create index if not exists idx_one_go_jobs_created_at on one_go_jobs(created_at);
create index if not exists idx_one_go_jobs_status on one_go_jobs(overall_status);
