export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export type SubscriptionPlan = "free" | "creator" | "pro" | "agency";

export type IdeaStatus =
  | "pending"
  | "scripting"
  | "recorded"
  | "uploaded"
  | "done";

export type LeadStatus =
  | "captured"
  | "trial_started"
  | "paid"
  | "churned"
  | "unsubscribed";

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  email: string;

  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan | null;
  subscription_period_end: string | null;
  subscription_renews_at: string | null;

  youtube_api_key: string | null;
  youtube_api_key_verified: boolean;

  locked_channel_id: string | null;
  locked_channel_handle: string | null;
  locked_channel_name: string | null;
  locked_channel_thumbnail: string | null;
  locked_channel_subscriber_count: number | null;
  channel_connected_at: string | null;
  channel_lock_until: string | null;

  allowed_channel_ids: string[];
  allowed_channel_data: unknown[];

  youtube_access_token: string | null;
  youtube_refresh_token: string | null;
  youtube_token_expires_at: string | null;

  scans_today: number;
  scans_reset_date: string;

  youtube_quota_used_today: number;
  youtube_quota_reset_date: string;

  onboarding_completed: boolean;
  api_key_setup_completed: boolean;
}

export interface ViralIdea {
  id: string;
  user_id: string;
  created_at: string;
  niche: string;
  search_session_id: string;
  video_title: string;
  thumbnail_text: string;
  hook_line: string;
  click_confirmation: string | null;
  sub_niche_keyword: string;
  packaging_notes: string | null;
  title_score: number | null;
  source_video_id: string | null;
  source_video_url: string | null;
  source_video_title: string | null;
  source_channel_name: string | null;
  source_channel_id: string | null;
  source_views: number | null;
  source_vph: number | null;
  source_outlier_ratio: number | null;
  source_tags: string[] | null;
  status: IdeaStatus;
  is_done: boolean;
  done_at: string | null;
  notes: string | null;
}

export interface Competitor {
  id: string;
  user_id: string;
  created_at: string;
  channel_id: string;
  channel_handle: string | null;
  channel_name: string;
  channel_thumbnail: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  total_views: number | null;
  avg_views_per_video: number | null;
  top_videos: unknown | null;
  title_patterns: unknown | null;
  niche_consistency_score: number | null;
  last_analyzed_at: string | null;
}

export interface ChannelVideoCache {
  id: string;
  user_id: string;
  channel_id: string;
  video_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration_seconds: number | null;
  vph: number | null;
  outlier_ratio: number | null;
  optimization_score: number | null;
  category_id: string | null;
  suggested_title: string | null;
  suggested_description: string | null;
  suggested_tags: string[] | null;
  suggested_thumbnail_text: string | null;
  optimization_notes: string | null;
  suggestions_generated_at: string | null;
  applied_at: string | null;
  last_synced_at: string;
}

export interface Lead {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  source: string | null;
  niche_interest: string | null;
  country: string | null;
  status: LeadStatus;
  notes: string | null;
  last_activity: string;
}

export interface AdminSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface LemonsqueezyEvent {
  id: string;
  event_name: string;
  data: unknown;
  processed_at: string;
}

export interface SearchCache {
  id: string;
  niche_key: string;
  raw_results: unknown;
  total_videos: number | null;
  cached_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      viral_ideas: {
        Row: ViralIdea;
        Insert: Partial<ViralIdea> & {
          user_id: string;
          niche: string;
          video_title: string;
          thumbnail_text: string;
          hook_line: string;
          sub_niche_keyword: string;
        };
        Update: Partial<ViralIdea>;
      };
      competitors: {
        Row: Competitor;
        Insert: Partial<Competitor> & {
          user_id: string;
          channel_id: string;
          channel_name: string;
        };
        Update: Partial<Competitor>;
      };
      channel_video_cache: {
        Row: ChannelVideoCache;
        Insert: Partial<ChannelVideoCache> & {
          user_id: string;
          channel_id: string;
          video_id: string;
          title: string;
        };
        Update: Partial<ChannelVideoCache>;
      };
      leads: {
        Row: Lead;
        Insert: Partial<Lead> & { email: string };
        Update: Partial<Lead>;
      };
      admin_settings: {
        Row: AdminSetting;
        Insert: AdminSetting;
        Update: Partial<AdminSetting>;
      };
      lemonsqueezy_events: {
        Row: LemonsqueezyEvent;
        Insert: LemonsqueezyEvent;
        Update: Partial<LemonsqueezyEvent>;
      };
      search_cache: {
        Row: SearchCache;
        Insert: Partial<SearchCache> & { niche_key: string; raw_results: unknown };
        Update: Partial<SearchCache>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
