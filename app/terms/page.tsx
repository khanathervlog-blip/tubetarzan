import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Terms of Service — TubeTarzan",
  description: "TubeTarzan Terms of Service. Read our terms before using the platform.",
};

export default function TermsPage() {
  return (
    <main className="bg-[#080808] min-h-screen">
      <Navbar />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display font-extrabold text-4xl text-white mb-3">Terms of Service</h1>
          <p className="text-[#555555] text-sm">Last updated: June 2025</p>
        </div>

        <div className="space-y-8 text-[#999999] text-sm leading-relaxed">

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using TubeTarzan (&ldquo;the Service&rdquo;), you agree to these Terms of Service. If you do not agree, do not use the Service. These terms constitute a binding legal agreement between you and TubeTarzan.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">2. Description of Service</h2>
            <p>
              TubeTarzan is a YouTube viral intelligence platform that provides niche video research, VPH and outlier ratio analysis, AI-generated video packaging suggestions, and YouTube channel optimisation tools. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">3. Account Responsibilities</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>You must be at least 13 years old to use TubeTarzan</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must not share your account with others</li>
              <li>You must provide accurate information when registering</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must notify us immediately of any unauthorised account access</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">4. YouTube API and Google Services</h2>
            <p className="mb-3">
              TubeTarzan uses the YouTube Data API v3. By connecting your YouTube channel, you authorise TubeTarzan to read and update your video metadata on your behalf. You must comply with{" "}
              <a href="https://www.youtube.com/t/terms" className="text-[#FFD200] hover:underline" target="_blank" rel="noopener noreferrer">
                YouTube&apos;s Terms of Service
              </a>{" "}
              when using TubeTarzan.
            </p>
            <p>
              TubeTarzan will only make changes to your YouTube content that you explicitly approve within the application. We are not responsible for any consequences of metadata changes you apply via TubeTarzan. Review all suggested changes before applying them.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">5. Subscription and Payments</h2>
            <p className="mb-3">
              Paid plans are billed through LemonSqueezy. By subscribing, you authorise recurring charges to your payment method at the frequency you selected (monthly or annual).
            </p>
            <p className="mb-3">
              <strong className="text-white">Free trial:</strong> All paid plans include a 7-day free trial. You will not be charged until the trial ends. Cancel any time during the trial to avoid charges.
            </p>
            <p className="mb-3">
              <strong className="text-white">Cancellation:</strong> You may cancel your subscription at any time via Settings → Manage Subscription. Your access continues until the end of your paid period. No partial refunds are issued for unused time.
            </p>
            <p>
              <strong className="text-white">Refunds:</strong> Refund requests submitted within 7 days of a charge are reviewed individually. Contact{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
              We do not issue refunds for charges older than 7 days.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Use TubeTarzan to violate YouTube&apos;s Terms of Service or community guidelines</li>
              <li>Attempt to reverse engineer, scrape, or reproduce TubeTarzan&apos;s data or algorithms</li>
              <li>Share your account with multiple users (each subscription is for one user)</li>
              <li>Use automated scripts or bots to interact with the Service</li>
              <li>Use TubeTarzan for any illegal purpose</li>
              <li>Attempt to gain unauthorised access to other users&apos; data</li>
              <li>Interfere with or disrupt the Service infrastructure</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">7. API Key Usage</h2>
            <p>
              Free and Creator plan users must provide their own YouTube Data API key. You are responsible for obtaining and managing your API key in compliance with Google&apos;s terms. TubeTarzan is not responsible for API quota exhaustion, key revocation, or any actions taken by Google regarding your API key.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">8. Intellectual Property</h2>
            <p className="mb-3">
              TubeTarzan and all its content, features, and functionality are owned by TubeTarzan and are protected by intellectual property laws. You may not copy, reproduce, or distribute any part of the Service without express written permission.
            </p>
            <p>
              AI-generated content produced by TubeTarzan (titles, descriptions, hooks, thumbnail text) is provided for your use in connection with your YouTube channel. We make no claim over content you publish on YouTube.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">9. Disclaimer of Warranties</h2>
            <p>
              TubeTarzan is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that any specific results will be achieved from using TubeTarzan. YouTube growth depends on many factors outside our control.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TubeTarzan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, data, or business opportunities, arising from your use of the Service. Our total liability to you shall not exceed the amount you paid in the 3 months preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these terms, fraudulent activity, or any behaviour that harms other users or the integrity of the Service. You may delete your account at any time via Settings → Delete Account.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">12. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Continued use after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg mb-3">13. Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a href="mailto:support@tubetarzan.com" className="text-[#FFD200] hover:underline">support@tubetarzan.com</a>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
