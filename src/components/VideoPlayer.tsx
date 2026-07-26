import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  isPlaying: boolean;
  onPlay?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, isPlaying, onPlay }) => {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  // Загрузка YouTube API
  useEffect(() => {
    if (window.YT) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  // Инициализация плеера
  useEffect(() => {
    if (!isApiReady || !containerRef.current || !videoId) return;

    const cleanVideoId = videoId.split('?')[0].split('&')[0];

    playerRef.current = new YT.Player(containerRef.current, {
      videoId: cleanVideoId,
      playerVars: {
        autoplay: isPlaying ? 1 : 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          if (isPlaying) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: YT.PlayerEvent) => {
          if (event.data === YT.PlayerState.PLAYING) {
            onPlay?.();
          }
        },
      },
    });

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [isApiReady, videoId, onPlay]);

  // Обработка изменения состояния воспроизведения
  useEffect(() => {
    if (!isApiReady || !playerRef.current) return;

    try {
      if (isPlaying && playerRef.current.playVideo) {
        playerRef.current.playVideo();
      } else if (!isPlaying && playerRef.current.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('Error controlling video:', error);
    }
  }, [isPlaying, isApiReady]);

  return <div ref={containerRef} className='youtube-player' />;
};

export default VideoPlayer;
