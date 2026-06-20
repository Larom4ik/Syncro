import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const key = process.env.KINOPOISK_API_KEY || 'a00fa176-196f-422d-a14f-f00ad38cb55f';
console.log('Ключ:', key);

try {
  const res = await axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films', {
    headers: { 'X-API-KEY': key },
    params: { type: 'FILM', order: 'NUM_VOTE', ratingFrom: 7, page: 1 },
    timeout: 10000,
  });
  console.log(`✅ Кинопоиск работает → фильмов: ${res.data.items?.length}`);
  console.log('Первый фильм:', res.data.items?.[0]?.nameRu);
} catch (err: any) {
  console.log(`❌ Кинопоиск → ${err.message}`);
  console.log('Статус:', err.response?.status);
  console.log('Ответ:', err.response?.data);
}