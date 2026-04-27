import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function isLikelyRebootDisconnect(err) {
  const code = err?.cause?.code;
  const message = String(err?.message || "").toLowerCase();

  return (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "UND_ERR_SOCKET" ||
    message.includes("socket") ||
    message.includes("other side closed")
  );
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { esp32Ip } = body;

    if (!esp32Ip) {
      return NextResponse.json({ error: "ESP32 IP address is required" }, { status: 400 });
    }

    // Send CLEAR_WIFI command to ESP32
    const response = await fetch(`http://${esp32Ip}/CLEAR_WIFI`, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ESP32 responded with status: ${response.status}`);
    }

    const result = await response.text();

    return NextResponse.json({ 
      success: true, 
      message: result 
    });
  } catch (err) {
    if (isLikelyRebootDisconnect(err)) {
      return NextResponse.json(
        {
          success: true,
          accepted: true,
          message: "Request sent. Device likely disconnected while rebooting into AP mode.",
        },
        { status: 202 }
      );
    }

    console.error("WiFi clear error:", err);
    return NextResponse.json({ 
      error: "Failed to clear WiFi credentials", 
      details: err.message 
    }, { status: 500 });
  }
}
