import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, until } = await req.json().catch(() => ({}));
  if (!["manual", "auto"].includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
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

  const payload = {
    mode,
    manual_expires_at: mode === "manual" && until ? new Date(until).toISOString() : null,
  };

  const { error: updateErr } = await supabaseService
    .from("devices")
    .update(payload)
    .eq("id", device.id);

  if (updateErr) {
    return Response.json({ error: updateErr.message }, { status: 400 });
  }

  return Response.json({ ok: true, mode: payload.mode, manual_expires_at: payload.manual_expires_at });
}
