"use client";
import { useEffect, useRef, useState } from "react";
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
  const wifiConfigInFlightRef = useRef(false);
  const wifiClearInFlightRef = useRef(false);
  const esp32IpUpdateInFlightRef = useRef(false);

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
        // System Information
        const serial = document.getElementById("serialNumber");
        const zip = document.getElementById("zipCode");
        const esp32IpMain = document.getElementById("esp32IpMain");
        const serialInputRow = document.getElementById("serialInputRow");
        const zipInputRow = document.getElementById("zipInputRow");
        const serialDisplayRow = document.getElementById("serialDisplayRow");
        const zipDisplayRow = document.getElementById("zipDisplayRow");
        const serialValue = document.getElementById("serialValue");
        const zipValue = document.getElementById("zipValue");

        let serialStr = typeof settings?.system?.serialNumber === "string" ? settings.system.serialNumber : "";
        const zipStr = typeof settings?.system?.zipCode === "string" ? settings.system.zipCode : "";
        const esp32IpStr = typeof settings?.system?.esp32Ip === "string" ? settings.system.esp32Ip : "";

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
        if (esp32IpMain) esp32IpMain.value = esp32IpStr;

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

    // Theme functionality removed - appearance column doesn't exist in database

    const onSaveSystem = async () => {
      const serial = document.getElementById("serialNumber")?.value?.trim();
      const zip = document.getElementById("zipCode")?.value?.trim();
      const esp32Ip = document.getElementById("esp32Ip")?.value?.trim();
      const shouldReturnHome = !serial && zip;

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

      // Persist zip, serial, and esp32Ip to settings store for display
      const payload = {
        system: {
          serialNumber: serial,
          zipCode: zip,
          esp32Ip: esp32Ip,
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

    const onSaveWiFi = async () => {
      if (wifiConfigInFlightRef.current) {
        return;
      }

      setMessage("");
      setError(false);

      const ssid = document.getElementById("wifiSSID")?.value?.trim();
      const password = document.getElementById("wifiPassword")?.value?.trim();

      if (!ssid || !password) {
        setError(true);
        setMessage("Please enter both WiFi name and password");
        return;
      }

      const wifiBtn = document.getElementById("saveWiFiBtn");

      try {
        wifiConfigInFlightRef.current = true;
        if (wifiBtn) wifiBtn.disabled = true;

        const response = await fetch("/api/wifi-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ssid, password }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send WiFi configuration");
        }

        const result = await response.json().catch(() => ({}));
        setError(false);
        setMessage(
          result?.accepted
            ? "Request sent. Device is switching to the new WiFi network."
            : "WiFi configuration sent to device. Device will reboot."
        );
        
        // Clear the form
        document.getElementById("wifiSSID").value = "";
        document.getElementById("wifiPassword").value = "";
      } catch (err) {
        console.error("WiFi config error:", err);
        setError(true);
        setMessage(`Failed to send WiFi configuration: ${err.message}`);
      } finally {
        wifiConfigInFlightRef.current = false;
        if (wifiBtn) wifiBtn.disabled = false;
      }
    };

    const onReconfigureWiFi = async () => {
      if (wifiClearInFlightRef.current) {
        return;
      }

      setMessage("");
      setError(false);

      const esp32Ip = document.getElementById("esp32Ip")?.value?.trim();
      
      if (!esp32Ip) {
        setError(true);
        setMessage("Please enter the device's IP address to reconfigure WiFi");
        return;
      }

      if (!confirm("This will clear the device's WiFi credentials and reboot it into AP mode. You will need to reconnect to 'ShadeSync-Setup' WiFi to configure a new network. Continue?")) {
        return;
      }

      const reconfigureWiFiBtn = document.getElementById("reconfigureWiFiBtn");

      try {
        wifiClearInFlightRef.current = true;
        if (reconfigureWiFiBtn) reconfigureWiFiBtn.disabled = true;

        const response = await fetch("/api/wifi-config/clear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ esp32Ip }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to clear WiFi credentials");
        }

        const result = await response.json().catch(() => ({}));
        setError(false);
        setMessage(
          result?.accepted
            ? "Request sent. Device is rebooting into AP mode."
            : "WiFi credentials cleared. Device is rebooting into AP mode."
        );
      } catch (err) {
        console.error("WiFi clear error:", err);
        setError(true);
        setMessage(`Failed to clear WiFi credentials: ${err.message}`);
      } finally {
        wifiClearInFlightRef.current = false;
        if (reconfigureWiFiBtn) reconfigureWiFiBtn.disabled = false;
      }
    };

    const onUpdateEsp32Ip = async () => {
      if (esp32IpUpdateInFlightRef.current) {
        return;
      }

      setMessage("");
      setError(false);

      const esp32Ip = document.getElementById("esp32IpMain")?.value?.trim();
      
      if (!esp32Ip) {
        setError(true);
        setMessage("Please enter the device's IP address");
        return;
      }

      const updateEsp32IpBtn = document.getElementById("updateEsp32IpBtn");

      try {
        esp32IpUpdateInFlightRef.current = true;
        if (updateEsp32IpBtn) updateEsp32IpBtn.disabled = true;

        const payload = {
          system: {
            esp32Ip: esp32Ip,
          },
        };

        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to update ESP32 IP");
        }

        setError(false);
        setMessage("Device IP address updated successfully");
      } catch (err) {
        console.error("ESP32 IP update error:", err);
        setError(true);
        setMessage(`Failed to update device IP: ${err.message}`);
      } finally {
        esp32IpUpdateInFlightRef.current = false;
        if (updateEsp32IpBtn) updateEsp32IpBtn.disabled = false;
      }
    };

    if (prefBtn) prefBtn.onclick = onSavePrefs;
    if (autoBtn) autoBtn.onclick = onSaveAuto;
    if (systemBtn) systemBtn.onclick = onSaveSystem;
    if (updateSerialBtn) updateSerialBtn.onclick = onUpdateSerial;
    if (updateZipBtn) updateZipBtn.onclick = onUpdateZip;
    const wifiBtn = document.getElementById("saveWiFiBtn");
    if (wifiBtn) wifiBtn.onclick = onSaveWiFi;
    const reconfigureWiFiBtn = document.getElementById("reconfigureWiFiBtn");
    if (reconfigureWiFiBtn) reconfigureWiFiBtn.onclick = onReconfigureWiFi;
    const updateEsp32IpBtn = document.getElementById("updateEsp32IpBtn");
    if (updateEsp32IpBtn) updateEsp32IpBtn.onclick = onUpdateEsp32Ip;

    return () => {
      if (prefBtn) prefBtn.onclick = null;
      if (autoBtn) autoBtn.onclick = null;
      if (systemBtn) systemBtn.onclick = null;
      if (updateSerialBtn) updateSerialBtn.onclick = null;
      if (updateZipBtn) updateZipBtn.onclick = null;
      if (wifiBtn) wifiBtn.onclick = null;
      if (reconfigureWiFiBtn) reconfigureWiFiBtn.onclick = null;
      if (updateEsp32IpBtn) updateEsp32IpBtn.onclick = null;
    };
  }, []);

  return (
    <>
      <ToastPortal>
        <ToastContainer position="top-right" autoClose={2500} newestOnTop closeOnClick pauseOnHover />
      </ToastPortal>
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
