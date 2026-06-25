export function calculateVPH(viewCount: number, publishedAt: string): number {
  const hoursAlive =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  return Math.round(viewCount / Math.max(hoursAlive, 1));
}

export function calculateOutlierRatio(
  videoViews: number,
  channelTotalViews: number,
  channelVideoCount: number
): number {
  const channelAvgViews = channelTotalViews / Math.max(channelVideoCount, 1);
  return Number((videoViews / Math.max(channelAvgViews, 1)).toFixed(1));
}

export function calculateViralScore(vph: number, outlierRatio: number): number {
  const normalizedVPH = Math.min(vph, 10000) / 10000;
  const normalizedOutlier = Math.min(outlierRatio, 50) / 50;
  return normalizedVPH * 0.5 + normalizedOutlier * 0.5;
}

export function scoreDescription(description: string): number {
  if (!description) return 0;
  let score = 20;
  if (description.length >= 800) score += 35;
  else if (description.length >= 400) score += 22;
  else if (description.length >= 200) score += 12;
  if (/https?:\/\//.test(description)) score += 10;
  if (/subscribe|follow|like|comment/i.test(description)) score += 15;
  if (/#\w+/.test(description)) score += 8;
  if (description.split("\n").length > 3) score += 7;
  if (/\b(today|now|watch|check|click)\b/i.test(description)) score += 5;
  return Math.min(100, score);
}

export function scoreTags(tags: string[]): number {
  if (!tags || tags.length === 0) return 0;
  let score = 20;
  if (tags.length >= 10 && tags.length <= 15) score += 45;
  else if (tags.length >= 6) score += 30;
  else if (tags.length >= 3) score += 15;
  const multiWord = tags.filter(t => t.includes(" "));
  if (multiWord.length >= 5) score += 25;
  else if (multiWord.length >= 3) score += 12;
  const avgLen = tags.reduce((s, t) => s + t.length, 0) / tags.length;
  if (avgLen >= 8) score += 10;
  return Math.min(100, score);
}

export function scoreTitle(title: string): number {
  let score = 50;

  if (title.length >= 40 && title.length <= 65) score += 15;
  else if (title.length < 25 || title.length > 80) score -= 15;
  else if (title.length < 40 || title.length > 65) score -= 5;

  const powerWords = [
    "best","worst","things","never","always","secret","truth",
    "dark side","mistakes","actually","stop","most","only","every",
    "nobody","hidden","real","honest","exposed",
  ];
  if (powerWords.some((w) => title.toLowerCase().includes(w))) score += 15;

  const saturated = [
    "how to ","what is ","learn ","guide to ",
    "tips for ","top tips","introduction to",
  ];
  if (saturated.some((s) => title.toLowerCase().startsWith(s))) score -= 10;

  if (/\d+/.test(title)) score += 8;
  if (title.includes("?")) score += 5;

  const capsWords = title
    .split(" ")
    .filter((w) => w.length > 2 && w === w.toUpperCase() && !/^\d+$/.test(w));
  if (capsWords.length >= 1 && capsWords.length <= 2) score += 7;
  if (capsWords.length > 3) score -= 8;

  return Math.min(100, Math.max(0, score));
}
