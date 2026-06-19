import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { env } from './config/env.js';
import { tmdbRouter } from './routes/tmdb.js';
import { torrentsRouter } from './routes/torrents.js';
import { registerSocketHandlers } from './sockets/index.js';

const app = express();
app.use(cors({ origin: env.corsOrigin === '*' ? '*' : env.corsOrigin }));
app.use(express.json());

app.get('/ping', (_req, res) => {
  res.json({ ok: true, service: 'syncro-backend' });
});
app.use('/api/tmdb', tmdbRouter);
app.use('/api/torrents', torrentsRouter);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin === '*' ? '*' : env.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`);
  registerSocketHandlers(io, socket);
});

server.listen(env.port, () => {
  console.log(`🚀 Syncro backend → http://localhost:${env.port}`);
  if (!env.tmdbApiKey) {
    console.warn('⚠️  TMDB_API_KEY не задан — каталог фильмов недоступен');
  }
});
