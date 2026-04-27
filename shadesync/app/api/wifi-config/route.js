import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSettings } from "@/lib/databaseSettingsStore";

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
    const { ssid, password } = body;

    if (!ssid || !password) {
      return NextResponse.json({ error: "SSID and password are required" }, { status: 400 });
    }

    // Get user settings to find the ESP32 IP address
    const userSettings = await getUserSettings(session.user.id);
    const esp32Ip = userSettings?.system?.esp32Ip || "192.168.4.1"; // Default ESP32 AP IP

    // Send WiFi credentials to ESP32
    const response = await fetch(`http://${esp32Ip}/WIFI_CONFIG?ssid=${encodeURIComponent(ssid)}&password=${encodeURIComponent(password)}`, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ESP32 responded with status: ${response.status}`);
    }

    const result = await response.text();

    return NextResponse.json({ 
      success: true, 
      message: "WiFi credentials sent to ESP32",
      esp32Response: result 
    });
  } catch (err) {
    if (isLikelyRebootDisconnect(err)) {
      return NextResponse.json(
        {
          success: true,
          accepted: true,
          message: "Request sent. Device likely disconnected while rebooting to join the new WiFi network.",
        },
        { status: 202 }
      );
    }

    console.error("WiFi config error:", err);
    return NextResponse.json({ 
      error: "Failed to send WiFi credentials to ESP32", 
      details: err.message 
    }, { status: 500 });
  }
}
