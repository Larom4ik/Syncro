// Public PeerJS — для self-hosted замените host/port/path/secure:
export const PEERJS_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  // Self-hosted:
  // host: 'localhost',
  // port: 9000,
  // path: '/peerjs',
  // secure: false,
} as const;
