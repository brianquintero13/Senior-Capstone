import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setPasswordResetMeta } from "@/lib/settingsStore";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Demo: accept any current/new password payload and mark the reset timestamp
  await req.json().catch(() => ({}));
  const meta = setPasswordResetMeta(session.user.email);
  return NextResponse.json({ ok: true, meta });
}
