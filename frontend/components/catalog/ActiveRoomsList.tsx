"use client";

import { Button } from "@/components/shared/Button";
import { GlassPanel } from "@/components/shared/GlassPanel";
import type { PublicRoom } from "@/lib/types";

export function ActiveRoomsList({
  rooms,
  onJoin,
}: {
  rooms: PublicRoom[];
  onJoin: (room: PublicRoom) => void;
}) {
  if (rooms.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-mono tracking-widest text-zinc-500 uppercase">
        Сейчас смотрят вместе
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <GlassPanel key={room.id} className="p-4 flex flex-col gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm line-clamp-1">{room.name}</h4>
              <p className="text-xs text-zinc-500 truncate">{room.title}</p>
              <span className="text-[11px] font-mono text-[var(--syncro-chrome)] bg-[var(--syncro-chrome)]/10 px-2 py-0.5 rounded-md inline-block">
                {room.usersCount} участн.
              </span>
            </div>
            <Button variant="secondary" className="w-full text-xs" onClick={() => onJoin(room)}>
              Присоединиться
            </Button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
