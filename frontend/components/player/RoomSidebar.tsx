"use client";

import { GlassPanel } from "@/components/shared/GlassPanel";

export function RoomSidebar({
  roomName,
  roomId,
  users,
  nickname,
}: {
  roomName: string;
  roomId: string;
  users: string[];
  nickname: string;
}) {
  return (
    <GlassPanel className="p-5 space-y-4 shadow-xl">
      <div className="border-b border-white/5 pb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Текущая комната
        </span>
        <h3 className="text-lg font-bold mt-1">{roomName}</h3>
      </div>

      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          Участники ({users.length})
        </h4>
        <ul className="space-y-2 max-h-[200px] overflow-y-auto">
          {users.map((user) => (
            <li
              key={user}
              className="flex items-center gap-2 text-sm text-zinc-300 bg-white/5 p-2.5 rounded-xl border border-white/5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate">{user}</span>
              {user === nickname && (
                <span className="text-[10px] text-zinc-600 ml-auto">(вы)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t border-white/5 space-y-2">
        <p className="text-[10px] text-zinc-500">ID комнаты для друзей:</p>
        <div className="flex items-center bg-black/40 px-3 py-2 rounded-xl border border-white/10 justify-between">
          <span className="text-zinc-300 font-mono text-xs select-all font-bold">{roomId}</span>
          <button
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
            onClick={() => navigator.clipboard.writeText(roomId)}
          >
            КОПИРОВАТЬ
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
