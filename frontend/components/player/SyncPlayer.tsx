"use client";

import dynamic from "next/dynamic";

export const SyncPlayer = dynamic(
  () => import("./SyncPlayerInner").then((m) => m.SyncPlayerInner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-zinc-500 text-sm">
        Загрузка плеера...
      </div>
    ),
  }
);