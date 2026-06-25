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

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  try {
    const accessToken = await getValidAccessToken(user.id);

    // When no specific video is given, try channel-wide first, then fall back to cached videos
    if (!videoId) {
      const allComments: string[] = [];

      // Try channel-wide comments endpoint first (most efficient)
      const chanRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${profile.locked_channel_id}&maxResults=100&order=relevance`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (chanRes.ok) {
        const chanData = await chanRes.json();
        const chanComments = (chanData.items || []).map(
          (item: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }) =>
            item.snippet.topLevelComment.snippet.textOriginal
        );
        allComments.push(...chanComments);
      }

      // If channel-wide failed or returned few results, supplement from cached videos
      if (allComments.length < 20) {
        const { data: cachedVideos } = await svc
          .from("channel_video_cache")
          .select("video_id, title")
          .eq("user_id", user.id)
          .eq("channel_id", profile.locked_channel_id)
          .order("view_count", { ascending: false })
          .limit(10);

        for (const vid of cachedVideos || []) {
          if (allComments.length >= 80) break;
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${vid.video_id}&maxResults=25&order=relevance`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const comments = (data.items || []).map(
            (item: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }) =>
              item.snippet.topLevelComment.snippet.textOriginal
          );
          allComments.push(...comments);
        }
      }

      if (!allComments.length) {
        return NextResponse.json({
          error: "No comments found. Comments may be disabled on your videos, or your videos haven't received comments yet. Try entering a specific Video ID that you know has comments.",
          noComments: true,
        }, { status: 404 });
      }

      const commentSample = allComments.slice(0, 60).join("\n---\n");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a YouTube channel strategist. Analyze viewer comments and extract actionable intelligence. Return JSON with:
{
  "topQuestions": [{"question": "...", "frequency": "high/medium/low", "videoIdea": "..."}],
  "painPoints": [{"issue": "...", "suggestion": "..."}],
  "videoIdeas": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "sentiment": {"positive": 0-100, "neutral": 0-100, "negative": 0-100},
  "topRequests": ["request 1", "request 2", "request 3"],
  "summary": "2-3 sentence overall analysis"
}`,
          },
          {
            role: "user",
            content: `Analyze these ${allComments.length} YouTube comments from recent channel videos:\n\n${commentSample}`,
          },
        ],
      });

      const raw = completion.choices[0].message.content || "{}";
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(clean);
      return NextResponse.json({ comments: allComments.slice(0, 10), analysis, totalAnalyzed: allComments.length });
    }

    // Specific video comments
    const commentsEndpoint = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance`;
    const res = await fetch(commentsEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.error?.code === 403) {
        return NextResponse.json({ error: "Comments are disabled for this video" }, { status: 403 });
      }
      throw new Error(err.error?.message || `YouTube API error: ${res.status}`);
    }

    const data = await res.json();
    const comments: string[] = (data.items || []).map(
      (item: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }) =>
        item.snippet.topLevelComment.snippet.textOriginal
    );

    if (!comments.length) {
      return NextResponse.json({ comments: [], analysis: null, totalAnalyzed: 0 });
    }

    const commentSample = comments.slice(0, 60).join("\n---\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a YouTube channel strategist. Analyze viewer comments and extract actionable intelligence. Return JSON with:
{
  "topQuestions": [{"question": "...", "frequency": "high/medium/low", "videoIdea": "..."}],
  "painPoints": [{"issue": "...", "suggestion": "..."}],
  "videoIdeas": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "sentiment": {"positive": 0-100, "neutral": 0-100, "negative": 0-100},
  "topRequests": ["request 1", "request 2", "request 3"],
  "summary": "2-3 sentence overall analysis"
}`,
        },
        {
          role: "user",
          content: `Analyze these ${comments.length} YouTube comments:\n\n${commentSample}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(clean);

    return NextResponse.json({ comments: comments.slice(0, 10), analysis, totalAnalyzed: comments.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
