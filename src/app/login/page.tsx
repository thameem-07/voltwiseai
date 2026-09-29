"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Shield, User, Lock, Mail, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "driver.google@voltwise.ai",
          name: "Google EV Driver",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isNewUser) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Google authentication failed");
        setGoogleLoading(false);
      }
    } catch {
      setError("Google authentication service unavailable");
      setGoogleLoading(false);
    }
  };

  const loginAsDemo = async (role: "DRIVER" | "ADMIN") => {
    const demoEmail = role === "ADMIN" ? "admin@voltwise.ai" : "driver@voltwise.ai";
    const demoPassword = role === "ADMIN" ? "Admin@123" : "Driver@123";
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        if (role === "ADMIN") router.push("/admin");
        else router.push("/dashboard");
      } else {
        setError(data.error);
        setLoading(false);
      }
    } catch {
      setError("Demo login error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full card-level-2 p-8 shadow-xl relative rounded-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30 flex items-center justify-center text-[var(--primary-accent)] mx-auto">
              <Zap className="w-6 h-6 fill-[var(--primary-accent)]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Sign in to VoltWise AI
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Access your driver dashboard or infrastructure management portal
            </p>
          </div>

          {/* Quick 1-Click Access */}
          <div className="mb-5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block text-center">
              ⚡ Quick Access Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginAsDemo("DRIVER")}
                className="py-2 px-3 rounded-lg card-level-3 text-xs font-semibold text-[var(--primary-accent)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:border-[var(--primary-accent)]"
              >
                <User className="w-3.5 h-3.5" />
                Driver Account
              </button>
              <button
                type="button"
                onClick={() => loginAsDemo("ADMIN")}
                className="py-2 px-3 rounded-lg card-level-3 text-xs font-semibold text-[var(--info)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:border-[var(--info)]"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Account
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          {/* Continue with Google */}
          <div className="space-y-3 mb-4">
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl card-level-3 hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? "Connecting Google..." : "Continue with Google"}</span>
            </button>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-[var(--border-subtle)]"></div>
              <span className="px-3 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                or Sign In with Email
              </span>
              <div className="flex-1 border-t border-[var(--border-subtle)]"></div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@voltwise.ai"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--primary-accent)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {loading ? "Authenticating..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--primary-accent)] hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
