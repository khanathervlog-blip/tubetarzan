import { searchVideos, getVideoDetails, getChannelDetails } from "./youtube";
import {
  calculateVPH,
  calculateOutlierRatio,
  calculateViralScore,
} from "./scoring";
import { parseISO8601Duration } from "./utils";
import { createServiceClient } from "./supabase/server";
import type { YouTubeVideoDetail, YouTubeChannelDetail, EnrichedVideo } from "@/types/youtube";

const SEARCH_PATTERNS = [
  (n: string) => `things not to do in ${n}`,
  (n: string) => `dark side of ${n}`,
  (n: string) => `mistakes ${n}`,
  (n: string) => `best places ${n}`,
  (n: string) => `${n} travel guide`,
  (n: string) => `is ${n} worth it`,
  (n: string) => `things you will only see in ${n}`,
  (n: string) => `what can money get you in ${n}`,
  (n: string) => `first impression ${n}`,
  (n: string) => `${n} vs`,
  (n: string) => `hidden gems ${n}`,
  (n: string) => `${n} secrets`,
  (n: string) => `${n} scams`,
  (n: string) => `best things to do ${n}`,
  (n: string) => `${n} tips`,
  (n: string) => `${n} transformation`,
  (n: string) => `${n} exposed`,
  (n: string) => `${n} honest review`,
];

const STOP_WORDS = new Set([
  "The","A","An","In","Of","To","For","And","Or","But","Is","Are",
  "Was","Were","Be","Been","Have","Has","Had","Do","Does","Did",
  "Will","Would","Could","Should","May","Might","Must","Can",
  "My","Your","His","Her","Its","Our","Their","This","That",
  "These","Those","With","From","By","At","On","Up","Out",
  "About","Into","Not","You","Things","Best","Most","Only",
  "Every","How","What","When","Where","Why","Who","Which",
  "They","He","She","It","We","Side","Dark","Hidden","First",
  "Last","New","Old","Top","Vs","vs","I","Me",
]);

function extractSubNiche(title: string): string {
  const words = title.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^a-zA-Z]/g, "");
    const w2 = words[i + 1].replace(/[^a-zA-Z]/g, "");
    if (
      w1.length > 2 && w2.length > 2 &&
      /^[A-Z]/.test(w1) && /^[A-Z]/.test(w2) &&
      !STOP_WORDS.has(w1) && !STOP_WORDS.has(w2)
    ) {
      return `${w1} ${w2}`;
    }
  }
  const single = words.find(
    (w) =>
      w.length > 3 &&
      /^[A-Z]/.test(w) &&
      !STOP_WORDS.has(w.replace(/[^a-zA-Z]/g, "")) &&
      /^[a-zA-Z]+$/.test(w)
  );
  return single || "";
}

function detectPattern(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("things not to do") || t.includes("never do")) return "Things Not To Do";
  if (t.includes("dark side")) return "Dark Side";
  if (t.includes("mistake")) return "Mistakes";
  if (t.includes("best places") || t.includes("best things")) return "Best Places";
  if (t.includes("worth it")) return "Worth It?";
  if (t.includes("hidden gem") || t.includes("secret")) return "Secrets";
  if (t.includes("exposed") || t.includes("honest review") || t.includes("scam")) return "Exposed";
  if (t.includes("first impression")) return "First Impression";
  if (/ vs /i.test(title)) return "Comparison";
  if (t.includes("transformation")) return "Transformation";
  if (t.includes("tips")) return "Tips";
  return "Other";
}

export function shouldIncludeVideo(
  video: YouTubeVideoDetail,
  channel: YouTubeChannelDetail,
  hoursAlive: number
): boolean {
  if (parseISO8601Duration(video.duration) < 60) return false;
  if (hoursAlive / (24 * 30) > 18) return false;
  if (channel.subscriberCount < 5000) return false;
  if (video.viewCount < 50000) return false;
  return true;
}

