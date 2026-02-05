'use client';

export default function ModuleHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
    </div>
  );
}
