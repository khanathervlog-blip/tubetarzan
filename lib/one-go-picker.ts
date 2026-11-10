import { calculateCompleteViralScore } from "./scoring";
import type { EnrichedVideo, ViralScoreBreakdown } from "@/types/youtube";

export interface OneGoPickResult {
  video: EnrichedVideo;
  scoreBreakdown: ViralScoreBreakdown;
  selectionReason: string;
  confidence: "very_high" | "high" | "medium" | "low";
}

export function pickBestVideoForOneGo(
  searchResults: EnrichedVideo[]
): OneGoPickResult {
  if (searchResults.length === 0) {
    throw new Error("No videos to pick from");
  }

  // ── STEP 1: Topic clustering ────────────────────────────────────
  const topicGroups = groupVideosByTopic(searchResults);

  // ── STEP 2: Score all videos with topic context ─────────────────
  const scoredVideos = searchResults.map((video) => {
    const sameTopicViralCount = getTopicViralCount(video, topicGroups);
    const channelAvgViews = video.channelAvgViews || 1;

    const breakdown = calculateCompleteViralScore({
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount || 0,
      channelTotalViews: channelAvgViews * 100,
      channelVideoCount: 100,
      hoursAlive: video.hoursAlive,
      title: video.title,
      subscriberCount: video.channelSubscriberCount,
      sameTopicViralCount,
    });

    return { video, scoreBreakdown: breakdown };
  });

  // ── STEP 3: Sort by total score ─────────────────────────────────
  scoredVideos.sort(
    (a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total
  );

  const best = scoredVideos[0];
  const topScore = best.scoreBreakdown.total;
  const secondScore = scoredVideos[1]?.scoreBreakdown.total || 0;
  const gap = topScore - secondScore;

  // ── STEP 4: Confidence level ────────────────────────────────────
  let confidence: OneGoPickResult["confidence"];
  if (topScore >= 80 && gap >= 15)       confidence = "very_high";
  else if (topScore >= 65 && gap >= 10)  confidence = "high";
  else if (topScore >= 50)               confidence = "medium";
  else                                   confidence = "low";

  // ── STEP 5: Build selection reason ─────────────────────────────
  const selectionReason = buildSelectionReason(best.scoreBreakdown);

  return {
    video: best.video,
    scoreBreakdown: best.scoreBreakdown,
    selectionReason,
    confidence,
  };
}

function buildSelectionReason(
  s: ViralScoreBreakdown
): string {
  const reasons: string[] = [];

  if (s.daysOld <= 7 && s.outlierRatio >= 10) {
    reasons.push(
      `Uploaded ${Math.round(s.daysOld)} days ago and already at ${s.outlierRatio.toFixed(1)}x outlier — fresh viral proof`
    );
  } else if (s.daysOld <= 7) {
    reasons.push(
      `Only ${Math.round(s.daysOld)} days old with ${s.vph} VPH — strong early momentum`
    );
  } else if (s.outlierRatio >= 15) {
    reasons.push(
      `${s.outlierRatio.toFixed(1)}x outlier ratio — this topic massively outperformed channel average`
    );
  }

  if (s.engagementVelocity > 20) {
    reasons.push(
      `High engagement velocity — viewers are actively liking and commenting at an above-average rate`
    );
  }

  if (s.sameTopicViralCount >= 3) {
    reasons.push(
      `${s.sameTopicViralCount} videos on this exact topic are trending simultaneously — topic is hot right now`
    );
  }

  if (s.titlePatternScore > 0) {
    reasons.push(`Title uses a proven viral pattern`);
  }

  if (s.subscriberToViewRatio >= 5) {
    reasons.push(
      `${s.subscriberToViewRatio.toFixed(1)}x subscriber breakout — YouTube is pushing this to new audiences`
    );
  }

  return reasons.length > 0
    ? reasons.join(". ") + "."
    : `Highest composite viral score (${s.total}/100).`;
}

function groupVideosByTopic(
  videos: EnrichedVideo[]
): Map<string, number> {
  const groups = new Map<string, number>();
  for (const v of videos) {
    if (v.outlierRatio >= 5 && v.detectedSubNiche) {
      groups.set(
        v.detectedSubNiche,
        (groups.get(v.detectedSubNiche) || 0) + 1
      );
    }
  }
  return groups;
}

function getTopicViralCount(
  video: EnrichedVideo,
  topicGroups: Map<string, number>
): number {
  if (!video.detectedSubNiche) return 0;
  return topicGroups.get(video.detectedSubNiche) || 0;
}

export function getConfidenceLabel(confidence: OneGoPickResult["confidence"]): string {
  switch (confidence) {
    case "very_high": return "VERY HIGH";
    case "high":      return "HIGH";
    case "medium":    return "MEDIUM";
    case "low":       return "LOW";
  }
}
