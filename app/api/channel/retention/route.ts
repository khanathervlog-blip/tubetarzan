import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("subscription_plan, email, locked_channel_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { subscription_plan: string; email: string; locked_channel_id: string | null } | null;

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(profile?.email || "");
  const plan = profile?.subscription_plan || "free";
  if (plan === "free" && !isAdmin) {
    return NextResponse.json({ error: "Retention Analysis requires Creator plan or above", upgradeRequired: true }, { status: 403 });
  }

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId is required" }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(user.id);

    // Try real YouTube Analytics API first
    const analyticsRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${profile.locked_channel_id}&startDate=2020-01-01&endDate=${new Date().toISOString().split("T")[0]}&metrics=audienceWatchRatio,relativeRetentionPerformance&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}&sort=elapsedVideoTimeRatio`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (analyticsRes.ok) {
      const analyticsData = await analyticsRes.json();
      const rows: [number, number, number][] = analyticsData.rows || [];

      if (rows.length > 0) {
        return buildRealResponse(videoId, rows, accessToken);
      }
    }

    // Analytics API unavailable (403 scope issue or no data) → AI-estimated retention
    return buildAiEstimatedResponse(videoId, accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retention analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildRealResponse(videoId: string, rows: [number, number, number][], accessToken: string) {
  const retentionCurve = rows.map(([elapsed, watchRatio, relPerf]) => ({
    position: Math.round(elapsed * 100),
    retention: Math.round(watchRatio * 100),
    relativePerformance: Math.round(relPerf * 100),
  }));

  const dropOffs: { position: number; drop: number }[] = [];
  for (let i = 1; i < retentionCurve.length; i++) {
    const drop = retentionCurve[i - 1].retention - retentionCurve[i].retention;
    if (drop >= 5) dropOffs.push({ position: retentionCurve[i].position, drop });
  }
  dropOffs.sort((a, b) => b.drop - a.drop);
  const topDropOffs = dropOffs.slice(0, 3);

  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const videoData = await videoRes.json();
  const videoTitle = videoData.items?.[0]?.snippet?.title || "Unknown Video";

  let analysis = null;
  if (topDropOffs.length > 0) {
    const prompt = topDropOffs.map(d => `At ${d.position}% through the video: ${d.drop}% drop in viewers`).join("\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a YouTube analytics expert. Analyze retention drop-off points. Return JSON:
{"dropOffAnalysis":[{"position":"X%","likelyCause":"...","fix":"specific action"}],"overallInsight":"2-3 sentences","quickWins":["tip1","tip2","tip3"]}`,
        },
        {
          role: "user",
          content: `Video: "${videoTitle}"\nDrop-offs:\n${prompt}\nEnd retention: ${retentionCurve[retentionCurve.length - 1]?.retention || 0}%`,
        },
      ],
    });
    const raw = completion.choices[0].message.content || "{}";
    analysis = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  }

  const avgRetention = retentionCurve.length
    ? Math.round(retentionCurve.reduce((s, p) => s + p.retention, 0) / retentionCurve.length)
    : 0;

  return NextResponse.json({ videoId, videoTitle, retentionCurve, dropOffs: topDropOffs, avgRetention, analysis, estimated: false });
}

async function buildAiEstimatedResponse(videoId: string, accessToken: string) {
  // Fetch video metadata for AI estimation
  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const videoData = await videoRes.json();
  const item = videoData.items?.[0];

  if (!item) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const videoTitle = item.snippet?.title || "Unknown Video";
  const viewCount = parseInt(item.statistics?.viewCount || "0");
  const likeCount = parseInt(item.statistics?.likeCount || "0");
  const commentCount = parseInt(item.statistics?.commentCount || "0");
  const rawDuration = item.contentDetails?.duration || "PT5M";
  const durationSeconds = parseDuration(rawDuration);
  const likeRatio = viewCount > 0 ? ((likeCount / viewCount) * 100).toFixed(2) : "0";
  const commentRatio = viewCount > 0 ? ((commentCount / viewCount) * 100).toFixed(2) : "0";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a YouTube retention expert. Given video metadata, generate a REALISTIC AI-estimated retention curve and analysis.

Typical YouTube retention patterns:
- Views drop 20-30% in first 10% of video (intro hook test)
- Mid-video dips at natural segment transitions
- End of video typically 20-40% of starting retention
- High like ratio (>5%) = engaged audience = better retention
- Low like ratio (<2%) = less engaged = steeper drop

Return JSON exactly:
{
  "retentionCurve": [
    {"position": 0, "retention": 100},
    {"position": 5, "retention": <number>},
    {"position": 10, "retention": <number>},
    {"position": 15, "retention": <number>},
    {"position": 20, "retention": <number>},
    {"position": 25, "retention": <number>},
    {"position": 30, "retention": <number>},
    {"position": 35, "retention": <number>},
    {"position": 40, "retention": <number>},
    {"position": 45, "retention": <number>},
    {"position": 50, "retention": <number>},
    {"position": 55, "retention": <number>},
    {"position": 60, "retention": <number>},
    {"position": 65, "retention": <number>},
    {"position": 70, "retention": <number>},
    {"position": 75, "retention": <number>},
    {"position": 80, "retention": <number>},
    {"position": 85, "retention": <number>},
    {"position": 90, "retention": <number>},
    {"position": 95, "retention": <number>},
    {"position": 100, "retention": <number>}
  ],
  "dropOffAnalysis": [
    {"position": "X%", "likelyCause": "...", "fix": "specific actionable fix"},
    {"position": "Y%", "likelyCause": "...", "fix": "specific actionable fix"},
    {"position": "Z%", "likelyCause": "...", "fix": "specific actionable fix"}
  ],
  "overallInsight": "2-3 sentence insight about this video's estimated retention health",
  "quickWins": ["specific win 1", "specific win 2", "specific win 3"]
}

Make the retention curve realistic — it should reflect the actual engagement level suggested by the metrics.`,
      },
      {
        role: "user",
        content: `Video: "${videoTitle}"
Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s
Views: ${viewCount.toLocaleString()}
Likes: ${likeCount.toLocaleString()} (${likeRatio}% like ratio)
Comments: ${commentCount.toLocaleString()} (${commentRatio}% comment ratio)

Generate a realistic estimated retention curve and actionable analysis for this video.`,
      },
    ],
  });

  const raw = completion.choices[0].message.content || "{}";
  const result = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

  const retentionCurve = result.retentionCurve || [];
  const avgRetention = retentionCurve.length
    ? Math.round(retentionCurve.reduce((s: number, p: { retention: number }) => s + p.retention, 0) / retentionCurve.length)
    : 0;

  // Find biggest drops for display
  const dropOffs: { position: number; drop: number }[] = [];
  for (let i = 1; i < retentionCurve.length; i++) {
    const drop = retentionCurve[i - 1].retention - retentionCurve[i].retention;
    if (drop >= 5) dropOffs.push({ position: retentionCurve[i].position, drop });
  }
  dropOffs.sort((a: { drop: number }, b: { drop: number }) => b.drop - a.drop);

  return NextResponse.json({
    videoId,
    videoTitle,
    retentionCurve,
    dropOffs: dropOffs.slice(0, 3),
    avgRetention,
    analysis: {
      dropOffAnalysis: result.dropOffAnalysis || [],
      overallInsight: result.overallInsight || "",
      quickWins: result.quickWins || [],
    },
    estimated: true,
  });
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}
