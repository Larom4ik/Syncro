"use client";

import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--syncro-bg-elevated)] border border-[var(--syncro-glass-border)] rounded-3xl max-w-2xl w-full p-6 md:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
          aria-label="Закрыть"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
