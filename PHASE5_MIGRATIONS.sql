-- ============================================================
-- TubeTarzan Phase 5 SQL Migrations
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Social posts / scheduling ──────────────────────────────────────────────

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  platform text not null check (platform in ('youtube','instagram','tiktok','twitter','linkedin','facebook')),
  post_title text not null,
  post_description text,
  post_tags text[],
  post_hashtags text[],
  scheduled_for timestamptz not null,
  publish_immediately boolean default false,
  status text default 'scheduled' check (status in ('draft','scheduled','publishing','published','failed')),
  published_at timestamptz,
  platform_post_id text,
  platform_post_url text,
  error_message text,
  platform_access_token text,
  platform_refresh_token text,
  platform_token_expires_at timestamptz
);

alter table social_posts enable row level security;
create policy "Users own social_posts" on social_posts for all using (auth.uid() = user_id);
create index if not exists social_posts_user_scheduled on social_posts(user_id, scheduled_for);
create index if not exists social_posts_status on social_posts(status) where status = 'scheduled';

-- ── Video transcripts ──────────────────────────────────────────────────────

create table if not exists video_transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  youtube_url text not null,
  video_id text not null,
  video_title text,
  channel_name text,
  duration_seconds integer,
  language text default 'en',
  transcript_raw text,
  transcript_segments jsonb,
  word_count integer,
  speaking_pace_wpm integer
);

alter table video_transcripts enable row level security;
create policy "Users own transcripts" on video_transcripts for all using (auth.uid() = user_id);

-- ── Audio files ────────────────────────────────────────────────────────────

create table if not exists audio_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  source text not null check (source in ('google_tts','uploaded')),
  voice_name text,
  voice_language text,
  speaking_rate numeric(4,2) default 1.0,
  file_url text,
  file_size_bytes bigint,
  duration_seconds numeric(8,2),
  format text default 'mp3',
  status text default 'ready' check (status in ('processing','ready','failed'))
);

alter table audio_files enable row level security;
create policy "Users own audio_files" on audio_files for all using (auth.uid() = user_id);

-- ── Editing patterns ───────────────────────────────────────────────────────

create table if not exists editing_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  youtube_url text not null,
  video_id text not null,
  video_title text,
  total_clips integer,
  avg_clip_duration_seconds numeric(5,2),
  cut_frequency_per_minute numeric(5,2),
  has_broll boolean,
  pattern_segments jsonb,
  pattern_summary text,
  template_name text,
  template_json jsonb
);

alter table editing_patterns enable row level security;
create policy "Users own editing_patterns" on editing_patterns for all using (auth.uid() = user_id);

-- ── Project assets (B-rolls) ───────────────────────────────────────────────

create table if not exists project_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  asset_type text not null check (asset_type in ('broll_video','stock_image','stock_video','ai_generated_video','thumbnail_image','uploaded')),
  source text not null check (source in ('pexels','pixabay','kling_ai','stable_diffusion','uploaded')),
  source_id text,
  source_url text,
  file_url text,
  thumbnail_url text,
  duration_seconds numeric(8,2),
  width integer,
  height integer,
  keyword_used text,
  is_selected boolean default false,
  display_order integer,
  kling_task_id text,
  kling_credits_used integer,
  attribution text
);

alter table project_assets enable row level security;
create policy "Users own project_assets" on project_assets for all using (auth.uid() = user_id);

-- ── Rendered videos ────────────────────────────────────────────────────────

create table if not exists rendered_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  render_status text default 'queued' check (render_status in ('queued','processing','complete','failed')),
  render_progress integer default 0,
  render_started_at timestamptz,
  render_completed_at timestamptz,
  error_message text,
  output_url text,
  output_duration_seconds numeric(8,2),
  output_file_size_bytes bigint,
  thumbnail_url text,
  railway_job_id text
);

alter table rendered_videos enable row level security;
create policy "Users own rendered_videos" on rendered_videos for all using (auth.uid() = user_id);

-- ── Niche RPM intelligence ─────────────────────────────────────────────────

create table if not exists niche_rpm_data (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz default now(),
  niche_keyword text unique not null,
  category text,
  avg_rpm_usd numeric(6,2),
  avg_cpm_usd numeric(6,2),
  competition_level text check (competition_level in ('low','medium','high')),
  best_audience_country text,
  monetization_difficulty text check (monetization_difficulty in ('easy','medium','hard')),
  notes text
);

-- Seed with data
insert into niche_rpm_data (niche_keyword, category, avg_rpm_usd, avg_cpm_usd, competition_level, best_audience_country, monetization_difficulty)
values
  ('AI Technology', 'Technology', 18.00, 25.00, 'high', 'US', 'medium'),
  ('Senior Health', 'Health', 15.00, 22.00, 'medium', 'US', 'easy'),
  ('Personal Finance', 'Finance', 12.50, 18.00, 'high', 'US', 'medium'),
  ('Self Mastery', 'Education', 8.50, 11.00, 'medium', 'US', 'easy'),
  ('Car Reviews', 'Automotive', 9.00, 14.00, 'medium', 'US', 'medium'),
  ('True Crime', 'Entertainment', 7.00, 10.00, 'high', 'US', 'medium'),
  ('Horror Stories', 'Entertainment', 6.00, 8.00, 'medium', 'US', 'easy'),
  ('Cooking', 'Food', 5.00, 7.00, 'high', 'US', 'medium'),
  ('Travel Vlog', 'Travel', 4.50, 6.00, 'high', 'US', 'hard'),
  ('Islamic Content', 'Religion', 3.00, 4.00, 'low', 'US', 'easy'),
  ('Mindfulness', 'Wellness', 7.50, 10.50, 'medium', 'US', 'easy'),
  ('Productivity', 'Education', 9.50, 13.00, 'high', 'US', 'medium'),
  ('Fitness & Gym', 'Health', 6.50, 9.00, 'high', 'US', 'medium'),
  ('Crypto & Web3', 'Finance', 14.00, 20.00, 'high', 'US', 'hard'),
  ('Business Tips', 'Business', 11.00, 16.00, 'high', 'US', 'medium'),
  ('DIY & Crafts', 'Lifestyle', 4.00, 6.00, 'medium', 'US', 'medium')
on conflict (niche_keyword) do nothing;

-- ── Supabase Storage bucket for rendered videos ────────────────────────────
-- Run in Supabase Dashboard → Storage → Create new bucket:
-- Bucket name: rendered-videos
-- Public: YES (so URLs work)
-- OR uncomment and run this (requires service role):
-- insert into storage.buckets (id, name, public) values ('rendered-videos', 'rendered-videos', true) on conflict do nothing;

-- ============================================================
-- DONE. All Phase 5 tables created.
-- Next: Set these environment variables in Vercel:
--   PEXELS_API_KEY     - from pexels.com/api (free)
--   PIXABAY_API_KEY    - from pixabay.com/api (free)
--   KLING_API_KEY      - from klingai.com/developer (free)
--   GOOGLE_TTS_API_KEY - from Google Cloud Console (free 4M chars/mo)
--   FFMPEG_SERVICE_URL - from Railway after deploying railway/ folder
-- ============================================================
