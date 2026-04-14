import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiNotificationService } from "@/lib/aiNotificationService";
import { supabaseService } from "@/lib/supabaseService";
import { aiService } from "@/lib/aiService";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🧪 Creating AI-powered test notification for user:", session.user.id);
    
    // Get user's device info (zip_code column doesn't exist, so get basic device info)
    const { data: device, error: deviceError } = await supabaseService
      .from("devices")
      .select("id, owner_id")
      .eq("owner_id", session.user.id)
      .single();

    console.log("🏠 Device data:", device);
    console.log("🏠 Device error:", deviceError);
    console.log("🏠 User ID:", session.user.id);

    // Get current shade state
    const { data: shadeStateData } = await supabaseService
      .from("shade_states")
      .select("state")
      .eq("id", 1)
      .single();

    const currentShadeState = shadeStateData?.state || "unknown";

    // Get real weather data (use existing weather API instead of aiService)
    let weather = { main: { temp: 0 }, weather: [{ description: "Unknown" }] };
    const defaultZipCode = "33615"; // Tampa, FL
    try {
      console.log("🌤️ Fetching weather for Tampa, FL (zip code: 33615)");
      
      // Use OpenWeather API directly since getWeatherForZip doesn't exist
      const apiKey = process.env.OPEN_WEATHER_API_KEY;
      const geoResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/zip?zip=${defaultZipCode},US&appid=${apiKey}`
      );
      
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&appid=${apiKey}&units=metric`
        );
        
        if (weatherResponse.ok) {
          weather = await weatherResponse.json();
          console.log("🌡️ Raw weather data:", weather);
          console.log("🌡️ Temperature in Celsius:", weather.main.temp);
          console.log("🌡️ Temperature in Fahrenheit:", ((weather.main.temp * 9/5) + 32).toFixed(1));
        }
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
    }

    // Get recent usage patterns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentCommands } = await supabaseService
      .from("device_commands")
      .select("action, created_at")
      .eq("device_id", device?.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    // Generate real AI insights
    let aiInsights = "AI analysis unavailable";
    try {
      console.log("🧠 Calling AI service with data:", {
        weather: weather.weather[0]?.description,
        temp: weather.main.temp,
        shadeState: currentShadeState,
        hasDevice: !!device,
        zipCode: defaultZipCode,
        recentCommandsCount: recentCommands?.length || 0
      });
      
      const insights = await aiService.generateInsightReport(session.user.id, weather, currentShadeState, {});
      
      console.log("✅ AI insights generated:", insights);
      
      const tempFahrenheit = (weather.main.temp * 9/5) + 32;
      const weatherDesc = weather.weather[0]?.description || 'unknown';
      aiInsights = `
🌡️ Current Weather: ${tempFahrenheit.toFixed(1)}°F, ${weatherDesc}
🏠 Shade Status: ${currentShadeState}
💡 AI Suggestion: ${insights.weatherSuggestions || 'AI suggestion unavailable'}

⚡ Energy Tip: ${insights.energyTips || 'Energy tip unavailable'}

📊 Usage Patterns: ${insights.usagePatterns?.message || 'Building your usage patterns...'}
      `.trim();
    } catch (error) {
      console.error("❌ AI insights generation error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        weatherAvailable: !!weather,
        deviceAvailable: !!device,
        zipCode: defaultZipCode
      });
      
      // Fallback to basic weather analysis if AI fails (including rate limits)
      const tempFahrenheit = (weather.main.temp * 9/5) + 32;
      const weatherDesc = weather.weather[0]?.description || 'unknown';
      
      aiInsights = `
🌡️ Current Weather: ${tempFahrenheit.toFixed(1)}°F, ${weatherDesc}
🏠 Shade Status: ${currentShadeState}
💡 Basic Suggestion: ${tempFahrenheit > 75 ? 'It\'s warm outside - consider closing shades to save energy.' : 'Temperature is comfortable for current shade position.'}

⚡ Energy Tip: Regular shade adjustments can save up to 15% on cooling costs.

📊 Usage Patterns: ${recentCommands?.length || 0} manual operations detected in the last 30 days.

🤖 Note: AI analysis temporarily unavailable due to rate limits. Basic weather analysis provided.
      `.trim();
    }

    // Create AI-powered test notification
    const testNotification = {
      type: 'ai_test',
      subject: '🤖 ShadeSync: Live AI Analysis & Weather Alert',
      body: `This is a live AI-powered notification from your ShadeSync system!

${aiInsights}

---
📧 This is a test of your AI notification system. You'll receive real-time alerts like this based on:
• Current weather conditions in your area
• Your shade's current state
• Your usage patterns over time
• Energy optimization opportunities

Stay tuned for intelligent home automation! 🏠✨`,
      priority: 'medium',
      email: session.user.email || 'your-email@example.com'
    };
    
    // Try to send email, but don't fail if it doesn't work
    let emailSent = false;
    let emailError = null;
    
    try {
      await aiNotificationService.sendEmailNotification(testNotification);
      emailSent = true;
    } catch (error) {
      emailError = error.message;
      console.log("Email failed but showing AI content:", error.message);
    }
    
    return NextResponse.json({
      success: true,
      message: emailSent ? "AI-powered test notification sent successfully!" : "AI analysis created (email service needs configuration)",
      notification: {
        subject: testNotification.subject,
        body: testNotification.body,
        type: testNotification.type,
        recipient: testNotification.email
      },
      emailSent,
      emailError,
      aiData: {
        weather: weather.weather[0]?.description || 'unknown',
        temperature: `${((weather.main.temp * 9/5) + 32).toFixed(1)}°F`,
        shadeState: currentShadeState,
        zipCode: defaultZipCode
      }
    });

  } catch (error) {
    console.error("Test AI notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test notification" },
      { status: 500 }
    );
  }
}
