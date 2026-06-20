"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  PictureInPicture2,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { useEncryptedSync } from "@/hooks/useEncryptedSync";
import type { BootstrapPayload, SyncEvent } from "@/lib/types";
import { API_URL } from "@/lib/constants";

export interface SyncPlayerProps {
  src: string | null;
  socket?: Socket | null;
  roomId?: string | null;
  userId?: string;
  roomKeyReady?: boolean;
  isHost?: boolean;
  title?: string;
  qualities?: Array<{ id: string; label: string; ext: string; url: string; size: number }>;
  selectedQuality?: string;
  onQualityChange?: (qualityId: string) => void;
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const SKIP_SECONDS = 10;

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function SyncPlayerInner({
  src,
  socket,
  roomId,
  userId,
  roomKeyReady,
  isHost,
  title,
  qualities,
  selectedQuality,
  onQualityChange,
}: SyncPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pendingBootstrapRef = useRef<BootstrapPayload | null>(null);
  const suppressSyncRef = useRef(false);
  const lastAppliedSeekRef = useRef(-1);
  const bootstrapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const hasSync = !!(socket && roomId && userId && roomKeyReady);

  // ──── Sync ────

  const applySyncEvent = useCallback((event: SyncEvent) => {
    const video = videoRef.current;
    if (!video) return;
    if (event.type === "seek" && event.t !== undefined) {
      lastAppliedSeekRef.current = event.t;
      video.currentTime = event.t;
    } else {
      suppressSyncRef.current = true;
      if (event.type === "play" && event.t !== undefined) {
        if (Math.abs(video.currentTime - event.t) > 0.5) video.currentTime = event.t;
        if (video.paused) video.play().catch(() => {});
      } else if (event.type === "pause") {
        if (!video.paused) video.pause();
      }
      suppressSyncRef.current = false;
    }
  }, []);

  const handleBootstrap = useCallback((payload: BootstrapPayload) => {
    const video = videoRef.current;
    if (!video || !video.readyState) {
      pendingBootstrapRef.current = payload;
      return;
    }
    if (payload.currentTime !== undefined) {
      lastAppliedSeekRef.current = payload.currentTime;
      video.currentTime = payload.currentTime;
    }
    suppressSyncRef.current = true;
    if (payload.playing) {
      video.play().catch(() => {});
    } else if (payload.playing === false) {
      video.pause();
    }
    suppressSyncRef.current = false;
  }, []);

  const { emitSync, emitBootstrap } = useEncryptedSync({
    socket: hasSync ? socket! : null,
    roomId: hasSync ? roomId! : null,
    userId: hasSync ? userId! : "",
    roomKeyReady: hasSync,
    onSyncEvent: applySyncEvent,
    onBootstrap: handleBootstrap,
  });

  useEffect(() => {
    if (!socket || !isHost || !roomId || !userId || !roomKeyReady) return;
    const onUserJoined = (data: { userId: string; socketId: string }) => {
      const video = videoRef.current;
      if (!video || !video.readyState) return;
      emitBootstrap(
        { playing: !video.paused, currentTime: video.currentTime },
        data.socketId
      );
    };
    socket.on("user_joined", onUserJoined);
    return () => { socket.off("user_joined", onUserJoined); };
  }, [socket, isHost, roomId, userId, roomKeyReady, emitBootstrap]);

  // ──── Bootstrap handling ────

  const onVideoReady = useCallback(() => {
    setVideoLoading(false);
    if (pendingBootstrapRef.current) {
      handleBootstrap(pendingBootstrapRef.current);
      pendingBootstrapRef.current = null;
    }
  }, [handleBootstrap]);

  const onVideoPlaybackReady = useCallback(() => {
    onVideoReady();
    if (!isHost && !bootstrapTimeoutRef.current) {
      bootstrapTimeoutRef.current = setTimeout(() => {
        const video = videoRef.current;
        if (video && video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }, 3000);
    }
  }, [isHost, onVideoReady]);

  useEffect(() => {
    return () => { if (bootstrapTimeoutRef.current) clearTimeout(bootstrapTimeoutRef.current); };
  }, []);

  // ──── Video source ────

  const loadSource = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video || !url) return;
    setVideoError(false);
    setVideoLoading(true);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (url.includes(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else {
        setVideoError(true);
      }
    } else {
      video.src = url;
    }
  }, []);

