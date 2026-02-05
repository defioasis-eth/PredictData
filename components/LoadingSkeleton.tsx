'use client';

export default function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-white/10" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-3 w-full rounded bg-white/5" />
      ))}
    </div>
  );
}
