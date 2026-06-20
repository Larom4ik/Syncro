// Функция для извлечения ID фильма из URL Кинопоиска
export function extractKinopoiskId(url: string): string | null {
  const match = url.match(/(?:film|series)\/(\d+)/);
  if (match && match[1]) return match[1];
  
  const numericMatch = url.match(/^(\d+)$/);
  if (numericMatch && numericMatch[1]) return numericMatch[1];
  
  return null;
}

export function getKinopoiskVipUrl(kinopoiskId: string): string {
  return `https://kinopoisk.vip/${kinopoiskId}/`;
}