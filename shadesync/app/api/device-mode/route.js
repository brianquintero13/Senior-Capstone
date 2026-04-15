import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { getResolvedDeviceMode, saveDeviceMode } from "@/lib/deviceModeStore";

async function getDeviceForSession(session) {
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
      throw new Error(deviceErr.message);
    }

    const { data: fallbackDevice, error: fallbackErr } = await supabaseService
      .from("devices")
      .select("id")
      .eq("owner_id", session.user.id)
      .maybeSingle();
    if (fallbackErr) {
      throw new Error(fallbackErr.message);
    }
    device = fallbackDevice;
  } else {
    device = deviceRow;
    mode = deviceRow?.mode || null;
    manualExpiresAt = deviceRow?.manual_expires_at || null;
  }

  return { device, mode, manualExpiresAt };
}

function resolveMode(deviceId, mode, manualExpiresAt) {
  const storedMode = getResolvedDeviceMode(deviceId);
  let resolvedMode = mode;
  let resolvedExpires = manualExpiresAt;

  if (resolvedMode) {
    saveDeviceMode(deviceId, resolvedMode, resolvedExpires);
  } else if (storedMode?.mode) {
    resolvedMode = storedMode.mode;
    resolvedExpires = storedMode.manual_expires_at || null;
  }

  const expiresAt = resolvedExpires || storedMode?.manual_expires_at;
  const hasExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const effectiveMode = hasExpired ? "auto" : resolvedMode || storedMode?.mode || "auto";
  if (hasExpired) {
    saveDeviceMode(deviceId, "auto", null);
  }
  return { mode: effectiveMode, manual_expires_at: hasExpired ? null : resolvedExpires || null };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { device, mode, manualExpiresAt } = await getDeviceForSession(session);
    if (!device) {
      return Response.json({ error: "No device found for this user" }, { status: 404 });
    }
    const resolved = resolveMode(device.id, mode, manualExpiresAt);
    return Response.json({ ok: true, mode: resolved.mode, manual_expires_at: resolved.manual_expires_at }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load mode" }, { status: 400 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, until } = await req.json().catch(() => ({}));
  if (!["manual", "auto"].includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  let device = null;
  try {
    const result = await getDeviceForSession(session);
    device = result.device;
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load device" }, { status: 400 });
  }
  if (!device) {
    return Response.json({ error: "No device found for this user" }, { status: 404 });
  }

  const payload = {
    mode,
    manual_expires_at: mode === "manual" && until ? new Date(until).toISOString() : null,
  };

  const { error: updateErr } = await supabaseService
    .from("devices")
    .update(payload)
    .eq("id", device.id);

  if (updateErr) {
    const errMsg = updateErr.message?.toLowerCase() || "";
    const schemaMissing =
      errMsg.includes("'mode' column") ||
      errMsg.includes("manual_expires_at") ||
      errMsg.includes("within group is required for ordered-set aggregate mode");
    if (schemaMissing) {
      const stored = saveDeviceMode(device.id, payload.mode, payload.manual_expires_at);
      return Response.json({ ok: true, mode: stored.mode, manual_expires_at: stored.manual_expires_at });
    }
    return Response.json({ error: updateErr.message }, { status: 400 });
  }

  const stored = saveDeviceMode(device.id, payload.mode, payload.manual_expires_at);
  return Response.json({ ok: true, mode: stored.mode, manual_expires_at: stored.manual_expires_at });
}
