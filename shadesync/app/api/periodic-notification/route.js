import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { aiService } from "@/lib/aiService";
import { aiNotificationService } from "@/lib/aiNotificationService";
import { getUserSettings } from "@/lib/databaseSettingsStore";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔔 Starting periodic notification analysis...");

    // Get user's device
    const { data: device } = await supabaseService
      .from("devices")
      .select("id, owner_id")
      .eq("owner_id", session.user.id)
      .single();

    // Get user settings for zip code and notification preferences
    const userSettings = await getUserSettings(session.user.id);
    const userZipCode = userSettings?.system?.zipCode || "33615";
    const userNotifications = userSettings?.notifications || {};
    
    console.log("User notification preferences:", userNotifications);

    // Check if user has any notifications enabled
    const hasEnabledNotifications = Object.values(userNotifications).some(enabled => enabled === true);
    if (!hasEnabledNotifications) {
      console.log("🔕 User has all notifications disabled");
      return NextResponse.json({
        success: true,
        notification_sent: false,
        reason: "All notifications are disabled in user preferences"
      });
    }

    if (!device) {
      return NextResponse.json({ error: "No device found" }, { status: 404 });
    }

    // Get current shade state
    const { data: shadeStateData } = await supabaseService
      .from("shade_states")
      .select("state")
      .eq("id", 1)
      .single();

    const currentShadeState = shadeStateData?.state || "unknown";

    // Get weather data (use user's zip code if available, otherwise Tampa as fallback)
    let weather = { main: { temp: 0 }, weather: [{ description: "Unknown" }] };
    try {
      const apiKey = process.env.OPEN_WEATHER_API_KEY;
      const geoResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/zip?zip=${userZipCode},US&appid=${apiKey}`
      );
      
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&appid=${apiKey}&units=metric`
        );
        
        if (weatherResponse.ok) {
          weather = await weatherResponse.json();
        }
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
    }

    // Get recent operations (last 24 hours for daily check, or last 5 operations for pattern check)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: recentCommands } = await supabaseService
      .from("device_commands")
      .select("action, created_at")
      .eq("device_id", device.id)
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Get current schedule
    const { data: scheduleData } = await supabaseService
      .from("schedules")
      .select("entries")
      .eq("id", 1)
      .single();

    const schedule = scheduleData?.entries || {};

    // Use AI to determine if notification should be sent
    const aiDecision = await aiService.analyzeForNotification(
      session.user.id,
      weather,
      currentShadeState,
      schedule,
      recentCommands
    );

    console.log("🤖 AI Decision:", aiDecision);

    if (aiDecision.should_notify) {
      // Check if this notification type is enabled by user preferences
      const typeMapping = {
        'weather_alert': 'deviceAlerts',
        'device_alert': 'deviceAlerts',
        'pattern_suggestion': 'automationUpdates',
        'pattern_insight': 'automationUpdates',
        'schedule_suggestion': 'scheduleNotifications',
        'schedule_status': 'scheduleNotifications',
        'system': 'systemAnnouncements',
        'system_alert': 'systemAnnouncements',
        'automation': 'automationUpdates',
      };

      const preferenceKey = typeMapping[aiDecision.notification_type] || 'deviceAlerts';
      if (!userNotifications[preferenceKey]) {
        console.log(`🔕 Notification type '${aiDecision.notification_type}' is disabled by user preferences`);
        return NextResponse.json({
          success: true,
          notification_sent: false,
          reason: `Notification type '${aiDecision.notification_type}' is disabled in user preferences`
        });
      }

      console.log("📧 Sending notification based on AI decision...");
      
      const notification = {
        type: aiDecision.notification_type,
        subject: `🤖 ShadeSync: ${aiDecision.notification_type.replace('_', ' ').toUpperCase()}`,
        body: aiDecision.message,
        priority: aiDecision.priority,
        email: session.user.email
      };

      try {
        await aiNotificationService.sendEmailNotification(notification);
        console.log("✅ Notification sent successfully");
        
        return NextResponse.json({
          success: true,
          notification_sent: true,
          notification_type: aiDecision.notification_type,
          priority: aiDecision.priority,
          reason: aiDecision.reason
        });
      } catch (emailError) {
        console.error("❌ Failed to send notification:", emailError);
        return NextResponse.json({
          success: false,
          notification_sent: false,
          error: emailError.message,
          ai_decision: aiDecision
        }, { status: 500 });
      }
    } else {
      console.log("🔕 AI decided not to send notification:", aiDecision.reason);
      return NextResponse.json({
        success: true,
        notification_sent: false,
        reason: aiDecision.reason
      });
    }

  } catch (error) {
    console.error("❌ Periodic notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process periodic notification" },
      { status: 500 }
    );
  }
}
