"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, BadgeCheck, Users, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = () => {
    setErrorMsg("");
    signInWithGoogle();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");

    try {
      if (activeTab === "signup") {
        await signUpWithEmail(email, password, fullName);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-white grid lg:grid-cols-2">
      {/* Left Column: Image & Feature Showcase */}
      <div className="relative isolate hidden overflow-hidden lg:flex flex-col justify-center bg-slate-900 px-12 py-20 text-white">
        <img
          src="/assets/hero-immigration.jpg"
          alt="International travellers verifying digital passport identity at an airport e-gate"
          className="absolute inset-0 -z-10 size-full object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/80 to-slate-900/40" />

        <div className="max-w-lg space-y-8 relative z-10">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
              <ShieldCheck className="size-3.5" /> Republic of India Smart Tourism Grid
            </span>
            <h2 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Welcome to SafirPass
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign in once. Complete verification once. Travel across hotels, SIM counters, transport, and attractions without ever surrendering your physical passport.
            </p>
          </div>

          <ul className="space-y-4 pt-2">
            {[
              { icon: <BadgeCheck className="size-5 text-blue-400" />, t: "Authority-verified digital tourist ID" },
              { icon: <Lock className="size-5 text-blue-400" />, t: "Consent required for every third-party data request" },
              { icon: <ShieldCheck className="size-5 text-blue-400" />, t: "Rotating 30s credential, useless if screenshotted" },
              { icon: <Users className="size-5 text-blue-400" />, t: "One-touch SOS panic trigger routed to 112 emergency units" },
            ].map((f, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 border border-white/10 shrink-0">
                  {f.icon}
                </span>
                <span className="font-medium">{f.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Column: Sign In / Create Account Form */}
      <div className="flex items-center justify-center bg-slate-50/50 px-5 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-slate-900">Sign in to SafirPass</h1>
              <p className="mt-1 text-xs text-slate-500">
                Use your Google account for instant sign-in, or continue with email.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition-all hover:shadow-md border-b-2"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin text-blue-600" />
              ) : (
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.1-.2-1.6H12z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold uppercase">
              <span className="h-px flex-1 bg-slate-200" /> or use email{" "}
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className={`rounded-lg py-2 transition-colors ${activeTab === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={`rounded-lg py-2 transition-colors ${activeTab === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Create account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {activeTab === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="su-name" className="block text-xs font-bold uppercase text-slate-600">Full Name</label>
                  <input
                    id="su-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alexander Wright"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email-input" className="block text-xs font-bold uppercase text-slate-600">Email Address</label>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tourist@example.com"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password-input" className="block text-xs font-bold uppercase text-slate-600">Password</label>
                <input
                  id="password-input"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : activeTab === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="text-[11px] leading-relaxed text-slate-500">
              By continuing you agree to the programme's{" "}
              <Link href="/privacy" className="text-blue-600 underline font-semibold">
                privacy &amp; data policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
