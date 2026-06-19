import type { UserIdentity } from '@/lib/types';

const STORAGE_KEY = 'syncro_identity';

export function loadIdentity(): UserIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserIdentity;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: UserIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function createIdentity(nickname: string): UserIdentity {
  return {
    userId: crypto.randomUUID(),
    nickname: nickname.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function updateNickname(identity: UserIdentity, nickname: string): UserIdentity {
  const updated = { ...identity, nickname: nickname.trim() };
  saveIdentity(updated);
  return updated;
}
