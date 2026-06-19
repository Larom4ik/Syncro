export type RoomMode = 'catalog' | 'torrent' | 'custom-url' | 'custom-p2p' | 'solo';

export interface RoomMeta {
  mode: RoomMode;
  tmdbId?: number;
  title: string;
  posterPath?: string;
  streamUrl?: string;
  hostPeerId?: string;
}

export interface RoomUser {
  userId: string;
  nickname: string;
}

export interface RoomSession {
  id: string;
  name: string;
  passwordHash: string;
  meta: RoomMeta;
  hostUserId: string;
  users: Map<string, RoomUser>;
  createdAt: number;
}

export interface PublicRoomInfo {
  id: string;
  name: string;
  title: string;
  posterPath?: string;
  mode: RoomMode;
  usersCount: number;
}
