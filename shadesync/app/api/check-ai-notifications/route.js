import { NextResponse } from "next/server";
import { aiNotificationService } from "@/lib/aiNotificationService";
import { supabaseService } from "@/lib/supabaseService";

export async function POST() {
  try {
    // This endpoint can be called by a cron job service
    console.log("🔍 Starting AI notification check...");
    
    // Get all users with devices
    const { data: devices, error: devicesError } = await supabaseService
      .from("devices")
      .select("owner_id")
      .not("owner_id", "is", null);

    if (devicesError) {
      throw new Error("Failed to fetch devices");
    }

    const uniqueUserIds = [...new Set(devices?.map(d => d.owner_id) || [])];
    console.log(`Checking notifications for ${uniqueUserIds.length} users`);

    let totalNotifications = 0;
    const results = [];

    for (const userId of uniqueUserIds) {
      try {
        const notifications = await aiNotificationService.checkAndSendNotifications(userId);
        totalNotifications += notifications?.length || 0;
        
        if (notifications && notifications.length > 0) {
          results.push({
            userId,
            notificationsSent: notifications.length,
            types: notifications.map(n => n.type)
          });
        }
      } catch (userError) {
        console.error(`Error checking notifications for user ${userId}:`, userError);
      }
    }

    console.log(`✅ AI notification check complete. Sent ${totalNotifications} notifications`);

    return NextResponse.json({
      success: true,
      usersChecked: uniqueUserIds.length,
      totalNotifications,
      results
    });

  } catch (error) {
    console.error("AI notification check error:", error);
    return NextResponse.json(
      { error: "Failed to check AI notifications" },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET() {
  return POST();
}
