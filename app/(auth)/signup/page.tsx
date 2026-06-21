"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Profile is created automatically by the handle_new_user database trigger.
    // Onboarding runs after the user confirms their email and gets a valid session.
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
          <div className="w-16 h-16 bg-[#FFD200]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#FFD200]" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-3">
            Check your email
          </h1>
          <p className="text-[#999999] text-sm leading-relaxed mb-6">
            We sent a confirmation link to{" "}
            <span className="text-white font-medium">{email}</span>.
            Click the link to confirm your account and continue setup.
          </p>
          <p className="text-[#555555] text-xs">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              onClick={() => setSuccess(false)}
              className="text-[#FFD200] hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8">
        <h1 className="font-display font-bold text-2xl text-white mb-2">
          Create your account
        </h1>
        <p className="text-[#555555] text-sm mb-8">
          Start free. No credit card required.
        </p>

        {error && (
          <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-badge px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#999999] mb-2">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-[#999999] mb-2">
              Password
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-[#555555] text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#FFD200] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
