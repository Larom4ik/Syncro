import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="block space-y-1.5 w-full">
      {label && (
        <span className="text-xs font-medium text-[var(--syncro-muted)] uppercase tracking-wider">
          {label}
        </span>
      )}
      <input
        className={`w-full px-4 py-3 bg-black/40 border border-[var(--syncro-glass-border)] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-[var(--syncro-accent)]/50 transition-colors ${className}`}
        {...props}
      />
    </label>
  );
}
