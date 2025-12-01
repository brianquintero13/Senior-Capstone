"use client";
import { useState } from "react";
import Link from "next/link";
import ToastPortal from "@/app/components/ToastPortal";

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!newPassword || newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setMsg("Password reset successful (demo)");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setMsg("Error resetting password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#87b5ff] via-[#bcd9ff] to-[#eef4ff] text-[#0f1c2e]">
      <div className="absolute left-6 top-6 z-20">
        <Link
          href="/account"
          className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
        >
          ← Back
        </Link>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-16">
        <section className="w-full rounded-[32px] border border-white/30 bg-white/60 px-8 py-8 shadow-[0_25px_80px_rgba(52,101,183,0.3)] backdrop-blur-2xl sm:px-16">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your current and new password.</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Current Password</label>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">New Password</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Confirm New Password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none"
                placeholder="••••••••"
              />
            </div>

            {msg && <p className="text-sm text-slate-700">{msg}</p>}

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#4069b3] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#4c79c9] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </section>
      </main>
      {(msg || saving) && (
        <ToastPortal>
          <div className="fixed inset-x-0 bottom-4 z-[1000] flex justify-center px-4">
            <div
              className={`rounded-full border px-4 py-2 text-sm shadow backdrop-blur ${
                saving
                  ? "border-blue-200 bg-white/70 text-slate-700"
                  : msg?.toLowerCase().includes("error")
                  ? "border-red-200 bg-red-50/90 text-red-700"
                  : "border-green-200 bg-white/70 text-slate-800"
              }`}
            >
              {saving ? "Saving..." : msg}
            </div>
          </div>
        </ToastPortal>
      )}
    </div>
  );
}
