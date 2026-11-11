/**
 * Landing page copy kept in one plain (server-safe) module so both the page and its JSON-LD structured data
 * (FAQPage for Google) use exactly the same text.
 */

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "What does TubeTarzan do?",
    answer:
      "It scans hundreds of YouTube videos in your niche, ranks them by views per hour (VPH) and outlier score, and turns the winners into ready-to-film ideas with a title, hook, script and thumbnail text.",
  },
  {
    question: "What is an outlier score?",
    answer:
      "A video's views divided by its channel's average views per video. 14x means the video did 14 times better than normal for that channel - a strong sign the topic itself is viral.",
  },
  {
    question: "How is VPH calculated?",
    answer: "Views per hour = total views ÷ hours since upload. It shows what is gaining momentum right now, not years ago.",
  },
  {
    question: "Do I need a YouTube API key?",
    answer:
      "On Free and Creator you add your own free Google API key (5 minutes, we show you how). On Pro and Agency we handle it for you.",
  },
  {
    question: "Is it a VidIQ or TubeBuddy alternative?",
    answer:
      "Yes. It uses the same official YouTube data and focuses on finding proven video ideas fast, at a fraction of the price.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes - free forever with no card. Paid plans include a 7-day free trial and can be cancelled anytime.",
  },
];

export type FeatureGroup = { id: string; label: string; blurb: string; items: { name: string; text: string }[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "intelligence",
    label: "Find ideas",
    blurb: "Know what to make next.",
    items: [
      { name: "Intelligence Board", text: "200+ videos scanned in 60 seconds" },
      { name: "Outlier & VPH scores", text: "Spot topics that beat the channel average" },
      { name: "Idea Tracker", text: "Save, sort and plan your next videos" },
      { name: "Niche RPM Guide", text: "See which niches pay the most" },
    ],
  },
  {
    id: "channel",
    label: "Grow your channel",
    blurb: "Fix and test what you already published.",
    items: [
      { name: "Channel Optimiser", text: "AI titles, tags & descriptions, one-click apply" },
      { name: "Competitors", text: "Track rivals and their best videos" },
      { name: "A/B Title Testing", text: "Rotate titles and keep the winner" },
      { name: "Bulk Updates", text: "Change tags or footers on every video" },
      { name: "Comments Intelligence", text: "Questions your viewers keep asking" },
      { name: "Retention Analysis", text: "Where viewers drop off" },
    ],
  },
  {
    id: "studio",
    label: "Create content",
    blurb: "From idea to upload in one place.",
    items: [
      { name: "Packaging Studio", text: "Title, hook and thumbnail text" },
      { name: "Script Writer", text: "Full scripts in your style" },
      { name: "Thumbnail Generator", text: "AI thumbnail concepts" },
      { name: "Voiceover & B-roll", text: "AI voice plus free stock footage" },
      { name: "Shorts Factory", text: "Vertical Shorts from one idea" },
      { name: "Auto Captions", text: "Word-by-word captions in 5 styles" },
      { name: "Transcripts", text: "Any video's transcript in seconds" },
      { name: "Publish & Schedule", text: "Plan uploads on a calendar" },
    ],
  },
  {
    id: "agency",
    label: "Agencies & teams",
    blurb: "Run several channels without the busywork.",
    items: [
      { name: "5 channels", text: "One workspace for all clients" },
      { name: "2 team seats", text: "Share the workspace with your team" },
      { name: "API keys handled", text: "No Google Cloud setup" },
      { name: "Unlimited competitors", text: "Watch every rival" },
      { name: "Priority support", text: "Answers within hours" },
      { name: "Analytics", text: "Ideas, scans and output per month" },
    ],
  },
];
