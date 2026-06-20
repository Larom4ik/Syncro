"use client";

import { MovieCard } from "./MovieCard";
import type { MovieSummary } from "@/lib/types";

export function MovieGrid({
  movies,
  onSelect,
}: {
  movies: MovieSummary[];
  onSelect: (movie: MovieSummary) => void;
}) {
  if (movies.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500 text-sm bg-white/5 border border-white/5 rounded-2xl">
        Фильмы не найдены
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {movies.map((movie) => (
        <div key={movie.id} className="relative">
          <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-sm text-[var(--syncro-accent)] border border-[var(--syncro-accent)]/20">
            {movie.rating ?? "—"}
          </div>
          <MovieCard movie={movie} onClick={() => onSelect(movie)} />
        </div>
      ))}
    </div>
  );
}
