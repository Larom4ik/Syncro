const files = new Map<string, File>();

export function storeLocalFile(roomId: string, file: File) {
  files.set(roomId, file);
}

export function getLocalFile(roomId: string): File | undefined {
  return files.get(roomId);
}

export function clearLocalFile(roomId: string) {
  files.delete(roomId);
}
