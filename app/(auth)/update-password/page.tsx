"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const errorCode = searchParams.get("error_code");
    if (errorParam) {
      setLinkExpired(true);
      const isExpired = errorCode === "otp_expired";
      setError(
        isExpired
          ? "This reset link has expired. Please request a new one."
          : errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "This reset link is invalid. Please request a new one."
      );
    }
  }, [searchParams]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLinkExpired(false);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (done) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl text-white mb-3">
            Password updated!
          </h1>
          <p className="text-[#999999] text-sm">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8">
        <h1 className="font-display font-bold text-2xl text-white mb-2">
          Set new password
        </h1>
        <p className="text-[#555555] text-sm mb-8">
          Choose a strong password for your account.
        </p>

        {error && (
          <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-badge px-4 py-3 mb-6">
            {error}
            {linkExpired && (
              <div className="mt-2">
                <Link
                  href="/reset-password"
                  className="underline font-medium text-[#FF3B3B]"
                >
                  Request a new reset link
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#999999] mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white transition-colors p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#999999] mb-2">
              Confirm new password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat your password"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || linkExpired}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <UpdatePasswordContent />
    </Suspense>
  );
}
