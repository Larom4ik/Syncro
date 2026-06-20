"use client";

import { useEffect, useState, startTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { api, generateRoomId } from "@/lib/api";
import { saveRoomSession } from "@/lib/storage/roomSession";
import type { MovieDetails, MovieSummary, TorrentOption } from "@/lib/types";

interface MovieDetailModalProps {
  movie: MovieSummary | null;
  onClose: () => void;
  onWatchTogether: (magnet: string, details: MovieDetails) => void;
}

export function MovieDetailModal({
  movie,
  onClose,
  onWatchTogether,
}: MovieDetailModalProps) {
  const router = useRouter();
  const [torrents, setTorrents] = useState<TorrentOption[]>([]);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [torrentError, setTorrentError] = useState("");

  useEffect(() => {
    if (!movie) return;

    startTransition(() => {
      setLoading(true);
      setTorrentError("");
      setTorrents([]);
      setDetails(null);
      setSelectedIdx(0);
    });

    // Определяем тип: фильм или сериал
    const mediaType = movie.kinopoiskId && movie.kinopoiskId > 1000000 ? 'series' : 'film';

    // Загружаем детали фильма и торренты параллельно
    Promise.all([
      api.movie(movie.id),
      api.torrents(movie.title, movie.year, movie.kinopoiskId, mediaType).catch(() => ({ results: [], recommendedId: 0 })),
    ])
      .then(([det, tor]) => {
        setDetails(det);
        setTorrents(tor.results);
        setSelectedIdx(tor.recommendedId >= 0 ? tor.recommendedId : 0);
        if (tor.results.length === 0) {
          setTorrentError("Источники не найдены. Попробуйте позже или Custom Stream.");
        }
      })
      .catch(() => {
        setTorrentError("Ошибка загрузки данных.");
      })
      .finally(() => setLoading(false));
  }, [movie]);

  if (!movie) return null;

  const selected = torrents[selectedIdx];
  const movieData = (details || movie) as MovieDetails;

  return (
    <Modal open={!!movie} onClose={onClose} title={movie.title}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-1/3 aspect-[2/3] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
            {movie.poster && (
              <Image src={movie.poster} alt={movie.title} fill unoptimized className="object-cover" />
            )}
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-2xl font-black">{movie.title}</h3>
            {movie.titleEn && (
              <p className="text-sm text-zinc-500">{movie.titleEn}</p>
            )}
            <div className="text-xs text-zinc-400 space-y-1">
              <p>
                {movie.rating && (
                  <span className="text-[var(--syncro-accent)] font-bold">★ {movie.rating}</span>
                )}
                {movie.rating && movie.year ? " · " : ""}
                {movie.year > 0 ? movie.year : ""}
              </p>
              {movie.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {movie.genres.map((g) => (
                    <span key={g} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {movie.description && (
                <p className="pt-2 leading-relaxed">{movie.description}</p>
              )}
              {movie.size && (
                <p className="text-zinc-600 pt-1">Размер: {movie.size}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-zinc-300">Выберите источник</h4>
          {loading && <p className="text-xs text-zinc-500">Поиск источников...</p>}
          {torrentError && !loading && (
            <p className="text-xs text-amber-400">{torrentError}</p>
          )}
          {torrents.length > 0 && (
            <div className="space-y-2">
              {torrents.map((t, i) => (
                <button
                  key={`${t.provider}-${i}`}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selectedIdx === i
                      ? "border-[var(--syncro-accent)] bg-[var(--syncro-accent-dim)]"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="font-medium">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="secondary"
            disabled={!selected || loading}
            onClick={() => {
              if (!selected) return;
              // Одиночный просмотр — сразу переходим
              const roomId = `solo-${generateRoomId()}`;
              saveRoomSession(roomId, {
                password: '',
                magnet: selected.magnet,
                meta: {
                  mode: 'solo',
                  title: movieData.title,
                  posterPath: movieData.poster,
                },
                isHost: true,
              });
              router.push(`/room/${roomId}`);
            }}
          >
            Смотреть одному
          </Button>
          <Button
            disabled={!selected || loading}
            onClick={() => selected && onWatchTogether(selected.magnet, movieData)}
          >
            Смотреть с кем-то
          </Button>
        </div>
      </div>
    </Modal>
  );
}