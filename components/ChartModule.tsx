'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ModuleCard from './ModuleCard';
import ModuleHeader from './ModuleHeader';

type TimeAggregation = 'D' | 'W' | 'M' | 'Cum';

type SeriesPoint = {
  date: Date;
  values: Record<string, number>;
};

type ChartModuleProps = {
  title: string;
  rows: Record<string, unknown>[];
  multiSeries?: boolean;
  height?: number;
  chartType?: 'line' | 'bar' | 'grouped-bar';
};

const TIME_OPTIONS: TimeAggregation[] = ['D', 'W', 'M', 'Cum'];
const COLORS = ['#8aa4ff', '#5ecaa7', '#f0c36d', '#f08db3', '#6bb6ff', '#b59bff'];

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function findDateKey(row: Record<string, unknown>): string | null {
  const keys = Object.keys(row);
  const dateKey = keys.find((key) => /date|day|time/i.test(key));
  return dateKey ?? null;
}

function normalizeRows(rows: Record<string, unknown>[]): SeriesPoint[] {
  if (rows.length === 0) {
    return [];
  }
  const dateKey = findDateKey(rows[0]);
  if (!dateKey) {
    return [];
  }

  return rows
    .map((row) => {
      const date = parseDate(row[dateKey]);
      if (!date) {
        return null;
      }
      const values: Record<string, number> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key === dateKey) {
          return;
        }
        if (typeof value === 'number') {
          values[key] = value;
        }
      });
      return { date, values };
    })
    .filter((point): point is SeriesPoint => Boolean(point))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function aggregateWeekly(data: SeriesPoint[]): SeriesPoint[] {
  if (data.length === 0) {
    return [];
  }
  const buckets = new Map<string, SeriesPoint>();

  data.forEach((point) => {
    const bucketDate = startOfWeek(point.date);
    const key = bucketDate.toISOString();
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { date: bucketDate, values: { ...point.values } });
      return;
    }
    Object.entries(point.values).forEach(([key, value]) => {
      existing.values[key] = (existing.values[key] ?? 0) + value;
    });
  });

  const results = Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const currentWeekStart = startOfWeek(new Date()).getTime();
  return results.filter((point) => point.date.getTime() < currentWeekStart);
}

function aggregateMonthly(data: SeriesPoint[]): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();

  data.forEach((point) => {
    const key = `${point.date.getFullYear()}-${point.date.getMonth()}`;
    const bucketDate = new Date(point.date.getFullYear(), point.date.getMonth(), 1);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { date: bucketDate, values: { ...point.values } });
      return;
    }
    Object.entries(point.values).forEach(([seriesKey, value]) => {
      existing.values[seriesKey] = (existing.values[seriesKey] ?? 0) + value;
    });
  });

  const results = Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  return results.filter((point) => `${point.date.getFullYear()}-${point.date.getMonth()}` !== currentMonthKey);
}

function aggregateCumulative(data: SeriesPoint[]): SeriesPoint[] {
  const cumulative: Record<string, number> = {};
  return data.map((point) => {
    Object.entries(point.values).forEach(([key, value]) => {
      cumulative[key] = (cumulative[key] ?? 0) + value;
    });
    return { date: point.date, values: { ...cumulative } };
  });
}

function aggregateData(data: SeriesPoint[], aggregation: TimeAggregation): SeriesPoint[] {
  if (aggregation === 'W') {
    return aggregateWeekly(data);
  }
  if (aggregation === 'M') {
    return aggregateMonthly(data);
  }
  if (aggregation === 'Cum') {
    return aggregateCumulative(data);
  }
  return data;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function humanizeSeriesLabel(key: string) {
  const normalized = key.replace(/_/g, ' ').replace(/  +/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const match = lower.match(/(\d{1,9})/);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      const formatted =
        value >= 1_000_000
          ? `$${value / 1_000_000}M+`
          : value >= 1_000
          ? `$${value / 1_000}K+`
          : `$${value}+`;
      return formatted;
    }
  }
  return normalized
    .replace(/addresses|traders|volume/gi, '')
    .replace(/by/gi, '')
    .replace(/  +/g, ' ')
    .trim()
    .replace(/^all$/i, 'All');
}

