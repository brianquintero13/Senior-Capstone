import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";

const ALLOWED_ACTIONS = ["open", "close", "stop"];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json().catch(() => ({}));
  if (!ALLOWED_ACTIONS.includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: device, error: deviceErr } = await supabaseService
    .from("devices")
    .select("id")
    .eq("owner_id", session.user.id)
    .maybeSingle();

  if (deviceErr) {
    return Response.json({ error: deviceErr.message }, { status: 400 });
  }
  if (!device) {
    return Response.json({ error: "No device found for this user" }, { status: 404 });
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

  return Response.json({ ok: true, action });
}
