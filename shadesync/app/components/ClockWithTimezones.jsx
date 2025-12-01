"use client";

import React, { useEffect, useState } from "react";

const TIMEZONES = [
    { label: "Eastern Time (EST)", short: "EST", value: "America/New_York" },
    { label: "Central Time (CST)", short: "CST", value: "America/Chicago" },
    { label: "Mountain Time (MST)", short: "MST", value: "America/Denver" },
    { label: "Pacific Time (PST)", short: "PST", value: "America/Los_Angeles" },
    { label: "UTC", short: "UTC", value: "UTC" },
    { label: "London (GMT)", short: "GMT", value: "Europe/London" },
    { label: "Berlin (CET)", short: "CET", value: "Europe/Berlin" },
    { label: "Dubai (GST)", short: "GST", value: "Asia/Dubai" },
    { label: "Tokyo (JST)", short: "JST", value: "Asia/Tokyo" },
    { label: "Sydney (AEST)", short: "AEST", value: "Australia/Sydney" },
];

function ClockWithTimezones() {
    const [selectedZone, setSelectedZone] = useState("America/New_York");
    const [now, setNow] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const activeZone =
        TIMEZONES.find((tz) => tz.value === selectedZone) || TIMEZONES[0];

    if (!now) {
        return (
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-baseline gap-2">
          <span className="text-[64px] font-semibold leading-none tracking-tight text-slate-900">
            --:--
          </span>
                    <button
                        type="button"
                        className="mb-1 rounded-full bg-white/70 px-3 py-1 text-lg font-semibold text-slate-600 shadow-inner border border-blue-100"
                    >
                        {activeZone.short}
                    </button>
                </div>
            </div>
        );
    }

    const timeString = now.toLocaleTimeString("en-US", {
        timeZone: selectedZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    const dateString = now.toLocaleDateString("en-US", {
        timeZone: selectedZone,
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
    });

    return (
        <div className="relative flex flex-col items-center gap-3">
            {/* Big time + clickable timezone badge */}
            <div className="flex items-baseline gap-3">
        <span className="text-[72px] font-semibold leading-none tracking-tight text-slate-900">
          {timeString}
        </span>

                <button
                    type="button"
                    onClick={() => setShowMenu((s) => !s)}
                    className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold uppercase text-slate-600 shadow-inner border border-blue-100 cursor-pointer hover:bg-white"
                >
                    <span>{activeZone.short}</span>
                    <span className="text-xs text-slate-500">
            {showMenu ? "▲" : "▼"}
          </span>
                </button>
            </div>

            <span className="text-sm text-slate-600">{dateString}</span>

            {/* Dropdown TIMEZONE MENU under the EST pill */}
            {showMenu && (
                <div className="absolute top-[95px] right-0 z-50 w-40 rounded-xl border border-blue-100 bg-white shadow-xl">
                    <ul className="py-1 text-sm text-slate-700">
                        {TIMEZONES.map((tz) => (
                            <li
                                key={tz.value}
                                onClick={() => {
                                    setSelectedZone(tz.value);
                                    setShowMenu(false);
                                }}
                                className="cursor-pointer px-3 py-2 hover:bg-blue-50 rounded-lg transition select-none"
                            >
                                {tz.short} — {tz.label.replace(` (${tz.short})`, "")}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ClockWithTimezones;
