import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

interface Movie {
  id: string;
  title: string;
  description: string;
  url: string;
  poster: string;
  genres: string[];
  year: number;
  rating: number;
  duration: string;
  country: string;
}

interface Room {
  id: string;
  name: string;
  movieId: string;
  movieUrl: string;
  users: { [socketId: string]: string }; 
}

// 1. Расширенный каталог фильмов а-ля Кинопоиск
const MOVIES_CATALOG: Movie[] = [
  {
    id: "movie-1",
    title: "Sintel",
    description: "Красивый open-source мультфильм рассказывает о молодой девушке по имени Синтел, которая отправляется в опасное и эмоциональное путешествие, чтобы спасти своего домашнего дракона.",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    genres: ["Фэнтези", "Анимация", "Драма"],
    year: 2010,
    rating: 7.8,
    duration: "14 мин.",
    country: "Нидерланды"
  },
  {
    id: "movie-2",
    title: "Big Buck Bunny",
    description: "История о гигантском и дружелюбном кролике, чья жизнь лесных будней нарушается тремя наглыми грызунами. Кролик решает устроить им изощренную лесную ловушку.",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
    genres: ["Комедия", "Анимация", "Семейный"],
    year: 2008,
    rating: 6.5,
    duration: "10 мин.",
    country: "Нидерланды"
  },
  {
    id: "movie-3",
    title: "Tears of Steel",
    description: "Действие разворачивается в постапокалиптическом Амстердаме, где группа исследователей отчаянно пытается защитить планету от восставших военных роботов и дронов.",
    url: "https://mango-blender.commondatastorage.googleapis.com/tears_of_steel_1080p.mp4",
    poster: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80",
    genres: ["Фантастика", "Боевик"],
    year: 2012,
    rating: 8.2,
    duration: "12 мин.",
    country: "Нидерланды"
  }
];

const activeRooms: { [roomId: string]: Room } = {};

function updateGlobalRoomsList() {
  const list = Object.values(activeRooms).map(r => ({
    id: r.id,
    name: r.name,
    movieId: r.movieId,
    usersCount: Object.keys(r.users).length
  }));
  io.emit("rooms_list_update", list);
}

app.get('/ping', (req, res) => {
  res.send('pong');
});

io.on('connection', (socket) => {
  console.log(`[CONNECT] Подключился сокет: ${socket.id}`);

  // Отправляем расширенные метаданные фильмов на клиент
  socket.emit("init_data", {
    movies: MOVIES_CATALOG,
    rooms: Object.values(activeRooms).map(r => ({ id: r.id, name: r.name, movieId: r.movieId, usersCount: Object.keys(r.users).length }))
  });

  socket.on("join_room", ({ roomId, roomName, nickname, movieId }: { roomId: string, roomName?: string, nickname: string, movieId: string }) => {
    socket.join(roomId);

    if (!activeRooms[roomId]) {
      const foundMovie = MOVIES_CATALOG.find(m => m.id === movieId);
      const selectedMovie = foundMovie || MOVIES_CATALOG[0] || {
        id: "default",
        title: "Default Movie",
        description: "",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        poster: "",
        genres: [],
        year: 2026,
        rating: 0,
        duration: "0 мин.",
        country: "Unknown"
      };

      activeRooms[roomId] = {
        id: roomId,
        name: roomName || `Комната: ${nickname}`,
        movieId: selectedMovie.id,
        movieUrl: selectedMovie.url,
        users: {}
      };
    }

    const room = activeRooms[roomId];
    if (room) {
      room.users[socket.id] = nickname;
      console.log(`[ROOM JOIN] ${nickname} вошел в комнату ${roomId}. Всего участников: ${Object.keys(room.users).length}`);
      io.to(roomId).emit("room_users", Object.values(room.users));
    }
    
    // Если это одиночный просмотр (id начинается с solo-), то скрываем комнату из общего списка
    if (!roomId.startsWith("solo-")) {
      updateGlobalRoomsList();
    }
  });

  socket.on('video_play', (data: { roomId: string, currentTime: number } | undefined) => {
    if (!data || !data.roomId) return; 
    console.log(`[SIGNAL PLAY] Отправляю PLAY всем в комнату ${data.roomId}, время: ${data.currentTime}`);
    socket.to(data.roomId).emit('server_play', data.currentTime);
  });

  socket.on('video_pause', (data: { roomId: string } | undefined) => {
    if (!data || !data.roomId) return;
    console.log(`[SIGNAL PAUSE] Отправляю PAUSE всем в комнату ${data.roomId}`);
    socket.to(data.roomId).emit('server_pause');
  });

  socket.on('video_seek', (data: { roomId: string, currentTime: number } | undefined) => {
    if (!data || !data.roomId) return;
    console.log(`[SIGNAL SEEK] Отправляю SEEK всем в комнату ${data.roomId}, время: ${data.currentTime}`);
    socket.to(data.roomId).emit('server_seek', data.currentTime);
  });

  socket.on('disconnect', () => {
    Object.keys(activeRooms).forEach(roomId => {
      const room = activeRooms[roomId];
      if (!room) return;

      if (room.users[socket.id]) {
        console.log(`[LEAVE] Пользователь ${room.users[socket.id]} покинул комнату ${roomId}`);
        delete room.users[socket.id];

        if (Object.keys(room.users).length === 0) {
          delete activeRooms[roomId];
          console.log(`[ROOM DELETED] Комната ${roomId} удалена.`);
        } else {
          io.to(roomId).emit("room_users", Object.values(room.users));
        }
      }
    });
    updateGlobalRoomsList();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер Syncro запущен на http://localhost:${PORT}`);
});