import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";
import { calculateVPH, calculateOutlierRatio, scoreTitle } from "@/lib/scoring";
import type { Profile, ChannelVideoCache } from "@/types/database";

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseInt(match[3] || "0");
}

function calcOptimizationScore(video: {
  title: string;
  description: string | null;
  tags: string[] | null;
  outlier_ratio: number | null;
}): number {
  let score = 50;
  const titleScore = scoreTitle(video.title);
  score += (titleScore - 50) * 0.4;
  if (video.description && video.description.length > 200) score += 10;
  else if (!video.description || video.description.length < 50) score -= 15;
  const tagCount = video.tags?.length || 0;
  if (tagCount >= 10 && tagCount <= 15) score += 10;
  else if (tagCount === 0) score -= 20;
  else if (tagCount < 5) score -= 10;
  const outlier = video.outlier_ratio || 0;
  if (outlier >= 5) score += 15;
  else if (outlier < 0.5) score -= 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("locked_channel_id, locked_channel_name, locked_channel_handle, locked_channel_thumbnail, locked_channel_subscriber_count, channel_lock_until, youtube_access_token, youtube_token_expires_at")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Pick<Profile, "locked_channel_id" | "locked_channel_name" | "locked_channel_handle" | "locked_channel_thumbnail" | "locked_channel_subscriber_count" | "channel_lock_until" | "youtube_access_token" | "youtube_token_expires_at"> | null;

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ noChannel: true, channelInfo: null, videos: [] });
  }

  const serviceSupabase = await createServiceClient();
  const { data: videos } = await serviceSupabase
    .from("channel_video_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("channel_id", profile.locked_channel_id)
    .order("view_count", { ascending: false });

  return NextResponse.json({
    noChannel: false,
    channelInfo: {
      id: profile.locked_channel_id,
      name: profile.locked_channel_name,
      handle: profile.locked_channel_handle,
      thumbnail: profile.locked_channel_thumbnail,
      subscriberCount: profile.locked_channel_subscriber_count,
      lockUntil: profile.channel_lock_until,
    },
    videos: videos || [],
    lastSyncedAt: (videos || [])[0]?.last_synced_at || null,
  });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("locked_channel_id, locked_channel_subscriber_count")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as Pick<Profile, "locked_channel_id" | "locked_channel_subscriber_count"> | null;

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No channel connected" }, { status: 400 });
  }

  const channelId = profile.locked_channel_id;
  const serviceSupabase = await createServiceClient();

  const { data: existing } = await serviceSupabase
    .from("channel_video_cache")
    .select("last_synced_at")
    .eq("user_id", user.id)
    .eq("channel_id", channelId)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .single();

  if (existing?.last_synced_at) {
    const hoursSince = (Date.now() - new Date(existing.last_synced_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 6) {
      return NextResponse.json({ error: `Last synced ${Math.round(hoursSince * 60)} minutes ago. Sync available every 6 hours.` }, { status: 429 });
    }
  }

  try {
    const accessToken = await getValidAccessToken(user.id);

    // Use mine=true so we always get the authenticated user's own channel data reliably
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!channelRes.ok) {
      const errBody = await channelRes.json().catch(() => ({})) as { error?: { message?: string } };
      return NextResponse.json({
        error: `YouTube channel API error (${channelRes.status}): ${errBody?.error?.message || "Could not fetch channel. Try reconnecting."}`,
      }, { status: 500 });
    }
    const channelData = await channelRes.json() as {
      items?: Array<{
        statistics: { viewCount: string; videoCount: string; subscriberCount: string };
        contentDetails: { relatedPlaylists: { uploads: string } };
      }>;
    };

    const channelStats = channelData.items?.[0]?.statistics;
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId || !channelStats) {
      return NextResponse.json({ error: "Could not read channel uploads playlist. Try disconnecting and reconnecting your channel." }, { status: 500 });
    }

    const channelTotalViews = parseInt(channelStats.viewCount || "0");
    const channelVideoCount = parseInt(channelStats.videoCount || "1");

    // Fetch all video IDs from uploads playlist
    const videoIds: string[] = [];
    let pageToken: string | undefined;
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({
          error: `YouTube playlist API error (${res.status}): ${errBody?.error?.message || "Could not fetch video list. Try reconnecting your channel."}`,
        }, { status: 500 });
      }
      const data = await res.json() as { items?: Array<{ contentDetails: { videoId: string } }>; nextPageToken?: string };
      (data.items || []).forEach(item => videoIds.push(item.contentDetails.videoId));
      pageToken = data.nextPageToken;
    } while (pageToken && videoIds.length < 200);

    // Fetch video details in batches of 50
    const nowStr = new Date().toISOString();
    const upsertRows: Partial<ChannelVideoCache>[] = [];

    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50).join(",");
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!vRes.ok) {
        console.error("[sync] videos.list batch failed:", vRes.status);
        continue; // skip failed batch, don't abort entire sync
      }
      const vData = await vRes.json() as {
        items?: Array<{
          id: string;
          snippet: { title: string; description: string; tags?: string[]; thumbnails: { maxres?: { url: string }; high?: { url: string } }; publishedAt: string; categoryId?: string };
          statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
          contentDetails: { duration: string };
        }>;
      };

      for (const v of vData.items || []) {
        const viewCount = parseInt(v.statistics.viewCount || "0");
        const durationSeconds = parseISO8601Duration(v.contentDetails.duration);
        const vph = calculateVPH(viewCount, v.snippet.publishedAt);
        const outlierRatio = calculateOutlierRatio(viewCount, channelTotalViews, channelVideoCount);
        const tags = v.snippet.tags || [];
        const description = v.snippet.description || null;
        const optimizationScore = calcOptimizationScore({ title: v.snippet.title, description, tags, outlier_ratio: outlierRatio });

        upsertRows.push({
          user_id: user.id,
          channel_id: channelId,
          video_id: v.id,
          title: v.snippet.title,
          description,
          tags,
          thumbnail_url: v.snippet.thumbnails.maxres?.url || v.snippet.thumbnails.high?.url || null,
          published_at: v.snippet.publishedAt,
          view_count: viewCount,
          like_count: parseInt(v.statistics.likeCount || "0"),
          comment_count: parseInt(v.statistics.commentCount || "0"),
          duration_seconds: durationSeconds,
          vph,
          outlier_ratio: outlierRatio,
          optimization_score: optimizationScore,
          category_id: v.snippet.categoryId || null,
          last_synced_at: nowStr,
        });
      }
    }

    for (let i = 0; i < upsertRows.length; i += 50) {
      const { error: upsertErr } = await serviceSupabase
        .from("channel_video_cache")
        .upsert(upsertRows.slice(i, i + 50) as ChannelVideoCache[], { onConflict: "user_id,video_id" });
      if (upsertErr) {
        console.error("[sync] upsert failed:", upsertErr.message, upsertErr.details);
        return NextResponse.json({ error: `Database save failed: ${upsertErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ synced: upsertRows.length, syncedAt: nowStr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
