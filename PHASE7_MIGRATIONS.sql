-- ── Phase 7: Lip Sync + Auto Captions ───────────────────────────────────────
-- Run AFTER ADMIN_MIGRATIONS.sql

-- Lip sync jobs
create table if not exists lipsync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),

  video_input_url text not null,
  audio_input_url text not null,
  quality text default 'balanced' check (quality in ('fast','balanced','best')),

  output_url text,
  duration_seconds numeric(8,2),
  parts_urls text[],
  parts_count integer,

  status text default 'processing' check (status in ('processing','complete','failed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  error text
);

alter table lipsync_jobs enable row level security;
create policy "Users own lipsync jobs" on lipsync_jobs for all using (auth.uid() = user_id);

-- Caption jobs
create table if not exists caption_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),

  video_input_url text not null,

  language_detected text,
  srt_content text,
  words_json jsonb,
  segment_count integer,
  word_count integer,

  caption_style text default 'classic_white' check (caption_style in (
    'classic_white','yellow_pop','word_highlight','karaoke','netflix'
  )),
  font_size integer default 24,
  position text default 'bottom',
  primary_color text default '#FFFFFF',
  highlight_color text default '#FFD200',

  output_url text,
  srt_export_url text,

  status text default 'pending' check (status in (
    'generating','editing','burning','complete','failed'
  )),
  completed_at timestamptz,
  error text
);

alter table caption_jobs enable row level security;
create policy "Users own caption jobs" on caption_jobs for all using (auth.uid() = user_id);

-- Add Phase 7 columns to plan_limits
alter table plan_limits
  add column if not exists lipsync_jobs_per_month integer default 0,
  add column if not exists caption_jobs_per_month integer default 3,
  add column if not exists lipsync_max_duration_seconds integer default 0;

-- Update plan limits for Phase 7
update plan_limits set
  lipsync_jobs_per_month = 0,
  caption_jobs_per_month = 3,
  lipsync_max_duration_seconds = 0
where plan = 'free';

update plan_limits set
  lipsync_jobs_per_month = 5,
  caption_jobs_per_month = 20,
  lipsync_max_duration_seconds = 30
where plan = 'creator';

update plan_limits set
  lipsync_jobs_per_month = 20,
  caption_jobs_per_month = 100,
  lipsync_max_duration_seconds = 60
where plan = 'pro';

update plan_limits set
  lipsync_jobs_per_month = 60,
  caption_jobs_per_month = 999,
  lipsync_max_duration_seconds = 60
where plan = 'agency';
