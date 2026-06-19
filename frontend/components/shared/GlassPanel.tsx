import type { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--syncro-glass-border)] bg-[var(--syncro-glass)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
