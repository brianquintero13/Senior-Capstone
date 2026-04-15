import { NextResponse } from "next/server";
import { motorController } from "../../../lib/motorController.js";
import { shadeStateManager } from "../../../lib/shadeStateManager.js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const currentState = await motorController.getCurrentShadeState();
    return NextResponse.json({ state: currentState });
  } catch (error) {
    console.error("Shade state error:", error);
    return NextResponse.json(
      { error: "Failed to get shade state" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { state } = await req.json().catch(() => ({}));
  if (!["open", "closed", "unknown"].includes(String(state || "").toLowerCase())) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const normalized = String(state).toLowerCase();
  const ok = await shadeStateManager.setState(normalized);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update shade state" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: normalized }, { status: 200 });
}
