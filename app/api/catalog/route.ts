import { rentalPrices } from '@/lib/inventory-server';

export async function GET() {
  try {
    return Response.json({prices:await rentalPrices()}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    console.error('catalog_prices_unavailable');
    return Response.json({error:'Prices are temporarily unavailable. Please retry.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
