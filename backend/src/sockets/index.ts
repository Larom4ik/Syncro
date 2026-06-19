import type { Server, Socket } from 'socket.io';
import { roomStore } from '../stores/roomStore.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerSignalingHandlers } from './signalingHandlers.js';
import { registerSyncRelay } from './syncRelay.js';

export function registerSocketHandlers(io: Server, socket: Socket) {
  socket.emit('init_data', {
    rooms: roomStore.listPublic(),
  });

  registerRoomHandlers(io, socket);
  registerSyncRelay(io, socket);
  registerSignalingHandlers(io, socket);
}
