"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Maximize, Pause, Play, Volume2, VolumeX, Lock } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useEncryptedSync } from "@/hooks/useEncryptedSync";
import type { BootstrapPayload, SyncEvent } from "@/lib/types";

export interface SyncPlayerProps {
  src: string | null;
  magnet?: string | null;
  socket: Socket | null;
  roomId: string | null;
  userId: string;
  roomKeyReady: boolean;
  isHost?: boolean;
  onNeedBootstrap?: () => void;
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
  magnet,
  socket,
  roomId,
  userId,
  roomKeyReady,
  isHost,
  onNeedBootstrap,
  title,
}: SyncPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextPlay = useRef(false);
  const skipNextPause = useRef(false);
  const skipNextSeek = useRef(false);
  const hlsRef = useRef<Hls | null>(null);
  const torrentRef = useRef<{ destroy: () => void } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [torrentProgress, setTorrentProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadMagnet = useCallback(async (mag: string) => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    if (torrentRef.current) {
      torrentRef.current.destroy();
      torrentRef.current = null;
    }

    try {
      const WebTorrent = (await import("webtorrent")).default;
      const client = new WebTorrent();
      torrentRef.current = client;

      client.add(mag, (torrent) => {
        const file =
          torrent.files.find((f) => /\.(mp4|mkv|webm|avi)$/i.test(f.name)) ||
          torrent.files[0];
        if (!file) {
          setLoading(false);
          return;
        }

        file.renderTo(video, { autoplay: false, controls: false }, () => {
          setLoading(false);
        });

        torrent.on("download", () => {
          if (torrent.length > 0) {
            setTorrentProgress(Math.round((torrent.downloaded / torrent.length) * 100));
          }
        });
      });
    } catch {
      setLoading(false);
    }
  }, []);

  const applySyncEvent = useCallback((event: SyncEvent) => {
    const video = videoRef.current;
    if (!video) return;

    if (event.type === "play" && event.t !== undefined) {
      if (Math.abs(video.currentTime - event.t) > 0.5) {
        skipNextSeek.current = true;
        video.currentTime = event.t;
      }
      if (video.paused) {
        skipNextPlay.current = true;
        video.play().catch(() => {});
      }
    } else if (event.type === "pause") {
      if (!video.paused) {
        skipNextPause.current = true;
        video.pause();
      }
    } else if (event.type === "seek" && event.t !== undefined) {
      if (Math.abs(video.currentTime - event.t) > 0.5) {
        skipNextSeek.current = true;
        video.currentTime = event.t;
      }
    } else if (event.type === "state_snapshot" && event.t !== undefined) {
      skipNextSeek.current = true;
      video.currentTime = event.t;
      if (event.playing) {
        skipNextPlay.current = true;
        video.play().catch(() => {});
      } else {
        skipNextPause.current = true;
        video.pause();
      }
    }
  }, []);

  const handleBootstrap = useCallback(
    (payload: BootstrapPayload) => {
      if (payload.streamUrl) loadSource(payload.streamUrl);
      if (payload.magnet) loadMagnet(payload.magnet);
    },
    [loadSource, loadMagnet]
  );

  const { emitSync, emitBootstrap } = useEncryptedSync({
    socket,
    roomId,
    userId,
    roomKeyReady,
    onSyncEvent: applySyncEvent,
    onBootstrap: handleBootstrap,
  });

  useEffect(() => {
    if (src) loadSource(src);
    else if (magnet) loadMagnet(magnet);
    else if (!isHost) onNeedBootstrap?.();

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (torrentRef.current) torrentRef.current.destroy();
    };
  }, [src, magnet, loadSource, loadMagnet, isHost, onNeedBootstrap]);

  useEffect(() => {
    if (isHost && roomKeyReady && socket && roomId) {
      const timer = setTimeout(() => {
        emitBootstrap({
          streamUrl: src || undefined,
          magnet: magnet || undefined,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isHost, roomKeyReady, socket, roomId, src, magnet, emitBootstrap]);

  const handlePlay = () => {
    if (skipNextPlay.current) {
      skipNextPlay.current = false;
      return;
    }
    emitSync({ type: "play", t: videoRef.current?.currentTime ?? 0 });
  };

  const handlePause = () => {
    if (skipNextPause.current) {
      skipNextPause.current = false;
      return;
    }
    emitSync({ type: "pause", t: videoRef.current?.currentTime ?? 0 });
  };

  const handleSeeked = () => {
    if (skipNextSeek.current) {
      skipNextSeek.current = false;
      return;
    }
    emitSync({ type: "seek", t: videoRef.current?.currentTime ?? 0 });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = parseFloat(e.target.value);
    video.currentTime = t;
    setCurrentTime(t);
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
      <video
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain"
        onPlay={() => {
          setPlaying(true);
          handlePlay();
        }}
        onPause={() => {
          setPlaying(false);
          handlePause();
        }}
        onSeeked={handleSeeked}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
      />

      {(loading || (magnet && torrentProgress < 5)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--syncro-accent)] transition-all"
              style={{ width: `${torrentProgress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">Буферизация {torrentProgress}%</span>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center gap-2">
          {title && <span className="text-sm font-semibold truncate">{title}</span>}
          <Lock size={14} className="text-[var(--syncro-accent)] shrink-0" aria-label="E2E шифрование" />
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
    </div>
  );
}
