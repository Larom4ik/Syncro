"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { api } from "@/lib/api";
import type { MovieDetails, MovieSummary, TorrentOption } from "@/lib/types";

interface MovieDetailModalProps {
  movie: MovieSummary | null;
  onClose: () => void;
  onWatchSolo: (magnet: string, details: MovieDetails) => void;
  onWatchTogether: (magnet: string, details: MovieDetails) => void;
}

export function MovieDetailModal({
  movie,
  onClose,
  onWatchSolo,
  onWatchTogether,
}: MovieDetailModalProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [torrents, setTorrents] = useState<TorrentOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [torrentError, setTorrentError] = useState("");

  useEffect(() => {
    if (!movie) return;

    setLoading(true);
    setTorrentError("");

    Promise.all([
      api.movie(movie.id),
      api.torrents(movie.title, movie.year).catch(() => ({ results: [], recommendedId: 0 })),
    ])
      .then(([det, tor]) => {
        setDetails(det);
        setTorrents(tor.results);
        setSelectedIdx(tor.recommendedId >= 0 ? tor.recommendedId : 0);
        if (tor.results.length === 0) {
          setTorrentError("Источники не найдены. Попробуйте позже или Custom Stream.");
        }
      })
      .catch((err) => setTorrentError((err as Error).message))
      .finally(() => setLoading(false));
  }, [movie]);

  if (!movie) return null;

  const selected = torrents[selectedIdx];

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
            {details && (
              <div className="text-xs text-zinc-400 space-y-1">
                <p>
                  <span className="text-[var(--syncro-accent)] font-bold">★ {details.rating.toFixed(1)}</span>
                  {" · "}{details.year}{details.country && ` · ${details.country}`}
                  {details.duration && ` · ${details.duration}`}
                </p>
                {details.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {details.genres.map((g) => (
                      <span key={g} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <p className="pt-2 leading-relaxed">{details.overview}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-zinc-300">Выберите источник</h4>
          {loading && <p className="text-xs text-zinc-500">Поиск источников...</p>}
          {torrentError && !loading && (
            <p className="text-xs text-amber-400">{torrentError}</p>
          )}
          {torrents.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {torrents.map((t, i) => (
                <button
                  key={`${t.provider}-${i}`}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    selectedIdx === i
                      ? "border-[var(--syncro-accent)] bg-[var(--syncro-accent-dim)]"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium line-clamp-1 flex-1">{t.title}</span>
                    {i === selectedIdx && torrents.length > 1 && (
                      <span className="text-[10px] text-[var(--syncro-accent)] shrink-0">рекомендуем</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-zinc-500">
                    <span>{t.quality}</span>
                    <span>{t.seeders} сидов</span>
                    <span>{t.size}</span>
                    <span className="uppercase">{t.provider}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="secondary"
            disabled={!selected || loading}
            onClick={() => details && selected && onWatchSolo(selected.magnet, details)}
          >
            Смотреть одному
          </Button>
          <Button
            disabled={!selected || loading}
            onClick={() => details && selected && onWatchTogether(selected.magnet, details)}
          >
            Смотреть с кем-то
          </Button>
        </div>
      </div>
    </Modal>
  );
}
