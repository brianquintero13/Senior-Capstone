"use client";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";

export default function AIInsights({ isNight, zipCode }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchAIInsights();
    // Refresh insights every 10 minutes
    const interval = setInterval(fetchAIInsights, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-insights");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch AI insights: ${response.status}`);
      }
      const data = await response.json();
      setInsights(data);
      setError("");
    } catch (err) {
      console.error("AI Insights error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTips = (tipsText) => {
    if (!tipsText) return [];
    // If the AI already provided bullets, just split by newline
    if (tipsText.includes('•')) {
      return tipsText.split('•').filter(tip => tip.trim().length > 0);
    }
    // Otherwise split by numbered points or bullet points
    return tipsText.split(/\d+\.|\*\s+|\-\s+/).filter(tip => tip.trim().length > 0);
  };

  if (loading) {
    return (
      <div className={`w-full rounded-2xl px-4 py-3 text-sm ${
        isNight 
          ? "border border-white/20 bg-white/10 text-slate-100" 
          : "border border-blue-100 bg-white/70 text-slate-700"
      }`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>AI is analyzing your patterns...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full rounded-2xl px-4 py-3 text-sm ${
        isNight 
          ? "border border-red-200 bg-red-900/20 text-red-200" 
          : "border border-red-200 bg-red-50 text-red-700"
      }`}>
        <div className="flex items-center gap-2">
          <span>⚠️ AI Insights unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl px-4 py-3 text-sm ${
      isNight 
        ? "border border-white/20 bg-white/10 text-slate-100" 
        : "border border-blue-100 bg-white/70 text-slate-700"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium">AI Insights</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity transform transition-transform"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          <button 
            onClick={fetchAIInsights}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
            title="Refresh insights"
          >
            🔄
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Weather-based suggestion */}
          {insights?.weatherSuggestion && (
            <div className={`mb-3 p-3 rounded-lg ${
              isNight ? "bg-orange-500/20 text-orange-200" : "bg-orange-100 text-orange-800"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">🌡️</span>
                <div>
                  <div className="font-medium text-sm">Weather Suggestion</div>
                  <div className="text-xs mt-1 opacity-90">{insights.weatherSuggestion}</div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule optimization suggestions */}
          {insights?.scheduleSuggestions && (
            <div className={`mb-3 p-3 rounded-lg ${
              isNight ? "bg-blue-500/20 text-blue-200" : "bg-blue-100 text-blue-800"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">⏰</span>
                <div>
                  <div className="font-medium text-sm">Schedule Status</div>
                  <div className="text-xs mt-1 opacity-90">{insights.scheduleSuggestions}</div>
                </div>
              </div>
            </div>
          )}

          {/* Energy saving tips */}
          {insights?.energyTips && (
            <div className={`mb-3 p-3 rounded-lg ${
              isNight ? "bg-green-500/20 text-green-200" : "bg-green-100 text-green-800"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <div className="font-medium text-sm">Energy Saving Tips</div>
                  <div className="text-xs mt-1 opacity-90">
                    {formatTips(insights.energyTips).map((tip, index) => (
                      <div key={index} className="mb-1">• {tip.trim()}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage patterns summary */}
          {insights?.usagePatterns && (
            <div className={`p-3 rounded-lg ${
              isNight ? "bg-purple-500/20 text-purple-200" : "bg-purple-100 text-purple-800"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div>
                  <div className="font-medium text-sm">Your Patterns</div>
                  <div className="text-xs mt-1 opacity-90">
                    {insights.usagePatterns.message ? (
                      <div>{insights.usagePatterns.message}</div>
                    ) : (
                      <>
                        {insights.usagePatterns.mostCommonOpenTime && insights.usagePatterns.mostCommonOpenTime !== "Not enough data" && (
                          <div>• Often open at {insights.usagePatterns.mostCommonOpenTime}</div>
                        )}
                        {insights.usagePatterns.mostCommonCloseTime && insights.usagePatterns.mostCommonCloseTime !== "Not enough data" && (
                          <div>• Often close at {insights.usagePatterns.mostCommonCloseTime}</div>
                        )}
                        <div>• {insights.usagePatterns.totalOperations} manual adjustments last 30 days</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs mt-3 opacity-70 text-center">
            Insights updated {new Date(insights?.timestamp).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}
