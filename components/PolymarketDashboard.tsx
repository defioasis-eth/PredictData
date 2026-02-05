'use client';

import useSWR from 'swr';
import { polymarketQueryIds, PolymarketBundleItem, PolymarketQueryKey } from '@/lib/polymarket';
import { DuneQueryResult } from '@/lib/dune';
import ChartModule from './ChartModule';
import DataTable from './DataTable';
import ErrorState from './ErrorState';
import LoadingSkeleton from './LoadingSkeleton';
import ModuleCard from './ModuleCard';

const fetcher = async (url: string): Promise<DuneQueryResult> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

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

function ChartSection({
  title,
  queryId,
  initial,
  multiSeries
}: {
  title: string;
  queryId: number;
  initial: PolymarketBundleItem;
  multiSeries?: boolean;
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
        <ErrorState message={error ?? 'Unable to load chart.'} />
      </ModuleCard>
    );
  }

  return (
    <ChartModule title={title} rows={data.data.rows} multiSeries={multiSeries} />
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
          Live snapshots across key market activity signals. Each module can refresh independently.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartSection
          title="Volume"
          queryId={polymarketQueryIds.volume}
          initial={initialData.volume}
        />
        <ChartSection
          title="Traders"
          queryId={polymarketQueryIds.trader}
          initial={initialData.trader}
        />
        <ChartSection
          title="Fees"
          queryId={polymarketQueryIds.fees}
          initial={initialData.fees}
        />
      </section>

      <section className="space-y-6">
        <ChartSection
          title="Traders by Balance"
          queryId={polymarketQueryIds.tradersByBalance}
          initial={initialData.tradersByBalance}
          multiSeries
        />
        <TableSection
          title="Hot Events (Last 24h)"
          queryId={polymarketQueryIds.hotEvents}
          initial={initialData.hotEvents}
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
