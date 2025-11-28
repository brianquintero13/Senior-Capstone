'use client';

import { useEffect, useState } from "react";

export default function DisableScheduleModal({
  open,
  onClose,
  onConfirm,
  initialChoice = "today",
}) {
  const [choice, setChoice] = useState(initialChoice);

  useEffect(() => {
    if (open) {
      setChoice(initialChoice);
    }
  }, [open, initialChoice]);

  if (!open) return null;

  const handleSave = () => {
    onConfirm?.(choice);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-schedule-heading"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-[#8cb4ff] bg-white p-8 shadow-[0_25px_80px_rgba(15,28,46,0.35)]">
        <div className="absolute inset-x-0 top-0 h-24 rounded-3xl bg-gradient-to-b from-[#e9f2ff] to-transparent" />
        <div className="relative flex flex-col gap-8">
          <div className="flex items-start justify-between">
            <div>
              <h3
                id="disable-schedule-heading"
                className="text-2xl font-bold text-slate-900"
              >
                Disable Schedule
              </h3>
              <p className="mt-2 text-base font-medium text-slate-700">
                How long do you want to disable the schedule?
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

          <div className="flex flex-col gap-4">
            {[
              { value: "today", label: "Just Today" },
              { value: "entire", label: "Entire Schedule" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setChoice(value)}
                className={`w-full rounded-full border-2 px-6 py-3 text-lg font-semibold transition
                  ${
                    choice === value
                      ? "border-[#5c8efa] bg-[#eef4ff] text-slate-900 shadow-inner"
                      : "border-[#5c8efa] bg-white text-slate-800 hover:bg-[#f5f8ff]"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={onClose}
              className="rounded-full border-2 border-[#ff6b6b] px-6 py-3 text-base font-semibold text-slate-800 transition hover:bg-[#fff1f1]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-full border-2 border-[#4ad463] bg-white px-6 py-3 text-base font-semibold text-slate-800 transition hover:bg-[#f3fff7]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
