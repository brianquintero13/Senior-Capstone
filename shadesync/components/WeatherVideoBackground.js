'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { getWeatherVideo } from '@/utils/weatherUtils';

export default function WeatherVideoBackground({ weatherData }) {
  const videoRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const videoSource = useMemo(() => {
    const source = getWeatherVideo(weatherData);
    console.log('Selected video source:', source, 'Weather data:', weatherData);
    return source;
  }, [weatherData]);

  useEffect(() => {
    if (!isClient) return;
    
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.error('Error playing video:', err);
      }
    };

    playVideo();

    return () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, [videoSource, isClient]);

  if (!isClient) {
    return null; // Don't render on server
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        ref={videoRef}
        key={videoSource}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        <source src={videoSource} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
