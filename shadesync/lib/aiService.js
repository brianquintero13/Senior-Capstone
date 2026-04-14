import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async callOpenAI(prompt, systemPrompt = "You are a helpful home automation assistant for ShadeSync.") {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async getWeatherSuggestion(weather, currentShadeState) {
    const temp = weather.main?.temp || 0;
    const tempFahrenheit = (temp * 9/5) + 32;
    
    if (tempFahrenheit > 75 && currentShadeState === 'open') {
      const prompt = `
        Current weather data:
        - Temperature: ${tempFahrenheit.toFixed(1)}°F
        - Condition: ${weather.weather?.[0]?.description || 'Unknown'}
        - Humidity: ${weather.main?.humidity || 0}%
        - Current shade state: ${currentShadeState}
        
        The temperature is above 75°F and shades are currently open. Provide a brief, friendly suggestion 
        about closing the shades to keep the home cool. Mention energy savings and comfort benefits.
        Keep it under 100 words and be conversational.
      `;

      const systemPrompt = "You are a helpful home automation assistant for ShadeSync. Provide practical energy-saving advice in a friendly tone.";

      return await this.callOpenAI(prompt, systemPrompt);
    }
    
    return null;
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

    return await this.callOpenAI(prompt, systemPrompt);
  }

  async getEnergySavingTips(weather, shadeState, usagePatterns) {
    const temp = weather.main?.temp || 0;
    const tempFahrenheit = (temp * 9/5) + 32;
    const condition = weather.weather?.[0]?.description || 'Unknown';

    const prompt = `
      Current conditions:
      - Temperature: ${tempFahrenheit.toFixed(1)}°F
      - Weather: ${condition}
      - Shade state: ${shadeState}
      - Usage patterns: ${usagePatterns?.totalOperations || 0} manual operations in last 30 days
      
      Provide 2-3 brief energy-saving tips specific to these conditions. 
      Focus on shade optimization for energy efficiency and comfort.
      Keep each tip under 50 words.
    `;

    const systemPrompt = "You are an energy efficiency expert for smart homes. Provide practical, actionable energy-saving tips.";

    return await this.callOpenAI(prompt, systemPrompt);
  }

  async generateInsightReport(userId, weather, currentShadeState, currentSchedule) {
    try {
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
}

export const aiService = new AIService();
