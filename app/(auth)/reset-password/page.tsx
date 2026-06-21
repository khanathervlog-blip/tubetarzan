"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const errorCode = searchParams.get("error_code");
    if (errorCode === "otp_expired") {
      setError("Your reset link has expired. Enter your email to request a new one.");
    }
  }, [searchParams]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl text-white mb-3">
            Check your email
          </h1>
          <p className="text-[#999999] text-sm leading-relaxed mb-6">
            We sent a password reset link to{" "}
            <span className="text-white font-medium">{email}</span>. Click the
            link in the email to set a new password.
          </p>
          <Link
            href="/login"
            className="text-[#FFD200] hover:underline text-sm font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8">
        <h1 className="font-display font-bold text-2xl text-white mb-2">
          Reset your password
        </h1>
        <p className="text-[#555555] text-sm mb-8">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-badge px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#999999] mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <p className="text-center text-[#555555] text-sm mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-[#FFD200] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
