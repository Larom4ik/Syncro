export interface SyncEvent {
  type: 'play' | 'pause' | 'seek' | 'state_request' | 'state_snapshot';
  t?: number;
  playing?: boolean;
  ts: number;
  senderId: string;
}

export interface BootstrapPayload {
  magnet?: string;
  streamUrl?: string;
  hostPeerId?: string;
  tmdbId?: number;
  title?: string;
}

export interface UserIdentity {
  userId: string;
  nickname: string;
  createdAt: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  overview: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  popularity: number;
  genreIds: number[];
}

export interface MovieDetails extends MovieSummary {
  runtime: number | null;
  genres: string[];
  country: string;
  duration: string;
}

export interface TorrentOption {
  title: string;
  magnet: string;
  seeders: number;
  size: string;
  quality: string;
  provider: '1337x' | 'rutracker';
  score: number;
}

export interface PublicRoom {
  id: string;
  name: string;
  title: string;
  posterPath?: string;
  mode: string;
  usersCount: number;
}

export interface RoomMeta {
  mode: 'catalog' | 'torrent' | 'custom-url' | 'custom-p2p' | 'solo';
  tmdbId?: number;
  title: string;
  posterPath?: string;
  streamUrl?: string;
  hostPeerId?: string;
}
