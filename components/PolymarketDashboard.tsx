'use client';

import useSWR from 'swr';
import { polymarketQueryIds, PolymarketBundleItem, PolymarketQueryKey } from '@/lib/polymarket';
import { DuneQueryResult } from '@/lib/dune';
import ChartModule from './ChartModule';
import DataTable from './DataTable';
import ErrorState from './ErrorState';
import LoadingSkeleton from './LoadingSkeleton';
import ModuleCard from './ModuleCard';
import KpiPlaceholderCard from './KpiPlaceholderCard';

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
  multiSeries,
  height,
  id
}: {
  title: string;
  queryId: number;
  initial: PolymarketBundleItem;
  multiSeries?: boolean;
  height?: number;
  id?: string;
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
    <div id={id} className="scroll-mt-24">
      <ChartModule title={title} rows={data.data.rows} multiSeries={multiSeries} height={height} />
    </div>
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
        <KpiPlaceholderCard title="Volume (Last 24h)" />
        <KpiPlaceholderCard title="Traders (Last 24h)" />
        <KpiPlaceholderCard title="Fees (Last 24h)" subtitle="15min Up/Down Market" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="order-2 lg:order-1">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-surface-card/80 p-4 text-sm">
            <div className="text-xs font-semibold uppercase text-text-muted">Quick Jump</div>
            <ul className="mt-3 space-y-2 text-text-primary">
              <li>
                <a href="#volume">Volume</a>
                <ul className="mt-2 space-y-1 pl-4 text-xs text-text-muted">
                  <li><a href="#volume-category">by Category</a></li>
                  <li><a href="#volume-sport">sport volume</a></li>
                </ul>
              </li>
              <li>
                <a href="#traders">Trader</a>
                <ul className="mt-2 space-y-1 pl-4 text-xs text-text-muted">
                  <li><a href="#traders-balance">by Balance</a></li>
                </ul>
              </li>
              <li>
                <a href="#fees">Fees</a>
              </li>
            </ul>
          </div>
        </aside>

        <section className="order-1 space-y-6 lg:order-2">
          <ChartSection
            id="volume"
            title="Volume"
            queryId={polymarketQueryIds.volume}
            initial={initialData.volume}
            height={260}
          />
          <ChartSection
            id="volume-category"
            title="Volume by Category"
            queryId={polymarketQueryIds.volumeByCategory}
            initial={initialData.volumeByCategory}
            multiSeries
            height={260}
          />
          <ChartSection
            id="volume-sport"
            title="Sport Volume by Category"
            queryId={polymarketQueryIds.sportVolumeByCategory}
            initial={initialData.sportVolumeByCategory}
            multiSeries
            height={260}
          />
          <ChartSection
            id="traders"
            title="Traders"
            queryId={polymarketQueryIds.trader}
            initial={initialData.trader}
            height={260}
          />
          <ChartSection
            id="traders-balance"
            title="Traders by Balance"
            queryId={polymarketQueryIds.tradersByBalance}
            initial={initialData.tradersByBalance}
            multiSeries
            height={320}
          />
          <ChartSection
            id="fees"
            title="Fees"
            queryId={polymarketQueryIds.fees}
            initial={initialData.fees}
            height={260}
          />
          <TableSection
            title="Hot Events (Last 24h)"
            queryId={polymarketQueryIds.hotEvents}
            initial={initialData.hotEvents}
          />
        </section>
      </div>
    </div>
  );
}
