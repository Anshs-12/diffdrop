import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/**
 * A tool's input that survives a reload and can travel in a share link.
 *
 * `useSaved(key, initial)` works like useState. Every field a page registers
 * is saved together in localStorage (only in this browser, never sent
 * anywhere) and can be packed into a link's #fragment, which browsers don't
 * send to servers. A link's input wins over the saved one; after reading it,
 * the fragment is removed from the address bar.
 *
 * Tools that handle secrets (PRIVATE_TOOLS) neither save nor share.
 */

/** Pages whose input is never saved or put in a link. */
export const PRIVATE_TOOLS = new Set(['password-generator', 'jwt-decoder']);

const PREFIX = 'toolspace-input:';
/** Inputs larger than this (characters, all fields together) aren't saved, so storage never fills up. */
export const MAX_SAVED = 1_000_000;
/** Links longer than this aren't offered: some apps and servers cut long URLs. */
export const MAX_SHARE = 32_000;
const HASH_KEY = 's=';

interface Field {
  get: () => unknown;
  set: (v: unknown) => void;
  initial: unknown;
}

type Status = { restored: 'link' | 'browser' | null; saved: boolean; fields: number };

const fields = new Map<string, Field>();
const listeners = new Set<() => void>();
let status: Status = { restored: null, saved: false, fields: 0 };
let loaded: { link: Record<string, unknown> | null; stored: Record<string, unknown> | null } | null = null;

function setStatus(patch: Partial<Status>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

/** The page this script runs on (from #root's data-page), or null when prerendering. */
export function currentPage(): string | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root')?.dataset.page ?? null;
}

const enabled = () => {
  const page = currentPage();
  return !!page && !PRIVATE_TOOLS.has(page);
};

export function encodeState(state: Record<string, unknown>): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeState(encoded: string): Record<string, unknown> | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data: unknown = JSON.parse(json);
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Reads the link and the saved input once per page load. */
function load() {
  if (loaded) return loaded;
  loaded = { link: null, stored: null };
  if (!enabled()) return loaded;
  const hash = window.location.hash.slice(1);
  if (hash.startsWith(HASH_KEY)) {
    loaded.link = decodeState(hash.slice(HASH_KEY.length));
    // Keep the address bar clean once the input is on the page
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
  }
  try {
    const raw = localStorage.getItem(PREFIX + currentPage());
    if (raw) loaded.stored = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Storage unavailable or corrupt: start empty
  }
  status = { ...status, restored: loaded.link ? 'link' : loaded.stored ? 'browser' : null, saved: !!loaded.stored };
  return loaded;
}

/** Field values that differ from their defaults. */
function changedValues(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, f] of fields) {
    const v = f.get();
    if (JSON.stringify(v) !== JSON.stringify(f.initial)) out[key] = v;
  }
  return out;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  if (!enabled()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const values = changedValues();
    const key = PREFIX + currentPage();
    try {
      if (!Object.keys(values).length) {
        localStorage.removeItem(key);
        setStatus({ saved: false });
        return;
      }
      const json = JSON.stringify(values);
      if (json.length > MAX_SAVED) return; // too big to keep; the last saved input stays
      localStorage.setItem(key, json);
      setStatus({ saved: true });
    } catch {
      // Storage full or blocked: nothing is saved
    }
  }, 400);
}

/**
 * Like useState, but saved in this browser and included in share links.
 * `valid` rejects a saved or linked value that no longer fits (an option that
 * was renamed, a value of the wrong type).
 */
export function useSaved<T>(key: string, initial: T, valid?: (v: unknown) => boolean, preferred?: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    // A value the page already has (the diff checker's own share links) wins over saved input
    if (preferred !== undefined) return preferred;
    if (typeof window === 'undefined' || !enabled()) return initial;
    const { link, stored } = load();
    for (const source of [link, stored]) {
      if (!source || !(key in source)) continue;
      const v = source[key];
      const sameType = typeof v === typeof initial && Array.isArray(v) === Array.isArray(initial) && (v === null) === (initial === null);
      if (sameType && (!valid || valid(v))) return v as T;
    }
    return initial;
  });
  const ref = useRef(value);
  ref.current = value;
  const initialRef = useRef(initial);

  useEffect(() => {
    if (!enabled()) return;
    fields.set(key, { get: () => ref.current, set: (v) => setValue(v as T), initial: initialRef.current });
    setStatus({ fields: fields.size });
    return () => {
      fields.delete(key);
      setStatus({ fields: fields.size });
    };
  }, [key]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      // A linked input is saved like a typed one
      if (status.restored !== 'link') return;
    }
    scheduleSave();
  }, [value]);

  return [value, setValue];
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: Status = { restored: null, saved: false, fields: 0 };

/** Whether this page saves input, whether something is saved, and where the input came from. */
export function useSavedStatus(): Status & { enabled: boolean } {
  const s = useSyncExternalStore(subscribe, () => status, () => SERVER);
  return { ...s, enabled: typeof window !== 'undefined' && enabled() && s.fields > 0 };
}

/** Removes this page's saved input and resets every field to its default. */
export function forgetSaved() {
  clearTimeout(saveTimer);
  try {
    localStorage.removeItem(PREFIX + currentPage());
  } catch {
    // Nothing to remove
  }
  for (const f of fields.values()) f.set(f.initial);
  // Resetting the fields schedules a save of the defaults, which removes the key again
  setStatus({ saved: false, restored: null });
}

/** A link to this page carrying the current input, or why there isn't one. */
export function shareLink(): { ok: true; url: string } | { ok: false; reason: string } {
  const values = changedValues();
  if (!Object.keys(values).length) return { ok: false, reason: 'Add some input first; the link carries what you type.' };
  const encoded = encodeState(values);
  const url = `${window.location.origin}${window.location.pathname}#${HASH_KEY}${encoded}`;
  if (url.length > MAX_SHARE) {
    return { ok: false, reason: `This input is too large for a link (${Math.round(url.length / 1000)} KB). Download it as a file instead.` };
  }
  return { ok: true, url };
}

/** For tests: forget everything read or registered on this page. */
export function resetSavedForTests() {
  fields.clear();
  loaded = null;
  status = { restored: null, saved: false, fields: 0 };
}
