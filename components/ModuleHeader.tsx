'use client';

import Link from 'next/link';

export default function ModuleHeader({
  title,
  updatedAt,
  queryId
}: {
  title: string;
  updatedAt?: string | null;
  queryId: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-text-muted">
          Updated {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}
        </p>
      </div>
      <div className="text-right text-xs text-text-muted">
        <p>Query ID: {queryId}</p>
        <Link href={`https://dune.com/queries/${queryId}`} target="_blank" rel="noreferrer">
          View on Dune
        </Link>
      </div>
    </div>
  );
}
