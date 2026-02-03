import { NextResponse } from 'next/server';
import { getDuneQueryResult } from '@/lib/dune';

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: { queryId: string } }
) {
  const queryId = Number(params.queryId);
  if (!Number.isFinite(queryId)) {
    return NextResponse.json({ error: 'Invalid queryId.' }, { status: 400 });
  }

  try {
    const result = await getDuneQueryResult(queryId);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch Dune query.' },
      { status: 500 }
    );
  }
}
