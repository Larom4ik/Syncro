import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  torrentProvider: process.env.TORRENT_PROVIDER || 'both',
};
