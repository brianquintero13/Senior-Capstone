import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { aiService } from "@/lib/aiService";
import { getUserSettings } from "@/lib/databaseSettingsStore";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🧪 Testing AI function calling with OpenAI API...");

    // Get user's device
    const { data: device } = await supabaseService
      .from("devices")
      .select("id, owner_id")
      .eq("owner_id", session.user.id)
      .single();

    // Get user settings for zip code
    const userSettings = await getUserSettings(session.user.id);
    const userZipCode = userSettings?.system?.zipCode || "33615";

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

    // Get recent operations
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: recentCommands } = await supabaseService
      .from("device_commands")
      .select("action, created_at")
      .eq("device_id", device?.id)
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Get current schedule
    const { data: scheduleData } = await supabaseService
      .from("schedules")
      .select("entries")
      .eq("id", 1)
      .single();

    const schedule = scheduleData?.entries || {};

    // Test AI function calling
    const aiDecision = await aiService.analyzeForNotification(
      session.user.id,
      weather,
      currentShadeState,
      schedule,
      recentCommands || []
    );

    console.log("🎯 AI Function Call Result:", aiDecision);

    return NextResponse.json({
      success: true,
      ai_decision: aiDecision,
      test_data: {
        weather: {
          temp: ((weather.main.temp * 9/5) + 32).toFixed(1) + "°F",
          condition: weather.weather[0]?.description
        },
        shade_state: currentShadeState,
        recent_operations: recentCommands?.length || 0,
        schedule_entries: Object.keys(schedule).length
      },
      message: "AI function calling test completed. Check server logs for OpenAI API usage."
    });

  } catch (error) {
    console.error("❌ AI function calling test error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test AI function calling" },
      { status: 500 }
    );
  }
}
