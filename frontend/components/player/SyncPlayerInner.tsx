"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useEncryptedSync } from "@/hooks/useEncryptedSync";
import type { SyncEvent } from "@/lib/types";

export interface SyncPlayerProps {
  src: string | null;
  socket?: Socket | null;
  roomId?: string | null;
  userId?: string;
  roomKeyReady?: boolean;
  isHost?: boolean;
  title?: string;
}

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SyncPlayerInner({
  src,
  socket,
  roomId,
  userId,
  roomKeyReady,
  isHost,
  title,
}: SyncPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSync = !!(socket && roomId && userId && roomKeyReady);

  const applySyncEvent = useCallback((event: SyncEvent) => {
    const video = videoRef.current;
    if (!video) return;
    if (event.type === "play" && event.t !== undefined) {
      if (Math.abs(video.currentTime - event.t) > 0.5) video.currentTime = event.t;
      if (video.paused) video.play().catch(() => {});
    } else if (event.type === "pause") {
      if (!video.paused) video.pause();
    } else if (event.type === "seek" && event.t !== undefined) {
      video.currentTime = event.t;
    }
  }, []);

  const { emitSync } = useEncryptedSync({
    socket: hasSync ? socket! : null,
    roomId: hasSync ? roomId! : null,
    userId: hasSync ? userId! : "",
    roomKeyReady: hasSync,
    onSyncEvent: applySyncEvent,
    onBootstrap: () => {},
  });

  const loadSource = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (url.includes(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hlsRef.current = hls;
      }
    } else {
      video.src = url;
    }
  }, []);

  useEffect(() => {
    if (src) loadSource(src);
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [src, loadSource]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hasSync) {
      emitSync({ type: "play", t: video.currentTime });
    }
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hasSync) {
      emitSync({ type: "pause", t: video.currentTime });
    }
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hasSync) {
      emitSync({ type: "seek", t: video.currentTime });
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      handlePlay();
    } else {
      video.pause();
      handlePause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = parseFloat(e.target.value);
    video.currentTime = t;
    setCurrentTime(t);
    handleSeeked();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
      {src ? (
        <video
          ref={videoRef}
          playsInline
          controls={false}
          className="w-full h-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onSeeked={handleSeeked}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Play size={48} className="opacity-50" />
          <p className="text-sm">Ожидание видео...</p>
        </div>
      )}

      {src && (
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center gap-2">
            {title && <span className="text-sm font-semibold truncate">{title}</span>}
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={togglePlay}
              className="pointer-events-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
              aria-label={playing ? "Пауза" : "Воспроизведение"}
            >
              {playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
          </div>

          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 accent-[var(--syncro-accent)] cursor-pointer"
              aria-label="Таймлайн"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setMuted(v.muted);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={muted ? "Включить звук" : "Выключить звук"}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) videoRef.current.volume = val;
                  }}
                  className="w-20 h-1 accent-[var(--syncro-accent)]"
                  aria-label="Громкость"
                />
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Полный экран"
                >
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}