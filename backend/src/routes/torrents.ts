import { Router } from 'express';
import path from 'path';
import { create } from 'youtube-dl-exec';
import { pickBestTorrent, searchTorrents } from '../services/torrentScraper.js';

// Инициализируем парсер yt-dlp, указывая жесткий путь к нашему локальному файлу.
// process.cwd() — это корень проекта (папка backend), где лежит yt-dlp.exe
const youtubedl = create(path.join(process.cwd(), 'yt-dlp.exe'));

export const torrentsRouter = Router();

// 1. Твой существующий эндпоинт поиска торрентов
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

// 2. НОВЫЙ эндпоинт для извлечения прямых mp4-ссылок (YouTube, VK и т.д.)
torrentsRouter.get('/extract-url', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    
    if (!rawUrl.trim()) {
      return res.status(400).json({ error: 'Параметр url обязателен' });
    }

    console.log(`[MEDIA EXTRACT] Пытаюсь достать прямую ссылку из: ${rawUrl}`);

   // Прогоняем ссылку через локальный yt-dlp.exe
   const output = (await youtubedl(rawUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: 'best' 
    })) as unknown as { url: string };
    // Возвращаем прямую ссылку на видеопоток
    res.json({ streamUrl: output.url });

  } catch (err) {
    console.error('[MEDIA EXTRACT ERROR]:', (err as Error).message);
    res.status(500).json({ error: 'Не удалось извлечь ссылку из предоставленного URL' });
  }
});