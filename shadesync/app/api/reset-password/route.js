import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setPasswordResetMeta } from "@/lib/databaseSettingsStore";
import { supabaseService } from "@/lib/supabaseService";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPassword } = await req.json().catch(() => ({}));
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const { error } = await supabaseService.auth.admin.updateUserById(session.user.id, {
      password: newPassword,
    });
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 400 });
    }

    const meta = await setPasswordResetMeta(session.user.id);
    return NextResponse.json({ ok: true, meta });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
