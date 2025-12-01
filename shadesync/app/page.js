'use client'
import { useState } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";
import AutoTimeModal from "./components/AutoTimeModal";
import DisableScheduleModal from "./components/DisableScheduleModal";
import SmartRoutineModal from "./components/SmartRoutineModal";
import { useSession, signOut } from "next-auth/react";
import ClockWithTimezones from "./components/ClockWithTimezones";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export default function Home() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(true);
    const [manual, setManual] = useState(false);
    const [autoModalOpen, setAutoModalOpen] = useState(false);
    const [disableModalOpen, setDisableModalOpen] = useState(false);
    const [smartModalOpen, setSmartModalOpen] = useState(false);
    const [disableChoice, setDisableChoice] = useState("today");

    return (
        <div
            className={`relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#87b5ff] via-[#bcd9ff] to-[#eef4ff] text-[#0f1c2e] ${poppins.className}`}
        >
            {/* Top-right actions */}
            <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
                {session ? (
                    <>
                        <Link
                            href="/account"
                            className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
                        >
                            Account Settings
                        </Link>
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="rounded-full border border-white/60 bg-white/30 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_8px_24px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/60"
                        >
                            Log Out
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="rounded-full border border-white/60 bg-white/40 px-6 py-2 text-base font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
                    >
                        Log In
                    </Link>
                )}
            </div>

            {/* soft sun glow */}
            <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-[#ffe9a0] via-[#ffd36a] to-[#ffb347] blur-[2px] shadow-[0_0_80px_rgba(255,210,100,0.7)]" />

            {/* subtle atmospheric glow */}
            <div className="pointer-events-none absolute inset-x-[-40%] bottom-[-60%] h-[80%] rounded-[50%] bg-white/30 blur-[100px]" />

            <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-16">
                {/* Always show main UI, logged in or not (demo mode) */}
                <section className="flex w-full flex-col items-center gap-8 rounded-[36px] border border-white/20 bg-white/25 px-8 py-12 text-center shadow-[0_20px_60px_rgba(52,101,183,0.25)] backdrop-blur-2xl sm:px-12">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-medium text-slate-700">Current Time</p>

                        {/* LIVE CLOCK */}
                        <ClockWithTimezones />

                        <div className="flex rounded-full border border-blue-200 bg-white/60 p-1 text-base font-medium text-slate-600 shadow-inner">
                            <button
                                onClick={() => setOpen(!open)}
                                className={`cursor-pointer rounded-full px-6 py-2 transition-all ease-in-out duration-300
                  ${open ? "bg-white text-slate-900 shadow-sm" : ""}`}
                            >
                                Open
                            </button>
                            <button
                                onClick={() => setOpen(!open)}
                                className={`cursor-pointer rounded-full px-6 py-2  transition-all ease-in-out duration-300 ${
                                    !open ? "bg-white text-slate-900 shadown-sm" : ""
                                }`}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 text-center text-slate-800">
                        <h2 className="text-2xl font-semibold">Today&apos;s Automation</h2>
                        <div className="flex w-full flex-col gap-4 sm:flex-row">
                            <button
                                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-blue-200 bg-white/70 px-6 py-3 text-lg font-medium text-slate-700 shadow hover:bg-white"
                                onClick={() => setAutoModalOpen(true)}
                            >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 text-blue-500">
                  <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                                Set Schedule
                            </button>

                            <button
                                className="flex flex-1 items-center justify-center rounded-full border border-blue-200 bg-white/70 px-6 py-3 text-lg font-medium text-slate-700 shadow hover:bg-white"
                                onClick={() => setDisableModalOpen(true)}
                            >
                                Disable Schedule
                            </button>

                            <button
                                className="flex flex-1 items-center justify-center rounded-full border border-blue-200 bg-white/70 px-6 py-3 text-lg font-medium text-slate-700 shadow hover:bg-white"
                                type="button"
                                onClick={() => setSmartModalOpen(true)}
                            >
                                Set to Smart Routine
                            </button>
                        </div>
                    </div>

                    <div className="flex w-full flex-col items-center gap-4">
                        <div className="flex w-full items-center justify-between rounded-full bg-white/70 px-6 py-3 text-lg font-medium text-slate-700 shadow-inner">
                            <span>Manual Control</span>
                            <button
                                onClick={() => setManual(!manual)}
                                aria-pressed={manual}
                                className={`cursor-pointer relative flex h-9 w-16 items-center rounded-full border-2 px-1 transition-all duration-300 ease-in-out
                  ${
                                    manual
                                        ? "border-[#ff7a63] bg-[#ff8c72] shadow-[0_12px_25px_rgba(255,124,99,0.4)]"
                                        : "border-[#ffd8c8] bg-[#fff1e9] shadow-inner"
                                }`}
                            >
                <span
                    className={`h-7 w-7 rounded-full bg-gradient-to-br from-[#ffba9d] to-[#ff5f5f] shadow transition-all duration-300 ease-in-out
                    ${manual ? "translate-x-7" : "translate-x-0"}`}
                />
                            </button>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
                            <button className="rounded-2xl bg-[#4ad463] py-6 text-2xl font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.45)]">
                                Open
                            </button>
                            <button className="rounded-2xl bg-[#e06a76] py-6 text-2xl font-semibold text-white shadow-[0_20px_45px_rgba(224,106,118,0.45)]">
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-lg font-medium text-slate-600">
                        <span className="h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.9)]" />
                        System Online
                    </div>
                </section>
            </main>

            {/* Modals */}
            <AutoTimeModal
                open={autoModalOpen}
                onClose={() => setAutoModalOpen(false)}
            />
            <DisableScheduleModal
                open={disableModalOpen}
                onClose={() => setDisableModalOpen(false)}
                onConfirm={(choice) => setDisableChoice(choice)}
                initialChoice={disableChoice}
            />
            <SmartRoutineModal
                open={smartModalOpen}
                onClose={() => setSmartModalOpen(false)}
            />
        </div>
    );
}
