import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSettings, saveUserSettings } from "@/lib/databaseSettingsStore";

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
    const updated = await saveUserSettings(session.user.id, body || {});
    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error("Settings POST error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
