"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ToastPortal from "@/app/components/ToastPortal";

export default function EditProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (!mounted) return;
        setEmail(data.email || "");
        setName(data.profile?.name || "");
      } catch (e) {
        setMsg("Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMsg("Saved");
    } catch (e) {
      setMsg("Error saving profile");
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
            <h1 className="text-3xl font-semibold text-slate-900">Edit Profile</h1>
            <p className="mt-2 text-sm text-slate-600">Update your profile information.</p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div>
                <label className="text-sm font-medium text-slate-600">Email (read-only)</label>
                <input
                  value={email}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-inner outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#2d4c7c] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#3b5d98] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </form>
          )}
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