  useEffect(() => {
    if (src) loadSource(src);
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [src, loadSource]);

  // ──── Sync emitters ────

  const emitPlay = () => {
    if (suppressSyncRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    if (hasSync) emitSync({ type: "play", t: video.currentTime });
  };

  const emitPause = () => {
    if (suppressSyncRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    if (hasSync) emitSync({ type: "pause", t: video.currentTime });
  };

  const emitSeek = () => {
    if (suppressSyncRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    // Don't re-emit a seek we just received from remote (onseeked fires async)
    if (Math.abs(t - lastAppliedSeekRef.current) < 0.5) return;
    if (hasSync) emitSync({ type: "seek", t });
  };

  // ──── User actions ────

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const handleSkip = (dir: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    const t = Math.max(0, Math.min(video.duration || 0, video.currentTime + dir * SKIP_SECONDS));
    video.currentTime = t;
    lastAppliedSeekRef.current = t;
    emitSeek();
  };

  const handleSeek = (t: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.max(0, Math.min(duration, t));
    lastAppliedSeekRef.current = t;
    emitSeek();
  };

  const onSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    handleSeek(t);
  };

  const setSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
  };

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowSpeedMenu(false);
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  // ──── Keyboard shortcuts ────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const v = Math.min(1, (videoRef.current.volume || 0) + 0.1);
            videoRef.current.volume = v;
            setVolume(v);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const v = Math.max(0, (videoRef.current.volume || 0) - 0.1);
            videoRef.current.volume = v;
            setVolume(v);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setMuted(videoRef.current.muted);
          }
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          togglePiP();
          break;
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [togglePlay]);

  const reloadCurrentFormat = useCallback(() => {
    if (!selectedQuality || !roomId || !onQualityChange) return;
    fetch(`${API_URL}/api/torrents/room-stream?roomId=${roomId}`)
      .then(r => r.json())
      .then(data => {
        if (data.formats) {
          const f = data.formats.find((x: any) => x.id === selectedQuality);
          if (f?.url) onQualityChange(selectedQuality);
        }
      })
      .catch(() => {});
  }, [selectedQuality, roomId, onQualityChange]);

  const isFullscreen = typeof document !== 'undefined' && !!document.fullscreenElement;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group outline-none"
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
    >
      {/* ──── Quality selector ──── */}
      {qualities && qualities.length > 1 && onQualityChange && (
        <div className="absolute top-3 right-3 z-20 flex gap-1.5 flex-wrap">
          {qualities.map(q => (
            <button
              key={q.id}
              onClick={(e) => { e.stopPropagation(); onQualityChange(q.id); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md transition-all ${
                q.id === selectedQuality
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-black/40 text-white/80 hover:bg-black/60 border border-white/20'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* ──── Loading spinner ──── */}
      {videoLoading && src && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-10 h-10 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ──── Video or Error ──── */}
      {videoError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <p className="text-sm text-rose-400">Ошибка загрузки видео</p>
          <button onClick={reloadCurrentFormat} className="text-xs text-zinc-500 hover:text-white underline">
            Попробовать другой формат
          </button>
        </div>
      ) : src ? (
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onPlay={() => { setPlaying(true); emitPlay(); }}
          onPause={() => { setPlaying(false); emitPause(); }}
          onSeeked={emitSeek}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration ?? 0);
            onVideoReady();
          }}
          onCanPlay={onVideoPlaybackReady}
          onError={() => setVideoError(true)}
          onWaiting={() => setVideoLoading(true)}
          onPlaying={() => setVideoLoading(false)}
          onRateChange={() => setPlaybackRate(videoRef.current?.playbackRate ?? 1)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Play size={48} className="opacity-50" />
          <p className="text-sm">Ожидание видео...</p>
        </div>
      )}

      {/* ──── Controls overlay ──── */}
      {src && !videoError && (
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Seek bar */}
          <div
            className="relative h-1.5 group/seek cursor-pointer mx-4"
            onClick={onSeekBarClick}
          >
            <div className="absolute inset-0 rounded-full bg-white/20" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/80 transition-[width]"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Play/Pause */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label={playing ? "Пауза" : "Воспроизведение"}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Skip back */}
            <button onClick={(e) => { e.stopPropagation(); handleSkip(-1); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Назад 10с">
              <Rewind size={16} />
            </button>

            {/* Skip forward */}
            <button onClick={(e) => { e.stopPropagation(); handleSkip(1); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Вперёд 10с">
              <FastForward size={16} />
            </button>

            {/* Time */}
            <span className="text-xs font-mono text-zinc-300 ml-1 min-w-[80px] tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v); }}
                className="px-2 py-1 text-xs font-semibold hover:bg-white/10 rounded-lg transition-colors"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); setSpeed(s); }}
                      className={`block w-full px-4 py-1.5 text-xs text-left hover:bg-white/10 transition-colors ${
                        s === playbackRate ? 'text-white font-bold' : 'text-zinc-400'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const v = videoRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={muted ? "Включить звук" : "Выключить звук"}
              >
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
                  if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = false; setMuted(false); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-16 h-1 accent-white cursor-pointer"
                aria-label="Громкость"
              />
            </div>

            {/* PiP */}
            {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button onClick={(e) => { e.stopPropagation(); togglePiP(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Картинка в картинке">
                <PictureInPicture2 size={16} />
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Полный экран">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
