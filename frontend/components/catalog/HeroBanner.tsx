"use client";

import Image from "next/image";
import { Button } from "@/components/shared/Button";
import type { MovieSummary } from "@/lib/types";

export function HeroBanner({
  movie,
  onSelect,
}: {
  movie: MovieSummary;
  onSelect: () => void;
}) {
  return (
    <div className="relative w-full h-[380px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl group">
      {movie.poster && (
        <Image
          src={movie.poster}
          alt={movie.title}
          fill
          unoptimized
          className="object-cover brightness-[0.35] group-hover:scale-[1.01] transition-transform duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--syncro-bg-deep)] via-[var(--syncro-bg-deep)]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl space-y-4">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2 py-0.5 bg-[var(--syncro-accent)] text-black font-black rounded">
            ТРЕНД
          </span>
          {movie.rating && (
            <span className="text-[var(--syncro-accent)] font-bold">★ {movie.rating}</span>
          )}
          <span className="text-zinc-400">{movie.year}</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight">{movie.title}</h2>
        {movie.description && (
          <p className="text-sm text-zinc-300 line-clamp-2">{movie.description}</p>
        )}
        {movie.genres?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {movie.genres.slice(0, 3).map((g) => (
              <span key={g} className="px-2 py-0.5 bg-white/10 rounded text-[11px] text-zinc-300">{g}</span>
            ))}
          </div>
        )}
        <Button onClick={onSelect}>Выбрать для просмотра</Button>
      </div>
    </div>
  );
}