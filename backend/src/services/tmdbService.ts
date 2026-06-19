import axios from 'axios';
import { env } from '../config/env.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  popularity: number;
}

export interface TmdbMovieDetails extends TmdbMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
}

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data as T);

  return fetcher().then((data) => {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
    return data;
  });
}

function ensureKey(): string {
  if (!env.tmdbApiKey) {
    throw new Error('TMDB_API_KEY не задан. Добавьте ключ в backend/.env');
  }
  return env.tmdbApiKey;
}

async function tmdbGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const { data } = await axios.get<T>(`${TMDB_BASE}${path}`, {
    params: { api_key: ensureKey(), language: 'ru-RU', ...params },
    timeout: 15000,
  });
  return data;
}

export function posterUrl(path: string | null, size = 'w500'): string {
  if (!path) return '';
  return `${TMDB_IMAGE}/${size}${path}`;
}

export async function discoverMovies(params: {
  page?: number;
  genre?: string;
  year?: string;
  sortBy?: string;
}) {
  const query: Record<string, string | number> = {
    page: params.page || 1,
    sort_by: params.sortBy || 'popularity.desc',
    include_adult: 'false',
  };
  if (params.genre) query.with_genres = params.genre;
  if (params.year) query.primary_release_year = params.year;

  return cached(`discover:${JSON.stringify(query)}`, () =>
    tmdbGet<{ results: TmdbMovie[]; page: number; total_pages: number }>('/discover/movie', query)
  );
}

export async function searchMovies(query: string, page = 1) {
  return cached(`search:${query}:${page}`, () =>
    tmdbGet<{ results: TmdbMovie[] }>('/search/movie', { query, page })
  );
}

export async function getMovieDetails(id: number) {
  return cached(`movie:${id}`, () => tmdbGet<TmdbMovieDetails>(`/movie/${id}`));
}

export async function getGenres() {
  return cached('genres', () =>
    tmdbGet<{ genres: { id: number; name: string }[] }>('/genre/movie/list')
  );
}

export function mapMovieSummary(m: TmdbMovie) {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster: posterUrl(m.poster_path),
    backdrop: posterUrl(m.backdrop_path, 'w1280'),
    year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0,
    rating: m.vote_average,
    popularity: m.popularity,
    genreIds: m.genre_ids,
  };
}

export function mapMovieDetails(m: TmdbMovieDetails) {
  return {
    ...mapMovieSummary(m),
    runtime: m.runtime,
    genres: m.genres.map((g) => g.name),
    country: m.production_countries[0]?.name || '',
    duration: m.runtime ? `${m.runtime} мин.` : '',
  };
}
