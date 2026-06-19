import type { PublicRoomInfo, RoomSession } from '../types/room.js';

class RoomStore {
  private rooms = new Map<string, RoomSession>();

  get(roomId: string): RoomSession | undefined {
    return this.rooms.get(roomId);
  }

  set(roomId: string, room: RoomSession): void {
    this.rooms.set(roomId, room);
  }

  delete(roomId: string): void {
    this.rooms.delete(roomId);
  }

  listPublic(): PublicRoomInfo[] {
    return Array.from(this.rooms.values())
      .filter((r) => !r.id.startsWith('solo-') && r.meta.mode !== 'solo')
      .map((r) => {
        const info: PublicRoomInfo = {
          id: r.id,
          name: r.name,
          title: r.meta.title,
          mode: r.meta.mode,
          usersCount: r.users.size,
        };
        if (r.meta.posterPath) info.posterPath = r.meta.posterPath;
        return info;
      });
  }

  removeUser(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.users.delete(socketId);

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      return true;
    }
    return false;
  }

  removeSocketFromAll(socketId: string): string[] {
    const affected: string[] = [];
    for (const [roomId, room] of this.rooms) {
      if (room.users.has(socketId)) {
        room.users.delete(socketId);
        affected.push(roomId);
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }
    return affected;
  }
}

export const roomStore = new RoomStore();
