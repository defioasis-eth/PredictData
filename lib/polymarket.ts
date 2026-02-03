import { getDuneQueryResult, DuneQueryResult } from './dune';

export type PolymarketQueryKey =
  | 'volume'
  | 'trader'
  | 'tradersByBalance'
  | 'volumeByCategory'
  | 'hotEvents'
  | 'fees'
  | 'sportVolumeByCategory';

export type PolymarketBundleItem = {
  result: DuneQueryResult | null;
  error?: string;
};

const QUERY_CONFIG: Record<PolymarketQueryKey, { queryId: number; divideBy2: boolean }> = {
  volume: { queryId: 6501641, divideBy2: false },
  trader: { queryId: 6501625, divideBy2: false },
  tradersByBalance: { queryId: 6501761, divideBy2: false },
  volumeByCategory: { queryId: 6499975, divideBy2: false },
  hotEvents: { queryId: 6501712, divideBy2: false },
  fees: { queryId: 6500882, divideBy2: false },
  sportVolumeByCategory: { queryId: 6500413, divideBy2: false }
};

function applyDivideBy2(result: DuneQueryResult, divideBy2: boolean): DuneQueryResult {
  if (!divideBy2) {
    return result;
  }

  const rows = result.data.rows.map((row) => {
    const updated: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (typeof value === 'number') {
        updated[key] = value / 2;
      } else {
        updated[key] = value;
      }
    });
    return updated;
  });

  return {
    ...result,
    data: {
      ...result.data,
      rows
    }
  };
}

export const polymarketQueryIds = Object.fromEntries(
  Object.entries(QUERY_CONFIG).map(([key, value]) => [key, value.queryId])
) as Record<PolymarketQueryKey, number>;

export async function getPolymarketBundle(): Promise<Record<PolymarketQueryKey, PolymarketBundleItem>> {
  const entries = Object.entries(QUERY_CONFIG) as [PolymarketQueryKey, { queryId: number; divideBy2: boolean }][];

  const results = await Promise.allSettled(
    entries.map(async ([key, config]) => {
      const result = await getDuneQueryResult(config.queryId);
      return [key, applyDivideBy2(result, config.divideBy2)] as const;
    })
  );

  return results.reduce((acc, outcome, index) => {
    const key = entries[index][0];
    if (outcome.status === 'fulfilled') {
      const [, result] = outcome.value;
      acc[key] = { result };
    } else {
      acc[key] = { result: null, error: outcome.reason?.message ?? 'Failed to load data.' };
    }
    return acc;
  }, {} as Record<PolymarketQueryKey, PolymarketBundleItem>);
}
