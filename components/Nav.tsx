'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { label: 'Overview', href: '/' },
  { label: 'Polymarket', href: '/polymarket' },
  { label: 'Kalshi', href: '/kalshi' },
  { label: 'Opinion', href: '/opinion' },
  { label: 'Predict.Fun', href: '/predict-fun' },
  { label: 'Probable', href: '/probable' }
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[color:var(--color-border)] bg-surface-muted px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-lg font-semibold">PredictData</div>
        <ThemeToggle />
        <div className="flex flex-wrap gap-4 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 ${
                  isActive
                    ? 'bg-accent/20 text-white'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
