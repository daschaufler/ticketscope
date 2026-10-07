'use client';
import { useCallback, useEffect, useState } from 'react';
import { defaultSettings } from './constants';
import { Settings } from './types';

const KEY = 'ticketscope.settings.v1';

/** Settings live in localStorage; nothing is ever sent to a server. */
export function useSettings(): [Settings, (s: Settings) => void, () => void] {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        const d = defaultSettings();
        setSettings({ ...d, ...saved, columns: { ...d.columns, ...saved.columns } });
      }
    } catch {
      /* ignore broken storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable */
    }
  }, [settings, ready]);

  const reset = useCallback(() => setSettings(defaultSettings()), []);
  return [settings, setSettings, reset];
}
