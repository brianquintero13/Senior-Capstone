import Link from "next/link";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SignupPage() {
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

          <form className="flex flex-col gap-6 text-left">
            <label className="text-sm font-medium text-slate-600">
              Name
              <input
                type="text"
                name="name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="John Doe"
              />
            </label>

            <label className="text-sm font-medium text-slate-600">
              Email Address
              <input
                type="email"
                name="email"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="you@example.com"
              />
            </label>

            <label className="text-sm font-medium text-slate-600">
              Password
              <input
                type="password"
                name="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            <label className="text-sm font-medium text-slate-600">
              Confirm Password
              <input
                type="password"
                name="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-300"
                />
                Remember me
              </label>
              <a
                href="#"
                className="font-semibold text-blue-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="mt-4 rounded-2xl bg-gradient-to-r from-[#4ad463] to-[#3ab0ff] py-4 text-lg font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.35)] transition hover:shadow-[0_25px_50px_rgba(58,176,255,0.35)]"
            >
              Sign up
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
