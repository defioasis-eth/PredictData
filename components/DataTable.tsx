'use client';

import ModuleCard from './ModuleCard';
import ModuleHeader from './ModuleHeader';

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);
  }
  return String(value);
}

export default function DataTable({
  title,
  rows
}: {
  title: string;
  rows: Record<string, unknown>[];
}) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const hasRows = rows.length > 0 && columns.length > 0;

  return (
    <ModuleCard>
      <ModuleHeader title={title} />
      <div className="mt-4 overflow-x-auto">
        {hasRows ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-text-muted">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border-b border-white/10 px-3 py-2">
                    {column.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/5">
                  {columns.map((column) => (
                    <td key={column} className="px-3 py-2 text-text-primary">
                      {formatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">No data available.</p>
        )}
      </div>
    </ModuleCard>
  );
}
