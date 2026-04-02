import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile, saveUserProfile } from "@/lib/databaseSettingsStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getUserProfile(session.user.id);
    return NextResponse.json({ profile, email: session.user.email });
  } catch (err) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { name } = body || {};
    const updated = await saveUserProfile(session.user.id, { name: name ?? "" });
    return NextResponse.json({ profile: updated, email: session.user.email });
  } catch (err) {
    console.error("Profile POST error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
