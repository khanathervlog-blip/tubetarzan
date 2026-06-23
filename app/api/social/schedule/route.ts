import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET — list user's scheduled posts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();

  // Gracefully handle table not existing yet
  try {
    const { data, error } = await svc
      .from("social_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_for", { ascending: true });

    if (error) {
      // Table likely doesn't exist yet — return empty
      return NextResponse.json({ posts: [], tableExists: false });
    }

    return NextResponse.json({ posts: data || [], tableExists: true });
  } catch {
    return NextResponse.json({ posts: [], tableExists: false });
  }
}

// POST — create a scheduled post
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("subscription_plan, email")
    .eq("id", user.id)
    .single();

  const isAdmin = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .includes(profile?.email || "");
  const plan = (profile?.subscription_plan as string) || "free";

  if (plan === "free" && !isAdmin) {
    return NextResponse.json(
      { error: "Social scheduling requires Creator plan or above", upgradeRequired: true },
      { status: 403 }
    );
  }

  const { platform, postTitle, postDescription, postTags, scheduledFor, youtubeVideoId } =
    await request.json();

  if (!platform || !scheduledFor) {
    return NextResponse.json({ error: "Platform and scheduled time are required" }, { status: 400 });
  }

  if (!postTitle?.trim()) {
    return NextResponse.json({ error: "Post title is required" }, { status: 400 });
  }

  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  try {
    const { data, error } = await svc.from("social_posts").insert({
      user_id: user.id,
      platform,
      post_title: postTitle.trim(),
      post_description: postDescription?.trim() || null,
      post_tags: postTags || [],
      scheduled_for: scheduledFor,
      status: "scheduled",
      platform_post_id: youtubeVideoId || null,
    }).select().single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "social_posts table not created yet. Run the Phase 5 SQL migration first.", tableExists: false },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ post: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create scheduled post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — cancel a scheduled post
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("id");
  if (!postId) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

  const svc = await createServiceClient();

  try {
    const { error } = await svc
      .from("social_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id)
      .eq("status", "scheduled");

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
