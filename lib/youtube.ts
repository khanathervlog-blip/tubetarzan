/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  YouTubeSearchResult,
  YouTubeVideoDetail,
  YouTubeChannelDetail,
} from "@/types/youtube";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function searchVideos(
  query: string,
  apiKey: string,
  maxResults = 50
): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    order: "viewCount",
    maxResults: String(maxResults),
    q: query,
    key: apiKey,
  });
  const res = await fetch(`${BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube search failed: ${err.error?.message || res.statusText}`
    );
  }
  const data = await res.json();
  return (data.items || [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
    }));
}

export async function getVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<YouTubeVideoDetail[]> {
  if (videoIds.length === 0) return [];
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    key: apiKey,
  });
  const res = await fetch(`${BASE}/videos?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube videos.list failed: ${err.error?.message || res.statusText}`
    );
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    videoId: item.id,
    title: item.snippet.title,
    description: item.snippet.description || "",
    tags: item.snippet.tags || [],
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails.duration,
    viewCount: parseInt(item.statistics.viewCount || "0"),
    likeCount: parseInt(item.statistics.likeCount || "0"),
    commentCount: parseInt(item.statistics.commentCount || "0"),
    thumbnailUrl:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",
  }));
}

export async function getChannelDetails(
  channelIds: string[],
  apiKey: string
): Promise<YouTubeChannelDetail[]> {
  if (channelIds.length === 0) return [];
  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: channelIds.join(","),
    key: apiKey,
  });
  const res = await fetch(`${BASE}/channels?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube channels.list failed: ${err.error?.message || res.statusText}`
    );
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    channelId: item.id,
    title: item.snippet.title,
    subscriberCount: parseInt(item.statistics.subscriberCount || "0"),
    videoCount: parseInt(item.statistics.videoCount || "0"),
    totalViews: parseInt(item.statistics.viewCount || "0"),
    thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
  }));
}

export async function getChannelVideos(
  channelId: string,
  apiKey: string,
  maxResults = 50
): Promise<string[]> {
  const chParams = new URLSearchParams({
    part: "contentDetails",
    id: channelId,
    key: apiKey,
  });
  const chRes = await fetch(`${BASE}/channels?${chParams}`);
  if (!chRes.ok) throw new Error("Failed to get channel contentDetails");
  const chData = await chRes.json();
  const uploadsId =
    chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];

  const plParams = new URLSearchParams({
    part: "contentDetails",
    playlistId: uploadsId,
    maxResults: String(maxResults),
    key: apiKey,
  });
  const plRes = await fetch(`${BASE}/playlistItems?${plParams}`);
  if (!plRes.ok) throw new Error("Failed to get playlist items");
  const plData = await plRes.json();
  return (plData.items || []).map(
    (item: any) => item.contentDetails.videoId as string
  );
}

export async function updateVideo(
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
  },
  accessToken: string
): Promise<boolean> {
  const body = {
    id: videoId,
    snippet: {
      ...(updates.title && { title: updates.title }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      ...(updates.tags && { tags: updates.tags }),
      ...(updates.categoryId && { categoryId: updates.categoryId }),
    },
  };
  const res = await fetch(`${BASE}/videos?part=snippet`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}
