import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSettings, saveUserSettings } from "@/lib/databaseSettingsStore";
import { supabaseService } from "@/lib/supabaseService";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getUserSettings(session.user.id);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    console.log("Saving settings:", body);
    
    // Try to ensure user_settings table has proper structure
    try {
      await supabaseService.rpc('ensure_user_settings_structure');
    } catch (e) {
      console.log("Structure check skipped:", e.message);
    }
    
    const updated = await saveUserSettings(session.user.id, body || {});
    console.log("Settings saved successfully:", updated);
    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error("Settings POST error:", err);
    return NextResponse.json({ error: "Failed to save settings", details: err.message }, { status: 500 });
  }
}
