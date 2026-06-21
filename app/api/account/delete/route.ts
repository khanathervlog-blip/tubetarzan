import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = await createServiceClient();

  // Delete user data
  await serviceClient.from("viral_ideas").delete().eq("user_id", user.id);
  await serviceClient.from("competitors").delete().eq("user_id", user.id);
  await serviceClient.from("channel_video_cache").delete().eq("user_id", user.id);
  await serviceClient.from("profiles").delete().eq("id", user.id);

  // Delete auth user
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Failed to delete account. Please contact support." }, { status: 500 });

  // Sign out
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
