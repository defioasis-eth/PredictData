'use client';

import { ReactNode } from 'react';

export default function ModuleCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-card/80 p-5 shadow-sm">
      {children}
    </section>
  );
}
