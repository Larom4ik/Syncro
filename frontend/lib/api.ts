import { API_URL } from './constants';
import type { MovieDetails, MovieSummary, TorrentOption } from './types';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Ошибка запроса');
  }
  return res.json();
}

export const api = {
  discover: (params?: { genre?: string; year?: string; sortBy?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.genre) q.set('genre', params.genre);
    if (params?.year) q.set('year', params.year);
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString();
    return get<{ results: MovieSummary[] }>(`/api/catalog/discover${qs ? `?${qs}` : ''}`);
  },

  search: (q: string) =>
    get<{ results: MovieSummary[] }>(`/api/catalog/search?q=${encodeURIComponent(q)}`),

  movie: (id: string) => get<MovieDetails>(`/api/catalog/movie/${id}`),

  genres: () => get<{ id: number; name: string }[]>('/api/catalog/genres'),

  torrents: (title: string, year?: number) => {
    const q = new URLSearchParams({ title });
    if (year) q.set('year', String(year));
    return get<{ results: TorrentOption[]; recommendedId: number }>(
      `/api/torrents/search?${q}`
    );
  },
};

export function generateRoomId(): string {
  return crypto.randomUUID().slice(0, 8);
}