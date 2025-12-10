'use client'
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Poppins } from "next/font/google";
import AutoTimeModal from "./components/AutoTimeModal";
import DisableScheduleModal from "./components/DisableScheduleModal";
import { useSession, signOut } from "next-auth/react";
import ClockWithTimezones from "./components/ClockWithTimezones";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWeatherTheme } from "./hooks/useWeatherTheme";
import WeatherVideoBackground from "../components/WeatherVideoBackground";

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
    const [disableChoice, setDisableChoice] = useState("today");
    const [deviceError, setDeviceError] = useState("");
    const [scheduleEntries, setScheduleEntries] = useState({});
    const [scheduleFetchError, setScheduleFetchError] = useState("");
    const { theme, loading: weatherLoading, error: weatherError, weatherData } = useWeatherTheme();

    const router = useRouter();
    useEffect(() => {
        const controller = new AbortController();
        const checkDevice = async () => {
            try {
                const res = await fetch("/api/devices", { cache: "no-store", signal: controller.signal });
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                if (res.status === 404) {
                    router.push("/account?missingSerial=1");
                    return;
                }
                if (!res.ok) throw new Error("Failed to load device");
            } catch (err) {
                if (controller.signal.aborted) return;
                setDeviceError("Could not verify your device. Please try again.");
            }
        };
        checkDevice();
        return () => controller.abort();
    }, [router]);

    const loadSchedule = useCallback(async () => {
        try {
            const res = await fetch("/api/schedules", { cache: "no-store" });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to load schedule");
            }
            const data = await res.json();
            setScheduleEntries(data?.entries || {});
            setScheduleFetchError("");
        } catch (err) {
            setScheduleFetchError(err.message || "Failed to load schedule");
        }
    }, []);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handleDisableSchedule = async (choice) => {
        setDisableChoice(choice);
        const scope = choice === "entire" ? "all" : "today";
        try {
            const res = await fetch("/api/schedules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to update schedule");
            }
            toast.success(scope === "all" ? "Schedule disabled" : "Schedule skipped for today");
        } catch (err) {
            toast.error(err.message || "Failed to update schedule");
        }
    };

    const handleEnableSchedule = async () => {
        try {
            const res = await fetch("/api/schedules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope: "enable" }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to enable schedule");
            }
            toast.success("Schedule enabled");
        } catch (err) {
            toast.error(err.message || "Failed to enable schedule");
        }
    };

    const toggleManual = async () => {
        const nextMode = manual ? "auto" : "manual";
        setManual(!manual);
        try {
            const res = await fetch("/api/device-mode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: nextMode }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to update mode");
            }
            toast.success(nextMode === "manual" ? "Manual mode enabled" : "Manual mode disabled");
        } catch (err) {
            setManual(manual); // revert
            toast.error(err.message || "Failed to update mode");
        }
    };

    const sendCommand = async (action) => {
        try {
            const res = await fetch("/api/device-command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Command failed");
            }
            toast.success(`Command sent: ${action}`);
        } catch (err) {
            toast.error(err.message || "Command failed");
        }
    };

    const dayAbbrs = ["Su", "M", "T", "W", "Th", "F", "Sa"];
    const todayKey = dayAbbrs[new Date().getDay()];
    const formatTimeLabel = (timeString) => {
        if (!timeString) return "";
        const [hourStr, minute] = timeString.split(":");
        const hourNum = Number(hourStr);
        const ampm = hourNum >= 12 ? "pm" : "am";
        const hour12 = ((hourNum + 11) % 12) + 1;
        return `${hour12}:${minute}${ampm}`;
    };
    const todayTime = scheduleEntries?.[todayKey]?.[open ? "open" : "close"];

    const isNight = theme.name?.startsWith("night");
    const backgroundStyle = theme?.backgroundImage
        ? {
              backgroundImage: theme.backgroundImage,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
          }
        : isNight
          ? {
                backgroundImage: "url('/night-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }
          : {
                background: "linear-gradient(to bottom, #87b5ff, #bcd9ff, #eef4ff)",
            };

    return (
        <div
            className={`relative min-h-screen w-full overflow-hidden ${poppins.className} ${
                isNight ? "text-[#f5f7fb]" : "text-[#0f1c2e]"
            }`}
        >
            <WeatherVideoBackground weatherData={weatherData} />
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

            {/* Device error banner */}
            {deviceError && (
                <div className="absolute left-0 right-0 top-0 z-30 flex justify-center px-4 pt-4">
                    <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow">
                        {deviceError}
                    </div>
                </div>
            )}
            <ToastContainer position="top-right" autoClose={2200} hideProgressBar />

            {/* Weather-based video background will handle the visual theme */}

            <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-16">
                {/* Always show main UI, logged in or not (demo mode) */}
                <section
                    className={`flex w-full flex-col items-center gap-8 rounded-[36px] px-8 py-12 text-center backdrop-blur-2xl sm:px-12 ${
                        isNight
                            ? "border border-white/15 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                            : "border border-white/20 bg-white/25 shadow-[0_20px_60px_rgba(52,101,183,0.25)]"
                    }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <p className={`text-lg font-medium ${isNight ? "text-white" : "text-slate-700"}`}>Current Time</p>

                        {/* LIVE CLOCK */}
                        <ClockWithTimezones isNight={isNight} />

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

                    <div className={`flex flex-col items-center gap-4 text-center ${isNight ? "text-slate-100" : "text-slate-800"}`}>
                        <h2 className="text-2xl font-semibold">Today&apos;s Automation</h2>
                        <div className="flex w-full flex-col gap-4 sm:flex-row">
                            <button
                                className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-6 py-3 text-lg font-medium shadow hover:bg-white ${
                                    isNight
                                        ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                                        : "border-blue-200 bg-white/70 text-slate-700"
                                }`}
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
                                className={`flex flex-1 items-center justify-center rounded-full border px-6 py-3 text-lg font-medium shadow hover:bg-white ${
                                    isNight
                                        ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                                        : "border-blue-200 bg-white/70 text-slate-700"
                                }`}
                                onClick={() => setDisableModalOpen(true)}
                            >
                                Disable Schedule
                            </button>
                            <button
                                className={`flex flex-1 items-center justify-center rounded-full border px-6 py-3 text-lg font-medium shadow hover:bg-white ${
                                    isNight
                                        ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                                        : "border-blue-200 bg-white/70 text-slate-700"
                                }`}
                                onClick={handleEnableSchedule}
                                type="button"
                            >
                                Enable Schedule
                            </button>

                        </div>
                        <div
                            className={`w-full rounded-2xl px-4 py-3 text-sm shadow-inner ${
                                isNight
                                    ? "border border-white/20 bg-white/10 text-slate-100"
                                    : "border border-blue-100 bg-white/70 text-slate-700"
                            }`}
                        >
                            {scheduleFetchError ? (
                                <span className="text-red-600">{scheduleFetchError}</span>
                            ) : todayTime ? (
                                <span>
                                    Today&apos;s {open ? "open" : "close"} time:{" "}
                                    <span className="font-semibold">{formatTimeLabel(todayTime)}</span>
                                </span>
                            ) : (
                                <span>No {open ? "open" : "close"} time set for today.</span>
                            )}
                        </div>
                    </div>

                    <div className="flex w-full flex-col items-center gap-4">
                        <div
                            className={`flex w-full items-center justify-between rounded-full px-6 py-3 text-lg font-medium shadow-inner ${
                                isNight ? "bg-white/10 text-white" : "bg-white/70 text-slate-700"
                            }`}
                        >
                            <span>Manual Control</span>
                            <button
                                onClick={toggleManual}
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
                            <button
                                className={`rounded-2xl py-6 text-2xl font-semibold text-white shadow-[0_20px_45px_rgba(74,212,99,0.45)] transition ${
                                    manual ? "bg-[#4ad463]" : "bg-[#a4e3b3] opacity-60 cursor-not-allowed"
                                }`}
                                onClick={() => manual && sendCommand("open")}
                                disabled={!manual}
                            >
                                Open
                            </button>
                            <button
                                className={`rounded-2xl py-6 text-2xl font-semibold text-white shadow-[0_20px_45px_rgba(224,106,118,0.45)] transition ${
                                    manual ? "bg-[#e06a76]" : "bg-[#f1b5bb] opacity-60 cursor-not-allowed"
                                }`}
                                onClick={() => manual && sendCommand("close")}
                                disabled={!manual}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 text-lg font-medium ${isNight ? "text-slate-100" : "text-slate-600"}`}>
                        <span className="h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.9)]" />
                        System Online
                    </div>
                </section>
            </main>

            {/* Modals */}
            <AutoTimeModal
                open={autoModalOpen}
                onClose={() => setAutoModalOpen(false)}
                onSaved={loadSchedule}
            />
            <DisableScheduleModal
                open={disableModalOpen}
                onClose={() => setDisableModalOpen(false)}
                onConfirm={(choice) => handleDisableSchedule(choice)}
                initialChoice={disableChoice}
            />
        </div>
    );
}
