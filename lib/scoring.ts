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
