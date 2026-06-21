import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./openai-support";

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

export async function searchKnowledgeBase(
  query: string,
  topK = 5,
  threshold = 0.70
): Promise<KnowledgeChunk[]> {
  const supabase = await createServiceClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("search_knowledge_base", {
    query_embedding: queryEmbedding,
    match_count: topK,
    similarity_threshold: threshold,
  });

  if (error) {
    console.error("Knowledge base search error:", error);
    return [];
  }

  return (data as KnowledgeChunk[]) || [];
}

export function calculateConfidence(
  chunks: KnowledgeChunk[],
  needsEscalation: boolean
): number {
  if (needsEscalation) return 0;
  if (chunks.length === 0) return 20;

  const avg = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
  if (avg >= 0.90) return 97;
  if (avg >= 0.85) return 92;
  if (avg >= 0.80) return 85;
  if (avg >= 0.75) return 78;
  if (avg >= 0.70) return 70;
  return 55;
}

export function buildKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "No specific knowledge base articles found.";
  return chunks
    .map((c) => `[${c.category} — ${c.title}]\n${c.content}`)
    .join("\n\n---\n\n");
}
