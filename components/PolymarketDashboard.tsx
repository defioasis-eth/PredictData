'use client';

import useSWR from 'swr';
import { polymarketQueryIds, PolymarketBundleItem, PolymarketQueryKey } from '@/lib/polymarket';
import { DuneQueryResult } from '@/lib/dune';
import KpiCard, { KpiValues } from './KpiCard';
import DataTable from './DataTable';
import ErrorState from './ErrorState';
import LoadingSkeleton from './LoadingSkeleton';
import ModuleCard from './ModuleCard';
import ModuleHeader from './ModuleHeader';

const fetcher = async (url: string): Promise<DuneQueryResult> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const KPI_KEY_VARIANTS: Record<string, string[]> = {
  day: ['day', 'daily', 'd'],
  week: ['week', 'weekly', 'w'],
  month: ['month', 'monthly', 'm'],
  cumulative: ['cum', 'cumulative', 'total']
};

function findValue(row: Record<string, unknown>, variants: string[]): number | null {
  const key = Object.keys(row).find((candidate) =>
    variants.some((variant) => candidate.toLowerCase() === variant.toLowerCase())
  );
  if (!key) {
    return null;
  }
  const value = row[key];
  return typeof value === 'number' ? value : null;
}

function extractKpiValues(result: DuneQueryResult | null): KpiValues {
  if (!result || result.data.rows.length === 0) {
    return { day: null, week: null, month: null, cumulative: null };
  }
  const row = result.data.rows[0];
  const values: KpiValues = {
    day: findValue(row, KPI_KEY_VARIANTS.day),
    week: findValue(row, KPI_KEY_VARIANTS.week),
    month: findValue(row, KPI_KEY_VARIANTS.month),
    cumulative: findValue(row, KPI_KEY_VARIANTS.cumulative)
  };

  const hasAny = Object.values(values).some((value) => value !== null);
  if (!hasAny) {
    const numeric = Object.values(row).find((value) => typeof value === 'number') as number | undefined;
    return {
      day: numeric ?? null,
      week: numeric ?? null,
      month: numeric ?? null,
      cumulative: numeric ?? null
    };
  }
  return values;
}

function useDuneQuery(queryId: number, initial: PolymarketBundleItem) {
  const { data, error, isLoading } = useSWR<DuneQueryResult>(
    `/api/dune/${queryId}`,
    fetcher,
    {
      fallbackData: initial.result ?? undefined,
      revalidateOnFocus: false
    }
  );

  return {
    data: data ?? initial.result,
    error: error ?? initial.error,
    isLoading: isLoading && !initial.result
  };
}

function KPISection({
  title,
  queryId,
  initial
}: {
  title: string;
  queryId: number;
  initial: PolymarketBundleItem;
}) {
  const { data, error, isLoading } = useDuneQuery(queryId, initial);

  if (isLoading) {
    return (
      <ModuleCard>
        <LoadingSkeleton lines={4} />
      </ModuleCard>
    );
  }

  if (!data || error) {
    return (
      <ModuleCard>
        <ErrorState message={error ?? 'Unable to load KPI.'} />
      </ModuleCard>
    );
  }

  return (
    <ModuleCard>
      <ModuleHeader title={title} queryId={queryId} updatedAt={data.updatedAt} />
      <div className="mt-3">
        <KpiCard title={title} values={extractKpiValues(data)} />
      </div>
    </ModuleCard>
  );
}

function TableSection({
  title,
  queryId,
  initial
}: {
  title: string;
  queryId: number;
  initial: PolymarketBundleItem;
}) {
  const { data, error, isLoading } = useDuneQuery(queryId, initial);

  if (isLoading) {
    return (
      <ModuleCard>
        <LoadingSkeleton lines={5} />
      </ModuleCard>
    );
  }

  if (!data || error) {
    return (
      <ModuleCard>
        <ErrorState message={error ?? 'Unable to load table.'} />
      </ModuleCard>
    );
  }

  return (
    <DataTable
      title={title}
      queryId={queryId}
      updatedAt={data.updatedAt}
      rows={data.data.rows}
    />
  );
}

export default function PolymarketDashboard({
  initialData
}: {
  initialData: Record<PolymarketQueryKey, PolymarketBundleItem>;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Polymarket Analytics</h1>
        <p className="mt-2 text-sm text-text-muted">
          Live snapshots from Dune queries. Each module can refresh independently.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <KPISection
          title="Volume"
          queryId={polymarketQueryIds.volume}
          initial={initialData.volume}
        />
        <KPISection
          title="Traders"
          queryId={polymarketQueryIds.trader}
          initial={initialData.trader}
        />
        <KPISection
          title="Fees"
          queryId={polymarketQueryIds.fees}
          initial={initialData.fees}
        />
      </section>

      <section className="space-y-6">
        <TableSection
          title="Hot Events (Last 24h)"
          queryId={polymarketQueryIds.hotEvents}
          initial={initialData.hotEvents}
        />
        <TableSection
          title="Traders by Balance"
          queryId={polymarketQueryIds.tradersByBalance}
          initial={initialData.tradersByBalance}
        />
        <TableSection
          title="Volume by Category"
          queryId={polymarketQueryIds.volumeByCategory}
          initial={initialData.volumeByCategory}
        />
        <TableSection
          title="Sport Volume by Category"
          queryId={polymarketQueryIds.sportVolumeByCategory}
          initial={initialData.sportVolumeByCategory}
        />
      </section>
    </div>
  );
}
