'use client';
import Link from "next/link";
import { Poppins } from "next/font/google";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);

    const resp = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    const body = await resp.json();
    if (!resp.ok) {
      setLoading(false);
      setError(body.error || "Signup failed");
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/");
    }
  };
  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-linear-to-b from-[#7bb2ff] via-[#b6d8ff] to-[#f2f6ff] text-[#0f1c2e] ${poppins.className}`}
    >
      <div className="absolute left-6 top-6">
        <Link
          href="/"
          className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
        >
          ← Back
        </Link>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-16">
        <section className="w-full rounded-[32px] border border-white/30 bg-white/60 px-8 py-8 shadow-[0_25px_80px_rgba(52,101,183,0.3)] backdrop-blur-2xl sm:px-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
              ShadeSync
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">
              Welcome!
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Sign up to access schedules, automation, and manual controls.
            </p>
          </div>

          <form className="flex flex-col gap-6 text-left" onSubmit={onSubmit}>
            <label className="text-sm font-medium text-slate-600">
              Full Name
              <input
                type="text"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="John Doe"
              />
            </label>

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

            <label className="text-sm font-medium text-slate-600">
              Password
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            <label className="text-sm font-medium text-slate-600">
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 rounded-2xl bg-gradient-to-r from-[#4ad463] to-[#3ab0ff] py-4 text-lg font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.35)] transition hover:shadow-[0_25px_50px_rgba(58,176,255,0.35)] disabled:opacity-60"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Have an account?{" "}
            <a href="/login" className="font-semibold text-blue-600 hover:underline">
              Login
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
