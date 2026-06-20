import { Router } from 'express';
import path from 'path';
import { create } from 'youtube-dl-exec';

const youtubedl = create(path.join(process.cwd(), 'yt-dlp.exe'));

export const torrentsRouter = Router();

const roomStreamCache = new Map<string, { url: string; formats: any[]; expires: number }>();
const CACHE_DURATION = 4 * 60 * 60 * 1000;

interface YtFormat {
  format_id: string;
  width: number;
  height: number;
  ext: string;
  url: string;
  filesize: number;
  vcodec: string;
  acodec: string;
}

interface YtOutput {
  url?: string;
  format_id?: string;
  width?: number;
  height?: number;
  formats?: YtFormat[];
}

function getQualityLabel(height: number): string {
  if (height <= 144) return '144p';
  if (height <= 360) return '360p';
  if (height <= 540) return '480p';
  if (height <= 720) return '720p';
  if (height <= 1080) return '1080p';
  if (height <= 1440) return '1440p';
  return '4K';
}

// Поиск источников
torrentsRouter.get('/search', async (req, res) => {
  try {
    const title = String(req.query.title || '');
    const kinopoiskId = req.query.kinopoiskId as string | undefined;
    const type = (req.query.type as string) || 'film';

    if (!title.trim()) {
      return res.status(400).json({ error: 'Параметр title обязателен' });
    }

    if (kinopoiskId) {
      const mediaType = type === 'series' ? 'series' : 'film';
      const watchUrl = `https://fbdomen.top/${mediaType}/${kinopoiskId}/?utm_referrer=www.google.com`;

      const results = [{
        title: 'Смотреть',
        magnet: watchUrl,
        seeders: 0,
        size: '',
        quality: '',
        provider: 'kinopoisk-vip' as const,
        score: 1000
      }];

      return res.json({ results, recommendedId: 0 });
    }

    return res.json({ results: [], recommendedId: 0 });
  } catch (err) {
    console.error('[Torrent Search Error]:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Одиночная прямая ссылка (лучшее качество)
// Всегда возвращает combined формат (видео+аудио в одном потоке)
torrentsRouter.get('/extract-url', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl.trim()) return res.status(400).json({ error: 'Параметр url обязателен' });

    console.log(`[MEDIA EXTRACT] Извлекаю ссылку из: ${rawUrl}`);

    // best[ext=mp4] — лучший формат где видео и аудио уже склеены
    // Для YouTube это даёт максимум 720p, но ГАРАНТИРОВАННО с аудио
    const output = await youtubedl(rawUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: 'best[ext=mp4]/best',
    }) as unknown as YtOutput;

    if (!output.url) {
      return res.status(500).json({ error: 'Не удалось получить ссылку на видео' });
    }

    res.json({ streamUrl: output.url });
  } catch (err) {
    console.error('[MEDIA EXTRACT ERROR]:', (err as Error).message);
    res.status(500).json({ error: 'Не удалось извлечь ссылку' });
  }
});

// Список доступных качеств с кэшированием
torrentsRouter.get('/extract-formats', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    const roomId = req.query.roomId as string | undefined;
    if (!rawUrl.trim()) return res.status(400).json({ error: 'Параметр url обязателен' });

    console.log(`[MEDIA FORMATS] Получаю форматы из: ${rawUrl}`);

    // Получаем все форматы через yt-dlp
    const output = await youtubedl(rawUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    }) as unknown as YtOutput;

    let formats: Array<{ id: string; label: string; ext: string; url: string; size: number }> = [];

    if (output.formats && output.formats.length > 0) {
      // Только combined-форматы (и видео, и аудио в одном потоке)
      // Это гарантирует, что URL можно вставить в <video> и будет звук
      formats = output.formats
        .filter(f =>
          f.height > 0 &&
          f.vcodec && f.vcodec !== 'none' &&
          f.acodec && f.acodec !== 'none' &&
          f.url
        )
        .map(f => ({
          id: f.format_id,
          label: getQualityLabel(f.height),
          ext: f.ext,
          url: f.url,
          size: f.filesize || 0,
        }))
        // Дедупликация: оставляем лучший (первый) формат для каждой метки
        .filter((f, i, arr) => arr.findIndex(x => x.label === f.label) === i);

      // Сортируем: лучшее качество первым
      const order = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4K'];
      formats.sort((a, b) => {
        const ai = order.indexOf(a.label);
        const bi = order.indexOf(b.label);
        return (bi === -1 ? 0 : bi) - (ai === -1 ? 0 : ai);
      });
    }

    // Если combined-форматы не найдены (редкий случай), используем best из выдачи
    if (formats.length === 0 && output.url) {
      formats = [{
        id: output.format_id || 'best',
        label: output.height ? getQualityLabel(output.height) : 'HD',
        ext: 'mp4',
        url: output.url,
        size: 0,
      }];
    }

    // Если всё равно пусто — пробуем принудительно best[ext=mp4]
    if (formats.length === 0) {
      try {
        const fallback = await youtubedl(rawUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          format: 'best[ext=mp4]/best',
        }) as unknown as YtOutput;

        if (fallback.url) {
          formats = [{
            id: 'best',
            label: fallback.height ? getQualityLabel(fallback.height) : 'HD',
            ext: 'mp4',
            url: fallback.url,
            size: 0,
          }];
        }
      } catch {
        // ignore
      }
    }

    if (roomId && formats.length > 0) {
      roomStreamCache.set(roomId, {
        url: formats[0]!.url,
        formats,
        expires: Date.now() + CACHE_DURATION,
      });
      console.log(`[CACHE] Сохранён стрим для комнаты ${roomId} (${formats.length} качеств)`);
    }

    res.json({ formats });
  } catch (err) {
    console.error('[MEDIA FORMATS ERROR]:', (err as Error).message);
    res.status(500).json({ error: 'Не удалось получить форматы' });
  }
});

// Получить закэшированный стрим для гостя
torrentsRouter.get('/room-stream', (req, res) => {
  const roomId = req.query.roomId as string;
  if (!roomId) return res.status(400).json({ error: 'roomId обязателен' });

  const cached = roomStreamCache.get(roomId);
  if (!cached || cached.expires < Date.now()) {
    return res.status(404).json({ error: 'Стрим не найден или устарел' });
  }

  res.json({ url: cached.url, formats: cached.formats });
});

// Сменить качество
torrentsRouter.post('/select-quality', (req, res) => {
  const { roomId, formatId } = req.body;
  if (!roomId || !formatId) return res.status(400).json({ error: 'roomId и formatId обязательны' });

  const cached = roomStreamCache.get(roomId);
  if (!cached) return res.status(404).json({ error: 'Стрим не найден' });

  const format = cached.formats.find((f: any) => f.id === formatId);
  if (!format) return res.status(404).json({ error: 'Формат не найден' });

  cached.url = format.url;
  res.json({ url: format.url });
});
