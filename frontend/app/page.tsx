"use client";

import { useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import VideoPlayer from "@/components/VideoPlayer";

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

interface ActiveRoom {
  id: string;
  name: string;
  movieId: string;
  usersCount: number;
}

const generateRoomId = () => Math.random().toString(36).substring(2, 9);

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [nickname, setNickname] = useState("");
  const [isNicknameSaved, setIsNicknameSaved] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [currentMovieId, setCurrentMovieId] = useState<string>("movie-1");
  const [roomUsers, setRoomUsers] = useState<string[]>([]);

  // Состояния для фильтрации и модалки
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Все");
  const [selectedMovieForModal, setSelectedMovieForModal] = useState<Movie | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");

    newSocket.on("connect", () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("init_data", ({ movies, rooms }: { movies: Movie[], rooms: ActiveRoom[] }) => {
      setMovies(movies);
      setActiveRooms(rooms);
    });

    newSocket.on("rooms_list_update", (updatedRooms: ActiveRoom[]) => {
      setActiveRooms(updatedRooms);
    });

    newSocket.on("room_users", (users: string[]) => {
      setRoomUsers(users);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleJoinRoom = (roomId: string, movieId: string, customRoomName?: string) => {
    if (!socket || !nickname) return;

    const targetMovie = movies.find(m => m.id === movieId);
    const rName = customRoomName || `🍿 Попкорн-пати: ${targetMovie?.title || nickname}`;
    
    setCurrentRoomId(roomId);
    setCurrentRoomName(rName);
    setCurrentMovieId(movieId);
    setSelectedMovieForModal(null); // Закрываем модалку при входе

    socket.emit("join_room", {
      roomId,
      roomName: rName,
      nickname,
      movieId
    });
  };

  // Извлекаем все уникальные жанры для кнопок фильтрации
  const allGenres = useMemo(() => {
    const genresSet = new Set<string>(["Все"]);
    movies.forEach(m => m.genres?.forEach(g => genresSet.add(g)));
    return Array.from(genresSet);
  }, [movies]);

  // Фильтруем фильмы на основе поиска и выбранного жанра
  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            movie.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === "Все" || movie.genres?.includes(selectedGenre);
      return matchesSearch && matchesGenre;
    });
  }, [movies, searchQuery, selectedGenre]);

  // Главный фильм для красивого баннера сверху (берём первый фильм из списка)
  const heroMovie = movies[0];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-zinc-950 text-white pb-12 relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Эффектное свечение на заднем фоне */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* ШАПКА КИНОТЕАТРА */}
      <header className="w-full max-w-7xl px-6 py-4 flex justify-between items-center border-b border-zinc-900/80 sticky top-0 bg-zinc-950/70 backdrop-blur-md z-40">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 cursor-pointer" onClick={() => window.location.reload()}>
            SYNCRO
          </h1>
          {isNicknameSaved && !currentRoomId && (
            <div className="hidden md:flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-1.5">
              <input 
                type="text" 
                placeholder="Поиск фильмов..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-zinc-200 outline-none placeholder-zinc-600 w-48 focus:w-64 transition-all"
              />
              <span className="text-zinc-600 text-xs">🔍</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {isNicknameSaved && (
            <span className="text-sm font-semibold px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-zinc-300 shadow-inner">
              👤 {nickname}
            </span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/30 border border-zinc-800/60 rounded-full">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-[10px] font-mono tracking-wider text-zinc-400">
              {isConnected ? "ONLINE" : "CONNECTING..."}
            </span>
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="w-full max-w-7xl px-6 mt-6 z-10 flex-1 flex flex-col items-center justify-center">
        
        {/* АВТОРИЗАЦИЯ */}
        {!isNicknameSaved ? (
          <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-2xl shadow-2xl text-center space-y-6 my-auto">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">Добро пожаловать</h2>
              <p className="text-xs text-zinc-400">Введите своё имя, чтобы открыть каталог фильмов и комнат</p>
            </div>
            <input
              type="text"
              placeholder="Ваш никнейм..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-5 py-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-200 text-center transition-all font-semibold"
            />
            <button
              disabled={!nickname.trim() || !isConnected}
              onClick={() => setIsNicknameSaved(true)}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 text-white font-bold rounded-2xl shadow-xl transition-all duration-300"
            >
              Войти в кинотеатр
            </button>
          </div>
        ) : !currentRoomId ? (
          
          /* КАТАЛОГ СТИЛЯ KINOPOISK / ZONA */
          <div className="w-full space-y-10">
            
            {/* ГЛАВНЫЙ БАННЕР (HERO SECTION) */}
            {heroMovie && !searchQuery && selectedGenre === "Все" && (
              <div className="relative w-full h-[380px] rounded-3xl overflow-hidden border border-zinc-900 shadow-2xl group">
                <Image 
                  src={heroMovie.poster} 
                  alt={heroMovie.title} 
                  fill
                  unoptimized
                  className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.3] group-hover:scale-[1.01] transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl space-y-4">
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="px-2 py-0.5 bg-amber-500 text-black font-black rounded">🔥 ТРЕНД НЕДЕЛИ</span>
                    <span className="text-emerald-400 font-bold">★ {heroMovie.rating.toFixed(1)}</span>
                    <span className="text-zinc-400">{heroMovie.year}</span>
                    <span className="text-zinc-400">{heroMovie.duration}</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">{heroMovie.title}</h2>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">{heroMovie.description}</p>
                  <button 
                    onClick={() => setSelectedMovieForModal(heroMovie)}
                    className="py-3 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
                  >
                    <span>▶</span> Выбрать для просмотра
                  </button>
                </div>
              </div>
            )}

            {/* АКТИВНЫЕ КОМНАТЫ СЕЙЧАС */}
            {activeRooms.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-mono tracking-widest text-zinc-500 uppercase">⚡️ Прямо сейчас смотрят вместе:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {activeRooms.map((room) => {
                    const roomMovie = movies.find(m => m.id === room.movieId);
                    return (
                      <div key={room.id} className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 backdrop-blur-md flex flex-col justify-between items-start gap-4 transition-all">
                        <div className="space-y-1 w-full">
                          <h4 className="font-bold text-zinc-200 text-sm line-clamp-1">{room.name}</h4>
                          <p className="text-xs text-zinc-500 truncate">Фильм: {roomMovie?.title || "Загрузка..."}</p>
                          <div className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md inline-block">👥 Участников: {room.usersCount}</div>
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.id, room.movieId, room.name)}
                          className="w-full py-2 bg-zinc-900 hover:bg-indigo-600 border border-zinc-800 hover:border-indigo-500 text-zinc-300 hover:text-white font-semibold rounded-xl text-xs transition-all shadow-md"
                        >
                          Присоединиться к залу
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ЛЕНТА ЖАНРОВ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between md:hidden">
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs outline-none text-zinc-200"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-image">
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedGenre === genre 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-900"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* СЕТКА ФИЛЬМОВ */}
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold tracking-tight text-zinc-200">
                {selectedGenre === "Все" ? "Рекомендуем посмотреть" : `Жанр: ${selectedGenre}`}
              </h3>
              
              {filteredMovies.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm bg-zinc-900/10 border border-zinc-900 rounded-2xl">
                  Фильмы по вашему запросу не найдены 🍿
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {filteredMovies.map((movie) => (
                    <div 
                      key={movie.id} 
                      onClick={() => setSelectedMovieForModal(movie)}
                      className="group flex flex-col bg-zinc-900/10 rounded-2xl overflow-hidden cursor-pointer border border-transparent hover:border-zinc-900 hover:bg-zinc-900/30 transition-all duration-300 relative"
                    >
                      {/* Рейтинг плашка */}
                      <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-sm text-emerald-400 border border-emerald-500/20">
                        {movie.rating.toFixed(1)}
                      </div>

                      {/* Постер */}
                      <div className="aspect-[2/3] w-full bg-zinc-900 relative overflow-hidden rounded-xl border border-zinc-900">
                        <Image 
                          src={movie.poster} 
                          alt={movie.title}
                          fill
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-[11px] font-bold bg-indigo-600 py-1.5 w-full text-center rounded-lg shadow-md">Подробнее</span>
                        </div>
                      </div>

                      {/* Метаданные */}
                      <div className="pt-3 px-1 pb-2 space-y-0.5">
                        <h4 className="font-bold text-sm text-zinc-200 group-hover:text-indigo-400 transition-colors line-clamp-1">{movie.title}</h4>
                        <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                          <span>{movie.year}, {movie.country}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          
          /* КОРНЕВОЙ ЭКРАН ПРОСМОТРА (ПЛЕЕР + БОКОВАЯ ПАНЕЛЬ) */
          <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mt-2">
            <div className="lg:col-span-3 space-y-4">
              <div className="p-4 bg-zinc-900/40 border border-zinc-900 backdrop-blur-sm rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase">Текущая комната</span>
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">{currentRoomName}</h2>
              </div>
              <VideoPlayer 
                src={movies.find(m => m.id === currentMovieId)?.url || ""} 
                socket={socket} 
                roomId={currentRoomId}
              />
              <button
                onClick={() => window.location.reload()}
                className="py-2.5 px-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Выйти из комнаты в главное меню
              </button>
            </div>

            {/* БОКОВАЯ ПАНЕЛЬ КОМНАТЫ */}
            <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-900 backdrop-blur-xl space-y-4 shadow-xl lg:mt-[72px]">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500">👥 В комнате ({roomUsers.length})</h3>
              </div>
              <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {roomUsers.map((user, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-zinc-300 font-medium bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40"></span>
                    <span className="truncate">{user}</span> {user === nickname && <span className="text-[10px] text-zinc-600 font-mono">(ты)</span>}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-zinc-900 space-y-2">
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Отправь ID друзьям, чтобы они подключились к этой сессии:
                </p>
                <div className="flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 justify-between">
                  <span className="text-zinc-300 font-mono text-xs select-all font-bold tracking-wider">{currentRoomId}</span>
                  <span className="text-[10px] text-zinc-600 font-mono cursor-pointer hover:text-zinc-400" onClick={() => navigator.clipboard.writeText(currentRoomId || "")}>КОПИРОВАТЬ</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ФИЛЬМА */}
      {selectedMovieForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 relative shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setSelectedMovieForModal(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-mono text-sm bg-zinc-900 w-8 h-8 rounded-full flex items-center justify-center border border-zinc-800"
            >
              ✕
            </button>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-1/3 aspect-[2/3] relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-900 shadow-lg shrink-0">
                <Image 
                  src={selectedMovieForModal.poster} 
                  alt={selectedMovieForModal.title} 
                  fill
                  unoptimized
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl md:text-3xl font-black tracking-tight">{selectedMovieForModal.title}</h3>
                
                <table className="w-full text-xs text-zinc-400 border-collapse">
                  <tbody>
                    <tr className="border-b border-zinc-900/60"><td className="py-1.5 font-medium text-zinc-600 w-24">Рейтинг:</td><td className="py-1.5 text-emerald-400 font-bold">★ {selectedMovieForModal.rating.toFixed(1)}</td></tr>
                    <tr className="border-b border-zinc-900/60"><td className="py-1.5 font-medium text-zinc-600">Год выпуска:</td><td className="py-1.5 text-zinc-200">{selectedMovieForModal.year}</td></tr>
                    <tr className="border-b border-zinc-900/60"><td className="py-1.5 font-medium text-zinc-600">Страна:</td><td className="py-1.5 text-zinc-200">{selectedMovieForModal.country}</td></tr>
                    <tr className="border-b border-zinc-900/60"><td className="py-1.5 font-medium text-zinc-600">Длительность:</td><td className="py-1.5 text-zinc-200">{selectedMovieForModal.duration}</td></tr>
                    <tr><td className="py-1.5 font-medium text-zinc-600">Жанры:</td><td className="py-1.5 flex flex-wrap gap-1">{selectedMovieForModal.genres?.map(g => <span key={g} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-300">{g}</span>)}</td></tr>
                  </tbody>
                </table>
                
                <p className="text-xs text-zinc-400 leading-relaxed pt-1">{selectedMovieForModal.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900 pt-5">
              <button
                onClick={() => {
                  handleJoinRoom(`solo-${generateRoomId()}`, selectedMovieForModal.id, `Одиночный: ${selectedMovieForModal.title}`);
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Смотреть одному
              </button>
              <button
                onClick={() => handleJoinRoom(generateRoomId(), selectedMovieForModal.id)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5"
              >
                <span>👥</span> Создать комнату для друзей
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}