"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { SyncPlayer } from "@/components/player/SyncPlayer";
import { RoomSidebar } from "@/components/player/RoomSidebar";
import { useIdentity } from "@/hooks/useIdentity";
import { useSocket } from "@/providers/SocketProvider";
import { useRoom } from "@/hooks/useRoom";
import { useCryptoContext } from "@/providers/CryptoProvider";
import { loadRoomSession, clearRoomSession } from "@/lib/storage/roomSession";
import { getLocalFile } from "@/lib/localFileStore";
import type { RoomMeta } from "@/lib/types";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { identity } = useIdentity();
  const { socket } = useSocket();
  const { initKey } = useCryptoContext();

  const [session] = useState(() => {
    const s = loadRoomSession(roomId);
    if (s && s.meta.mode === "custom-p2p") {
      const file = getLocalFile(roomId);
      if (file) {
        return { ...s, streamUrl: URL.createObjectURL(file) };
      }
    }
    return s;
  });
  const [roomKeyReady, setRoomKeyReady] = useState(false);
  const [meta, setMeta] = useState<RoomMeta | null>(session?.meta as RoomMeta | null);
  const [isHost, setIsHost] = useState(session?.isHost ?? false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const initializedRef = useRef(false);

  const onJoinOk = useCallback(
    (data: { roomId: string; meta: RoomMeta; isHost: boolean }) => {
      setMeta(data.meta);
      setIsHost(data.isHost);
      setJoined(true);
    },
    []
  );

  const { roomUsers, createRoom, joinRoom, leaveRoom } = useRoom({
    socket,
    onJoinOk,
    onJoinDenied: (msg) => setError(msg),
  });

  useEffect(() => {
    if (!session || !identity || !socket || initializedRef.current) {
      if (!session) setError("Сессия не найдена. Вернитесь в каталог.");
      return;
    }
    initializedRef.current = true;

    (async () => {
      await initKey(session.password, roomId);
      setRoomKeyReady(true);

      const roomMeta: RoomMeta = {
        mode: (session.meta.mode as RoomMeta["mode"]) || "torrent",
        tmdbId: session.meta.tmdbId,
        title: session.meta.title,
        posterPath: session.meta.posterPath,
        streamUrl: session.streamUrl,
      };

      if (session.isHost) {
        await createRoom({
          roomId,
          password: session.password,
          roomName: session.meta.title,
          hostUserId: identity.userId,
          nickname: identity.nickname,
          meta: roomMeta,
        });
      } else {
        await joinRoom({
          roomId,
          password: session.password,
          nickname: identity.nickname,
          userId: identity.userId,
        });
      }
    })();
  }, [session, identity, socket, roomId, initKey, createRoom, joinRoom]);

  const handleLeave = () => {
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

  return (
    <main className="min-h-screen bg-[var(--syncro-bg-deep)] text-white">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm">
            {error}
          </div>
        )}

        {joined && session && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <SyncPlayer
                src={session.streamUrl || null}
                magnet={session.magnet || null}
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
