import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile, saveUserProfile } from "@/lib/settingsStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = getUserProfile(session.user.email);
  return NextResponse.json({ profile, email: session.user.email });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { name } = body || {};
  const updated = saveUserProfile(session.user.email, { name: name ?? "" });
  return NextResponse.json({ profile: updated, email: session.user.email });
}
