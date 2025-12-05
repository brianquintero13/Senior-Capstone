"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ToastPortal from "../components/ToastPortal";

export default function AccountSettingsBinder() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shouldReturnHome, setShouldReturnHome] = useState(false);

  useEffect(() => {
    const missingSerial = searchParams?.get("missingSerial");
    if (missingSerial) {
      toast.warn("Please configure your serial number to continue.", {
        toastId: "missing-serial",
      });
      setShouldReturnHome(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load settings");
        const { settings } = await res.json();
        if (!mounted) return;
        // Populate Notification checkboxes
        const notifMap = [
          ["notifDeviceAlerts", settings?.notifications?.deviceAlerts],
          ["notifSchedule", settings?.notifications?.scheduleNotifications],
          ["notifAutomation", settings?.notifications?.automationUpdates],
          ["notifAnnouncements", settings?.notifications?.systemAnnouncements],
        ];
        notifMap.forEach(([id, val]) => {
          const el = document.getElementById(id);
          if (el) el.checked = !!val;
        });
        // Automation fields
        const opening = document.getElementById("openingPosition");
        if (opening && typeof settings?.automation?.openingPosition === "number") {
          opening.value = String(settings.automation.openingPosition);
        }
        const sensitivity = document.getElementById("sunlightSensitivity");
        if (sensitivity && settings?.automation?.sunlightSensitivity) {
          sensitivity.value = settings.automation.sunlightSensitivity;
        }
        // Theme
        const theme = document.getElementById("themeSelect");
        if (theme && settings?.appearance?.theme) {
          theme.value = settings.appearance.theme;
        }
        // System Information
        const serial = document.getElementById("serialNumber");
        const zip = document.getElementById("zipCode");
        const serialInputRow = document.getElementById("serialInputRow");
        const zipInputRow = document.getElementById("zipInputRow");
        const serialDisplayRow = document.getElementById("serialDisplayRow");
        const zipDisplayRow = document.getElementById("zipDisplayRow");
        const serialValue = document.getElementById("serialValue");
        const zipValue = document.getElementById("zipValue");

        let serialStr = typeof settings?.system?.serialNumber === "string" ? settings.system.serialNumber : "";
        const zipStr = typeof settings?.system?.zipCode === "string" ? settings.system.zipCode : "";

        // Prefer device serial from backend if available
        try {
          const deviceRes = await fetch("/api/devices", { cache: "no-store" });
          if (deviceRes.ok) {
            const { device } = await deviceRes.json();
            if (device?.serial_number) {
              serialStr = device.serial_number;
            }
          }
        } catch (e) {
          // ignore device fetch errors here; fallback to settings
        }

        if (serial) serial.value = serialStr;
        if (zip) zip.value = zipStr;

        // Toggle UI based on presence
        if (serialStr) {
          serialInputRow?.classList.add("hidden");
          serialDisplayRow?.classList.remove("hidden");
          if (serialValue) serialValue.textContent = serialStr;
        } else {
          serialInputRow?.classList.remove("hidden");
          serialDisplayRow?.classList.add("hidden");
        }
        if (zipStr) {
          zipInputRow?.classList.add("hidden");
          zipDisplayRow?.classList.remove("hidden");
          if (zipValue) zipValue.textContent = zipStr;
        } else {
          zipInputRow?.classList.remove("hidden");
          zipDisplayRow?.classList.add("hidden");
        }
      } catch (e) {
        setError(true);
        setMessage("Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async (partial) => {
    setSaving(true);
    setMessage("");
    setError(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Settings saved");
      setTimeout(() => setMessage(""), 1200);
    } catch (e) {
      setError(true);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const prefBtn = document.getElementById("savePreferencesBtn");
    const autoBtn = document.getElementById("saveAutomationBtn");
    const themeBtn = document.getElementById("saveThemeBtn");
    const systemBtn = document.getElementById("saveSystemBtn");
    const updateSerialBtn = document.getElementById("updateSerialBtn");
    const updateZipBtn = document.getElementById("updateZipBtn");

    const onSavePrefs = () => {
      const payload = {
        notifications: {
          deviceAlerts: !!document.getElementById("notifDeviceAlerts")?.checked,
          scheduleNotifications: !!document.getElementById("notifSchedule")?.checked,
          automationUpdates: !!document.getElementById("notifAutomation")?.checked,
          systemAnnouncements: !!document.getElementById("notifAnnouncements")?.checked,
        },
      };
      save(payload);
    };

    const onSaveAuto = () => {
      const openingVal = parseInt(document.getElementById("openingPosition")?.value || "0", 10);
      const saneOpening = isNaN(openingVal) ? 0 : Math.min(100, Math.max(0, openingVal));
      const payload = {
        automation: {
          openingPosition: saneOpening,
          sunlightSensitivity: document.getElementById("sunlightSensitivity")?.value || "Medium",
        },
      };
      save(payload);
    };

    const onSaveTheme = () => {
      const payload = {
        appearance: {
          theme: document.getElementById("themeSelect")?.value || "Light",
        },
      };
      save(payload);
    };

    const onSaveSystem = async () => {
      const serialEl = document.getElementById("serialNumber");
      const zipEl = document.getElementById("zipCode");
      const serial = (serialEl?.value || "").trim();
      const zip = (zipEl?.value || "").trim();
      setSaving(true);
      setMessage("");
      setError(false);

      // First, claim serial if provided
      if (serial) {
        try {
          const res = await fetch("/api/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serialNumber: serial }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Serial claim failed");
          }
        } catch (e) {
          setSaving(false);
          setError(true);
          setMessage(e.message || "Serial claim failed");
          return;
        }
      }

      // Persist zip (and optionally serial) to settings store for display
      const payload = {
        system: {
          serialNumber: serial,
          zipCode: zip,
        },
      };

      save(payload).then(() => {
        const serialInputRow = document.getElementById("serialInputRow");
        const zipInputRow = document.getElementById("zipInputRow");
        const serialDisplayRow = document.getElementById("serialDisplayRow");
        const zipDisplayRow = document.getElementById("zipDisplayRow");
        const serialValue = document.getElementById("serialValue");
        const zipValue = document.getElementById("zipValue");
        if (serial) {
          serialInputRow?.classList.add("hidden");
          serialDisplayRow?.classList.remove("hidden");
          if (serialValue) serialValue.textContent = serial;
        }
        if (zip) {
          zipInputRow?.classList.add("hidden");
          zipDisplayRow?.classList.remove("hidden");
          if (zipValue) zipValue.textContent = zip;
        }
        if (shouldReturnHome) {
          setMessage("Serial saved. Returning home...");
          setTimeout(() => router.back(), 600);
        }
      }).catch(() => {
        setError(true);
        setMessage("Error saving system info");
      }).finally(() => setSaving(false));
    };

    const onUpdateSerial = () => {
      document.getElementById("serialInputRow")?.classList.remove("hidden");
      document.getElementById("serialDisplayRow")?.classList.add("hidden");
      // focus input for convenience
      document.getElementById("serialNumber")?.focus();
    };

    const onUpdateZip = () => {
      document.getElementById("zipInputRow")?.classList.remove("hidden");
      document.getElementById("zipDisplayRow")?.classList.add("hidden");
      document.getElementById("zipCode")?.focus();
    };

    prefBtn?.addEventListener("click", onSavePrefs);
    autoBtn?.addEventListener("click", onSaveAuto);
    themeBtn?.addEventListener("click", onSaveTheme);
    systemBtn?.addEventListener("click", onSaveSystem);
    updateSerialBtn?.addEventListener("click", onUpdateSerial);
    updateZipBtn?.addEventListener("click", onUpdateZip);

    return () => {
      prefBtn?.removeEventListener("click", onSavePrefs);
      autoBtn?.removeEventListener("click", onSaveAuto);
      themeBtn?.removeEventListener("click", onSaveTheme);
      systemBtn?.removeEventListener("click", onSaveSystem);
      updateSerialBtn?.removeEventListener("click", onUpdateSerial);
      updateZipBtn?.removeEventListener("click", onUpdateZip);
    };
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={2500} newestOnTop closeOnClick pauseOnHover />
      <div className="mb-4 text-sm text-slate-600">
        {loading ? "Loading settings..." : null}
      </div>
      {Boolean(message || saving) && (
        <ToastPortal>
          <div className="fixed inset-x-0 bottom-4 z-[1000] flex justify-center px-4">
            <div
              className={`rounded-full border px-4 py-2 text-sm shadow backdrop-blur
                ${saving ? "border-blue-200 bg-white/70 text-slate-700" : error ? "border-red-200 bg-red-50/90 text-red-700" : "border-green-200 bg-white/70 text-slate-800"}`}
            >
              {saving ? "Saving..." : message}
            </div>
          </div>
        </ToastPortal>
      )}
    </>
  );
}
