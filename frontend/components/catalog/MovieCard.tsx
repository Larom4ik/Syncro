"use client";

import Image from "next/image";
import type { MovieSummary } from "@/lib/types";

export function MovieCard({
  movie,
  onClick,
}: {
  movie: MovieSummary;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col cursor-pointer transition-all duration-300"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="aspect-[2/3] w-full bg-zinc-900 relative overflow-hidden rounded-xl border border-white/5 group-hover:border-white/15 transition-colors">
        {movie.poster ? (
          <Image
            src={movie.poster}
            alt={movie.title}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            Нет постера
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span className="text-[11px] font-bold bg-[var(--syncro-accent)] text-black py-1.5 w-full text-center rounded-lg">
            Подробнее
          </span>
        </div>
      </div>
      <div className="pt-3 px-1 space-y-0.5">
        <h4 className="font-bold text-sm text-zinc-200 group-hover:text-[var(--syncro-chrome)] transition-colors line-clamp-1">
          {movie.title}
        </h4>
        <span className="text-[11px] text-zinc-500">{movie.year}</span>
      </div>
    </div>
  );
}
