'use client';

import { ReactNode } from 'react';

export default function ModuleCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-surface-card p-5 shadow-sm">
      {children}
    </section>
  );
}
