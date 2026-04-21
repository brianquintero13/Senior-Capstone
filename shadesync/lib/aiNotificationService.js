import { createClient } from '@supabase/supabase-js';
import { aiService } from './aiService.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AINotificationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.notificationHistory = new Map(); // Track recent notifications to avoid spam
  }

  async checkAndSendNotifications(userId) {
    try {
      console.log("🔔 Checking for AI-powered notifications...");
      
      // Get user's device
      const { data: device } = await supabase
        .from("devices")
        .select("id, owner_id")
        .eq("owner_id", userId)
        .single();

      if (!device) {
        console.log("No device found for user:", userId);
        return [];
      }

      // Get user's email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        console.log("No email found for user:", userId);
        return [];
      }

      // Get current shade state
      const { data: shadeStateData } = await supabase
        .from("shade_states")
        .select("state")
        .eq("id", 1)
        .single();

      const currentShadeState = shadeStateData?.state || "unknown";

      // Get weather data (use Tampa as default)
      let weather = { main: { temp: 0 }, weather: [{ description: "Unknown" }] };
      const defaultZipCode = "33615";
      try {
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
          }
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      }

      // Get recent operations (last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const { data: recentCommands } = await supabase
        .from("device_commands")
        .select("action, created_at")
        .eq("device_id", device.id)
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Get current schedule
      const { data: scheduleData } = await supabase
        .from("schedules")
        .select("entries")
        .eq("id", 1)
        .single();

      const schedule = scheduleData?.entries || {};

      // Use AI to determine if notification should be sent
      const aiDecision = await aiService.analyzeForNotification(
        userId,
        weather,
        currentShadeState,
        schedule,
        recentCommands || []
      );

      console.log("🤖 AI Notification Decision:", aiDecision);

      if (aiDecision.should_notify) {
        // Check if we recently sent a similar notification to avoid spam
        const notificationKey = `${userId}_${aiDecision.notification_type}`;
        const lastSent = this.notificationHistory.get(notificationKey);
        const now = Date.now();
        
        // Don't send same notification type within 1 hour (except high priority)
        if (aiDecision.priority !== 'high' && lastSent && (now - lastSent) < 3600000) {
          console.log("🔕 Skipping notification - recently sent similar notification");
          return [];
        }

        const notification = {
          type: aiDecision.notification_type,
          subject: `🤖 ShadeSync: ${aiDecision.notification_type.replace('_', ' ').toUpperCase()}`,
          body: aiDecision.message,
          priority: aiDecision.priority,
          email: userEmail
        };

        await this.sendEmailNotification(notification);
        
        // Track this notification
        this.notificationHistory.set(notificationKey, now);
        
        console.log("✅ AI-powered notification sent successfully");
        return [notification];
      } else {
        console.log("🔕 AI decided not to send notification:", aiDecision.reason);
        return [];
      }
    } catch (error) {
      console.error("Error in AI notification service:", error);
      throw error;
    }
  }

  async generateNotifications(weather, shadeState, recentCommands, userEmail) {
    const notifications = [];
    const tempFahrenheit = (weather.main.temp * 9/5) + 32;

    // Weather-based notification
    if (tempFahrenheit > 75 && shadeState === 'open') {
      notifications.push({
        type: 'weather_alert',
        subject: '🌡️ ShadeSync: Hot Weather Alert',
        body: `It's currently ${tempFahrenheit.toFixed(1)}°F outside and your shades are open. Consider closing them to keep your home cool and save on energy costs.`,
        priority: 'high',
        email: userEmail
      });
    }

    // Pattern-based notification
    if (recentCommands.length > 0) {
      const manualCommands = recentCommands.filter(cmd => cmd.action !== 'auto');
      
      // Check for frequent manual overrides
      if (manualCommands.length > 5) {
        notifications.push({
          type: 'pattern_suggestion',
          subject: '📊 ShadeSync: Schedule Optimization Suggestion',
          body: `We noticed you've manually adjusted your shades ${manualCommands.length} times in the past week. Your current schedule might not match your needs. Consider reviewing your schedule settings for better automation.`,
          priority: 'medium',
          email: userEmail
        });
      }

      // Check for inconsistent patterns
      const openCommands = manualCommands.filter(cmd => cmd.action === 'open');
      const closeCommands = manualCommands.filter(cmd => cmd.action === 'close');
      
      if (openCommands.length > 0 && closeCommands.length > 0) {
        const avgOpenTime = this.getAverageTime(openCommands);
        const avgCloseTime = this.getAverageTime(closeCommands);
        
        notifications.push({
          type: 'pattern_insight',
          subject: '📈 ShadeSync: Your Usage Patterns',
          body: `Based on your recent usage, you typically open shades around ${avgOpenTime} and close them around ${avgCloseTime}. Would you like us to suggest a schedule based on these patterns?`,
          priority: 'low',
          email: userEmail
        });
      }
    }

    return notifications;
  }

  getAverageTime(commands) {
    if (commands.length === 0) return "N/A";
    
    const hours = commands.map(cmd => new Date(cmd.created_at).getHours());
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    const ampm = avgHour >= 12 ? 'PM' : 'AM';
    const hour12 = avgHour > 12 ? avgHour - 12 : avgHour === 0 ? 12 : avgHour;
    return `${hour12}:00 ${ampm}`;
  }

  async getWeatherForZip(zipCode) {
    const apiKey = process.env.OPEN_WEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeather API key not found');
    }

    try {
      const geoResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${apiKey}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Failed to get coordinates for zip code');
      }
      
      const geoData = await geoResponse.json();
      
      if (!geoData.lat || !geoData.lon) {
        throw new Error('Invalid coordinates returned');
      }

      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&appid=${apiKey}&units=metric`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('Failed to get weather data');
      }
      
      return await weatherResponse.json();
    } catch (error) {
      console.error('Error fetching weather for zip:', error);
      throw error;
    }
  }

  async sendEmailNotification(notification) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send notification');
      }

      console.log(`✅ Sent ${notification.type} notification to ${notification.email}`);
      return await response.json();
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  async sendTestNotification(userId) {
    try {
      // Get user's email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        throw new Error('No email found for user');
      }

      const testNotification = {
        type: 'test',
        subject: '🧪 ShadeSync: AI Notification Test',
        body: `This is a test notification from your ShadeSync AI system. Your AI notifications are working correctly!\n\nFeatures:\n• Weather-based alerts\n• Usage pattern analysis\n• Schedule optimization suggestions\n\nYou'll receive real notifications based on your shade usage and local weather conditions.`,
        priority: 'low',
        email: userEmail
      };

      await this.sendEmailNotification(testNotification);
      return testNotification;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

export const aiNotificationService = new AINotificationService();
