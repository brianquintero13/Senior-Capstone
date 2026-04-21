"use client";
import { useState, useEffect } from "react";

export default function AIAssistant({ isNight }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAIInsights();
    }
  }, [isOpen]);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-insights");
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseWeatherRecommendation = (suggestion) => {
    if (!suggestion) return { recommendation: null, reason: null };
    
    const recommendationMatch = suggestion.match(/Recommendation:\s*(OPEN|CLOSED)/i);
    const reasonMatch = suggestion.match(/Reason:\s*(.+)/i);
    
    return {
      recommendation: recommendationMatch ? recommendationMatch[1].toUpperCase() : null,
      reason: reasonMatch ? reasonMatch[1].trim() : suggestion
    };
  };

  const handleRecommendedSchedule = () => {
    setActiveTab("schedule");
    setIsOpen(true);
  };

  const handleWeatherReport = () => {
    setActiveTab("weather");
    setIsOpen(true);
  };

  const handleMyPatterns = () => {
    setActiveTab("patterns");
    setIsOpen(true);
  };

  return (
    <>
      {/* AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            isNight 
              ? "bg-purple-600 hover:bg-purple-700 text-white" 
              : "bg-purple-500 hover:bg-purple-600 text-white"
          }`}
        >
          <span className="text-2xl">🤖</span>
        </button>
      </div>

      {/* AI Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${
            isNight 
              ? "bg-slate-800 text-white border border-slate-700" 
              : "bg-white text-slate-900 border border-slate-200"
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                AI Assistant
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isNight 
                    ? "hover:bg-slate-700 text-slate-400" 
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("schedule")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "schedule"
                    ? isNight 
                      ? "bg-purple-600 text-white" 
                      : "bg-purple-500 text-white"
                    : isNight 
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📅 Schedule
              </button>
              <button
                onClick={() => setActiveTab("weather")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "weather"
                    ? isNight 
                      ? "bg-purple-600 text-white" 
                      : "bg-purple-500 text-white"
                    : isNight 
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🌤️ Weather
              </button>
              <button
                onClick={() => setActiveTab("patterns")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "patterns"
                    ? isNight 
                      ? "bg-purple-600 text-white" 
                      : "bg-purple-500 text-white"
                    : isNight 
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                📊 Patterns
              </button>
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
              {loading && (
                <div className="flex items-center justify-center h-48">
                  <div className="text-sm opacity-70">Loading AI insights...</div>
                </div>
              )}
              {!loading && activeTab === "schedule" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    📅 Schedule Suggestions
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    <p className="text-sm mb-3">
                      {insights?.scheduleSuggestions || "No schedule suggestions available yet."}
                    </p>
                    {insights?.usagePatterns?.mostCommonWeekdayOpen && (
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weekday Open:</span>
                          <span className="font-medium">{insights.usagePatterns.mostCommonWeekdayOpen}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weekday Close:</span>
                          <span className="font-medium">{insights.usagePatterns.mostCommonWeekdayClose}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weekend Open:</span>
                          <span className="font-medium">{insights.usagePatterns.mostCommonWeekendOpen}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weekend Close:</span>
                          <span className="font-medium">{insights.usagePatterns.mostCommonWeekendClose}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loading && activeTab === "weather" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    🌤️ Weather-Based Recommendation
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    {(() => {
                      const { recommendation, reason } = parseWeatherRecommendation(insights?.weatherSuggestion);
                      if (!recommendation) {
                        return <p className="text-sm">{insights?.weatherSuggestion || "No weather suggestions available yet."}</p>;
                      }
                      return (
                        <div className="space-y-3">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            recommendation === 'OPEN' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            <span className="text-lg">
                              {recommendation === 'OPEN' ? '🔓' : '🔒'}
                            </span>
                            <span>{recommendation}</span>
                          </div>
                          <p className="text-sm">
                            {reason}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {!loading && activeTab === "patterns" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    📊 Usage Patterns
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    <p className="text-sm mb-3">
                      {insights?.usagePatterns?.message || "No pattern data available yet."}
                    </p>
                    {insights?.usagePatterns && (
                      <div className="space-y-3">
                        {insights.usagePatterns.mostCommonOpenTime && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm">Most Common Open Time</span>
                              <span className="font-medium">{insights.usagePatterns.mostCommonOpenTime}</span>
                            </div>
                          </div>
                        )}
                        {insights.usagePatterns.mostCommonCloseTime && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm">Most Common Close Time</span>
                              <span className="font-medium">{insights.usagePatterns.mostCommonCloseTime}</span>
                            </div>
                          </div>
                        )}
                        {insights.usagePatterns.totalOperations !== undefined && (
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Manual Adjustments (30 days)</span>
                              <span className="font-medium">{insights.usagePatterns.totalOperations}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
