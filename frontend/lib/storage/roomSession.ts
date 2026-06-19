const PREFIX = 'syncro_room_';

export interface RoomSessionData {
  password: string;
  magnet?: string;
  streamUrl?: string;
  meta: {
    mode: string;
    tmdbId?: number;
    title: string;
    posterPath?: string;
  };
  isHost: boolean;
}

export function saveRoomSession(roomId: string, data: RoomSessionData) {
  sessionStorage.setItem(`${PREFIX}${roomId}`, JSON.stringify(data));
}

export function loadRoomSession(roomId: string): RoomSessionData | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${roomId}`);
    if (!raw) return null;
    return JSON.parse(raw) as RoomSessionData;
  } catch {
    return null;
  }
}

export function clearRoomSession(roomId: string) {
  sessionStorage.removeItem(`${PREFIX}${roomId}`);
}
