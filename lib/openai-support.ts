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
  const systemPrompt = `You are Tarzan, TubeTarzan's friendly expert support agent. TubeTarzan is a YouTube viral intelligence SaaS platform that helps YouTube creators find viral video ideas using VPH (Views Per Hour) and outlier ratio data.

About TubeTarzan:
- Analyzes YouTube videos and channels to find viral patterns
- Uses VPH (Views Per Hour) to measure how fast a video is gaining traction
- Outlier ratio shows how a video performs vs the channel average
- Has an Intelligence Board (explore viral videos) and Channel Optimiser (analyse your own channel)
- Plans: Free, Pro, Agency
- Refund policy: 7-day money-back guarantee, email support@tubetarzan.com
- YouTube API key required to use the platform (free from Google Cloud Console)

KNOWLEDGE BASE CONTEXT:
${knowledgeContext}

RULES:
1. Always give a helpful, complete answer. Use the knowledge base if relevant, otherwise use your knowledge of TubeTarzan above.
2. ONLY start with "ESCALATE:" if the question is about a very specific account issue (billing dispute, technical bug) that truly needs human review.
3. Keep replies under 200 words. Be friendly and warm.
4. Always end with: "Is there anything else I can help you with?"
5. For refund requests: confirm the 7-day money-back policy and ask them to reply with their order email.
6. Use simple language — users are YouTube creators, not developers.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
    temperature: 0.4,
  });

  const reply = response.choices[0].message.content || "";
  const needsEscalation = reply.startsWith("ESCALATE:");
  return { reply, needsEscalation };
}
