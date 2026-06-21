import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Blog — TubeTarzan",
  description: "YouTube growth strategies, viral intelligence tips, and creator insights from TubeTarzan.",
};

const POSTS = [
  {
    title: "What is Outlier Ratio and Why It Predicts Viral Videos Better Than Views",
    category: "Strategy",
    date: "June 2025",
    excerpt: "Outlier ratio compares a video's views to that channel's average. A 14x outlier means the algorithm loved it. Here's why this signal is more valuable than raw view counts.",
    readTime: "5 min read",
  },
  {
    title: "VPH vs Views: The Metric That Actually Shows What's Trending Right Now",
    category: "Data",
    date: "May 2025",
    excerpt: "A video with 2M views uploaded 3 years ago tells you nothing. A video with 50K views uploaded 8 hours ago with 6,250 VPH tells you everything. Here's the difference.",
    readTime: "4 min read",
  },
  {
    title: "18 Viral YouTube Title Patterns (And How to Adapt Them to Any Niche)",
    category: "Titles",
    date: "May 2025",
    excerpt: "TubeTarzan scans YouTube using 18 proven viral title structures. In this post we break down each pattern with real examples and explain why they work psychologically.",
    readTime: "8 min read",
  },
  {
    title: "How to Set Up Your Free YouTube API Key in 5 Minutes",
    category: "Tutorial",
    date: "April 2025",
    excerpt: "Step-by-step: get your free YouTube Data API v3 key from Google Cloud Console. No credit card needed for the free tier. Takes 5 minutes.",
    readTime: "3 min read",
  },
];

export default function BlogPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
            Blog
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-4">
            YouTube growth intelligence
          </h1>
          <p className="text-[#999999] text-lg">
            Strategies, data breakdowns, and creator insights.
          </p>
        </div>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 hover:border-[#333333] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-[#FFD200]/10 text-[#FFD200] text-xs font-bold px-2.5 py-1 rounded-full">
                  {post.category}
                </span>
                <span className="text-[#555555] text-xs">{post.date}</span>
                <span className="text-[#555555] text-xs">·</span>
                <span className="text-[#555555] text-xs">{post.readTime}</span>
              </div>
              <h2 className="font-display font-bold text-xl text-white mb-3 leading-snug">
                {post.title}
              </h2>
              <p className="text-[#999999] text-sm leading-relaxed">{post.excerpt}</p>
              <div className="mt-4">
                <span className="text-[#555555] text-sm italic">Full post coming soon</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 bg-[#111111] border border-[#FFD200]/20 rounded-2xl p-8 text-center">
          <h2 className="font-display font-bold text-xl text-white mb-2">Get posts in your inbox</h2>
          <p className="text-[#999999] text-sm mb-6">No spam. Just YouTube growth tactics when we publish new research.</p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-6 py-3 rounded-xl hover:bg-[#FFE033] transition-colors text-sm"
          >
            Create your free account →
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
