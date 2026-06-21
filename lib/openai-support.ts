import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export async function generateSupportReply(
  userMessage: string,
  conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[],
  knowledgeContext: string
): Promise<{ reply: string; needsEscalation: boolean }> {
  const systemPrompt = `You are Tarzan, TubeTarzan's friendly expert support agent. TubeTarzan is a YouTube viral intelligence platform that helps creators find viral video ideas using VPH and outlier ratio data.

KNOWLEDGE BASE — answer ONLY from this:
${knowledgeContext}

RULES:
1. Answer ONLY from the knowledge base above. Do not invent features, prices, or policies.
2. If the answer is NOT in the knowledge base, start your response with exactly "ESCALATE:" followed by a polite message saying you will check with the team.
3. Keep replies under 200 words.
4. Be friendly, warm, and solution-focused.
5. Always end with: "Is there anything else I can help you with?"
6. For billing/refund questions always say: "For billing matters, please email support@tubetarzan.com and our team will resolve this within 24 hours."
7. Use simple language — users are YouTube creators, not developers.
8. If the user seems frustrated, acknowledge their frustration first, then provide the solution.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
    temperature: 0.3,
  });

  const reply = response.choices[0].message.content || "";
  const needsEscalation = reply.startsWith("ESCALATE:");
  return { reply, needsEscalation };
}
