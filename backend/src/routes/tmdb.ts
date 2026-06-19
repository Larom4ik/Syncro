import { Router } from 'express';
import {
  discoverMovies,
  getGenres,
  getMovieDetails,
  mapMovieDetails,
  mapMovieSummary,
  searchMovies,
} from '../services/tmdbService.js';

export const tmdbRouter = Router();

tmdbRouter.get('/discover', async (req, res) => {
  try {
    const data = await discoverMovies({
      page: Number(req.query.page) || 1,
      ...(req.query.genre ? { genre: String(req.query.genre) } : {}),
      ...(req.query.year ? { year: String(req.query.year) } : {}),
      sortBy: (req.query.sortBy as string) || 'popularity.desc',
    });
    res.json({
      results: data.results.map(mapMovieSummary),
      page: data.page,
      totalPages: data.total_pages,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

tmdbRouter.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    if (!q.trim()) return res.status(400).json({ error: 'Параметр q обязателен' });
    const data = await searchMovies(q, Number(req.query.page) || 1);
    res.json({ results: data.results.map(mapMovieSummary) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

tmdbRouter.get('/movie/:id', async (req, res) => {
  try {
    const data = await getMovieDetails(Number(req.params.id));
    res.json(mapMovieDetails(data));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

tmdbRouter.get('/genres', async (_req, res) => {
  try {
    const data = await getGenres();
    res.json(data.genres);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
