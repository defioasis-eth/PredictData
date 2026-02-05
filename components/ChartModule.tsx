'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
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

function getIndexFromEvent(
  event: { clientX: number },
  container: HTMLDivElement | null,
  length: number
) {
  if (!container || length <= 1) {
    return 0;
  }
  const rect = container.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  return Math.round(ratio * (length - 1));
}

export default function ChartModule({ title, rows, multiSeries, height = 240 }: ChartModuleProps) {
  const normalized = useMemo(() => normalizeRows(rows), [rows]);
  const [aggregation, setAggregation] = useState<TimeAggregation>('D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const [dragMode, setDragMode] = useState<'select' | 'move' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const overviewRef = useRef<HTMLDivElement | null>(null);
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
  const { min, max } = computeSeriesRange(visibleData, seriesKeys);
  const overviewKeys = buildSeriesKeys(aggregated, multiSeries);
  const overviewRange = computeSeriesRange(aggregated, overviewKeys);

  useEffect(() => {
    setRangeStart(defaultRange.start);
    setRangeEnd(defaultRange.end);
  }, [defaultRange.start, defaultRange.end]);

  const handleAggregationChange = (value: TimeAggregation) => {
    setAggregation(value);
  };

  const selectionLeft = aggregated.length > 1 ? (clampedStart / (aggregated.length - 1)) * 100 : 0;
  const selectionRight = aggregated.length > 1 ? (clampedEnd / (aggregated.length - 1)) * 100 : 100;

  const handleOverviewMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (aggregated.length <= 1) {
      return;
    }
    const index = getIndexFromEvent(event, overviewRef.current, aggregated.length);
    const selectionStart = Math.min(clampedStart, clampedEnd);
    const selectionEnd = Math.max(clampedStart, clampedEnd);
    if (index >= selectionStart && index <= selectionEnd) {
      setDragMode('move');
      setDragOffset(index - selectionStart);
      return;
    }
    setDragMode('select');
    setRangeStart(index);
    setRangeEnd(index);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragMode) {
        return;
      }
      const index = getIndexFromEvent(event, overviewRef.current, aggregated.length);
      if (dragMode === 'select') {
        setRangeEnd(index);
        return;
      }
      const selectionLength = Math.max(0, clampedEnd - clampedStart);
      const newStart = Math.max(0, Math.min(index - dragOffset, aggregated.length - 1 - selectionLength));
      setRangeStart(newStart);
      setRangeEnd(newStart + selectionLength);
    };
    const handleMouseUp = () => setDragMode(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [aggregated.length, clampedEnd, clampedStart, dragMode, dragOffset]);

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
            {hoverIndex !== null && visibleData[hoverIndex] && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-surface-card/90 px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: Math.min(Math.max(tooltipLeft - (chartRef.current?.getBoundingClientRect().left ?? 0), 0), (chartRef.current?.offsetWidth ?? 0) - 140),
                  top: 10
                }}
              >
                <div className="text-text-muted">{formatDate(visibleData[hoverIndex].date)}</div>
                {seriesKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">{key}</span>
                    <span className="font-semibold text-white">
                      {visibleData[hoverIndex].values[key]?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {aggregated.length > 1 && (
        <div className="mt-4">
          <div className="text-xs text-text-muted">Range</div>
          <div
            ref={overviewRef}
            className={`relative mt-2 h-16 w-full rounded-lg bg-surface-muted/70 ${dragMode ? 'cursor-grabbing' : 'cursor-pointer'}`}
            onMouseDown={handleOverviewMouseDown}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              {buildSeriesKeys(aggregated, multiSeries).map((key, index) => (
                <path
                  key={key}
                  d={buildPath(aggregated, key, overviewRange.min, overviewRange.max)}
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="1.5"
                  opacity={0.6}
                />
              ))}
            </svg>
            <div
              className="absolute inset-y-0 rounded-md border border-accent/60 bg-accent/20"
              style={{
                left: `${selectionLeft}%`,
                width: `${Math.max(selectionRight - selectionLeft, 1)}%`
              }}
            />
          </div>
        </div>
      )}
    </ModuleCard>
  );
}
