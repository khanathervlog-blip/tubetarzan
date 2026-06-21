import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Cookie Policy — TubeTarzan",
  description: "How TubeTarzan uses cookies and similar tracking technologies.",
};

export default function CookiesPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display font-extrabold text-4xl text-white mb-3">Cookie Policy</h1>
          <p className="text-[#555555] text-sm">Last updated: June 2025</p>
        </div>

        <div className="space-y-8 text-[#999999] text-sm leading-relaxed">

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored in your browser when you visit a website. They allow the site to remember information about your visit, such as your login session or preferences.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">2. Cookies We Use</h2>

            <div className="space-y-5 mt-4">
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-2.5 py-0.5 rounded-full">Essential</span>
                  <span className="text-white font-medium text-sm">Authentication cookies</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Set by Supabase to maintain your login session. These cookies are required for TubeTarzan to function. Without them you would be logged out on every page load. They expire when you sign out or after 7 days of inactivity.
                </p>
                <div className="mt-3 text-xs text-[#555555]">
                  <strong>Names:</strong> sb-access-token, sb-refresh-token
                </div>
              </div>

              <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-2.5 py-0.5 rounded-full">Essential</span>
                  <span className="text-white font-medium text-sm">CSRF protection</span>
                </div>
                <p className="text-xs leading-relaxed">
                  A security token that protects against cross-site request forgery attacks. Required for secure form submissions. Session-scoped (deleted when you close the browser).
                </p>
              </div>

              <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#FFB700]/10 text-[#FFB700] text-xs font-bold px-2.5 py-0.5 rounded-full">Functional</span>
                  <span className="text-white font-medium text-sm">Chat visitor ID</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Stored in localStorage (not a cookie) as &apos;tt_visitor_id&apos;. A random UUID that links your chat sessions so you don&apos;t lose conversation history if you navigate away. Not used for tracking or advertising. Persists indefinitely until you clear your browser storage.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#555555]/20 text-[#999999] text-xs font-bold px-2.5 py-0.5 rounded-full">Analytics</span>
                  <span className="text-white font-medium text-sm">Usage analytics (optional)</span>
                </div>
                <p className="text-xs leading-relaxed">
                  We may use privacy-friendly analytics to understand aggregate usage patterns (which features are popular, page load times). These do not track individual users across sites and do not use advertising networks. You can opt out at any time by emailing us.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">3. Third-Party Cookies</h2>
            <p className="mb-3">
              Third-party services integrated into TubeTarzan may set their own cookies:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white">LemonSqueezy</strong> — sets cookies during the checkout process to manage your payment session</li>
              <li><strong className="text-white">Google OAuth</strong> — sets temporary cookies during the YouTube channel connection flow</li>
            </ul>
            <p className="mt-3">These third-party cookies are governed by their respective privacy policies.</p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">4. Managing Cookies</h2>
            <p className="mb-3">
              You can control cookies through your browser settings. Note that blocking essential cookies will prevent you from logging in to TubeTarzan.
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">Chrome — Cookie settings</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">Firefox — Cookie settings</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">Safari — Cookie settings</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">Edge — Cookie settings</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">5. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy as we add or remove features. We will notify you of material changes via email or an in-app notice.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">6. Contact</h2>
            <p>
              Questions about cookies? Email us at{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
