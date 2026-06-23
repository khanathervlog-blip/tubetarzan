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

    const analyticsRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${profile.locked_channel_id}&startDate=2020-01-01&endDate=${new Date().toISOString().split("T")[0]}&metrics=audienceWatchRatio,relativeRetentionPerformance&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}&sort=elapsedVideoTimeRatio`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!analyticsRes.ok) {
      const err = await analyticsRes.json();
      if (err.error?.code === 403) {
        return NextResponse.json({
          error: "YouTube Analytics access required. Please reconnect your channel with Analytics permissions.",
          needsAnalyticsScope: true,
        }, { status: 403 });
      }
      throw new Error(err.error?.message || `Analytics API error: ${analyticsRes.status}`);
    }

    const analyticsData = await analyticsRes.json();
    const rows: [number, number, number][] = analyticsData.rows || [];

    if (!rows.length) {
      return NextResponse.json({ error: "No retention data available for this video yet. Videos need at least a few days of views." }, { status: 404 });
    }

    // Build retention curve: array of {position: 0-100, retention: 0-100}
    const retentionCurve = rows.map(([elapsed, watchRatio, relPerf]) => ({
      position: Math.round(elapsed * 100),
      retention: Math.round(watchRatio * 100),
      relativePerformance: Math.round(relPerf * 100),
    }));

    // Find biggest drop-offs (>5% drop between consecutive points)
    const dropOffs: { position: number; drop: number }[] = [];
    for (let i = 1; i < retentionCurve.length; i++) {
      const drop = retentionCurve[i - 1].retention - retentionCurve[i].retention;
      if (drop >= 5) {
        dropOffs.push({ position: retentionCurve[i].position, drop });
      }
    }
    dropOffs.sort((a, b) => b.drop - a.drop);
    const topDropOffs = dropOffs.slice(0, 3);

    // Get video title
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const videoData = await videoRes.json();
    const videoTitle = videoData.items?.[0]?.snippet?.title || "Unknown Video";
    const videoDuration = videoData.items?.[0]?.contentDetails?.duration || "PT0S";

    // AI analysis of drop-offs
    let analysis = null;
    if (topDropOffs.length > 0) {
      const prompt = topDropOffs.map(d => `At ${d.position}% through the video: ${d.drop}% drop in viewers`).join("\n");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a YouTube analytics expert. Analyze retention drop-off points and provide specific, actionable fixes. Return JSON:
{
  "dropOffAnalysis": [{"position": "X%", "likelyCause": "...", "fix": "specific action to prevent this drop"}],
  "overallInsight": "2-3 sentences on overall retention health",
  "quickWins": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}`,
          },
          {
            role: "user",
            content: `Video: "${videoTitle}"\nRetention drop-offs:\n${prompt}\n\nAverage retention at end: ${retentionCurve[retentionCurve.length - 1]?.retention || 0}%`,
          },
        ],
      });
      const raw = completion.choices[0].message.content || "{}";
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(clean);
    }

    const avgRetention = retentionCurve.length
      ? Math.round(retentionCurve.reduce((s, p) => s + p.retention, 0) / retentionCurve.length)
      : 0;

    return NextResponse.json({
      videoId,
      videoTitle,
      videoDuration,
      retentionCurve,
      dropOffs: topDropOffs,
      avgRetention,
      analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retention analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
