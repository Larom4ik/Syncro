"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { Socket } from "socket.io-client";

interface VideoPlayerProps {
  src: string;
  socket: Socket | null;
  roomId: string | null;
}

export default function VideoPlayer({ src, socket, roomId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const skipNextPlay = useRef(false);
  const skipNextPause = useRef(false);
  const skipNextSeek = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    }

    if (socket && roomId) {
      // Ловим PLAY от другого юзера
      socket.on("server_play", (currentTime: number) => {
        console.log(`[FRONTEND RECEIVE] Прилетел PLAY с сервера, время: ${currentTime}`);
        if (Math.abs(video.currentTime - currentTime) > 0.5) {
          skipNextSeek.current = true;
          video.currentTime = currentTime;
        }
        if (video.paused) {
          skipNextPlay.current = true;
          video.play().catch((err) => {
            console.error("❌ Браузер заблокировал автоплей! Кликни по экрану хотя бы раз:", err);
          });
        }
      });

      // Ловим PAUSE
      socket.on("server_pause", () => {
        console.log(`[FRONTEND RECEIVE] Прилетел PAUSE с сервера`);
        if (!video.paused) {
          skipNextPause.current = true;
          video.pause();
        }
      });

      // Ловим SEEK
      socket.on("server_seek", (currentTime: number) => {
        console.log(`[FRONTEND RECEIVE] Прилетел SEEK с сервера, время: ${currentTime}`);
        if (Math.abs(video.currentTime - currentTime) > 0.5) {
          skipNextSeek.current = true;
          video.currentTime = currentTime;
        }
      });
    }

    return () => {
      if (hls) hls.destroy();
      if (socket) {
        socket.off("server_play");
        socket.off("server_pause");
        socket.off("server_seek");
      }
    };
  }, [src, socket, roomId]);

  const handlePlay = () => {
    if (skipNextPlay.current) {
      skipNextPlay.current = false;
      return;
    }
    if (socket && roomId && videoRef.current) {
      console.log(`[FRONTEND EMIT] Отправляю PLAY на сервер для комнаты: ${roomId}`);
      socket.emit("video_play", { roomId, currentTime: videoRef.current.currentTime });
    }
  };

  const handlePause = () => {
    if (skipNextPause.current) {
      skipNextPause.current = false;
      return;
    }
    if (socket && roomId) {
      console.log(`[FRONTEND EMIT] Отправляю PAUSE на сервер для комнаты: ${roomId}`);
      socket.emit("video_pause", { roomId });
    }
  };

  const handleSeeked = () => {
    if (skipNextSeek.current) {
      skipNextSeek.current = false;
      return;
    }
    if (socket && roomId && videoRef.current) {
      console.log(`[FRONTEND EMIT] Отправляю SEEK на сервер для комнаты: ${roomId}`);
      socket.emit("video_seek", { roomId, currentTime: videoRef.current.currentTime });
    }
  };

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
      <video
        ref={videoRef}
        controls
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        className="w-full h-full object-contain"
      />
    </div>
  );
}