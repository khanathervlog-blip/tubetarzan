export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoDetail {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  channelId: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
}

export interface YouTubeChannelDetail {
  channelId: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  thumbnailUrl: string;
}

export interface EnrichedVideo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  channelSubscriberCount: number;
  channelAvgViews: number;
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  tags: string[];
  vph: number;
  outlierRatio: number;
  viralScore: number;
  hoursAlive: number;
  detectedSubNiche: string;
  videoUrl: string;
  pattern: string;
}

export interface GeneratedIdea {
  video_title: string;
  thumbnail_text: string;
  hook_line: string;
  click_confirmation: string;
  sub_niche_keyword: string;
  packaging_notes: string;
  suggested_tags: string[];
  title_score: number;
}

export interface SearchResponse {
  videos: EnrichedVideo[];
  fromCache: boolean;
  totalFound: number;
  subNiches: string[];
  quotaUsed: number;
  scansRemaining: number | null;
  scansDone: number;
}
