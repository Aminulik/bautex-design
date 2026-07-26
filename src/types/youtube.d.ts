// src/types/youtube.d.ts
declare namespace YT {
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    destroy(): void;
    // Добавьте другие методы по мере необходимости
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    // Другие параметры
  }

  interface PlayerEvents {
    onReady?(event: PlayerEvent): void;
    onStateChange?(event: PlayerEvent): void;
  }

  interface PlayerEvent {
    target: Player;
    data: number;
  }

  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}
