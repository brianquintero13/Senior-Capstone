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
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-[#8cb4ff] bg-white p-8 shadow-[0_25px_80px_rgba(15,28,46,0.35)]">
        <div className="absolute inset-x-0 top-0 h-24 rounded-3xl bg-gradient-to-b from-[#e9f2ff] to-transparent" />
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
              aria-label="Close dialog"
            >
              ×
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
          <div className="flex w-fit self-center rounded-2xl border-2 border-[#5c8efa] bg-white/80 px-4 py-3 shadow-inner">
            <input
              type="time"
              value={timeInput || ""}
              onChange={(e) => setTimeInput(e.target.value)}
              className="h-14 w-[190px] rounded-xl border border-blue-100 bg-white/90 px-4 text-lg font-semibold text-slate-800 shadow-inner outline-none focus:border-[#5c8efa]"
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

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={onClose}
              className="rounded-full border-2 border-[#ff6b6b] bg-white px-6 py-3 text-base font-semibold text-slate-800 transition hover:bg-[#fff1f1]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTime}
              className="rounded-full border-2 border-[#4ad463] bg-white px-6 py-3 text-base font-semibold text-slate-800 transition hover:bg-[#f3fff7]"
            >
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
