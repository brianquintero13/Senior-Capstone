"use client";
import Link from "next/link";
import { useState } from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSent(false);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to send reset email");
      }
      setSent(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#7bb2ff] via-[#b6d8ff] to-[#f2f6ff] text-[#0f1c2e] ${poppins.className}`}
    >
      <div className="absolute left-6 top-6">
        <Link
          href="/login"
          className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
        >
          ← Back
        </Link>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-16">
        <section className="w-full rounded-[32px] border border-white/30 bg-white/60 px-8 py-12 shadow-[0_25px_80px_rgba(52,101,183,0.3)] backdrop-blur-2xl sm:px-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">ShadeSync</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">Forgot Password</h1>
            <p className="mt-3 text-base text-slate-600">
              Enter your email and we will send a password reset link.
            </p>
          </div>

          <form className="flex flex-col gap-6 text-left" onSubmit={onSubmit}>
            <label className="text-sm font-medium text-slate-600">
              Email Address
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="you@example.com"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {sent && (
              <p className="text-sm text-green-700">
                If an account exists for that email, a reset link has been sent.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-2xl bg-gradient-to-r from-[#4ad463] to-[#3ab0ff] py-4 text-lg font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.35)] transition hover:shadow-[0_25px_50px_rgba(58,176,255,0.35)] disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
