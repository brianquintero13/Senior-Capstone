import { NextResponse } from "next/server";
import { motorController } from "../../../lib/motorController.js";

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
