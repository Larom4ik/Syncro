"use client";

import { useCallback, useRef } from "react";
import { decryptPayload, deriveRoomKey, encryptPayload } from "@/lib/crypto/aesGcm";
import type { BootstrapPayload, SyncEvent } from "@/lib/types";

export function useCrypto() {
  const keyRef = useRef<CryptoKey | null>(null);

  const initKey = useCallback(async (password: string, roomId: string) => {
    keyRef.current = await deriveRoomKey(password, roomId);
    return keyRef.current;
  }, []);

  const encryptSync = useCallback(async (event: SyncEvent) => {
    if (!keyRef.current) throw new Error("Ключ комнаты не инициализирован");
    return encryptPayload(keyRef.current, event);
  }, []);

  const decryptSync = useCallback(async (envelope: { iv: string; ct: string }) => {
    if (!keyRef.current) throw new Error("Ключ комнаты не инициализирован");
    return decryptPayload<SyncEvent>(keyRef.current, envelope);
  }, []);

  const encryptBootstrap = useCallback(async (payload: BootstrapPayload) => {
    if (!keyRef.current) throw new Error("Ключ комнаты не инициализирован");
    return encryptPayload(keyRef.current, payload);
  }, []);

  const decryptBootstrap = useCallback(async (envelope: { iv: string; ct: string }) => {
    if (!keyRef.current) throw new Error("Ключ комнаты не инициализирован");
    return decryptPayload<BootstrapPayload>(keyRef.current, envelope);
  }, []);

  return { initKey, encryptSync, decryptSync, encryptBootstrap, decryptBootstrap };
}
