import type { Server, Socket } from 'socket.io';
import { roomStore } from '../stores/roomStore.js';
import type { RoomMeta, RoomMode } from '../types/room.js';

function broadcastRooms(io: Server) {
  io.emit('rooms_list_update', roomStore.listPublic());
}

function emitRoomUsers(io: Server, roomId: string) {
  const room = roomStore.get(roomId);
  if (!room) return;
  io.to(roomId).emit(
    'room_users',
    Array.from(room.users.values()).map((u) => u.nickname)
  );
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on(
    'create_room',
    (payload: {
      roomId: string;
      passwordHash: string;
      roomName: string;
      hostUserId: string;
      nickname: string;
      meta: RoomMeta;
    }) => {
      const { roomId, passwordHash, roomName, hostUserId, nickname, meta } = payload;
      if (!roomId || !passwordHash) {
        socket.emit('room_error', { message: 'Некорректные данные комнаты' });
        return;
      }

      if (!roomStore.get(roomId)) {
        roomStore.set(roomId, {
          id: roomId,
          name: roomName,
          passwordHash,
          meta,
          hostUserId,
          users: new Map(),
          createdAt: Date.now(),
        });
      }

      socket.emit('room_created', { roomId });
      joinRoomInternal(io, socket, roomId, passwordHash, nickname, hostUserId);
    }
  );

  socket.on(
    'join_room',
    (payload: {
      roomId: string;
      passwordHash: string;
      nickname: string;
      userId: string;
    }) => {
      const { roomId, passwordHash, nickname, userId } = payload;
      joinRoomInternal(io, socket, roomId, passwordHash, nickname, userId);
    }
  );

  socket.on('leave_room', ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    socket.leave(roomId);
    const deleted = roomStore.removeUser(roomId, socket.id);
    if (deleted) {
      console.log(`[ROOM DELETED] ${roomId}`);
    } else {
      emitRoomUsers(io, roomId);
    }
    broadcastRooms(io);
  });

  socket.on('disconnect', () => {
    const affected = roomStore.removeSocketFromAll(socket.id);
    for (const roomId of affected) {
      if (roomStore.get(roomId)) {
        emitRoomUsers(io, roomId);
      }
    }
    if (affected.length > 0) broadcastRooms(io);
  });
}

function joinRoomInternal(
  io: Server,
  socket: Socket,
  roomId: string,
  passwordHash: string,
  nickname: string,
  userId: string
) {
  const room = roomStore.get(roomId);

  if (!room) {
    socket.emit('join_denied', { message: 'Комната не найдена' });
    return;
  }

  if (room.passwordHash !== passwordHash) {
    socket.emit('join_denied', { message: 'Неверный пароль комнаты' });
    return;
  }

  socket.join(roomId);
  room.users.set(socket.id, { userId, nickname });

  socket.emit('join_ok', {
    roomId,
    meta: room.meta,
    isHost: room.hostUserId === userId,
    hostUserId: room.hostUserId,
  });

  // Notify other users in the room about the new joiner (for bootstrap sync)
  socket.to(roomId).emit('user_joined', {
    userId,
    nickname,
    socketId: socket.id,
  });

  emitRoomUsers(io, roomId);

  if (!roomId.startsWith('solo-')) {
    broadcastRooms(io);
  }

  console.log(`[ROOM JOIN] ${nickname} → ${roomId} (${room.users.size} online)`);
}

export { broadcastRooms };
