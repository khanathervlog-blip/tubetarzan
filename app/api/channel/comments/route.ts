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

  let commentsEndpoint: string;
  if (videoId) {
    commentsEndpoint = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance`;
  } else {
    commentsEndpoint = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${profile.locked_channel_id}&maxResults=100&order=relevance`;
  }

  try {
    const accessToken = await getValidAccessToken(user.id);
    const res = await fetch(commentsEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.error?.code === 403) {
        return NextResponse.json({ error: "Comments are disabled for this channel or video" }, { status: 403 });
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
