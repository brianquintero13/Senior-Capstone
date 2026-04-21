import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";
import { aiService } from "@/lib/aiService";
import { getUserSettings } from "@/lib/databaseSettingsStore";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🤖 Generating AI insights with OpenAI...");

    // Get user device info
    const { data: device, error: deviceError } = await supabaseService
      .from("devices")
      .select("id, owner_id")
      .eq("owner_id", session.user.id)
      .limit(1)
      .single();

    // Get user settings for zip code
    const userSettings = await getUserSettings(session.user.id);
    const userZipCode = userSettings?.system?.zipCode || "33615";

    if (deviceError || !device) {
      console.log("No device found, returning default insights");
      return NextResponse.json({
        weatherSuggestions: "No device configured for weather-based suggestions.",
        energyTips: "Configure your device to receive personalized energy saving tips.",
        scheduleSuggestions: "No schedule currently set. AI can help you create an optimal schedule based on your usage patterns and local weather patterns.",
        usagePatterns: { message: "Start using your shades manually to build usage patterns, then AI can suggest optimal schedules." },
        timestamp: new Date().toISOString()
      });
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

    // Get schedule data
    const { data: scheduleData } = await supabaseService
      .from("schedules")
      .select("entries")
      .eq("id", 1)
      .single();

    const schedule = scheduleData?.entries || {};

    // Get recent usage patterns (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentCommands } = await supabaseService
      .from("device_commands")
      .select("action, created_at")
      .eq("device_id", device.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    // Generate AI insights using OpenAI
    try {
      const insights = await aiService.generateInsightReport(session.user.id, weather, currentShadeState, schedule);
      console.log("✅ AI insights generated successfully with OpenAI");
      return NextResponse.json(insights);
    } catch (aiError) {
      console.error("❌ AI insights generation error:", aiError);
      // Return fallback insights if AI fails
      const tempFahrenheit = (weather.main.temp * 9/5) + 32;
      const weatherDesc = weather.weather[0]?.description || 'unknown';
      
      return NextResponse.json({
        weatherSuggestions: `It's ${tempFahrenheit.toFixed(1)}°F and ${weatherDesc}. ${tempFahrenheit > 75 ? 'Consider closing shades to save energy.' : 'Current temperature is comfortable.'}`,
        energyTips: "Regular shade adjustments can save up to 15% on cooling costs.",
        scheduleSuggestions: "AI schedule optimization temporarily unavailable due to rate limits.",
        usagePatterns: { 
          message: `${recentCommands?.length || 0} manual operations detected in the last 30 days.`,
          totalOperations: recentCommands?.length || 0
        },
        timestamp: new Date().toISOString(),
        note: "AI analysis temporarily unavailable due to rate limits. Basic analysis provided."
      });
    }

  } catch (error) {
    console.error("❌ AI Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 }
    );
  }
}
