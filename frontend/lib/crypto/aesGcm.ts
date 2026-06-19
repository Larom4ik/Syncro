import { APP_SALT, PBKDF2_ITERATIONS } from '../constants';

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function hashPassword(password: string, roomId: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:${roomId}:${APP_SALT}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hash);
}

export async function deriveRoomKey(password: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${roomId}:${APP_SALT}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface CryptoEnvelope {
  iv: string;
  ct: string;
}

export async function encryptPayload(
  key: CryptoKey,
  payload: unknown
): Promise<CryptoEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return { iv: toBase64(iv.buffer), ct: toBase64(ciphertext) };
}

export async function decryptPayload<T>(
  key: CryptoKey,
  envelope: CryptoEnvelope
): Promise<T> {
  const iv = fromBase64(envelope.iv);
  const ct = fromBase64(envelope.ct);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
