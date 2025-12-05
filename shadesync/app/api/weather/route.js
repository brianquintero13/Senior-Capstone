import { NextResponse } from "next/server";

const OPEN_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache for current weather calls
const weatherCache = new Map();

function cacheKey(params) {
  if (params.zip) return `zip:${params.zip}`;
  if (params.lat && params.lon) return `lat:${params.lat}:lon:${params.lon}`;
  return "default";
}

async function fetchWeather(params) {
  const apiKey = process.env.OPEN_WEATHER_API_KEY;
  if (!apiKey) throw new Error("Missing OPEN_WEATHER_API_KEY");

  const search = new URLSearchParams({ appid: apiKey, units: "imperial" });
  if (params.zip) search.set("zip", `${params.zip},US`);
  if (params.lat && params.lon) {
    search.set("lat", params.lat);
    search.set("lon", params.lon);
  }

  const res = await fetch(`${OPEN_WEATHER_URL}?${search.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || "Weather fetch failed");
  }
  const data = await res.json();
  return normalizeWeather(data);
}

function normalizeWeather(data) {
  // data.weather[0].main examples: Clear, Clouds, Rain, Snow, Thunderstorm, Drizzle
  const main = data?.weather?.[0]?.main || "Clear";
  const description = data?.weather?.[0]?.description || main;
  const icon = data?.weather?.[0]?.icon || "";
  const temp = Math.round(data?.main?.temp ?? 0);
  const sunrise = data?.sys?.sunrise ? data.sys.sunrise * 1000 : null;
  const sunset = data?.sys?.sunset ? data.sys.sunset * 1000 : null;
  const now = Date.now();
  const isDay = sunrise && sunset ? now >= sunrise && now <= sunset : icon.endsWith("d");

  return {
    condition: main,
    description,
    icon,
    temp,
    isDay,
    sunrise,
    sunset,
    fetchedAt: now,
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const zip = searchParams.get("zip");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!zip && !(lat && lon)) {
    return NextResponse.json({ error: "zip or lat/lon required" }, { status: 400 });
  }

  const key = cacheKey({ zip, lat, lon });
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { status: 200 });
  }

  try {
    const data = await fetchWeather({ zip, lat, lon });
    weatherCache.set(key, { data, fetchedAt: Date.now() });
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Weather fetch failed" }, { status: 400 });
  }
}
