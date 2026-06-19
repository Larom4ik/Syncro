export const APP_SALT = 'syncro-v1';
export const PBKDF2_ITERATIONS = 310_000;
export const MIN_PASSWORD_LENGTH = 8;

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
