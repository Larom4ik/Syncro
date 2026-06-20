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

// ✅ Обновили под данные от нашего парсера
export interface MovieSummary {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  poster: string;
  year: number;
  rating: string | null;
  genres: string[];
  magnet: string;
  size: string;
  kinopoiskId: number | null;
  // оставляем для совместимости со старым кодом
  overview?: string;
  backdrop?: string;
  popularity?: number;
  genreIds?: number[];
}

// ✅ MovieDetails теперь тоже базируется на MovieSummary
export interface MovieDetails extends MovieSummary {
  runtime: number | null;
  country: string;
  duration: string;
}

export interface TorrentOption {
  title: string;
  magnet: string;
  seeders: number;
  size: string;
  quality: string;
  provider: '1337x' | 'rutracker' | 'rutorg' | 'fasttorrent';
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