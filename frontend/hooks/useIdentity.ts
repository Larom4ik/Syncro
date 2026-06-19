"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createIdentity,
  loadIdentity,
  saveIdentity,
  updateNickname,
} from "@/lib/storage/identity";
import type { UserIdentity } from "@/lib/types";

export function useIdentity() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIdentity(loadIdentity());
    setReady(true);
  }, []);

  const login = useCallback((nickname: string) => {
    const existing = loadIdentity();
    const next = existing
      ? updateNickname(existing, nickname)
      : (() => {
          const created = createIdentity(nickname);
          saveIdentity(created);
          return created;
        })();
    setIdentity(next);
    return next;
  }, []);

  return { identity, ready, login, isLoggedIn: !!identity };
}