export async function runViralPipeline(
  niche: string,
  _userId: string,
  apiKey: string
): Promise<{ videos: EnrichedVideo[]; fromCache: boolean; quotaUsed: number; cacheError?: string }> {
  const supabase = await createServiceClient();
  const cacheKey = niche.toLowerCase().replace(/\s+/g, "_");

  const { data: cached } = await supabase
    .from("search_cache")
    .select("*")
    .eq("niche_key", cacheKey)
    .single();

  if (cached) {
    const ageHours =
      (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60);
    if (ageHours < 12) {
      return {
        videos: cached.raw_results as EnrichedVideo[],
        fromCache: true,
        quotaUsed: 0,
      };
    }
  }

  let quotaUsed = 0;
  const queries = SEARCH_PATTERNS.map((fn) => fn(niche));
  const allVideoIds = new Set<string>();

  // Step 2: Run 18 searches in batches of 3
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((q) => searchVideos(q, apiKey, 50))
    );
    quotaUsed += batch.length * 100;
    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const v of r.value) {
          if (v.videoId) allVideoIds.add(v.videoId);
        }
      }
    }
  }

  // Step 3: Enrich video details in batches of 50
  const videoIdArray = Array.from(allVideoIds);
  const videoDetailsMap = new Map<string, YouTubeVideoDetail>();

  for (let i = 0; i < videoIdArray.length; i += 50) {
    try {
      const details = await getVideoDetails(videoIdArray.slice(i, i + 50), apiKey);
      quotaUsed += 1;
      for (const v of details) videoDetailsMap.set(v.videoId, v);
    } catch (e) {
      console.error("getVideoDetails batch error:", e);
    }
  }

  // Collect unique channel IDs and fetch details in batches of 50
  const channelIds = Array.from(new Set(Array.from(videoDetailsMap.values()).map((v) => v.channelId)));
  const channelDetailsMap = new Map<string, YouTubeChannelDetail>();

  for (let i = 0; i < channelIds.length; i += 50) {
    try {
      const channels = await getChannelDetails(channelIds.slice(i, i + 50), apiKey);
      quotaUsed += 1;
      for (const c of channels) channelDetailsMap.set(c.channelId, c);
    } catch (e) {
      console.error("getChannelDetails batch error:", e);
    }
  }

  // Step 4: Filter + Score
  const enriched: EnrichedVideo[] = [];
  for (const video of videoDetailsMap.values()) {
    const channel = channelDetailsMap.get(video.channelId);
    if (!channel) continue;
    const hoursAlive =
      (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);
    if (!shouldIncludeVideo(video, channel, hoursAlive)) continue;

    const vph = calculateVPH(video.viewCount, video.publishedAt);
    const outlierRatio = calculateOutlierRatio(
      video.viewCount,
      channel.totalViews,
      channel.videoCount
    );
    const viralScore = calculateViralScore(vph, outlierRatio);
    const channelAvgViews = channel.totalViews / Math.max(channel.videoCount, 1);

    enriched.push({
      videoId: video.videoId,
      title: video.title,
      channelName: channel.title,
      channelId: channel.channelId,
      channelSubscriberCount: channel.subscriberCount,
      channelAvgViews,
      publishedAt: video.publishedAt,
      durationSeconds: parseISO8601Duration(video.duration),
      thumbnailUrl: video.thumbnailUrl,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      tags: video.tags,
      vph,
      outlierRatio,
      viralScore,
      hoursAlive,
      detectedSubNiche: extractSubNiche(video.title),
      videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      pattern: detectPattern(video.title),
    });
  }

  // Step 5: Sort by viralScore descending
  enriched.sort((a, b) => b.viralScore - a.viralScore);

  // Step 6: Save to cache
  const { error: cacheError } = await supabase
    .from("search_cache")
    .upsert(
      {
        niche_key: cacheKey,
        raw_results: enriched,
        total_videos: enriched.length,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "niche_key" }
    );

  if (cacheError) {
    console.error("[search_cache] upsert failed:", cacheError.message, cacheError.details, cacheError.hint);
    return { videos: enriched, fromCache: false, quotaUsed, cacheError: `Cache write failed: ${cacheError.message}` };
  }

  console.log(`[search_cache] saved "${cacheKey}" (${enriched.length} videos)`);
  return { videos: enriched, fromCache: false, quotaUsed };
}
