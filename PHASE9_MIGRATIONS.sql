-- ── Phase 9: Visitor analytics + Lip Sync (free GPU pool) ───────────────────────────────────────────────
-- Run AFTER PHASE8_MIGRATIONS.sql in the Supabase SQL editor. Safe to run more than once.
--
-- Design note (Vercel free plan): page views are written by the browser STRAIGHT to Supabase with the
-- public anon key (insert-only), and the admin numbers are calculated inside Postgres. No Vercel function
-- runs per page view.

-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
-- 1. VISITOR ANALYTICS
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists page_views (
  id uuid primary key,                       -- generated in the browser so it can report time-on-page
  ts timestamptz not null default now(),
  path text not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,                              -- approximate, from the browser time zone (no IP is stored)
  timezone text,
  device text,
  browser text,
  os text,
  screen text,
  browser_language text,
  visitor_id text,                           -- random id kept in the visitor's browser
  session_id text,
  is_new_visitor boolean default false,
  landing boolean default false,
  logged_in boolean default false,
  duration_ms integer,
  constraint page_views_sizes check (
    char_length(path) <= 300
    and coalesce(char_length(referrer_host), 0) <= 200
    and coalesce(char_length(utm_source), 0) <= 100
    and coalesce(char_length(utm_medium), 0) <= 100
    and coalesce(char_length(utm_campaign), 0) <= 100
    and coalesce(char_length(country), 0) <= 2
    and coalesce(char_length(timezone), 0) <= 64
    and coalesce(char_length(device), 0) <= 20
    and coalesce(char_length(browser), 0) <= 40
    and coalesce(char_length(os), 0) <= 40
    and coalesce(char_length(screen), 0) <= 20
    and coalesce(char_length(browser_language), 0) <= 20
    and coalesce(char_length(visitor_id), 0) <= 64
    and coalesce(char_length(session_id), 0) <= 64
  )
);

create index if not exists page_views_ts_idx on page_views (ts desc);

alter table page_views enable row level security;
drop policy if exists "Anyone can record a page view" on page_views;
create policy "Anyone can record a page view" on page_views
  for insert to anon, authenticated
  with check (ts > now() - interval '5 minutes' and ts < now() + interval '5 minutes' and duration_ms is null);
-- No select/update/delete policies: only the service role (admin pages, cron) can read.

-- Time on page: the browser may set duration once, for its own recent row only.
create or replace function track_duration(p_id uuid, p_ms integer)
returns void
language sql
security definer
set search_path = public
as $$
  update page_views
     set duration_ms = least(greatest(p_ms, 0), 3600000)
   where id = p_id
     and duration_ms is null
     and ts > now() - interval '1 day';
$$;
revoke all on function track_duration(uuid, integer) from public;
grant execute on function track_duration(uuid, integer) to anon, authenticated;

-- Who is on the site right now (heartbeat every 2 minutes while a tab is visible)
create table if not exists live_presence (
  session_id text primary key,
  path text,
  country text,
  device text,
  referrer_host text,
  last_seen timestamptz not null default now()
);
alter table live_presence enable row level security;

