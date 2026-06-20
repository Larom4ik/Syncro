import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  torrentProvider: process.env.TORRENT_PROVIDER || 'both',
  kinopoiskApiKey: process.env.KINOPOISK_API_KEY || 'a00fa176-196f-422d-a14f-f00ad38cb55f'
};
