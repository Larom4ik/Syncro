import { Router } from 'express';
import path from 'path';
import { create } from 'youtube-dl-exec';

const youtubedl = create(path.join(process.cwd(), 'yt-dlp.exe'));

export const torrentsRouter = Router();

const roomStreamCache = new Map<string, { url: string; formats: any[]; expires: number }>();
const CACHE_DURATION = 4 * 60 * 60 * 1000;

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

torrentsRouter.get('/extract-url', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl.trim()) return res.status(400).json({ error: 'Параметр url обязателен' });

    console.log(`[MEDIA EXTRACT] Извлекаю ссылку из: ${rawUrl}`);
    const isYoutube = rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be');
    const formatArg = isYoutube ? 'best[ext=mp4]/best' : 'best';

    const output = (await youtubedl(rawUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: formatArg,
    })) as unknown as { url: string };

    res.json({ streamUrl: output.url });
  } catch (err) {
    console.error('[MEDIA EXTRACT ERROR]:', (err as Error).message);
    res.status(500).json({ error: 'Не удалось извлечь ссылку' });
  }
});

torrentsRouter.get('/extract-formats', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    const roomId = req.query.roomId as string | undefined;
    if (!rawUrl.trim()) return res.status(400).json({ error: 'Параметр url обязателен' });

    console.log(`[MEDIA FORMATS] Получаю форматы: ${rawUrl}`);

    // Для YouTube запрашиваем все форматы, чтобы потом отфильтровать совмещённые
    const isYoutube = rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be');
    const formatArg = isYoutube ? 'all' : 'best';

    const output = await youtubedl(rawUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: formatArg,
    }) as unknown as {
      formats?: Array<{
        format_id: string;
        width: number;
        height: number;
        ext: string;
        url: string;
        filesize: number;
        vcodec: string;
        acodec: string;
      }>;
      url?: string;
      format_id?: string;
      width?: number;
      height?: number;
    };

    let formats: Array<{ id: string; label: string; ext: string; url: string; size: number }> = [];

    if (output.formats && output.formats.length > 0) {
      formats = output.formats
        .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.height > 0)
        .map(f => ({
          id: f.format_id,
          label: f.height >= 2160 ? '4K' : f.height >= 1080 ? '1080p' : f.height >= 720 ? '720p' : `${f.height}p`,
          ext: f.ext,
          url: f.url,
          size: f.filesize || 0,
        }))
        .filter((f, i, arr) => arr.findIndex(x => x.label === f.label) === i);

      const qualityOrder = ['4K', '1080p', '720p', '480p', '360p', '240p', '144p'];
      formats.sort((a, b) => qualityOrder.indexOf(a.label) - qualityOrder.indexOf(b.label));
    }

    if (formats.length === 0 && output.url) {
      formats = [{
        id: 'best',
        label: output.height ? `${output.height}p` : 'HD',
        ext: 'mp4',
        url: output.url,
        size: 0,
      }];
    }

    if (roomId && formats.length > 0) {
      roomStreamCache.set(roomId, {
        url: formats[0].url,
        formats,
        expires: Date.now() + CACHE_DURATION,
      });
      console.log(`[CACHE] Сохранён стрим для комнаты ${roomId}`);
    }

    res.json({ formats });
  } catch (err) {
    console.error('[MEDIA FORMATS ERROR]:', (err as Error).message);
    res.status(500).json({ error: 'Не удалось получить форматы' });
  }
});

torrentsRouter.get('/room-stream', (req, res) => {
  const roomId = req.query.roomId as string;
  if (!roomId) return res.status(400).json({ error: 'roomId обязателен' });

  const cached = roomStreamCache.get(roomId);
  if (!cached || cached.expires < Date.now()) {
    return res.status(404).json({ error: 'Стрим не найден или устарел' });
  }

  res.json({ url: cached.url, formats: cached.formats });
});

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