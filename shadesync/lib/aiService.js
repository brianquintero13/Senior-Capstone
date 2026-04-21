import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    this.groqBaseUrl = 'https://api.groq.com/openai/v1';
    this.provider = this.groqApiKey ? 'groq' : (this.openaiApiKey ? 'openai' : null);
  }

  async callAI(prompt, systemPrompt = "You are a helpful home automation assistant for ShadeSync.", functions = null) {
    // Try Groq first (free), fallback to OpenAI if Groq fails
    if (this.groqApiKey) {
      try {
        return await this.callGroq(prompt, systemPrompt, functions);
      } catch (error) {
        console.error("Groq API failed, trying OpenAI:", error.message);
        if (this.openaiApiKey) {
          return await this.callOpenAI(prompt, systemPrompt, functions);
        }
        throw error;
      }
    } else if (this.openaiApiKey) {
      return await this.callOpenAI(prompt, systemPrompt, functions);
    } else {
      throw new Error("No AI API key configured. Please set GROQ_API_KEY or OPENAI_API_KEY in environment variables.");
    }
  }

  async callGroq(prompt, systemPrompt = "You are a helpful home automation assistant for ShadeSync.", functions = null) {
    try {
      console.log("🤖 Calling Groq API (FREE)...");
      console.log("🔑 Groq API Key exists:", !!this.groqApiKey);
      console.log("🔑 API Key starts with:", this.groqApiKey?.substring(0, 10) + "...");
      
      const requestBody = {
        model: 'llama-3.1-8b-instant', // Free Groq model (current)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      };

      if (functions) {
        requestBody.functions = functions;
        requestBody.function_call = "auto";
      }

      const response = await fetch(`${this.groqBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Groq API error response:", errorData);
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Groq API call successful");
      console.log("📊 Usage:", data.usage);
      
      if (data.choices[0].message.function_call) {
        // Fix Python-style booleans in function arguments
        let functionCall = data.choices[0].message.function_call;
        if (functionCall.arguments) {
          functionCall.arguments = functionCall.arguments
            .replace(/True/g, 'true')
            .replace(/False/g, 'false')
            .replace(/None/g, 'null');
        }
        return {
          type: 'function_call',
          function: functionCall
        };
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Groq Service Error:', error);
      throw error;
    }
  }

  async callOpenAI(prompt, systemPrompt = "You are a helpful home automation assistant for ShadeSync.", functions = null) {
    try {
      console.log("🤖 Calling OpenAI API...");
      console.log("🔑 API Key exists:", !!this.openaiApiKey);
      console.log("🔑 API Key starts with:", this.openaiApiKey?.substring(0, 10) + "...");
      
      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      };

      if (functions) {
        requestBody.functions = functions;
        requestBody.function_call = "auto";
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ OpenAI API error response:", errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ OpenAI API call successful");
      console.log("📊 Usage:", data.usage);
      
      if (data.choices[0].message.function_call) {
        return {
          type: 'function_call',
          function: data.choices[0].message.function_call
        };
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      throw error;
    }
  }

  async getWeatherSuggestion(weather, currentShadeState) {
    const temp = weather.main?.temp || 0;
    const tempFahrenheit = (temp * 9/5) + 32;
    const condition = weather.weather?.[0]?.description || 'Unknown';
    const humidity = weather.main?.humidity || 0;

    const prompt = `
      Current weather data:
      - Temperature: ${tempFahrenheit.toFixed(1)}°F
      - Condition: ${condition}
      - Humidity: ${humidity}%
      - Current shade state: ${currentShadeState}
      
      Provide a specific recommendation based on these rules:
      1. If temperature > 75°F: Recommend CLOSED to reduce AC usage and keep home cool
      2. If temperature <= 75°F and sunny: Recommend OPEN to let in natural light
      3. If temperature <= 75°F and cloudy/rainy: Recommend CLOSED for comfort
      
      Format your response as:
      Recommendation: [OPEN or CLOSED]
      Reason: [brief explanation mentioning temperature and benefit]
      
      Keep it concise and actionable.
    `;

    const systemPrompt = "You are a helpful home automation assistant for ShadeSync. Prioritize energy efficiency and comfort in shade recommendations.";

    return await this.callAI(prompt, systemPrompt);
  }

  async analyzeUsagePatterns(userId, days = 30) {
    try {
      // Get manual shade operations from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

      const { data: commands, error } = await supabase
        .from('device_commands')
        .select('action, created_at')
        .eq('device_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Analyze patterns
      const patterns = this.extractUsagePatterns(commands || []);
      return patterns;
    } catch (error) {
      console.error('Error analyzing usage patterns:', error);
      return null;
    }
  }

  extractUsagePatterns(commands) {
    const patterns = {
      openTimes: {},
      closeTimes: {},
      weekdayPatterns: { open: {}, close: {} },
      weekendPatterns: { open: {}, close: {} },
      totalOperations: commands.length,
      frequency: {}
    };

    commands.forEach(cmd => {
      const date = new Date(cmd.created_at);
      const hour = date.getHours();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayType = isWeekend ? 'weekendPatterns' : 'weekdayPatterns';
      
      // Track hourly patterns
      if (cmd.action === 'open') {
        patterns.openTimes[hour] = (patterns.openTimes[hour] || 0) + 1;
        patterns[dayType].open[hour] = (patterns[dayType].open[hour] || 0) + 1;
      } else if (cmd.action === 'close') {
        patterns.closeTimes[hour] = (patterns.closeTimes[hour] || 0) + 1;
        patterns[dayType].close[hour] = (patterns[dayType].close[hour] || 0) + 1;
      }

      // Track daily frequency
      const dateKey = date.toDateString();
      patterns.frequency[dateKey] = (patterns.frequency[dateKey] || 0) + 1;
    });

    // Find most common times
    patterns.mostCommonOpenTime = this.findMostCommonTime(patterns.openTimes);
    patterns.mostCommonCloseTime = this.findMostCommonTime(patterns.closeTimes);
    patterns.mostCommonWeekdayOpen = this.findMostCommonTime(patterns.weekdayPatterns.open);
    patterns.mostCommonWeekdayClose = this.findMostCommonTime(patterns.weekdayPatterns.close);
    patterns.mostCommonWeekendOpen = this.findMostCommonTime(patterns.weekendPatterns.open);
    patterns.mostCommonWeekendClose = this.findMostCommonTime(patterns.weekendPatterns.close);

    return patterns;
  }

  findMostCommonTime(timeMap) {
    let maxCount = 0;
    let mostCommonHour = null;

    Object.entries(timeMap).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonHour = parseInt(hour);
      }
    });

    return mostCommonHour !== null ? this.formatHour(mostCommonHour) : null;
  }

  formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  async getScheduleSuggestions(patterns, currentSchedule) {
    if (!patterns || !currentSchedule) return null;

    const prompt = `
      Based on the user's shade usage patterns over the last 30 days, provide schedule optimization suggestions.
      
      Usage Patterns:
      - Most common open time: ${patterns.mostCommonOpenTime || 'N/A'}
      - Most common close time: ${patterns.mostCommonCloseTime || 'N/A'}
      - Most common weekday open: ${patterns.mostCommonWeekdayOpen || 'N/A'}
      - Most common weekday close: ${patterns.mostCommonWeekdayClose || 'N/A'}
      - Most common weekend open: ${patterns.mostCommonWeekendOpen || 'N/A'}
      - Most common weekend close: ${patterns.mostCommonWeekendClose || 'N/A'}
      - Total manual operations: ${patterns.totalOperations}
      
      Current Schedule:
      ${JSON.stringify(currentSchedule, null, 2)}
      
      Analyze the patterns vs current schedule and suggest 1-2 specific improvements. 
      Focus on times when the user frequently overrides the schedule.
      Keep suggestions concise and actionable.
    `;

    const systemPrompt = "You are a smart home automation advisor. Analyze usage patterns and provide specific, actionable schedule optimization suggestions.";

    return await this.callAI(prompt, systemPrompt);
  }

  async getEnergySavingTips(weather, shadeState, usagePatterns) {
    const temp = weather.main?.temp || 0;
    const tempFahrenheit = (temp * 9/5) + 32;
    const condition = weather.weather?.[0]?.description || 'Unknown';
    
    const prompt = `
      Provide exactly 2 practical, actionable energy saving tips for automated shades based on current conditions.
      
      Current conditions:
      - Temperature: ${tempFahrenheit.toFixed(1)}°F
      - Weather: ${condition}
      - Shade state: ${shadeState}
      
      Provide SPECIFIC, USEFUL advice like:
      • Close shades before 10am to block morning sun
      • Open shades at 6pm for evening cooling
      • Close shades when AC runs to reduce load
      • Adjust shades based on sun direction
      • Close shades during hottest hours (12-4pm)
      
      STRICT RULES:
      - Maximum 2 bullets
      - Maximum 8 words per bullet
      - No preamble, no introduction
      - Start directly with bullets
      - Be specific and actionable
      
      Format:
      • [specific time-based or condition-based action]
      • [specific time-based or condition-based action]
    `;

    const systemPrompt = "You provide specific, actionable energy-saving advice for automated shades. Focus on time-based and condition-based recommendations.";

    return await this.callAI(prompt, systemPrompt);
  }

  async generateInsightReport(userId, weather, currentShadeState, currentSchedule) {
    try {
      console.log("🧠 Generating comprehensive AI insight report...");
      
      const [usagePatterns, weatherSuggestion, energyTips, scheduleSuggestions] = await Promise.all([
        this.analyzeUsagePatterns(userId),
        this.getWeatherSuggestion(weather, currentShadeState),
        this.getEnergySavingTips(weather, currentShadeState, null),
        this.getScheduleSuggestions(null, currentSchedule)
      ]);

      return {
        weatherSuggestion,
        energyTips,
        scheduleSuggestions,
        usagePatterns: {
          mostCommonOpenTime: usagePatterns?.mostCommonOpenTime,
          mostCommonCloseTime: usagePatterns?.mostCommonCloseTime,
          totalOperations: usagePatterns?.totalOperations
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating insight report:', error);
      return {
        error: 'Failed to generate AI insights',
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeForNotification(userId, weather, currentShadeState, currentSchedule, recentOperations) {
    console.log("🤖 Analyzing data for periodic notification...");
    
    const functions = [
      {
        name: "send_notification",
        description: "Send a notification to the user about their shade system",
        parameters: {
          type: "object",
          properties: {
            should_notify: {
              type: "boolean",
              description: "Whether to send a notification based on the analysis"
            },
            notification_type: {
              type: "string",
              enum: ["weather_alert", "pattern_insight", "schedule_suggestion", "energy_tip", "daily_summary", "none"],
              description: "The type of notification to send. Use 'none' if should_notify is false."
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low", "none"],
              description: "The priority level of the notification. Use 'none' if should_notify is false."
            },
            reason: {
              type: "string",
              description: "The reason why this notification should be sent or why not"
            },
            message: {
              type: "string",
              description: "The actual notification message to send to the user. Empty string if should_notify is false."
            }
          },
          required: ["should_notify", "notification_type", "priority", "reason", "message"]
        }
      }
    ];

    const temp = weather.main?.temp || 0;
    const tempFahrenheit = (temp * 9/5) + 32;
    const condition = weather.weather?.[0]?.description || 'Unknown';
    
    const prompt = `
      Analyze the following shade system data and determine if a notification should be sent to the user.
      
      Current Conditions:
      - Temperature: ${tempFahrenheit.toFixed(1)}°F
      - Weather: ${condition}
      - Current shade state: ${currentShadeState}
      
      Recent Activity:
      - Recent manual operations: ${recentOperations?.length || 0} in the last period
      - Operation types: ${recentOperations?.map(op => op.action).join(', ') || 'none'}
      
      Use the send_notification function to indicate if a notification should be sent and what type.
      
      Consider these triggers:
      1. Weather alerts: Temperature > 75°F and shades open (high priority)
      2. Pattern insights: After 5+ manual operations (medium priority)
      3. Schedule suggestions: Frequent manual overrides (medium priority)
      4. Energy tips: General optimization advice (low priority)
      5. Daily summary: End of day summary (low priority)
    `;

    const systemPrompt = "You are an intelligent home automation assistant for ShadeSync. Analyze user data and determine when to send helpful notifications. Be proactive but not annoying - only send notifications that provide genuine value.";

    try {
      const result = await this.callAI(prompt, systemPrompt, functions);
      
      if (result.type === 'function_call') {
        let functionArgs = JSON.parse(result.function.arguments);
        
        // Parse string values to correct types (Groq sometimes returns strings for booleans)
        if (typeof functionArgs.should_notify === 'string') {
          functionArgs.should_notify = functionArgs.should_notify === 'true';
        }
        
        console.log("🎯 AI decided to send notification:", functionArgs);
        return functionArgs;
      }
      
      // Fallback if no function call
      return {
        should_notify: false,
        reason: "AI did not trigger notification function",
        notification_type: "none",
        priority: "low",
        message: ""
      };
    } catch (error) {
      console.error("Error analyzing for notification:", error);
      return {
        should_notify: false,
        reason: "AI analysis failed",
        notification_type: "none",
        priority: "low",
        message: ""
      };
    }
  }
}

export const aiService = new AIService();
