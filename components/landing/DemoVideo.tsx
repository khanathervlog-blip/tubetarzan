interface DemoVideoProps {
  videoUrl: string;
  videoTitle?: string;
}

export default function DemoVideo({ videoUrl, videoTitle }: DemoVideoProps) {
  return (
    <section className="py-20 lg:py-28 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs font-bold px-3 py-1.5 rounded-badge uppercase tracking-wider mb-6">
            Demo
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            SEE IT IN ACTION
          </h2>
          {videoTitle && (
            <p className="text-[#999999] text-lg">{videoTitle}</p>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{
              paddingBottom: "56.25%",
              border: "2px solid #FFD200",
              borderRadius: "12px",
            }}
          >
            <iframe
              src={videoUrl}
              title={videoTitle || "TubeTarzan Demo"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