create or replace function touch_presence(p_sid text, p_path text, p_country text, p_device text, p_referrer text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into live_presence (session_id, path, country, device, referrer_host, last_seen)
  values (left(p_sid, 64), left(p_path, 300), left(p_country, 2), left(p_device, 20), left(p_referrer, 200), now())
  on conflict (session_id) do update
     set path = excluded.path, last_seen = now();
$$;
revoke all on function touch_presence(text, text, text, text, text) from public;
grant execute on function touch_presence(text, text, text, text, text) to anon, authenticated;

-- All numbers for Admin → Visitors in ONE database call (keeps the Vercel side trivial).
create or replace function admin_visitor_stats(p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  result jsonb;
begin
  with v as (
    select *, coalesce(visitor_id, session_id, id::text) as who,
           case
             when utm_source is not null and utm_source <> '' then utm_source
             when referrer_host is null or referrer_host = '' then 'Direct'
             when referrer_host ilike '%google.%' then 'Google'
             when referrer_host ilike '%bing.%' then 'Bing'
             when referrer_host ilike '%youtube.%' or referrer_host ilike '%youtu.be%' then 'YouTube'
             when referrer_host ilike '%facebook.%' or referrer_host ilike 'fb.%' or referrer_host ilike 'l.facebook.%' then 'Facebook'
             when referrer_host ilike '%instagram.%' then 'Instagram'
             when referrer_host ilike '%t.co' or referrer_host ilike '%twitter.%' or referrer_host ilike '%x.com' then 'X / Twitter'
             when referrer_host ilike '%reddit.%' then 'Reddit'
             when referrer_host ilike '%linkedin.%' or referrer_host ilike 'lnkd.in' then 'LinkedIn'
             when referrer_host ilike '%whatsapp.%' or referrer_host ilike 'wa.me' then 'WhatsApp'
             when referrer_host ilike '%chatgpt.%' or referrer_host ilike '%openai.%' or referrer_host ilike '%perplexity.%' then 'AI assistants'
             else referrer_host
           end as source
      from page_views
     where ts >= since
  ),
  sess as (select session_id, count(*) as n from v where session_id is not null group by session_id)
  select jsonb_build_object(
    'visitors',      (select count(distinct who) from v),
    'views',         (select count(*) from v),
    'sessions',      (select count(*) from sess),
    'bounced',       (select count(*) from sess where n = 1),
    'new_visitors',  (select count(distinct who) from v where is_new_visitor),
    'logged_in_views', (select count(*) from v where logged_in),
    'avg_seconds',   (select coalesce(round(avg(duration_ms) / 1000.0), 0) from v where duration_ms is not null),
    'live_now',      (select count(*) from live_presence where last_seen > now() - interval '5 minutes'),
    'counting_since',(select min(ts) from page_views),
    'daily', coalesce((
       select jsonb_agg(jsonb_build_object('day', d::date, 'views', coalesce(x.views, 0), 'visitors', coalesce(x.visitors, 0)) order by d)
         from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d
         left join (select date_trunc('day', ts) as day, count(*) as views, count(distinct who) as visitors from v group by 1) x
           on x.day = d), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('hour', h, 'views', c) order by h)
                         from (select extract(hour from ts at time zone 'UTC')::int as h, count(*) as c from v group by 1) t), '[]'::jsonb),
    'pages',     coalesce((select jsonb_agg(t) from (select path as name, count(distinct who) as people, count(*) as views from v group by path order by 2 desc, 3 desc limit 15) t), '[]'::jsonb),
    'sources',   coalesce((select jsonb_agg(t) from (select source as name, count(distinct who) as people, count(*) as views from v group by source order by 2 desc, 3 desc limit 12) t), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(t) from (select coalesce(country, '??') as name, count(distinct who) as people, count(*) as views from v group by 1 order by 2 desc, 3 desc limit 15) t), '[]'::jsonb),
    'devices',   coalesce((select jsonb_agg(t) from (select coalesce(device, 'Unknown') as name, count(distinct who) as people, count(*) as views from v group by 1 order by 2 desc limit 6) t), '[]'::jsonb),
    'browsers',  coalesce((select jsonb_agg(t) from (select coalesce(browser, 'Unknown') as name, count(distinct who) as people, count(*) as views from v group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'os',        coalesce((select jsonb_agg(t) from (select coalesce(os, 'Unknown') as name, count(distinct who) as people, count(*) as views from v group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(t) from (select coalesce(browser_language, 'Unknown') as name, count(distinct who) as people, count(*) as views from v group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(t) from (select utm_campaign as name, count(distinct who) as people, count(*) as views from v where utm_campaign is not null and utm_campaign <> '' group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'live', coalesce((select jsonb_agg(t) from (select path, country, device, referrer_host, last_seen from live_presence where last_seen > now() - interval '5 minutes' order by last_seen desc limit 30) t), '[]'::jsonb),
    'latest', coalesce((select jsonb_agg(t) from (select ts, path, country, device, browser, os, source, is_new_visitor, logged_in from v order by ts desc limit 40) t), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function admin_visitor_stats(integer) from public, anon, authenticated;
grant execute on function admin_visitor_stats(integer) to service_role;

-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
-- 2. LIP SYNC (clips of at most 60 seconds, processed on a pool of Hugging Face ZeroGPU accounts)
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists lipsync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  source_name text,
  mode text not null default 'split' check (mode in ('split', 'loop')),
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'processing', 'paused', 'complete', 'failed', 'expired')),
  total_seconds numeric(8,2) not null default 0,
  clip_count integer not null default 0,
  done_count integer not null default 0,
  error text
);
create index if not exists lipsync_runs_user_idx on lipsync_runs (user_id, created_at desc);

create table if not exists lipsync_clips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references lipsync_runs(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  idx integer not null,
  start_sec numeric(8,2) not null default 0,
  duration_sec numeric(8,2) not null,
  video_path text not null,
  audio_path text not null,
  output_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  attempts integer not null default 0,
  key_fp text,
  error text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (run_id, idx)
);
create index if not exists lipsync_clips_user_month_idx on lipsync_clips (user_id, created_at);

alter table lipsync_runs enable row level security;
alter table lipsync_clips enable row level security;
drop policy if exists "Users read own lipsync runs" on lipsync_runs;
create policy "Users read own lipsync runs" on lipsync_runs for select using (auth.uid() = user_id);
drop policy if exists "Users read own lipsync clips" on lipsync_clips;
create policy "Users read own lipsync clips" on lipsync_clips for select using (auth.uid() = user_id);
-- All writes go through the server with the service role.

-- Key pool state. Only a short fingerprint of each Hugging Face token is stored, never the token.
create table if not exists lipsync_key_state (
  key_fp text primary key,
  exhausted_until timestamptz,
  last_error text,
  updated_at timestamptz default now()
);
create table if not exists lipsync_key_usage (
  key_fp text not null,
  day date not null default (now() at time zone 'utc')::date,
  clips integer not null default 0,
  seconds numeric(10,2) not null default 0,
  primary key (key_fp, day)
);
alter table lipsync_key_state enable row level security;
alter table lipsync_key_usage enable row level security;

create or replace function lipsync_record_key_use(p_fp text, p_seconds numeric)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lipsync_key_usage (key_fp, day, clips, seconds)
  values (p_fp, (now() at time zone 'utc')::date, 1, p_seconds)
  on conflict (key_fp, day) do update
     set clips = lipsync_key_usage.clips + 1,
         seconds = lipsync_key_usage.seconds + excluded.seconds;
$$;
revoke all on function lipsync_record_key_use(text, numeric) from public, anon, authenticated;
grant execute on function lipsync_record_key_use(text, numeric) to service_role;

-- Private storage bucket for clips. Browsers upload with one-time signed upload URLs and download with
-- short-lived signed URLs; the Hugging Face Space does the same. 50 MB per file (Supabase free-tier limit).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lipsync', 'lipsync', false, 52428800,
        array['video/mp4', 'video/quicktime', 'video/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/webm', 'audio/ogg'])
on conflict (id) do nothing;
