"use client";
import { useState } from "react";

export default function AIAssistant({ isNight }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");

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
              {activeTab === "schedule" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    📅 Recommended Schedule
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    <p className="text-sm mb-3">
                      Based on your usage patterns, here are my recommendations:
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekday Open:</span>
                        <span className="font-medium">8:30 AM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekday Close:</span>
                        <span className="font-medium">6:45 PM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekend Open:</span>
                        <span className="font-medium">9:00 AM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekend Close:</span>
                        <span className="font-medium">7:30 PM</span>
                      </div>
                    </div>
                    <button className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isNight 
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : "bg-purple-500 hover:bg-purple-600 text-white"
                    }`}>
                      Apply These Times
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "weather" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    🌤️ Weather Report
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">☀️</span>
                      <span className="text-2xl font-bold">77°F</span>
                    </div>
                    <p className="text-sm mb-3">
                      Clear sky with plenty of sunshine. Perfect weather for keeping your shades closed during peak hours to maintain comfortable indoor temperature.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="opacity-70">Humidity:</span>
                        <span className="ml-2 font-medium">65%</span>
                      </div>
                      <div>
                        <span className="opacity-70">UV Index:</span>
                        <span className="ml-2 font-medium">High</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "patterns" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    📊 Your Patterns
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    isNight ? "bg-slate-700" : "bg-slate-50"
                  }`}>
                    <p className="text-sm mb-3">
                      Here's what I've learned about your shade usage:
                    </p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Most Common Open Time</span>
                          <span className="font-medium">9:00 AM</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: "70%"}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Most Common Close Time</span>
                          <span className="font-medium">6:00 PM</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: "85%"}}></div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Manual Adjustments (30 days)</span>
                          <span className="font-medium">15</span>
                        </div>
                      </div>
                    </div>
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
