'use client';
import { useState } from 'react'

const defaultSchedule = {
  M: { open: "09:30", close: "" },
  T: { open: "", close: "" },
  W: { open: "07:30", close: "" },
  Th: { open: "", close: "" },
  F: { open: "", close: "" },
  Sa: { open: "10:30", close: "" },
  Su: { open: "", close: "" },
};

export default function AutoTimeModal({ open, onClose }) {
  if (!open) return null;
  const [openShades, setOpenShades] = useState(true);
  const [selectedDay, setSelectedDay] = useState("M");
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [timeInput, setTimeInput] = useState(defaultSchedule.M.open);

  const handleTimeChange = (time) => {
    setSchedule((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [openShades ? "open" : "close"]: time,
      },
    }));
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setTimeInput(schedule[day][openShades ? "open" : "close"] || "");
  };

  const handleToggleShades = (isOpen) => {
    setOpenShades(isOpen);
    setTimeInput(schedule[selectedDay][isOpen ? "open" : "close"] || "");
  };

  const handleSaveTime = () => {
    if (!timeInput) return;
    handleTimeChange(timeInput);
  };

  const formatTimeLabel = (timeString) => {
    if (!timeString) return "";
    const [hourStr, minute] = timeString.split(":");
    const hourNum = Number(hourStr);
    const ampm = hourNum >= 12 ? "pm" : "am";
    const hour12 = ((hourNum + 11) % 12) + 1;
    return `${hour12}:${minute}${ampm}`;
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-time-heading"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/30 bg-white/85 p-8 shadow-[0_25px_80px_rgba(15,28,46,0.35)] backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-24 rounded-3xl bg-gradient-to-br from-[#ffe9a0]/70 via-[#ffd36a]/60 to-[#ffb347]/60 blur-2xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id="auto-time-heading"
                className="text-2xl font-semibold text-slate-900"
              >
                Set Auto Time
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Choose when the shades should open and close automatically.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-600 shadow hover:bg-white"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <div className="flex w-fit self-center items-center rounded-full border border-blue-200 bg-white/60 p-1 text-base font-medium text-slate-600 shadow-inner">
            <button
              onClick={() => handleToggleShades(true)}
              className={`cursor-pointer rounded-full px-6 py-2 transition-all ease-in-out duration-300
                  ${openShades ? "bg-white text-slate-900 shadow-sm" : ""}`}
            >
              Open
            </button>
            <button
              onClick={() => handleToggleShades(false)}
              className={`cursor-pointer rounded-full px-6 py-2  transition-all ease-in-out duration-300 ${
                !openShades ? "bg-white text-slate-900 shadown-sm" : ""
              }`}
            >
              Close
            </button>
          </div>

          {/* Time Set container */}
          <div className="flex w-fit self-center rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 shadow-inner">
            <input
              type="time"
              value={timeInput || ""}
              onChange={(e) => setTimeInput(e.target.value)}
              className="h-14 w-[190px] rounded-xl border border-blue-100 bg-white/90 px-4 text-lg font-semibold text-slate-800 shadow-inner outline-none focus:border-blue-300"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              {Object.entries(schedule).map(([label, times]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => handleSelectDay(label)}
                  className="flex flex-col items-center gap-1 focus:outline-none"
                >
                  <span className="min-h-[14px] text-[11px] font-semibold text-slate-600">
                    {formatTimeLabel(times.open) || "\u00a0"}
                  </span>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold text-slate-800 shadow-inner transition
                      ${
                        selectedDay === label
                          ? "border-[#5c8efa] bg-[#bcd9ff]"
                          : "border-transparent bg-[#dce9ff]"
                      }`}
                  >
                    {label}
                  </div>
                  <span className="min-h-[14px] text-[11px] font-semibold text-slate-600">
                    {formatTimeLabel(times.close) || "\u00a0"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-700 shadow-sm transition hover:bg-white/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTime}
              className="rounded-full bg-[#4ad463] px-6 py-3 text-base font-semibold text-white shadow-[0_15px_40px_rgba(74,212,99,0.45)] transition hover:brightness-105"
            >
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
