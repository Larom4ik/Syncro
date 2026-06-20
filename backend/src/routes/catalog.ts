import { Router } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';

export const catalogRouter = Router();

const catalogCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000;

const kpHeaders = () => ({ 'X-API-KEY': env.kinopoiskApiKey });

// Универсальный маппер
function mapFilm(f: any) {
  return {
    id: String(f.kinopoiskId ?? f.filmId),
    title: f.nameRu ?? f.nameEn ?? f.nameOriginal ?? 'Без названия',
    titleEn: f.nameEn ?? f.nameOriginal ?? '',
    // ДОБАВЛЕНО: принудительное описание, если поле пустое
    description: f.description ?? f.shortDescription ?? 'Описание отсутствует',
    poster: f.posterUrl ?? f.posterUrlPreview ?? '',
    year: parseInt(f.year ?? '0', 10),
    rating: f.ratingKinopoisk ? String(f.ratingKinopoisk) : (f.rating ? String(f.rating) : null),
    genres: (f.genres ?? []).map((g: any) => g.genre as string),
    magnet: '',
    size: '',
    kinopoiskId: f.kinopoiskId ?? f.filmId ?? null,
  };
}

// 1. Главная витрина
catalogRouter.get('/discover', async (req, res) => {
  const currentYear = new Date().getFullYear();
  const allowedOrders = ['RATING', 'NUM_VOTE', 'YEAR'];
  let sortBy = String(req.query.sortBy || 'NUM_VOTE').toUpperCase();
  if (!allowedOrders.includes(sortBy)) {
    sortBy = 'NUM_VOTE';
  }

  const year = req.query.year ? Number(req.query.year) : null;
  const genre = req.query.genre ? Number(req.query.genre) : null;
  const page = Number(req.query.page) || 1;

  const cacheKey = `catalog_${sortBy}_${year ?? 'all'}_${genre ?? 'all'}_${page}`;
  const hit = catalogCache.get(cacheKey);
  if (hit != null && hit.expires > Date.now()) {
    return res.json({ results: hit.data });
  }

  try {
    const params: any = {
      type: 'FILM',
      order: sortBy,
      ratingFrom: 6,
      ratingTo: 10,
      page,
      yearTo: currentYear, // ДОБАВЛЕНО: исключение фильмов из будущего
    };
    
    if (year && !isNaN(year) && year > 0) {
      params.yearFrom = year;
      params.yearTo = year;
    }
    
    if (genre && !isNaN(genre) && genre > 0) {
      params.genres = genre;
    }

    const { data } = await axios.get(
      'https://kinopoiskapiunofficial.tech/api/v2.2/films',
      { headers: kpHeaders(), params, timeout: 10000 }
    );

    // ДОБАВЛЕНО: дополнительная фильтрация даты на случай, если API вернет "будущие"
    const results = (data.items ?? [])
      .filter((f: any) => (f.posterUrl || f.posterUrlPreview) && (f.year <= currentYear))
      .map(mapFilm);

    catalogCache.set(cacheKey, { data: results, expires: Date.now() + CACHE_TTL });
    res.json({ results });
  } catch (err: any) {
    if (err.response) {
      console.error('[DISCOVER API ERROR]:', err.response.data);
    } else {
      console.error('[DISCOVER ERROR]:', err.message);
    }
    res.status(500).json({ error: 'Ошибка загрузки каталога' });
  }
});

// 2. Поиск по названию
catalogRouter.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Параметр q обязателен' });

  try {
    const { data } = await axios.get(
      'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword',
      {
        headers: kpHeaders(),
        params: { keyword: q, page: 1 },
        timeout: 10000,
      }
    );

    const results = (data.films ?? []).map(mapFilm);
    res.json({ results });
  } catch (err: any) {
    console.error('[SEARCH ERROR]:', err.message);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// 3. Детали фильма
catalogRouter.get('/movie/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { data } = await axios.get(
      `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`,
      { headers: kpHeaders(), timeout: 10000 }
    );

    const result = {
      ...mapFilm(data),
      runtime: data.filmLength ?? null,
      country: (data.countries ?? []).map((c: any) => c.country).join(', '),
      duration: data.filmLength ? `${data.filmLength} мин` : '',
    };

    res.json(result);
  } catch (err: any) {
    console.error('[MOVIE ERROR]:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки фильма' });
  }
});