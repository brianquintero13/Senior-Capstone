import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseService
    .from("devices")
    .select("id, serial_number, status, mode, manual_expires_at")
    .eq("owner_id", session.user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return Response.json({ error: "No device found for this user" }, { status: 404 });
  }

  return Response.json({ device: data });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serialNumber } = await req.json().catch(() => ({}));
  if (!serialNumber) {
    return Response.json({ error: "Missing serialNumber" }, { status: 400 });
  }

  const { data: device, error: findErr } = await supabaseService
    .from("devices")
    .select("id, owner_id, registered_at")
    .eq("serial_number", serialNumber)
    .maybeSingle();

  if (findErr) {
    return Response.json({ error: findErr.message }, { status: 400 });
  }
  if (!device) {
    return Response.json({ error: "Invalid serial number" }, { status: 400 });
  }
  if (device.owner_id && device.owner_id !== session.user.id) {
    return Response.json({ error: "Serial already claimed" }, { status: 409 });
  }

  const { error: claimErr } = await supabaseService
    .from("devices")
    .update({
      owner_id: session.user.id,
      registered_at: device.registered_at || new Date().toISOString(),
    })
    .eq("id", device.id);

  if (claimErr) {
    return Response.json({ error: claimErr.message }, { status: 400 });
  }

  // Optionally seed a default schedule row
  const { error: scheduleSeedErr } = await supabaseService
    .from("schedules")
    .upsert({ device_id: device.id, name: "Default", enabled: true }, { onConflict: "device_id" });

  if (scheduleSeedErr) {
    return Response.json({ error: scheduleSeedErr.message }, { status: 400 });
  }

  return Response.json({ ok: true, deviceId: device.id });
}