function getDefaultRange(length: number, aggregation: TimeAggregation) {
  if (length === 0) {
    return { start: 0, end: 0 };
  }
  if (aggregation === 'D') {
    return { start: Math.max(0, length - 90), end: length - 1 };
  }
  if (aggregation === 'W') {
    return { start: Math.max(0, length - 26), end: length - 1 };
  }
  if (aggregation === 'M') {
    return { start: Math.max(0, length - 12), end: length - 1 };
  }
  return { start: 0, end: length - 1 };
}

function buildSeriesKeys(data: SeriesPoint[], multiSeries?: boolean): string[] {
  if (data.length === 0) {
    return [];
  }
  const keys = Object.keys(data[0].values);
  return multiSeries ? keys : keys.slice(0, 1);
}

function computeSeriesRange(data: SeriesPoint[], seriesKeys: string[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  data.forEach((point) => {
    seriesKeys.forEach((key) => {
      const value = point.values[key];
      if (typeof value === 'number') {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

function buildPath(data: SeriesPoint[], seriesKey: string, min: number, max: number) {
  if (data.length === 0) {
    return '';
  }
  const values = data.map((point) => point.values[seriesKey] ?? 0);
  const stepX = 100 / Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = index * stepX;
      const normalized = (value - min) / (max - min || 1);
      const y = 100 - normalized * 100;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

function formatTick(value: number) {
  return formatCompact(value);
}

export default function ChartModule({
  title,
  rows,
  multiSeries,
  height = 240,
  chartType = 'line'
}: ChartModuleProps) {
  const normalized = useMemo(() => normalizeRows(rows), [rows]);
  const [aggregation, setAggregation] = useState<TimeAggregation>('D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const chartRef = useRef<HTMLDivElement | null>(null);

  const aggregated = useMemo(
    () => aggregateData(normalized, aggregation),
    [normalized, aggregation]
  );
  const defaultRange = useMemo(
    () => getDefaultRange(aggregated.length, aggregation),
    [aggregated.length, aggregation]
  );
  const [rangeStart, setRangeStart] = useState(defaultRange.start);
  const [rangeEnd, setRangeEnd] = useState(defaultRange.end);

  const clampedStart = Math.min(rangeStart, rangeEnd);
  const clampedEnd = Math.max(rangeStart, rangeEnd);

  const visibleData = aggregated.slice(clampedStart, clampedEnd + 1);
  const seriesKeys = buildSeriesKeys(visibleData, multiSeries);
  const activeSeriesKeys = seriesKeys.filter((key) => !hiddenSeries.has(key));
  const displaySeriesKeys = activeSeriesKeys.length > 0 ? activeSeriesKeys : seriesKeys;
  const chartSeriesKeys = chartType === 'bar' ? displaySeriesKeys.slice(0, 1) : displaySeriesKeys;
  const { min, max } = computeSeriesRange(visibleData, displaySeriesKeys);

  useEffect(() => {
    setRangeStart(defaultRange.start);
    setRangeEnd(defaultRange.end);
  }, [defaultRange.start, defaultRange.end]);

  const handleAggregationChange = (value: TimeAggregation) => {
    setAggregation(value);
  };

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };


  return (
    <ModuleCard>
      <ModuleHeader title={title} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/5 p-1 text-xs text-text-muted">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full px-2 py-0.5 ${
                option === aggregation ? 'bg-accent/30 text-white' : 'text-text-muted'
              }`}
              onClick={() => handleAggregationChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {seriesKeys.length > 1 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-text-muted">
            {seriesKeys.map((key, index) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSeries(key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                  hiddenSeries.has(key)
                    ? 'border-white/10 text-text-muted'
                    : 'border-white/20 text-white'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                    opacity: hiddenSeries.has(key) ? 0.3 : 1
                  }}
                />
                {humanizeSeriesLabel(key)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-surface-muted/40 p-4">
        {visibleData.length === 0 ? (
          <p className="text-sm text-text-muted">No data available.</p>
        ) : (
          <div
            ref={chartRef}
            className="relative w-full"
            style={{ height }}
            onMouseLeave={() => setHoverIndex(null)}
            onMouseMove={(event) => {
              if (!chartRef.current || visibleData.length <= 1) {
                return;
              }
              const rect = chartRef.current.getBoundingClientRect();
              const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
              const index = Math.round(ratio * (visibleData.length - 1));
              setHoverIndex(index);
              setTooltipLeft(rect.left + ratio * rect.width);
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <line x1="12" y1="86" x2="98" y2="86" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
              <line x1="12" y1="10" x2="12" y2="86" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 86 - ratio * 76;
                return (
                  <line
                    key={ratio}
                    x1="12"
                    y1={y}
                    x2="98"
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.2"
                  />
                );
              })}
              {[min, (min + max) / 2, max].map((value, index) => (
                <text
                  key={index}
                  x="1"
                  y={86 - (index * 38)}
                  fontSize="2.8"
                  fill="rgba(255,255,255,0.5)"
                >
                  {formatTick(value)}
                </text>
              ))}
              {visibleData.length > 0 && (
                <>
                  <text x="12" y="96" fontSize="2.8" fill="rgba(255,255,255,0.5)">
                    {formatDate(visibleData[0].date)}
                  </text>
                  <text x="55" y="96" fontSize="2.8" textAnchor="middle" fill="rgba(255,255,255,0.5)">
                    {formatDate(visibleData[Math.floor(visibleData.length / 2)].date)}
                  </text>
                  <text x="98" y="96" fontSize="2.8" textAnchor="end" fill="rgba(255,255,255,0.5)">
                    {formatDate(visibleData[visibleData.length - 1].date)}
                  </text>
                </>
              )}
              {chartType === 'line' && chartSeriesKeys.map((key, index) => (
                <path
                  key={key}
                  d={buildPath(visibleData, key, min, max)}
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="0.9"
                />
              ))}
              {chartType === 'bar' && chartSeriesKeys.map((key, index) => {
                const barWidth = 86 / Math.max(1, visibleData.length);
                return visibleData.map((point, pointIndex) => {
                  const value = point.values[key] ?? 0;
                  const normalized = (value - min) / (max - min || 1);
                  const heightValue = normalized * 76;
                  return (
                    <rect
                      key={`${key}-${pointIndex}`}
                      x={12 + pointIndex * barWidth + 0.2}
                      y={86 - heightValue}
                      width={Math.max(barWidth - 0.6, 0.5)}
                      height={heightValue}
                      fill={COLORS[index % COLORS.length]}
                      opacity={0.85}
                    />
                  );
                });
              })}
              {chartType === 'grouped-bar' && chartSeriesKeys.map((key, seriesIndex) => {
                const groupWidth = 86 / Math.max(1, visibleData.length);
                const barWidth = groupWidth / Math.max(1, chartSeriesKeys.length);
                return visibleData.map((point, pointIndex) => {
                  const value = point.values[key] ?? 0;
                  const normalized = (value - min) / (max - min || 1);
                  const heightValue = normalized * 76;
                  return (
                    <rect
                      key={`${key}-${pointIndex}`}
                      x={12 + pointIndex * groupWidth + seriesIndex * barWidth}
                      y={86 - heightValue}
                      width={Math.max(barWidth - 0.4, 0.3)}
                      height={heightValue}
                      fill={COLORS[seriesIndex % COLORS.length]}
                      opacity={0.9}
                    />
                  );
                });
              })}
            </svg>
            {hoverIndex !== null && visibleData[hoverIndex] && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-surface-card/90 px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: Math.min(Math.max(tooltipLeft - (chartRef.current?.getBoundingClientRect().left ?? 0), 0), (chartRef.current?.offsetWidth ?? 0) - 140),
                  top: 10
                }}
              >
                <div className="text-text-muted">{formatDate(visibleData[hoverIndex].date)}</div>
                {chartSeriesKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">{humanizeSeriesLabel(key)}</span>
                    <span className="font-semibold text-white">
                      {visibleData[hoverIndex].values[key] !== undefined
                        ? formatCompact(visibleData[hoverIndex].values[key])
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {aggregated.length > 1 && (
        <div className="mt-4 space-y-2 text-xs text-text-muted">
          <div className="flex items-center justify-between">
            <span>Range</span>
            {visibleData.length > 0 && (
              <span>
                {formatDate(visibleData[0].date)} → {formatDate(visibleData[visibleData.length - 1].date)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, aggregated.length - 1)}
              value={clampedStart}
              onChange={(event) => setRangeStart(Number(event.target.value))}
              className="w-full accent-accent"
            />
            <input
              type="range"
              min={0}
              max={Math.max(0, aggregated.length - 1)}
              value={clampedEnd}
              onChange={(event) => setRangeEnd(Number(event.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}
    </ModuleCard>
  );
}
