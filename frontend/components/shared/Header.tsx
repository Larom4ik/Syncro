"use client";

import Link from "next/link";
import { useIdentity } from "@/hooks/useIdentity";
import { useSocket } from "@/providers/SocketProvider";

export function Header() {
  const { identity } = useIdentity();
  const { connected } = useSocket();

  return (
    <header className="w-full max-w-7xl px-6 py-4 flex justify-between items-center border-b border-white/5 sticky top-0 bg-[var(--syncro-bg-deep)]/80 backdrop-blur-xl z-40">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--syncro-chrome)] to-[var(--syncro-accent)]"
        >
          SYNCRO
        </Link>
        <Link
          href="/stream"
          className="hidden md:block text-xs font-semibold text-zinc-400 hover:text-[var(--syncro-accent)] transition-colors uppercase tracking-wider"
        >
          Custom Stream
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {identity && (
          <span className="text-sm font-medium px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300">
            {identity.nickname}
          </span>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
          />
          <span className="text-[10px] font-mono tracking-wider text-zinc-400">
            {connected ? "ONLINE" : "..."}
          </span>
        </div>
      </div>
    </header>
  );
}
