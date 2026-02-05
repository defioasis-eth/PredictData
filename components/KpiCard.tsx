'use client';

import { useMemo, useState } from 'react';

const tabLabels: Record<string, string> = {
  day: 'D',
  week: 'W',
  month: 'M',
  cumulative: 'Cum'
};

export type KpiValues = Record<string, number | null>;

function formatValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

export default function KpiCard({ title, values }: { title: string; values: KpiValues }) {
  const tabs = useMemo(() => Object.keys(values), [values]);
  const [active, setActive] = useState(tabs[0] ?? 'day');
  const activeValue = values[active] ?? null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-surface-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted">{title}</h3>
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full px-2 py-0.5 ${
                tab === active ? 'bg-accent/30 text-white' : 'text-text-muted'
              }`}
            >
              {tabLabels[tab] ?? tab}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">{formatValue(activeValue)}</div>
    </div>
  );
}
