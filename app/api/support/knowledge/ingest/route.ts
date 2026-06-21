import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/openai-support";

function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  // Admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, content, category, id } = await req.json();
  if (!title || !content || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();
  const chunks = splitIntoChunks(content, 500, 50);

  // If updating existing article, delete old chunks first
  if (id) {
    await serviceClient
      .from("support_knowledge")
      .delete()
      .eq("source_doc", title)
      .eq("category", category);
  }

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    const { data } = await serviceClient
      .from("support_knowledge")
      .insert({
        title: chunks.length > 1 ? `${title} (Part ${i + 1})` : title,
        content: chunks[i],
        category,
        chunk_index: i,
        source_doc: title,
        embedding,
      })
      .select("id");
    results.push(data);
  }

  return NextResponse.json({ success: true, chunksCreated: chunks.length });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const serviceClient = await createServiceClient();
  await serviceClient.from("support_knowledge").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
