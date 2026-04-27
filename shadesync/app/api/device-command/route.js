import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { getResolvedDeviceMode, saveDeviceMode } from "@/lib/deviceModeStore";
import { motorController } from "@/lib/motorController";
import { incrementManualOperationCount, getUserSettings } from "@/lib/databaseSettingsStore";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = ["open", "close"];
const DEFAULT_MANUAL_OVERRIDE_MINUTES = 45;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, source = "manual" } = await req.json().catch(() => ({}));
  if (!ALLOWED_ACTIONS.includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  let device = null;
  let mode = null;
  let manualExpiresAt = null;

  const { data: deviceRow, error: deviceErr } = await supabaseService
    .from("devices")
    .select('id, "mode", manual_expires_at')
    .eq("owner_id", session.user.id)
    .maybeSingle();

  if (deviceErr) {
    const errMsg = deviceErr.message?.toLowerCase() || "";
    const schemaMissing =
      errMsg.includes("'mode' column") ||
      errMsg.includes("manual_expires_at") ||
      errMsg.includes("within group is required for ordered-set aggregate mode");
    if (!schemaMissing) {
      return Response.json({ error: deviceErr.message }, { status: 400 });
    }
    const { data: fallbackDevice, error: fallbackErr } = await supabaseService
      .from("devices")
      .select("id")
      .eq("owner_id", session.user.id)
      .maybeSingle();
    if (fallbackErr) {
      return Response.json({ error: fallbackErr.message }, { status: 400 });
    }
    device = fallbackDevice;
  } else {
    device = deviceRow;
    mode = deviceRow?.mode || null;
    manualExpiresAt = deviceRow?.manual_expires_at || null;
  }

  if (!device) {
    return Response.json({ error: "No device found for this user" }, { status: 404 });
  }

  const storedMode = getResolvedDeviceMode(device.id);
  if (mode) {
    saveDeviceMode(device.id, mode, manualExpiresAt);
  } else if (storedMode?.mode) {
    mode = storedMode.mode;
    manualExpiresAt = storedMode.manual_expires_at || null;
  }

  const expiresAt = manualExpiresAt || storedMode.manual_expires_at;
  const hasExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const effectiveMode = hasExpired ? "auto" : mode || storedMode.mode || "auto";
  if (hasExpired) {
    saveDeviceMode(device.id, "auto", null);
  }
  const manualOverrideActive = effectiveMode === "manual" && Boolean(expiresAt) && !hasExpired;

  if (source === "manual" && effectiveMode === "manual") {
    const overrideMinutes = Number(process.env.MANUAL_OVERRIDE_MINUTES || DEFAULT_MANUAL_OVERRIDE_MINUTES);
    const overrideExpiresAt = new Date(Date.now() + Math.max(1, overrideMinutes) * 60 * 1000).toISOString();

    const { error: overrideErr } = await supabaseService
      .from("devices")
      .update({ mode: "manual", manual_expires_at: overrideExpiresAt })
      .eq("id", device.id);

    if (overrideErr) {
      const errMsg = overrideErr.message?.toLowerCase() || "";
      const schemaMissing =
        errMsg.includes("'mode' column") ||
        errMsg.includes("manual_expires_at") ||
        errMsg.includes("within group is required for ordered-set aggregate mode");
      if (!schemaMissing) {
        return Response.json({ error: overrideErr.message }, { status: 400 });
      }
    }

    saveDeviceMode(device.id, "manual", overrideExpiresAt);
  }

  // Fetch ESP32 IP from user settings for this command
  let esp32Ip = null;
  try {
    const userSettings = await getUserSettings(session.user.id);
    esp32Ip = userSettings?.system?.esp32Ip;
    if (esp32Ip) {
      console.log(`Using ESP32 IP from user settings: ${esp32Ip}`);
    }
  } catch (err) {
    console.log(`Failed to get ESP32 IP from settings: ${err?.message}`);
  }

  try {
    const result = await motorController.sendCommand(action, esp32Ip);
    if (result.code === "REDUNDANT_OPERATION") {
      return Response.json(
        { 
          error: result.message,
          code: "REDUNDANT_OPERATION",
          allowed: false
        },
        { status: 200 } // Not really an error, just blocked
      );
    }
    if (result.code === "BUSY") {
      return Response.json(
        { error: "Motor is busy", status: motorController.getSnapshot() },
        { status: 409 }
      );
    }
    if (result.code === "INVALID_ACTION") {
      return Response.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
    if (result.code === "SERIAL_PORT_MISSING") {
      return Response.json(
        { error: "Hardware serial port is not configured" },
        { status: 503 }
      );
    }
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to dispatch motor command" }, { status: 500 });
  }

  // Persist command history for auditability.
  const { error: logErr } = await supabaseService
    .from("device_commands")
    .insert({
      device_id: device.id,
      action,
      created_at: new Date().toISOString(),
    });

  if (logErr) {
    return Response.json({ error: logErr.message }, { status: 400 });
  }

  // Audit trail in manual_commands table (if present)
  await supabaseService
    .from("manual_commands")
    .insert({
      device_id: device.id,
      user_id: session.user.id,
      command: action,
      status: "sent",
      metadata: { source, modeAtCommand: effectiveMode, manualOverrideActive },
    });

  if (source === "manual") {
    try {
      await incrementManualOperationCount(session.user.id);
    } catch (counterErr) {
      console.error("Failed to increment manual operation counter:", counterErr);
    }
  }

  return Response.json({
    ok: true,
    action,
    mode: effectiveMode,
    source,
    manualOverrideActive,
    motor: motorController.getSnapshot(),
  });
}
