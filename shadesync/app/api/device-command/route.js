import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { getResolvedDeviceMode, saveDeviceMode } from "@/lib/deviceModeStore";

const ALLOWED_ACTIONS = ["open", "close", "stop"];

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
    .select("id, mode, manual_expires_at")
    .eq("owner_id", session.user.id)
    .maybeSingle();

  if (deviceErr) {
    const errMsg = deviceErr.message?.toLowerCase() || "";
    const schemaMissing = errMsg.includes("'mode' column") || errMsg.includes("manual_expires_at");
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

  if (effectiveMode === "manual" && source === "schedule") {
    return Response.json({ error: "Device is in manual mode; schedule commands are blocked" }, { status: 409 });
  }

  // For now we just log the command; swap this with real hardware dispatch (MQTT/HTTP) later.
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
      status: "pending",
      metadata: { source, modeAtCommand: effectiveMode },
    })
    .catch(() => {});

  return Response.json({ ok: true, action, mode: effectiveMode, source });
}
