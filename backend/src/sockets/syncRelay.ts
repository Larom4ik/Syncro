import type { Server, Socket } from 'socket.io';

export function registerSyncRelay(io: Server, socket: Socket) {
  socket.on(
    'sync_encrypted',
    (payload: { roomId: string; envelope: { iv: string; ct: string } }) => {
      if (!payload?.roomId || !payload?.envelope) return;
      socket.to(payload.roomId).emit('sync_encrypted', payload);
    }
  );

  socket.on(
    'bootstrap_encrypted',
    (payload: {
      roomId: string;
      targetSocketId?: string;
      envelope: { iv: string; ct: string };
    }) => {
      if (!payload?.roomId || !payload?.envelope) return;

      if (payload.targetSocketId) {
        io.to(payload.targetSocketId).emit('bootstrap_encrypted', payload);
      } else {
        socket.to(payload.roomId).emit('bootstrap_encrypted', payload);
      }
    }
  );
}
