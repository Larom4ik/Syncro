"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { GlassPanel } from "@/components/shared/GlassPanel";
import { CreateRoomDialog, JoinRoomDialog } from "@/components/catalog/CreateRoomDialog";
import { useIdentity } from "@/hooks/useIdentity";
import { generateRoomId } from "@/lib/api";
import { saveRoomSession } from "@/lib/storage/roomSession";
import { storeLocalFile } from "@/lib/localFileStore";

type StreamMode = "url" | "file";

export default function StreamPage() {
  const router = useRouter();
  const { identity, login, isLoggedIn } = useIdentity();
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<StreamMode>("url");
  const [streamUrl, setStreamUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleCreate = (password: string, roomName: string) => {
    if (!identity) return;
    const roomId = generateRoomId();

    saveRoomSession(roomId, {
      password,
      streamUrl: mode === "url" ? streamUrl : undefined,
      meta: {
        mode: mode === "url" ? "custom-url" : "custom-p2p",
        title: roomName || (mode === "url" ? "Custom URL Stream" : selectedFile?.name || "Local File"),
      },
      isHost: true,
    });

    if (mode === "file" && selectedFile) {
      storeLocalFile(roomId, selectedFile);
    }

    setCreateOpen(false);
    router.push(`/room/${roomId}`);
  };

  const handleJoin = (password: string) => {
    saveRoomSession(joinRoomId, {
      password,
      meta: { mode: "custom-url", title: "Custom Stream" },
      isHost: false,
    });
    setJoinOpen(false);
    router.push(`/room/${joinRoomId}`);
  };

  return (
    <main className="min-h-screen bg-[var(--syncro-bg-deep)] text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black">Custom Stream</h1>
          <p className="text-sm text-zinc-400">
            Прямая ссылка, YouTube, VK Video или локальный файл.
          </p>
        </div>

        {!isLoggedIn ? (
          <GlassPanel className="p-8 space-y-4 text-center">
            <Input
              placeholder="Никнейм..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Button className="w-full" onClick={() => login(nickname)} disabled={!nickname.trim()}>
              Войти
            </Button>
          </GlassPanel>
        ) : (
          <>
            <div className="flex gap-2">
              {(["url", "file"] as StreamMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-[var(--syncro-accent)] text-black"
                      : "bg-white/5 text-zinc-400 border border-white/10"
                  }`}
                >
                  {m === "url" ? "По ссылке" : "Локальный файл"}
                </button>
              ))}
            </div>

            <GlassPanel className="p-6 space-y-4">
              {mode === "url" ? (
                <Input
                  label="URL видео (YouTube, VK, .mp4, .m3u8)"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
              ) : (
                <label className="block space-y-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Файл с ПК</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[var(--syncro-accent)] file:text-black file:font-semibold"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Файл не загружается на сервер. P2P через PeerJS.
                  </p>
                </label>
              )}

              <Button
                className="w-full"
                disabled={mode === "url" ? !streamUrl.trim() : !selectedFile}
                onClick={() => setCreateOpen(true)}
              >
                Создать комнату
              </Button>
            </GlassPanel>

            <GlassPanel className="p-6 space-y-4">
              <Input
                label="ID комнаты для входа"
                placeholder="abc12345"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={!joinRoomId.trim()}
                onClick={() => setJoinOpen(true)}
              >
                Присоединиться
              </Button>
            </GlassPanel>
          </>
        )}
      </div>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultName={mode === "url" ? "URL Stream" : selectedFile?.name || "Local Stream"}
        title="Создать Custom Stream"
        onConfirm={handleCreate}
      />

      <JoinRoomDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        roomId={joinRoomId}
        onConfirm={handleJoin}
      />
    </main>
  );
}