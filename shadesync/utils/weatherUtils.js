export const getWeatherVideo = (weatherData) => {
  if (!weatherData) return '/videos/Sunny.mp4';
  
  const isDaytime = weatherData.isDay !== false; // Default to true if not specified
  const weatherCondition = weatherData.condition?.toLowerCase() || '';
  const weatherCode = weatherData.current?.condition?.code;
  
  // First check the weather condition string if available
  if (weatherCondition) {
    if (weatherCondition.includes('cloud') || weatherCondition.includes('overcast') || weatherCondition.includes('fog')) {
      return isDaytime ? '/videos/Cloudy.mp4' : '/videos/CloudyNight.mp4';
    }
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle') || weatherCondition.includes('shower')) {
      return isDaytime ? '/videos/Rainy.mp4' : '/videos/RainyNight.mp4';
    }
    if (weatherCondition.includes('snow') || weatherCondition.includes('sleet') || weatherCondition.includes('blizzard')) {
      return '/videos/Snowy.mp4';
    }
    if (weatherCondition.includes('thunder') || weatherCondition.includes('storm')) {
      return isDaytime ? '/videos/Stormy.mp4' : '/videos/StormyNight.mp4';
    }
  }
  
  // Fall back to weather code if condition string doesn't match
  const cloudyCodes = [
    1009, // Overcast
    1135, // Fog
    1147, // Freezing fog
    1006, // Cloudy
    1003, // Partly cloudy
    1030, // Mist
    1009, // Overcast
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

  if (weatherCode && cloudyCodes.includes(weatherCode)) {
    return isDaytime ? '/videos/Cloudy.mp4' : '/videos/CloudyNight.mp4';
  }

  // Default to sunny/day or night based on time
  return isDaytime ? '/videos/Sunny.mp4' : '/videos/night.mp4';
};
