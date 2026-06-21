import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Privacy Policy — TubeTarzan",
  description: "How TubeTarzan collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display font-extrabold text-4xl text-white mb-3">Privacy Policy</h1>
          <p className="text-[#555555] text-sm">Last updated: June 2025</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-[#999999] text-sm leading-relaxed">

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">1. Who We Are</h2>
            <p>
              TubeTarzan (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a YouTube viral intelligence platform operated at tubetarzan.com. We help YouTube creators find viral video ideas using VPH data and outlier ratio analysis. For questions about this policy, contact us at{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">2. Information We Collect</h2>
            <p className="mb-3"><strong className="text-white">Account information:</strong> When you sign up, we collect your email address and any profile information you provide.</p>
            <p className="mb-3"><strong className="text-white">YouTube data:</strong> If you connect your YouTube channel, we access your channel ID, video metadata (titles, descriptions, tags, view counts), and the OAuth tokens required to make updates on your behalf. We store your access token and refresh token securely in our database, encrypted at rest. These tokens are never exposed to client-side code or browser storage.</p>
            <p className="mb-3"><strong className="text-white">Usage data:</strong> We collect information about how you use TubeTarzan, including which features you use, search queries you run, and pages you visit. This helps us improve the product.</p>
            <p className="mb-3"><strong className="text-white">Payment data:</strong> Payments are processed by LemonSqueezy. We do not store your credit card details. We receive subscription status and plan information from LemonSqueezy webhooks.</p>
            <p><strong className="text-white">Support conversations:</strong> If you contact us via chat or email, we store the conversation history to provide better support and improve our AI support agent.</p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To provide and improve TubeTarzan features</li>
              <li>To authenticate you and manage your account</li>
              <li>To connect to YouTube and apply optimisations you request</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send transactional emails (account, billing, important updates)</li>
              <li>To provide AI-powered support responses</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">4. YouTube API Data</h2>
            <p className="mb-3">
              TubeTarzan uses the YouTube Data API v3. Our use and transfer of information received from Google APIs complies with the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p className="mb-3">
              We access YouTube data <strong className="text-white">only to perform actions you explicitly request</strong> — such as reading your video list or updating video metadata. We do not sell, share, or use your YouTube data for advertising or any purpose other than operating TubeTarzan.
            </p>
            <p>
              You can revoke TubeTarzan&apos;s access to your YouTube account at any time by visiting{" "}
              <a href="https://myaccount.google.com/permissions" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">
                Google Account Permissions
              </a>{" "}
              and removing TubeTarzan.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">5. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We share data only with:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white">Supabase</strong> — our database and authentication provider (data stored in EU region)</li>
              <li><strong className="text-white">OpenAI</strong> — for AI-generated suggestions and support responses (video metadata and support messages may be sent to OpenAI API)</li>
              <li><strong className="text-white">LemonSqueezy</strong> — payment processing</li>
              <li><strong className="text-white">Vercel</strong> — hosting and serverless compute</li>
              <li><strong className="text-white">Resend</strong> — transactional email delivery</li>
            </ul>
            <p className="mt-3">All third-party providers are bound by their own privacy policies and data processing agreements.</p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account, we delete your personal data within 30 days, except where we are required to retain it for legal or accounting purposes. YouTube OAuth tokens are deleted immediately on account deletion or when you disconnect your channel.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
              We respond to all requests within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication (Supabase session cookies) and optional analytics cookies. See our{" "}
              <a href="/cookies" className="text-[#FFD200] hover:underline">Cookie Policy</a> for full details.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">9. Security</h2>
            <p>
              We use industry-standard security practices: HTTPS everywhere, database encryption at rest, server-side-only access to sensitive tokens, and Row Level Security (RLS) in our database so each user can only access their own data.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app banner. Continued use of TubeTarzan after changes constitutes acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">11. Contact</h2>
            <p>
              Questions about this Privacy Policy? Email us at{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
