import type { ViralScoreBreakdown } from "@/types/youtube";

export interface VideoSignals {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  channelTotalViews: number;
  channelVideoCount: number;
  hoursAlive: number;
  title: string;
  // Optional enhanced signals
  subscriberCount?: number;
  recentVideosAvgVPH?: number;
  sameTopicViralCount?: number;
}

// These power words MUST match the AI prompt in optimise/route.ts exactly
const POWER_WORDS = [
  "best","worst","never","always","secret","truth","dark side",
  "mistakes","actually","stop","most","only","every","nobody",
  "hidden","real","honest","exposed","shocking","insane",
  "unbelievable","breathtaking","dangerous","incredible",
  "banned","guaranteed","brutal","viral","epic","ultimate",
];

const VIRAL_PATTERNS = [
  "things not to do",
  "dark side of",
  "mistakes",
  "what can",
  " vs ",
  "first impression",
  "hidden gems",
  "is it worth",
  "things you will only see",
  "how much does",
  "what nobody tells you",
  "i tried",
  "honest review",
  "exposed",
  "truth about",
  "worst",
  "shocking",
  "they lied",
];

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

export function calculateCompleteViralScore(signals: VideoSignals): ViralScoreBreakdown {
  const {
    viewCount, likeCount, commentCount,
    channelTotalViews, channelVideoCount,
    hoursAlive, title,
    subscriberCount = 0,
    recentVideosAvgVPH,
    sameTopicViralCount = 0,
  } = signals;

  const daysOld = hoursAlive / 24;

  // ── FRESHNESS DECAY FACTOR ──────────────────────────────────────
  // Applied to time-sensitive signals (VPH, engagement velocity)
  let freshnessFactor: number;
  if (daysOld <= 7)        freshnessFactor = 1.00;
  else if (daysOld <= 30)  freshnessFactor = 0.85;
  else if (daysOld <= 90)  freshnessFactor = 0.70;
  else if (daysOld <= 180) freshnessFactor = 0.55;
  else if (daysOld <= 365) freshnessFactor = 0.40;
  else                     freshnessFactor = 0.25;

  // ── SIGNAL 1: VPH (25 points max) ──────────────────────────────
  const vph = Math.round(viewCount / Math.max(hoursAlive, 1));
  const freshVph = vph * freshnessFactor;
  let vphScore: number;
  if (freshVph >= 5000)      vphScore = 25;
  else if (freshVph >= 2000) vphScore = 22;
  else if (freshVph >= 1000) vphScore = 19;
  else if (freshVph >= 500)  vphScore = 16;
  else if (freshVph >= 200)  vphScore = 12;
  else if (freshVph >= 100)  vphScore = 8;
  else if (freshVph >= 50)   vphScore = 4;
  else                       vphScore = 1;

  // ── SIGNAL 2: OUTLIER RATIO (20 points max) ────────────────────
  // Not decayed — old outlier proof is still valid format evidence
  const channelAvgViews = channelTotalViews / Math.max(channelVideoCount, 1);
  const outlierRatio = viewCount / Math.max(channelAvgViews, 1);
  let outlierScore: number;
  if (outlierRatio >= 30)      outlierScore = 20;
  else if (outlierRatio >= 20) outlierScore = 18;
  else if (outlierRatio >= 15) outlierScore = 16;
  else if (outlierRatio >= 10) outlierScore = 14;
  else if (outlierRatio >= 7)  outlierScore = 11;
  else if (outlierRatio >= 5)  outlierScore = 8;
  else if (outlierRatio >= 3)  outlierScore = 5;
  else if (outlierRatio >= 1.5) outlierScore = 2;
  else                         outlierScore = 0;

  // ── SIGNAL 3: RECENCY BONUS (15 points max) ────────────────────
  let recencyScore: number;
  if (daysOld <= 3)       recencyScore = 15;
  else if (daysOld <= 7)  recencyScore = 13;
  else if (daysOld <= 14) recencyScore = 10;
  else if (daysOld <= 30) recencyScore = 7;
  else if (daysOld <= 90) recencyScore = 4;
  else if (daysOld <= 180) recencyScore = 2;
  else                    recencyScore = 0;

  // ── SIGNAL 4: ENGAGEMENT VELOCITY (15 points max) ──────────────
  const engagementVelocity = (likeCount + commentCount) / Math.max(hoursAlive, 1);
  const freshEngVel = engagementVelocity * freshnessFactor;
  let engagementScore: number;
  if (freshEngVel >= 100)    engagementScore = 15;
  else if (freshEngVel >= 50) engagementScore = 13;
  else if (freshEngVel >= 20) engagementScore = 10;
  else if (freshEngVel >= 10) engagementScore = 7;
  else if (freshEngVel >= 5)  engagementScore = 4;
  else if (freshEngVel >= 1)  engagementScore = 2;
  else                        engagementScore = 0;

  // ── SIGNAL 5: VIEWER SATISFACTION (10 points max) ──────────────
  const views = Math.max(viewCount, 1);
  const likeToViewRatio = likeCount / views;
  const commentToViewRatio = commentCount / views;
  const satisfactionSignal = (likeToViewRatio * 0.7) + (commentToViewRatio * 0.3);
  let satisfactionScore: number;
  if (satisfactionSignal >= 0.08)      satisfactionScore = 10;
  else if (satisfactionSignal >= 0.05) satisfactionScore = 8;
  else if (satisfactionSignal >= 0.03) satisfactionScore = 6;
  else if (satisfactionSignal >= 0.01) satisfactionScore = 4;
  else if (satisfactionSignal >= 0.005) satisfactionScore = 2;
  else                                 satisfactionScore = 0;

  // ── SIGNAL 6: CHANNEL MOMENTUM (5 points max) ──────────────────
  let momentumScore = 0;
  if (recentVideosAvgVPH && channelAvgViews > 0) {
    const channelAllTimeVPH = channelAvgViews / (24 * 30);
    const momentumRatio = recentVideosAvgVPH / Math.max(channelAllTimeVPH, 1);
    if (momentumRatio >= 2.0)       momentumScore = 5;
    else if (momentumRatio >= 1.5)  momentumScore = 4;
    else if (momentumRatio >= 1.2)  momentumScore = 3;
    else if (momentumRatio >= 1.0)  momentumScore = 2;
    else                            momentumScore = 0;
  }

  // ── SIGNAL 7: TOPIC TRENDING (5 points max) ────────────────────
  let topicScore: number;
  if (sameTopicViralCount >= 5)      topicScore = 5;
  else if (sameTopicViralCount >= 3) topicScore = 4;
  else if (sameTopicViralCount >= 2) topicScore = 3;
  else if (sameTopicViralCount >= 1) topicScore = 1;
  else                               topicScore = 0;

  // ── SIGNAL 8: TITLE PATTERN MATCH (5 points max) ───────────────
  const titleLower = title.toLowerCase();
  const hasViralPattern = VIRAL_PATTERNS.some(p => titleLower.includes(p));
  const titlePatternScore = hasViralPattern ? 5 : 0;

  // ── SUBSCRIBER BREAKOUT (context, not scored) ──────────────────
  const subscriberToViewRatio = subscriberCount > 0
    ? viewCount / subscriberCount
    : 0;

  // ── TOTAL (0–100) ───────────────────────────────────────────────
  const total = Math.min(100, Math.max(0,
    vphScore + outlierScore + recencyScore + engagementScore +
    satisfactionScore + momentumScore + topicScore + titlePatternScore
  ));

  // ── TIER ────────────────────────────────────────────────────────
  let viralTier: ViralScoreBreakdown["viralTier"];
  if (total >= 85)      viralTier = "legendary";
  else if (total >= 70) viralTier = "viral";
  else if (total >= 55) viralTier = "strong";
  else if (total >= 40) viralTier = "moderate";
  else                  viralTier = "weak";

  // ── PRIMARY SIGNAL ──────────────────────────────────────────────
  const scores: [string, number][] = [
    ["VPH momentum", vphScore],
    ["Outlier ratio", outlierScore],
    ["Upload recency", recencyScore],
    ["Engagement velocity", engagementScore],
    ["Viewer satisfaction", satisfactionScore],
  ];
  const primarySignal = scores.sort((a, b) => b[1] - a[1])[0][0];

  // ── RECOMMENDATION ──────────────────────────────────────────────
  let recommendation: string;
  if (viralTier === "legendary") {
    recommendation = "Create your version immediately. This is a proven viral formula actively gaining momentum.";
  } else if (viralTier === "viral") {
    recommendation = "Strong signal. Create your version within 48 hours to catch the trending window.";
  } else if (viralTier === "strong") {
    recommendation = "Good topic. Create when ready — momentum is steady but not urgent.";
  } else if (viralTier === "moderate") {
    recommendation = "Decent signal. Research the topic more before committing production time.";
  } else {
    recommendation = "Weak signal. This topic has not proven its viral potential yet.";
  }

  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    // Raw values
    vph,
    outlierRatio: r1(outlierRatio),
    daysOld: r1(daysOld),
    engagementVelocity: r1(engagementVelocity),
    likeToViewRatio: r1(likeToViewRatio * 100),
    commentToViewRatio: r1(commentToViewRatio * 100),
    subscriberToViewRatio: r1(subscriberToViewRatio),
    sameTopicViralCount,
    // Weighted scores
    vphScore,
    outlierScore,
    recencyScore,
    engagementScore,
    satisfactionScore,
    momentumScore,
    topicScore,
    titlePatternScore,
    // Composite
    total,
    viralTier,
    primarySignal,
    recommendation,
  };
}

