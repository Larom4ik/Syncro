import { Router } from 'express';
import { pickBestTorrent, searchTorrents } from '../services/torrentScraper.js';

export const torrentsRouter = Router();

torrentsRouter.get('/search', async (req, res) => {
  try {
    const title = String(req.query.title || '');
    const year = req.query.year ? Number(req.query.year) : undefined;

    if (!title.trim()) {
      return res.status(400).json({ error: 'Параметр title обязателен' });
    }

    const results = await searchTorrents(title, year);
    const recommended = pickBestTorrent(results);

    res.json({ results, recommendedId: recommended ? results.indexOf(recommended) : 0 });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
