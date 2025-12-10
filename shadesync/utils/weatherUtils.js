export const getWeatherVideo = (weatherData) => {
  if (!weatherData) return '/videos/Sunny.mp4';
  
  const isDaytime = weatherData.current?.is_day !== 0;
  const weatherCode = weatherData.current?.condition?.code;
  
  // Weather codes for cloudy/overcast conditions
  const cloudyCodes = [
    1009, // Overcast
    1135, // Fog
    1147, // Freezing fog
    1006, // Cloudy
    1003, // Partly cloudy
    1030, // Mist
    1150, // Patchy light drizzle
    1153, // Light drizzle
    1168, // Freezing drizzle
    1171, // Heavy freezing drizzle
    1180, // Patchy light rain
    1183, // Light rain
    1186, // Moderate rain at times
    1189, // Moderate rain
    1192, // Heavy rain at times
    1195, // Heavy rain
    1198, // Light freezing rain
    1201, // Moderate or heavy freezing rain
    1240, // Light rain shower
    1243, // Moderate or heavy rain shower
    1246, // Torrential rain shower
    1273, // Patchy light rain with thunder
    1276, // Moderate or heavy rain with thunder
  ];

  if (cloudyCodes.includes(weatherCode)) {
    return isDaytime ? '/videos/Cloudy.mp4' : '/videos/CloudyNight.mp4';
  }

  return isDaytime ? '/videos/Sunny.mp4' : '/videos/night.mp4';
};
