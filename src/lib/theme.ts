import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'toolspace-theme';
/** Where the theme was saved before the rename; read once, then moved. */
const OLD_KEY = 'diffdrop-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // Storage unavailable (private mode, blocked site data)
  }
  return 'system';
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'system') return choice;
  if (typeof window === 'undefined') return 'light'; // prerendering
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Tracks the user's theme choice and always writes the resolved theme to
 * <html data-theme>, following the OS setting live while the choice is "system".
 */
export function useTheme() {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readChoice()));

  useEffect(() => {
    const apply = () => {
      const next = resolve(choice);
      document.documentElement.setAttribute('data-theme', next);
      setResolved(next);
    };
    apply();

    try {
      localStorage.removeItem(OLD_KEY);
      if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignore — the choice still applies for this session
    }

    if (choice !== 'system') return;
    const mq = window.matchMedia(DARK_QUERY);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => setChoiceState(c), []);
  return { choice, resolved, setChoice };
}
