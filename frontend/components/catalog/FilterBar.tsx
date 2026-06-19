"use client";

interface FilterBarProps {
  genres: { id: number; name: string }[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  year: string;
  onYearChange: (year: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FilterBar({
  genres,
  selectedGenre,
  onGenreChange,
  sortBy,
  onSortChange,
  year,
  onYearChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const sortOptions = [
    { value: "popularity.desc", label: "Популярность" },
    { value: "vote_average.desc", label: "Рейтинг" },
    { value: "primary_release_date.desc", label: "Новинки" },
  ];

  const years = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Поиск фильмов..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full md:w-72 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-[var(--syncro-accent)]/50 text-zinc-200"
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-300 outline-none"
          aria-label="Сортировка"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-300 outline-none"
          aria-label="Год"
        >
          <option value="">Все годы</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => onGenreChange("")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            !selectedGenre
              ? "bg-[var(--syncro-accent)] text-black"
              : "bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/10"
          }`}
        >
          Все
        </button>
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => onGenreChange(String(g.id))}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedGenre === String(g.id)
                ? "bg-[var(--syncro-accent)] text-black"
                : "bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/10"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>
    </div>
  );
}
