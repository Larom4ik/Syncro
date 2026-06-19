"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { decryptPayload, deriveRoomKey, encryptPayload } from "@/lib/crypto/aesGcm";
import type { BootstrapPayload, SyncEvent } from "@/lib/types";

interface CryptoContextValue {
  initKey: (password: string, roomId: string) => Promise<void>;
  encryptSync: (event: SyncEvent) => Promise<{ iv: string; ct: string }>;
  decryptSync: (envelope: { iv: string; ct: string }) => Promise<SyncEvent>;
  encryptBootstrap: (payload: BootstrapPayload) => Promise<{ iv: string; ct: string }>;
  decryptBootstrap: (envelope: { iv: string; ct: string }) => Promise<BootstrapPayload>;
  isReady: () => boolean;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const keyRef = useRef<CryptoKey | null>(null);

  const initKey = useCallback(async (password: string, roomId: string) => {
    keyRef.current = await deriveRoomKey(password, roomId);
  }, []);

  const isReady = useCallback(() => keyRef.current !== null, []);

  const encryptSync = useCallback(async (event: SyncEvent) => {
    if (!keyRef.current) throw new Error("Ключ не инициализирован");
    return encryptPayload(keyRef.current, event);
  }, []);

  const decryptSync = useCallback(async (envelope: { iv: string; ct: string }) => {
    if (!keyRef.current) throw new Error("Ключ не инициализирован");
    return decryptPayload<SyncEvent>(keyRef.current, envelope);
  }, []);

  const encryptBootstrap = useCallback(async (payload: BootstrapPayload) => {
    if (!keyRef.current) throw new Error("Ключ не инициализирован");
    return encryptPayload(keyRef.current, payload);
  }, []);

  const decryptBootstrap = useCallback(async (envelope: { iv: string; ct: string }) => {
    if (!keyRef.current) throw new Error("Ключ не инициализирован");
    return decryptPayload<BootstrapPayload>(keyRef.current, envelope);
  }, []);

  return (
    <CryptoContext.Provider
      value={{ initKey, encryptSync, decryptSync, encryptBootstrap, decryptBootstrap, isReady }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCryptoContext() {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCryptoContext must be used within CryptoProvider");
  return ctx;
}
