'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <nav className="flex items-center justify-between border-b border-white/10 bg-surface-muted/80 px-6 py-4 backdrop-blur">
      <div className="text-lg font-semibold">PredictData</div>
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
    </nav>
  );
}
