"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { SyncPlayer } from "@/components/player/SyncPlayer";
import { RoomSidebar } from "@/components/player/RoomSidebar";
import { useIdentity } from "@/hooks/useIdentity";
import { useSocket } from "@/providers/SocketProvider";
import { useCryptoContext } from "@/providers/CryptoProvider";
import { useRoom } from "@/hooks/useRoom";
import { loadRoomSession, clearRoomSession } from "@/lib/storage/roomSession";
import type { RoomMeta } from "@/lib/types";
import { API_URL } from "@/lib/constants";

interface VideoFormat {
  id: string;
  label: string;
  ext: string;
  url: string;
  size: number;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { identity } = useIdentity();
  const { socket } = useSocket();
  const { initKey } = useCryptoContext();

  const [session] = useState(() => loadRoomSession(roomId));
  const [meta, setMeta] = useState<RoomMeta | null>(session?.meta as RoomMeta | null);
  const [isHost, setIsHost] = useState(session?.isHost ?? false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(!session ? "Сессия не найдена" : "");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [roomKeyReady, setRoomKeyReady] = useState(false);
  const initializedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadVideoForHost = useCallback(async (url: string) => {
    try {
      const res = await fetch(`${API_URL}/api/torrents/extract-formats?url=${encodeURIComponent(url)}&roomId=${roomId}`);
      const data = await res.json();
      if (data.formats && data.formats.length > 0) {
        setFormats(data.formats);
        const best = data.formats[0];
        setSelectedQuality(best.id);
        setVideoUrl(best.url);
      }
    } catch (err) {
      console.error('Ошибка загрузки видео:', err);
    }
  }, [roomId]);

  const pollStreamForGuest = useCallback(() => {
    const fetchStream = async () => {
      try {
        const res = await fetch(`${API_URL}/api/torrents/room-stream?roomId=${roomId}`);
        if (!res.ok) {
          pollTimerRef.current = setTimeout(fetchStream, 2000);
          return;
        }
        const data = await res.json();
        setVideoUrl(data.url);
        if (data.formats) setFormats(data.formats);
      } catch (err) {
        pollTimerRef.current = setTimeout(fetchStream, 2000);
      }
    };
    fetchStream();
  }, [roomId]);

  const onJoinOk = useCallback(
    (data: { roomId: string; meta: RoomMeta; isHost: boolean }) => {
      setMeta(data.meta);
      setIsHost(data.isHost);
      setJoined(true);
      if (data.isHost && session?.streamUrl) {
        loadVideoForHost(session.streamUrl);
      } else if (!data.isHost) {
        pollStreamForGuest();
      }
    },
    [session, loadVideoForHost, pollStreamForGuest]
  );

  const { roomUsers, createRoom, joinRoom, leaveRoom } = useRoom({
    socket,
    onJoinOk,
    onJoinDenied: (msg) => setError(msg),
  });

  // Инициализация E2E ключа для синхронизации
  useEffect(() => {
    if (!joined || !session?.password || !identity) return;
    initKey(session.password, roomId).then(() => setRoomKeyReady(true));
  }, [joined, session, roomId, identity, initKey]);

  useEffect(() => {
    if (!session || !identity || !socket || initializedRef.current) return;
    initializedRef.current = true;

    const roomMeta: RoomMeta = {
      mode: (session.meta.mode as RoomMeta["mode"]) || "custom-url",
      title: session.meta.title,
      posterPath: session.meta.posterPath,
      streamUrl: session.streamUrl,
    };

    if (session.isHost) {
      createRoom({
        roomId,
        password: session.password,
        roomName: session.meta.title,
        hostUserId: identity.userId,
        nickname: identity.nickname,
        meta: roomMeta,
      });
    } else {
      joinRoom({
        roomId,
        password: session.password,
        nickname: identity.nickname,
        userId: identity.userId,
      });
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [session, identity, socket, roomId, createRoom, joinRoom]);

  const handleQualityChange = async (formatId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/torrents/select-quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, formatId }),
      });
      const data = await res.json();
      if (data.url) {
        setVideoUrl(data.url);
        setSelectedQuality(formatId);
      }
    } catch (err) {
      console.error('Ошибка смены качества:', err);
    }
  };

  const handleLeave = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    leaveRoom(roomId);
    clearRoomSession(roomId);
    router.push("/");
  };

  if (!identity) {
    return (
      <main className="min-h-screen flex items-center justify-center text-zinc-400">
        <Button onClick={() => router.push("/")}>Сначала войдите</Button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center text-zinc-400">
        <Button onClick={() => router.push("/")}>Вернуться в каталог</Button>
      </main>
    );
  }

  if (session.magnet?.includes("fbdomen.top")) {
    return (
      <main className="min-h-screen bg-black text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 bg-black/80 backdrop-blur">
          <h2 className="text-sm font-bold truncate">{session.meta.title}</h2>
          <Button variant="secondary" onClick={handleLeave}>
            ← Назад
          </Button>
        </div>
        <iframe
          src={session.magnet}
          className="w-full h-screen border-none"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--syncro-bg-deep)] text-white">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm">
            {error}
          </div>
        )}

        {joined && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {isHost && formats.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-zinc-500">Качество:</span>
                  {formats.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleQualityChange(f.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedQuality === f.id
                          ? "bg-[var(--syncro-accent)] text-black"
                          : "bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/10"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              <SyncPlayer
                src={videoUrl}
                socket={socket}
                roomId={roomId}
                userId={identity.userId}
                roomKeyReady={roomKeyReady}
                isHost={isHost}
                title={meta?.title}
              />
              <Button variant="secondary" onClick={handleLeave}>
                ← Выйти из комнаты
              </Button>
            </div>
            <RoomSidebar
              roomName={meta?.title || roomId}
              roomId={roomId}
              users={roomUsers}
              nickname={identity.nickname}
            />
          </div>
        )}

        {!joined && !error && (
          <p className="text-center text-zinc-500 py-24">Подключение к комнате...</p>
        )}
      </div>
    </main>
  );
}