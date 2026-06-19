import type { Server, Socket } from 'socket.io';

export function registerSignalingHandlers(_io: Server, socket: Socket) {
  socket.on(
    'webrtc_signal',
    (payload: { roomId: string; signal: unknown; targetPeerId?: string }) => {
      if (!payload?.roomId) return;
      socket.to(payload.roomId).emit('webrtc_signal', {
        from: socket.id,
        signal: payload.signal,
        targetPeerId: payload.targetPeerId,
      });
    }
  );

  socket.on(
    'p2p_peer_ready',
    (payload: { roomId: string; peerId: string }) => {
      if (!payload?.roomId || !payload?.peerId) return;
      socket.to(payload.roomId).emit('p2p_peer_ready', {
        peerId: payload.peerId,
        hostSocketId: socket.id,
      });
    }
  );
}
