import { useEffect, useState } from "react";

const defaultTheme = {
  name: "day-clear",
  backgroundImage: "linear-gradient(to bottom, #87b5ff, #bcd9ff, #eef4ff)",
  textColor: "#0f1c2e",
  stars: false,
  rain: false,
  snow: false,
  lightning: false,
  showMoon: false,
};

const nightBase = {
  backgroundImage: "url('/night-bg.png')",
  textColor: "#f5f7fb",
  stars: true,
  showMoon: true,
  rain: false,
  snow: false,
  lightning: false,
};

const dayBase = {
  backgroundImage: "linear-gradient(to bottom, #87b5ff, #bcd9ff, #eef4ff)",
  textColor: "#0f1c2e",
  stars: false,
  showMoon: false,
  rain: false,
  snow: false,
  lightning: false,
};

function mapWeatherToTheme({ condition, isDay }) {
  const main = (condition || "").toLowerCase();
  if (!isDay) {
    if (main.includes("rain") || main.includes("drizzle")) return { ...nightBase, name: "night-rain", rain: true };
    if (main.includes("snow")) return { ...nightBase, name: "night-snow", snow: true, stars: false };
    if (main.includes("thunder")) return { ...nightBase, name: "night-storm", lightning: true, stars: false };
    if (main.includes("cloud")) return { ...nightBase, name: "night-clouds", stars: true };
    return { ...nightBase, name: "night-clear" };
  }
  // day themes
  if (main.includes("rain") || main.includes("drizzle"))
    return { ...dayBase, name: "day-rain", backgroundImage: "linear-gradient(135deg, #8cb1d4, #6a87a5)" };
  if (main.includes("snow"))
    return { ...dayBase, name: "day-snow", backgroundImage: "linear-gradient(135deg, #d7e9f5, #bcd4e6)" };
  if (main.includes("thunder"))
    return { ...dayBase, name: "day-storm", backgroundImage: "linear-gradient(135deg, #465776, #2f3c52)", lightning: true };
  if (main.includes("cloud"))
    return { ...dayBase, name: "day-clouds", backgroundImage: "linear-gradient(135deg, #cfd8e3, #a6b8cf)" };
  return { ...dayBase, name: "day-clear" };
}

function mapOverrideNameToTheme(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  const isDay = !lower.startsWith("night");
  let condition = "Clear";
  if (lower.includes("rain")) condition = "Rain";
  else if (lower.includes("snow")) condition = "Snow";
  else if (lower.includes("storm")) condition = "Thunderstorm";
  else if (lower.includes("cloud")) condition = "Clouds";
  return mapWeatherToTheme({ condition, isDay });
}

export function useWeatherTheme() {
  const [theme, setTheme] = useState(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const getGeoPosition = () =>
      new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !navigator.geolocation) {
          reject(new Error("Geolocation not available"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { maximumAge: 300000, timeout: 8000 }
        );
      });

    const load = async () => {
      // allow test overrides: ?theme=night-storm, localStorage WEATHER_THEME_OVERRIDE, or env NEXT_PUBLIC_WEATHER_THEME_OVERRIDE
      const qsOverride =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("theme")
          : null;
      const lsOverride =
        typeof window !== "undefined" ? localStorage.getItem("WEATHER_THEME_OVERRIDE") : null;
      const envOverride = process.env.NEXT_PUBLIC_WEATHER_THEME_OVERRIDE;
      const overrideName = qsOverride || envOverride || lsOverride;
      const overrideTheme = mapOverrideNameToTheme(overrideName);
      if (overrideTheme) {
        setTheme(overrideTheme);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        // get user zip from settings
        const settingsRes = await fetch("/api/settings", { cache: "no-store" });
        const settingsJson = settingsRes.ok ? await settingsRes.json() : {};
        const zip = settingsJson?.settings?.system?.zipCode || "";
        let query = "";
        if (zip) {
          query = `zip=${encodeURIComponent(zip)}`;
        } else {
          try {
            const pos = await getGeoPosition();
            if (pos?.coords) {
              query = `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
            }
          } catch {
            // ignore geolocation errors; will fallback to default theme
          }
        }

        const weatherRes = query
          ? await fetch(`/api/weather?${query}`, { cache: "no-store" })
          : null;
        if (!weatherRes || !weatherRes.ok) {
          if (weatherRes) {
            const body = await weatherRes.json().catch(() => ({}));
            throw new Error(body.error || "Weather fetch failed");
          }
          throw new Error("No location available for weather");
        }
        const weather = await weatherRes.json();
        if (!active) return;
        const mapped = mapWeatherToTheme(weather);
        setTheme(mapped);
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load weather");
        setTheme(defaultTheme);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return { theme, loading, error };
}
