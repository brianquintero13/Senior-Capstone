import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignOutButton from "../components/SignOutButton";
import AccountSettingsBinder from "./AccountSettingsBinder";
import { supabaseService } from "@/lib/supabaseService";

export const metadata = {
  title: "Account Settings | ShadeSync",
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const { data: profileRow } = await supabaseService
    .from("user_settings")
    .select("profile_name")
    .eq("user_id", user.id)
    .single();
  const profileName = profileRow?.profile_name || user?.name || "—";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#87b5ff] via-[#bcd9ff] to-[#eef4ff] text-[#0f1c2e]">
      {/* Back Button */}
      <div className="absolute left-6 top-6 z-20">
        <a
          href="/"
          className="rounded-full border border-white/60 bg-white/40 px-5 py-2 text-sm font-semibold text-[#0f1c2e] shadow-[0_10px_30px_rgba(52,101,183,0.25)] backdrop-blur transition hover:bg-white/70"
        >
          ← Back
        </a>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-16">
        <section className="w-full rounded-[32px] border border-white/30 bg-white/60 px-8 py-8 shadow-[0_25px_80px_rgba(52,101,183,0.3)] backdrop-blur-2xl sm:px-16">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Account Settings</h1>
            <p className="mt-2 text-sm text-slate-600">Manage your ShadeSync account.</p>
          </div>
          <AccountSettingsBinder />

          <div className="flex flex-col gap-8">

            {/* Profile */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
              <p className="mt-2 text-slate-700">
                <span className="font-medium">Name:</span> {profileName}
              </p>
              <p className="text-slate-700">
                <span className="font-medium">Email:</span> {user?.email}
              </p>

              <a
                href="/account/edit"
                className="mt-4 inline-block rounded-lg bg-[#2d4c7c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#3b5d98]"
              >
                Edit Profile
              </a>
            </div>

            {/* System Information */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">System Information</h2>
              <p className="mt-2 text-sm text-slate-600">
                Shades → WiFi Microcontroller → MQTT Broker → Your API → Website
              </p>

              {/* Display rows (visible when values are set) */}
              <div className="mt-4 flex flex-col gap-3">
                <div id="serialDisplayRow" className="hidden items-center justify-between gap-4 sm:flex">
                  <div className="text-slate-800">
                    <span className="font-medium">Serial Number:</span> <span id="serialValue" />
                  </div>
                  <button id="updateSerialBtn" className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-white">
                    Update
                  </button>
                </div>

                <div id="zipDisplayRow" className="hidden items-center justify-between gap-4 sm:flex">
                  <div className="text-slate-800">
                    <span className="font-medium">ZIP Code:</span> <span id="zipValue" />
                  </div>
                  <button id="updateZipBtn" className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-white">
                    Update
                  </button>
                </div>
              </div>

              {/* Input rows (visible when values are missing or when updating) */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label id="serialInputRow" className="flex flex-col">
                  <span className="font-medium text-slate-800">Serial Number</span>
                  <input
                    id="serialNumber"
                    placeholder="e.g., SS-ABC123456"
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label id="zipInputRow" className="flex flex-col">
                  <span className="font-medium text-slate-800">ZIP Code</span>
                  <input
                    id="zipCode"
                    inputMode="numeric"
                    placeholder="e.g., 94016"
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <button
                id="saveSystemBtn"
                className="mt-4 rounded-lg bg-[#2d4c7c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#3b5d98]"
              >
                Save System Info
              </button>
            </div>

            {/* Change Password */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              <p className="mt-2 text-slate-700">
                Change your password or recover your account.
              </p>

              <a
                href="/reset-password"
                className="mt-4 inline-block rounded-lg bg-[#4069b3] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#4c79c9]"
              >
                Change Password
              </a>
            </div>

            {/* Notification Preferences */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>

              <div className="mt-4 flex flex-col gap-3 text-slate-700">
                {[
                  ["Device alerts (low battery, motor jam)", "notifDeviceAlerts"],
                  ["Schedule notifications", "notifSchedule"],
                  ["Automation updates", "notifAutomation"],
                  ["System announcements", "notifAnnouncements"],
                ].map(([label, id]) => (
                  <label key={id} className="flex items-center justify-between">
                    <span>{label}</span>
                    <input
                      id={id}
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 accent-[#2d4c7c]"
                    />
                  </label>
                ))}
              </div>

              <button
                id="savePreferencesBtn"
                className="mt-4 rounded-lg bg-[#2d4c7c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#3b5d98]"
              >
                Save Preferences
              </button>
            </div>

            {/* Default Automation */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Default Automation Settings</h2>

              <div className="mt-4 flex flex-col gap-4 text-slate-700">
                <label className="flex flex-col">
                  <span className="font-medium">Opening Position (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="e.g., 75"
                    id="openingPosition"
                  />
                </label>

                <label className="flex flex-col">
                  <span className="font-medium">Sunlight Sensitivity</span>
                  <select id="sunlightSensitivity" className="mt-1 rounded-lg border border-slate-300 px-3 py-2">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>

              <button
                id="saveAutomationBtn"
                className="mt-4 rounded-lg bg-[#2d4c7c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#3b5d98]"
              >
                Save Automation Defaults
              </button>
            </div>

            {/* Theme */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
              <p className="mt-2 text-slate-700">Choose how ShadeSync looks on your device.</p>

              <select id="themeSelect" className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>

              <button
                id="saveThemeBtn"
                className="mt-4 rounded-lg bg-[#2d4c7c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#3b5d98]"
              >
                Save Theme
              </button>
            </div>

            {/* Sign Out */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Sign out</h3>
                <p className="text-sm text-slate-600">Sign out of this device.</p>
              </div>
              <SignOutButton />
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
