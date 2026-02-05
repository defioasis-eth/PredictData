'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'predictdata-theme';

type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial = stored ?? 'system';
    setMode(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);

  const handleChange = (value: ThemeMode) => {
    setMode(value);
    window.localStorage.setItem(STORAGE_KEY, value);
    applyTheme(value);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-surface-card/70 p-1 text-xs">
      {(['light', 'dark', 'system'] as ThemeMode[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleChange(value)}
          className={`rounded-full px-2 py-0.5 capitalize ${
            mode === value ? 'bg-accent/20 text-text-primary' : 'text-text-muted'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
