"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { useCryptoContext } from "@/providers/CryptoProvider";
import type { BootstrapPayload, SyncEvent } from "@/lib/types";

interface UseEncryptedSyncOptions {
  socket: Socket | null;
  roomId: string | null;
  userId: string;
  roomKeyReady: boolean;
  onSyncEvent: (event: SyncEvent) => void;
  onBootstrap: (payload: BootstrapPayload) => void;
}

export function useEncryptedSync({
  socket,
  roomId,
  userId,
  roomKeyReady,
  onSyncEvent,
  onBootstrap,
}: UseEncryptedSyncOptions) {
  const { encryptSync, decryptSync, encryptBootstrap, decryptBootstrap } = useCryptoContext();
  const callbacksRef = useRef({ onSyncEvent, onBootstrap });
  callbacksRef.current = { onSyncEvent, onBootstrap };

  useEffect(() => {
    if (!socket || !roomId || !roomKeyReady) return;

    const handleSync = async (payload: {
      roomId: string;
      envelope: { iv: string; ct: string };
    }) => {
      if (payload.roomId !== roomId) return;
      try {
        const event = await decryptSync(payload.envelope);
        if (event.senderId === userId) return;
        callbacksRef.current.onSyncEvent(event);
      } catch {
        /* ignore bad ciphertext */
      }
    };

    const handleBootstrap = async (payload: {
      roomId: string;
      envelope: { iv: string; ct: string };
    }) => {
      if (payload.roomId !== roomId) return;
      try {
        const data = await decryptBootstrap(payload.envelope);
        callbacksRef.current.onBootstrap(data);
      } catch {
        /* ignore */
      }
    };

    socket.on("sync_encrypted", handleSync);
    socket.on("bootstrap_encrypted", handleBootstrap);

    return () => {
      socket.off("sync_encrypted", handleSync);
      socket.off("bootstrap_encrypted", handleBootstrap);
    };
  }, [socket, roomId, userId, roomKeyReady, decryptSync, decryptBootstrap]);

  const emitSync = useCallback(
    async (event: Omit<SyncEvent, "ts" | "senderId">) => {
      if (!socket || !roomId || !roomKeyReady) return;
      const full: SyncEvent = { ...event, ts: Date.now(), senderId: userId };
      const envelope = await encryptSync(full);
      socket.emit("sync_encrypted", { roomId, envelope });
    },
    [socket, roomId, userId, roomKeyReady, encryptSync]
  );

  const emitBootstrap = useCallback(
    async (payload: BootstrapPayload, targetSocketId?: string) => {
      if (!socket || !roomId || !roomKeyReady) return;
      const envelope = await encryptBootstrap(payload);
      socket.emit("bootstrap_encrypted", { roomId, envelope, targetSocketId });
    },
    [socket, roomId, roomKeyReady, encryptBootstrap]
  );

  return { emitSync, emitBootstrap };
}