export function getViralTier(score: number): ViralScoreBreakdown["viralTier"] {
  if (score >= 85) return "legendary";
  if (score >= 70) return "viral";
  if (score >= 55) return "strong";
  if (score >= 40) return "moderate";
  return "weak";
}

// Legacy 2-signal wrapper — returns 0-100 for backwards compat
export function calculateViralScore(vph: number, outlierRatio: number): number {
  const vphScore = vph >= 5000 ? 25 : vph >= 2000 ? 22 : vph >= 1000 ? 19
    : vph >= 500 ? 16 : vph >= 200 ? 12 : vph >= 100 ? 8 : vph >= 50 ? 4 : 1;
  const outlierScore = outlierRatio >= 30 ? 20 : outlierRatio >= 20 ? 18
    : outlierRatio >= 15 ? 16 : outlierRatio >= 10 ? 14 : outlierRatio >= 7 ? 11
    : outlierRatio >= 5 ? 8 : outlierRatio >= 3 ? 5 : outlierRatio >= 1.5 ? 2 : 0;
  return vphScore + outlierScore;
}

export function scoreTitle(title: string): number {
  let score = 50;

  // Strip emojis for length check
  const bare = title.replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").trim();

  if (bare.length >= 40 && bare.length <= 65) score += 15;
  else if (bare.length < 25 || bare.length > 80) score -= 15;
  else if (bare.length < 40 || bare.length > 65) score -= 5;

  if (POWER_WORDS.some((w) => title.toLowerCase().includes(w))) score += 15;

  const saturated = [
    "how to ","what is ","learn ","guide to ",
    "tips for ","top tips","introduction to",
  ];
  if (saturated.some((s) => title.toLowerCase().startsWith(s))) score -= 10;

  if (/\d+/.test(title)) score += 8;
  if (title.includes("?")) score += 5;

  const capsWords = title
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.replace(/[^A-Z]/g, "") === w.replace(/[^a-zA-Z]/g, "").toUpperCase() && /[A-Z]/.test(w) && !/^\d+$/.test(w));
  if (capsWords.length >= 1 && capsWords.length <= 2) score += 7;
  if (capsWords.length > 3) score -= 8;

  return Math.min(100, Math.max(0, score));
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

// Per-tag score: rates a single tag's SEO value
export function scoreTagItem(tag: string): number {
  const t = tag.trim();
  if (!t || t.length < 2) return 0;

  let score = 25;
  const words = t.split(/\s+/).filter(Boolean);

  if (words.length >= 4) score += 40;
  else if (words.length === 3) score += 33;
  else if (words.length === 2) score += 22;
  else score += 8;

  if (t.length >= 18) score += 20;
  else if (t.length >= 10) score += 15;
  else if (t.length >= 5) score += 10;
  else score += 3;

  if (/\d/.test(t)) score += 10;

  if (words.length === 1 && t.length < 5) score -= 15;

  return Math.min(100, Math.max(0, score));
}
