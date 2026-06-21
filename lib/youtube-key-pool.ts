let currentKeyIndex = 0;

function getApiKeys(): string[] {
  return [
    process.env.YOUTUBE_API_KEY,
    process.env.YOUTUBE_API_KEY_1,
    process.env.YOUTUBE_API_KEY_2,
    process.env.YOUTUBE_API_KEY_3,
    process.env.YOUTUBE_API_KEY_4,
    process.env.YOUTUBE_API_KEY_5,
  ].filter(Boolean) as string[];
}

export function getNextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No platform YouTube API keys configured");
  }
  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}
