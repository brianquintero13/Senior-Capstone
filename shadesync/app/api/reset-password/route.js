import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setPasswordResetMeta } from "@/lib/settingsStore";
import { supabaseService } from "@/lib/supabaseService";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPassword } = await req.json().catch(() => ({}));
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { error } = await supabaseService.auth.admin.updateUserById(session.user.id, {
    password: newPassword,
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 400 });
  }

  const meta = setPasswordResetMeta(session.user.email);
  return NextResponse.json({ ok: true, meta });
}
