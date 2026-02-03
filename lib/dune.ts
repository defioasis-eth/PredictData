import { getCachedValue, setCachedValue } from './cache';

export type DuneQueryResult = {
  queryId: number;
  updatedAt: string;
  data: {
    rows: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
  };
};

const DUNE_API_BASE = 'https://api.dune.com/api/v1';
const CACHE_TTL_MS = 60_000;

function ensureApiKey() {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DUNE_API_KEY environment variable.');
  }
  return apiKey;
}

function normalizeResponse(queryId: number, payload: any): DuneQueryResult {
  const metadata = payload?.result?.metadata ?? {};
  const updatedAt =
    metadata?.result_set_updated_at ??
    metadata?.execution_ended_at ??
    payload?.execution_ended_at ??
    new Date().toISOString();

  return {
    queryId,
    updatedAt,
    data: {
      rows: payload?.result?.rows ?? [],
      metadata
    }
  };
}

export async function getDuneQueryResult(queryId: number): Promise<DuneQueryResult> {
  const cacheKey = `dune:${queryId}`;
  const cached = getCachedValue<DuneQueryResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = ensureApiKey();
  const response = await fetch(`${DUNE_API_BASE}/query/${queryId}/results`, {
    headers: {
      'x-dune-api-key': apiKey
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Dune API error (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const normalized = normalizeResponse(queryId, payload);
  setCachedValue(cacheKey, normalized, CACHE_TTL_MS);
  return normalized;
}

export function normalizeDuneResult(queryId: number, payload: any): DuneQueryResult {
  return normalizeResponse(queryId, payload);
}
