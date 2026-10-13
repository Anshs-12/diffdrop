import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// The texts live in the URL #fragment, which browsers never send to a server.

export function encodeHash(original: string, changed: string): string {
  return compressToEncodedURIComponent(JSON.stringify({ o: original, c: changed }));
}

export function decodeHash(hash: string): { original: string; changed: string } | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;
    const json = decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    return {
      original: typeof data.o === 'string' ? data.o : '',
      changed: typeof data.c === 'string' ? data.c : '',
    };
  } catch {
    return null;
  }
}
