"use client";

export default function SmartRoutineModal({ open, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white/95 px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,28,46,0.35)]">
                <h2 className="mb-3 text-2xl font-semibold text-slate-900">
                    Smart Routine is a Premium Feature
                </h2>
                <p className="mb-6 text-sm text-slate-600">
                    You need to upgrade your subscription to access Smart Routine
                    scheduling. Go to your account settings to view and manage your plan.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
