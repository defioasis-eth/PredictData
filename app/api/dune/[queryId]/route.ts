import { NextResponse } from 'next/server';
import { getDuneQueryResult } from '@/lib/dune';

export const revalidate = 60;
const ALLOWED_QUERY_IDS = new Set([
  6501641, 6501625, 6501761, 6499975, 6501712, 6500882, 6500413
]);

export async function GET(
  _request: Request,
  { params }: { params: { queryId: string } }
) {
  const queryId = Number(params.queryId);
  if (!Number.isFinite(queryId)) {
    return NextResponse.json({ error: 'Invalid queryId.' }, { status: 400 });
  }
  if (!ALLOWED_QUERY_IDS.has(queryId)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    const result = await getDuneQueryResult(queryId);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 's-maxage=60'
      }
    });
  } catch (error: any) {
    console.error('Dune API proxy error', error);
    return NextResponse.json(
      { error: 'Failed to fetch Dune data.' },
      { status: 500 }
    );
  }
}
