'use client';

type KpiPlaceholderCardProps = {
  title: string;
  subtitle?: string;
};

export default function KpiPlaceholderCard({ title, subtitle }: KpiPlaceholderCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card/80 p-5">
      <div>
        <h3 className="text-sm font-semibold text-text-muted">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-text-muted/80">{subtitle}</p>}
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">—</div>
    </div>
  );
}
