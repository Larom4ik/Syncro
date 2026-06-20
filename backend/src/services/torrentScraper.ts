import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TorrentResult {
  title: string;
  magnet: string;
  seeders: number;
  size: string;
  quality: string;
  provider: '1337x' | 'rutracker' | 'rutorg' | 'fasttorrent';
  score: number;
}

const cache = new Map<string, { data: TorrentResult[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
};

function detectQuality(title: string): string {
  const t = title.toLowerCase();
  if (/2160|4k/u.test(t)) return '4K';
  if (/1080/u.test(t)) return '1080p';
  if (/720/u.test(t)) return '720p';
  if (/480/u.test(t)) return '480p';
  return 'unknown';
}

export function scoreTorrent(r: Omit<TorrentResult, 'score'>): number {
  let score = r.seeders * 10;
  const q = r.quality.toLowerCase();
  const t = r.title.toLowerCase();

  if (q === '1080p') score += 500;
  else if (q === '4k') score += 400;
  else if (q === '720p') score += 200;

  if (/web-?dl|webrip|bluray|bdrip|remux/u.test(t)) score += 300;
  if (/cam|ts|tc|scr|dvdscr/u.test(t)) score -= 800;
  if (/x265|hevc|h265/u.test(t)) score += 50;

  return score;
}

// ── 1337x ──────────────────────────────────────────────────────────────────
async function search1337x(query: string): Promise<TorrentResult[]> {
  const results: TorrentResult[] = [];
  try {
    const searchUrl = `https://1337x.to/search/${encodeURIComponent(query)}/1/`;
    const { data: html } = await axios.get(searchUrl, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('table.table-list tbody tr').each((_, el) => {
      const href = $(el).find('a').eq(1).attr('href');
      if (href && href.includes('/torrent/')) links.push(href);
    });

    for (const link of [...new Set(links)].slice(0, 6)) {
      try {
        const detailUrl = link.startsWith('http') ? link : `https://1337x.to${link}`;
        const { data: detailHtml } = await axios.get(detailUrl, { headers: HEADERS, timeout: 10000 });
        const $$ = cheerio.load(detailHtml);
        const title = $$('h1').text().trim();
        const magnet = $$('a[href^="magnet:"]').attr('href') ?? '';
        const seeders = parseInt($$('span.seeds').text().trim(), 10) || 0;
        const size = $$('div.box-info ul li').eq(4).find('span').text().trim();

        if (!magnet) continue;
        const quality = detectQuality(title);
        const base = { title, magnet, seeders, size, quality, provider: '1337x' as const };
        results.push({ ...base, score: scoreTorrent(base) });
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('[1337x] failed:', (err as Error).message);
  }
  return results;
}

// ── Rutorg.info ────────────────────────────────────────────────────────────
async function searchRutorg(query: string): Promise<TorrentResult[]> {
  const results: TorrentResult[] = [];
  try {
    const searchUrl = `https://rutorg.info/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('div.short-story h2 a, div.title a, .mov-title a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });

    for (const link of links.slice(0, 6)) {
      try {
        const { data: detailHtml } = await axios.get(link, { headers: HEADERS, timeout: 10000 });
        const $$ = cheerio.load(detailHtml);
        const title = $$('h1').first().text().trim();
        const magnet = $$('a[href^="magnet:"]').first().attr('href') ?? '';
        if (!magnet) continue;

        const quality = detectQuality(title);
        const base = { title, magnet, seeders: 0, size: '', quality, provider: 'rutorg' as const };
        results.push({ ...base, score: scoreTorrent(base) });
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('[Rutorg] failed:', (err as Error).message);
  }
  return results;
}

// ── Fast-Torrent.ru ────────────────────────────────────────────────────────
async function searchFastTorrent(query: string): Promise<TorrentResult[]> {
  const results: TorrentResult[] = [];
  try {
    const searchUrl = `https://fast-torrent.ru/search/?q=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('div.torrent-title a, .film-name a, h2.title a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href.startsWith('http') ? href : `https://fast-torrent.ru${href}`);
    });

    for (const link of links.slice(0, 6)) {
      try {
        const { data: detailHtml } = await axios.get(link, { headers: HEADERS, timeout: 10000 });
        const $$ = cheerio.load(detailHtml);
        const title = $$('h1').first().text().trim();
        const magnet = $$('a[href^="magnet:"]').first().attr('href') ?? '';
        if (!magnet) continue;

        const sizeText = $$('*:contains("Размер")').next().text().trim() || '';
        const quality = detectQuality(title);
        const base = { title, magnet, seeders: 0, size: sizeText, quality, provider: 'fasttorrent' as const };
        results.push({ ...base, score: scoreTorrent(base) });
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('[FastTorrent] failed:', (err as Error).message);
  }
  return results;
}

// ── Главная функция ────────────────────────────────────────────────────────
export async function searchTorrents(title: string, year?: number): Promise<TorrentResult[]> {
  const query = year ? `${title} ${year}` : title;
  const cacheKey = query.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data;

  // Запускаем все три параллельно — кто ответит, тот и даёт результат
  const [from1337x, fromRutorg, fromFastTorrent] = await Promise.all([
    search1337x(query),
    searchRutorg(query),
    searchFastTorrent(query),
  ]);

  const merged = [...from1337x, ...fromRutorg, ...fromFastTorrent]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  cache.set(cacheKey, { data: merged, expires: Date.now() + CACHE_TTL });
  return merged;
}

export function pickBestTorrent(results: TorrentResult[]): TorrentResult | null {
  if (results.length === 0) return null;
  return [...results].sort((a, b) => b.score - a.score).at(0) ?? null;
}