import { Key, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface KeyStatus {
  name: string;
  envVar: string;
  isSet: boolean;
  note?: string;
}

function getKeyStatuses(): KeyStatus[] {
  return [
    { name: "YouTube API (Key 1)", envVar: "YOUTUBE_API_KEY_1", isSet: !!process.env.YOUTUBE_API_KEY_1 },
    { name: "YouTube API (Key 2)", envVar: "YOUTUBE_API_KEY_2", isSet: !!process.env.YOUTUBE_API_KEY_2 },
    { name: "YouTube API (Key 3)", envVar: "YOUTUBE_API_KEY_3", isSet: !!process.env.YOUTUBE_API_KEY_3 },
    { name: "YouTube API (Key 4)", envVar: "YOUTUBE_API_KEY_4", isSet: !!process.env.YOUTUBE_API_KEY_4 },
    { name: "YouTube API (Key 5)", envVar: "YOUTUBE_API_KEY_5", isSet: !!process.env.YOUTUBE_API_KEY_5 },
    { name: "Google OAuth Client ID", envVar: "GOOGLE_CLIENT_ID", isSet: !!process.env.GOOGLE_CLIENT_ID },
    { name: "Google OAuth Secret", envVar: "GOOGLE_CLIENT_SECRET", isSet: !!process.env.GOOGLE_CLIENT_SECRET },
    { name: "Anthropic (Claude)", envVar: "ANTHROPIC_API_KEY", isSet: !!process.env.ANTHROPIC_API_KEY },
    { name: "OpenAI", envVar: "OPENAI_API_KEY", isSet: !!process.env.OPENAI_API_KEY },
    { name: "HuggingFace", envVar: "HUGGINGFACE_API_KEY", isSet: !!process.env.HUGGINGFACE_API_KEY },
    { name: "Pexels", envVar: "PEXELS_API_KEY", isSet: !!process.env.PEXELS_API_KEY },
    { name: "Pixabay", envVar: "PIXABAY_API_KEY", isSet: !!process.env.PIXABAY_API_KEY },
    { name: "Kling AI", envVar: "KLING_API_KEY", isSet: !!process.env.KLING_API_KEY },
    { name: "Resend", envVar: "RESEND_API_KEY", isSet: !!process.env.RESEND_API_KEY },
    { name: "LemonSqueezy", envVar: "LEMONSQUEEZY_API_KEY", isSet: !!process.env.LEMONSQUEEZY_API_KEY },
    { name: "Railway (FFmpeg)", envVar: "NEXT_PUBLIC_FFMPEG_SERVICE_URL", isSet: !!process.env.NEXT_PUBLIC_FFMPEG_SERVICE_URL, note: "Public URL" },
    { name: "Admin Email", envVar: "ADMIN_EMAIL", isSet: !!process.env.ADMIN_EMAIL },
    { name: "Cron Secret", envVar: "CRON_SECRET", isSet: !!process.env.CRON_SECRET },
  ];
}

const GROUPS = [
  { label: "YouTube API Pool", keys: ["YOUTUBE_API_KEY_1", "YOUTUBE_API_KEY_2", "YOUTUBE_API_KEY_3", "YOUTUBE_API_KEY_4", "YOUTUBE_API_KEY_5"] },
  { label: "Google OAuth", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { label: "AI Services", keys: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "HUGGINGFACE_API_KEY"] },
  { label: "Stock & Media", keys: ["PEXELS_API_KEY", "PIXABAY_API_KEY", "KLING_API_KEY"] },
  { label: "Platform", keys: ["RESEND_API_KEY", "LEMONSQUEEZY_API_KEY", "NEXT_PUBLIC_FFMPEG_SERVICE_URL"] },
  { label: "Admin & Security", keys: ["ADMIN_EMAIL", "CRON_SECRET"] },
];

export default function ApiKeysPage() {
  const statuses = getKeyStatuses();
  const byEnvVar = Object.fromEntries(statuses.map((s) => [s.envVar, s]));
  const configured = statuses.filter((s) => s.isSet).length;
  const total = statuses.length;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Key className="w-6 h-6 text-[#FFD200]" /> API Keys
        </h1>
        <p className="text-[#555555] text-sm">
          {configured}/{total} keys configured. Add missing keys in your Vercel environment variables.
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#999999] text-xs">Configuration coverage</span>
          <span className="text-white text-xs font-bold">{Math.round((configured / total) * 100)}%</span>
        </div>
        <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#22C55E] transition-all"
            style={{ width: `${(configured / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const groupKeys = group.keys.map((k) => byEnvVar[k]).filter(Boolean);
          const allSet = groupKeys.every((k) => k.isSet);
          const someSet = groupKeys.some((k) => k.isSet);

          return (
            <div key={group.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
                <span className="text-white text-sm font-semibold">{group.label}</span>
                {allSet ? (
                  <span className="text-xs text-[#22C55E] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> All set
                  </span>
                ) : someSet ? (
                  <span className="text-xs text-[#FFD200] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Partial
                  </span>
                ) : (
                  <span className="text-xs text-[#FF3B3B] flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Missing
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#1E1E1E]">
                {groupKeys.map((key) => (
                  <div key={key.envVar} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[#999999] text-sm">{key.name}</p>
                      <p className="text-[#333333] text-xs font-mono mt-0.5">{key.envVar}</p>
                      {key.note && <p className="text-[#333333] text-xs mt-0.5">{key.note}</p>}
                    </div>
                    {key.isSet ? (
                      <div className="flex items-center gap-1.5 text-[#22C55E] text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Configured
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#FF3B3B] text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Not set
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
        <p className="text-[#555555] text-xs">
          All keys are stored in Vercel environment variables and never exposed to the client.
          To add or update a key, go to your Vercel project settings → Environment Variables.
        </p>
      </div>
    </div>
  );
}
