"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import { createClient } from "@/utils/supabase/client";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("account");

  useEffect(() => {
    // Check both URL hash and query parameters for recovery tokens
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const urlParams = new URLSearchParams(window.location.search);
    
    const accessToken = hashParams.get("access_token") || urlParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") || urlParams.get("refresh_token");
    const type = hashParams.get("type") || urlParams.get("type");

    console.log("Password reset params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

    if (type === "recovery" && accessToken && refreshToken) {
      setMode("recovery");
      const bootstrapRecoverySession = async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("Recovery session error:", error);
            setMsg("Recovery link is invalid or expired.");
            return;
          }
          console.log("Recovery session established successfully");
          window.history.replaceState(null, "", "/reset-password");
        } catch (err) {
          console.error("Recovery bootstrap error:", err);
          setMsg("Recovery link is invalid or expired.");
        }
      };
      bootstrapRecoverySession();
    } else {
      console.log("Not in recovery mode, showing regular reset form");
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!newPassword || newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setMsg("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      if (mode === "recovery") {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setMsg("Password reset successful. You can now log in.");
      } else {
        const res = await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Reset failed");
        setMsg("Password updated.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.replace("/login");
    } catch (err) {
      setMsg(err.message || "Error resetting password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#7bb2ff] via-[#b6d8ff] to-[#f2f6ff] text-[#0f1c2e] ${poppins.className}`}
    >
      <div className="absolute left-6 top-6 z-20">
        <Link
          href={mode === "recovery" ? "/login" : "/account"}
          className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
        >
          ← Back
        </Link>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-16">
        <section className="w-full rounded-[32px] border border-white/30 bg-white/60 px-8 py-12 shadow-[0_25px_80px_rgba(52,101,183,0.3)] backdrop-blur-2xl sm:px-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">ShadeSync</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">
              {mode === "recovery" ? "Create New Password" : "Reset Password"}
            </h1>
            <p className="mt-3 text-base text-slate-600">
              {mode === "recovery"
                ? "Enter a new password for your account."
                : "Enter your current password and choose a new one."}
            </p>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-2 text-xs text-slate-400">
                Debug: Mode = {mode}
              </p>
            )}
          </div>

          <form className="flex flex-col gap-6 text-left" onSubmit={onSubmit}>
            {mode !== "recovery" && (
              <label className="text-sm font-medium text-slate-600">
                Current Password
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  placeholder="••••••••"
                />
              </label>
            )}

            <label className="text-sm font-medium text-slate-600">
              New Password
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            <label className="text-sm font-medium text-slate-600">
              Confirm New Password
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="••••••••"
              />
            </label>

            {msg && (
              <p className={`text-sm ${msg.toLowerCase().includes("success") || msg.toLowerCase().includes("updated") ? "text-green-700" : "text-red-600"}`}>
                {msg}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-2xl bg-gradient-to-r from-[#4ad463] to-[#3ab0ff] py-4 text-lg font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.35)] transition hover:shadow-[0_25px_50px_rgba(58,176,255,0.35)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save New Password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
