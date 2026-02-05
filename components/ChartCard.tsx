'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import ModuleCard from './ModuleCard';
import ModuleHeader from './ModuleHeader';

type TimeAggregation = 'D' | 'W' | 'M' | 'Cum';
type ChartType = 'line' | 'bar' | 'grouped-bar';

type SeriesPoint = {
  date: Date;
  values: Record<string, number>;
};

type ChartCardProps = {
  title: string;
  rows: Record<string, unknown>[];
  multiSeries?: boolean;
  height?: number;
  chartType?: ChartType;
};

const TIME_OPTIONS: TimeAggregation[] = ['D', 'W', 'M', 'Cum'];
const DARK_COLORS = ['#8aa4ff', '#5ecaa7', '#f0c36d', '#f08db3', '#6bb6ff', '#b59bff'];
const LIGHT_COLORS = ['#3b5bdb', '#1b9c84', '#d3a54a', '#cc5a8a', '#2f74c0', '#7b6fe7'];

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

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
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

function useThemeMode() {
  const [isDark, setIsDark] = useState(false);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      setIsDark(root.classList.contains('dark'));
      const styles = getComputedStyle(root);
      setTokens({
        border: styles.getPropertyValue('--color-border').trim(),
        grid: styles.getPropertyValue('--color-grid').trim(),
        text: styles.getPropertyValue('--color-text-primary').trim(),
        muted: styles.getPropertyValue('--color-text-muted').trim(),
        tooltipBg: styles.getPropertyValue('--color-tooltip-bg').trim(),
        tooltipBorder: styles.getPropertyValue('--color-tooltip-border').trim()
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return { isDark, tokens };
}

export default function ChartCard({
  title,
  rows,
  multiSeries,
  height = 260,
  chartType = 'line'
}: ChartCardProps) {
  const normalized = useMemo(() => normalizeRows(rows), [rows]);
  const [aggregation, setAggregation] = useState<TimeAggregation>('D');
  const { isDark, tokens } = useThemeMode();
  const palette = isDark ? DARK_COLORS : LIGHT_COLORS;
  const tokenValues = {
    border: tokens.border || 'rgba(148, 163, 184, 0.2)',
    grid: tokens.grid || 'rgba(148, 163, 184, 0.12)',
    text: tokens.text || '#0f172a',
    muted: tokens.muted || '#64748b',
    tooltipBg: tokens.tooltipBg || '#ffffff',
    tooltipBorder: tokens.tooltipBorder || 'rgba(148, 163, 184, 0.2)'
  };

  const aggregated = useMemo(
    () => aggregateData(normalized, aggregation),
    [normalized, aggregation]
  );
  const range = useMemo(() => getDefaultRange(aggregated.length, aggregation), [aggregated.length, aggregation]);
  const seriesKeys = buildSeriesKeys(aggregated, multiSeries);
  const chartKeys = chartType === 'bar' ? seriesKeys.slice(0, 1) : seriesKeys;
  const dates = aggregated.map((point) => formatDate(point.date));

  const series = chartKeys.map((key, index) => ({
    name: humanizeSeriesLabel(key),
    type: chartType === 'line' ? 'line' : 'bar',
    data: aggregated.map((point) => point.values[key] ?? 0),
    symbol: 'none',
    smooth: chartType === 'line',
    lineStyle: { width: 1.2 },
    barMaxWidth: chartType === 'grouped-bar' ? 12 : 16,
    barGap: chartType === 'grouped-bar' ? '30%' : '5%'
  }));

  const startPercent = aggregated.length > 1 ? (range.start / (aggregated.length - 1)) * 100 : 0;
  const endPercent = aggregated.length > 1 ? (range.end / (aggregated.length - 1)) * 100 : 100;

  const option = {
    color: palette,
    grid: { left: 56, right: 24, top: 48, bottom: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokenValues.tooltipBg,
      borderColor: tokenValues.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: tokenValues.text, fontSize: 12 },
      formatter: (params: { axisValueLabel: string; seriesName: string; data: number }[]) => {
        const rows = params
          .map((item) => `${item.seriesName}: ${formatCompact(item.data)}`)
          .join('<br/>');
        return `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValueLabel ?? ''}</div>${rows}`;
      }
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: tokenValues.muted, fontSize: 12 },
      selectedMode: true,
      show: chartKeys.length > 1
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: tokenValues.muted, fontSize: 11 },
      axisLine: { lineStyle: { color: tokenValues.border } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: tokenValues.muted,
        fontSize: 11,
        formatter: (value: number) => formatCompact(value)
      },
      splitLine: { lineStyle: { color: tokenValues.grid } },
      axisLine: { show: false }
    },
    dataZoom: [
      {
        type: 'slider',
        start: startPercent,
        end: endPercent,
        height: 20,
        bottom: 12,
        borderColor: tokenValues.border,
        backgroundColor: tokenValues.border,
        fillerColor: tokenValues.grid,
        handleStyle: { color: tokenValues.text, borderColor: tokenValues.border },
        showDetail: false,
        showDataShadow: false
      }
    ],
    series
  };

  return (
    <ModuleCard>
      <ModuleHeader title={title} />
      <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-muted p-1 text-xs text-text-muted">
        {TIME_OPTIONS.map((optionKey) => (
          <button
            key={optionKey}
            type="button"
            className={`rounded-full px-2 py-0.5 ${
              optionKey === aggregation ? 'bg-accent/20 text-text-primary' : 'text-text-muted'
            }`}
            onClick={() => setAggregation(optionKey)}
          >
            {optionKey}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <ReactECharts
          option={option}
          style={{ height }}
          opts={{ renderer: 'canvas' }}
          notMerge
          lazyUpdate
        />
      </div>
    </ModuleCard>
  );
}
