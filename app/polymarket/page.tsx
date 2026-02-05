import PolymarketDashboard from '@/components/PolymarketDashboard';
import { getPolymarketBundle } from '@/lib/polymarket';

export default async function PolymarketPage() {
  const initialData = await getPolymarketBundle();

  return <PolymarketDashboard initialData={initialData} />;
}
