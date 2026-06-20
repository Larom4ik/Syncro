"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { HeroBanner } from "@/components/catalog/HeroBanner";
import { FilterBar } from "@/components/catalog/FilterBar";
import { MovieGrid } from "@/components/catalog/MovieGrid";
import { ActiveRoomsList } from "@/components/catalog/ActiveRoomsList";
import { MovieDetailModal } from "@/components/catalog/MovieDetailModal";
import { CreateRoomDialog, JoinRoomDialog } from "@/components/catalog/CreateRoomDialog";
import { useIdentity } from "@/hooks/useIdentity";
import { useSocket } from "@/providers/SocketProvider";
import { useRoom } from "@/hooks/useRoom";
import { api, generateRoomId } from "@/lib/api";
import { saveRoomSession } from "@/lib/storage/roomSession";
import type { MovieDetails, MovieSummary, PublicRoom } from "@/lib/types";

export function CatalogPage() {
  const router = useRouter();
  const { identity, ready, login, isLoggedIn } = useIdentity();
  const { socket, connected } = useSocket();
  const { activeRooms } = useRoom({ socket });

  const [nickname, setNickname] = useState("");
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [year, setYear] = useState("");

  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);
  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    magnet: string;
    details: MovieDetails | null;
    solo: boolean;
  }>({ open: false, magnet: "", details: null, solo: false });

  const [joinDialog, setJoinDialog] = useState<{ open: boolean; room: PublicRoom | null }>({
    open: false,
    room: null,
  });

  const loadCatalog = useCallback(async () => {
  setLoading(true);
  setError("");
  try {
    const discover = await (searchQuery.trim()
      ? api.search(searchQuery)
      : api.discover({
          genre: selectedGenre || undefined,
          year: year || undefined,
          sortBy,
        }));

    setMovies(discover.results);

    if (!genres.length && !searchQuery) {
      const allGenres = discover.results.flatMap((m) => m.genres ?? []);
      const unique = [...new Set(allGenres)];
      setGenres(unique.map((g, i) => ({ id: i, name: g })));
    }
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setLoading(false);
  }
}, [searchQuery, selectedGenre, year, sortBy, genres.length]);

  useEffect(() => {
    if (isLoggedIn) startTransition(() => { loadCatalog(); });
  }, [isLoggedIn, loadCatalog]);

  const heroMovie = movies[0];

  const startSession = (
    magnet: string,
    details: MovieDetails,
    password: string,
    roomName: string,
    solo: boolean
  ) => {
    if (!identity) return;
    const roomId = solo ? `solo-${generateRoomId()}` : generateRoomId();

    saveRoomSession(roomId, {
      password,
      magnet,
      meta: {
        mode: solo ? "solo" : "torrent",
        title: details.title,
        posterPath: details.poster,
      },
      isHost: true,
    });

    setCreateDialog({ open: false, magnet: "", details: null, solo: false });
    setSelectedMovie(null);
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (password: string) => {
    const room = joinDialog.room;
    if (!room || !identity) return;

    saveRoomSession(room.id, {
      password,
      meta: {
        mode: room.mode,
        title: room.title,
        posterPath: room.posterPath,
      },
      isHost: false,
    });

    setJoinDialog({ open: false, room: null });
    router.push(`/room/${room.id}`);
  };

  if (!ready) return null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--syncro-bg-deep)] text-white pb-12 relative overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[var(--syncro-chrome)]/5 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-[var(--syncro-accent)]/5 blur-[150px] rounded-full pointer-events-none" />

      <Header />

      <div className="w-full max-w-7xl px-6 mt-6 z-10 flex-1">
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto mt-24 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl text-center space-y-6">
            <h2 className="text-2xl font-extrabold">Добро пожаловать в Syncro</h2>
            <p className="text-xs text-zinc-400">Введите никнейм для доступа к каталогу</p>
            <Input
              placeholder="Ваш никнейм..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Button
              disabled={!nickname.trim() || !connected}
              className="w-full"
              onClick={() => login(nickname)}
            >
              Войти в кинотеатр
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {heroMovie && !searchQuery && !selectedGenre && (
              <HeroBanner movie={heroMovie} onSelect={() => setSelectedMovie(heroMovie)} />
            )}

            <ActiveRoomsList
              rooms={activeRooms}
              onJoin={(room) => setJoinDialog({ open: true, room })}
            />

            <FilterBar
              genres={genres}
              selectedGenre={selectedGenre}
              onGenreChange={setSelectedGenre}
              sortBy={sortBy}
              onSortChange={setSortBy}
              year={year}
              onYearChange={setYear}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {error && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <p className="text-center text-zinc-500 py-12">Загрузка каталога...</p>
            ) : (
              <MovieGrid movies={movies} onSelect={setSelectedMovie} />
            )}
          </div>
        )}
      </div>

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onWatchSolo={(magnet, details) =>
          setCreateDialog({ open: true, magnet, details, solo: true })
        }
        onWatchTogether={(magnet, details) =>
          setCreateDialog({ open: true, magnet, details, solo: false })
        }
      />

      <CreateRoomDialog
        open={createDialog.open}
        onClose={() => setCreateDialog({ open: false, magnet: "", details: null, solo: false })}
        defaultName={
          createDialog.details
            ? `${createDialog.solo ? "Одиночный" : "Комната"}: ${createDialog.details.title}`
            : ""
        }
        title={createDialog.solo ? "Одиночный просмотр" : "Создать комнату для друзей"}
        onConfirm={(password, roomName) => {
          if (createDialog.details && createDialog.magnet) {
            startSession(createDialog.magnet, createDialog.details, password, roomName, createDialog.solo);
          }
        }}
      />

      <JoinRoomDialog
        open={joinDialog.open}
        onClose={() => setJoinDialog({ open: false, room: null })}
        roomId={joinDialog.room?.id || ""}
        onConfirm={handleJoinRoom}
      />
    </main>
  );
}