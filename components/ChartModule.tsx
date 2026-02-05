'use client';

import { useEffect, useMemo, useState } from 'react';
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
};

const TIME_OPTIONS: TimeAggregation[] = ['D', 'W', 'M', 'Cum'];
const COLORS = ['#7c8fff', '#44d19f', '#f6c445', '#ff7aa2', '#5dd0ff'];

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

function aggregateWeekly(data: SeriesPoint[]): SeriesPoint[] {
  if (data.length === 0) {
    return [];
  }
  const start = data[0].date.getTime();
  const buckets = new Map<number, SeriesPoint>();

  data.forEach((point) => {
    const weekIndex = Math.floor((point.date.getTime() - start) / (7 * 24 * 60 * 60 * 1000));
    const bucketDate = new Date(start + weekIndex * 7 * 24 * 60 * 60 * 1000);
    const existing = buckets.get(weekIndex);
    if (!existing) {
      buckets.set(weekIndex, { date: bucketDate, values: { ...point.values } });
      return;
    }
    Object.entries(point.values).forEach(([key, value]) => {
      existing.values[key] = (existing.values[key] ?? 0) + value;
    });
  });

  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
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

  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
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

export default function ChartModule({ title, rows, multiSeries }: ChartModuleProps) {
  const normalized = useMemo(() => normalizeRows(rows), [rows]);
  const [aggregation, setAggregation] = useState<TimeAggregation>('D');

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
  const { min, max } = computeSeriesRange(visibleData, seriesKeys);

  useEffect(() => {
    setRangeStart(defaultRange.start);
    setRangeEnd(defaultRange.end);
  }, [defaultRange.start, defaultRange.end]);

  const handleAggregationChange = (value: TimeAggregation) => {
    setAggregation(value);
  };

  return (
    <ModuleCard>
      <ModuleHeader title={title} />
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
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
        {visibleData.length > 0 && (
          <span>
            {formatDate(visibleData[0].date)} → {formatDate(visibleData[visibleData.length - 1].date)}
          </span>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-surface-muted/50 p-4">
        {visibleData.length === 0 ? (
          <p className="text-sm text-text-muted">No data available.</p>
        ) : (
          <svg viewBox="0 0 100 100" className="h-48 w-full">
            <defs>
              <linearGradient id="chartGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7c8fff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#7c8fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {seriesKeys.map((key, index) => (
              <path
                key={key}
                d={buildPath(visibleData, key, min, max)}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth="2"
              />
            ))}
          </svg>
        )}
      </div>
      {aggregated.length > 1 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Range</span>
            <span>
              {Math.min(clampedStart + 1, aggregated.length)} - {Math.min(clampedEnd + 1, aggregated.length)} of {aggregated.length}
            </span>
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
