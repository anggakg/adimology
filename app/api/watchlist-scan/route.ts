import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketDetector, fetchOrderbook, getTopBroker, fetchEmitenInfo } from '@/lib/stockbit';
import { calculateTargets } from '@/lib/calculations';

export interface WatchlistScanResult {
  emiten: string;
  sector?: string;
  harga?: number;
  bandar?: string;
  barang_bandar?: number;
  rata_rata_bandar?: number;
  target_realistis?: number;
  target_max?: number;
  ara?: number;
  arb?: number;
  status: 'success' | 'error' | 'no_data';
  error?: string;
}

/**
 * POST /api/watchlist-scan
 * Body: { symbols: string[], fromDate: string, toDate: string }
 * Runs Adimology scan for each symbol in batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, fromDate, toDate } = body as {
      symbols: string[];
      fromDate: string;
      toDate: string;
    };

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty symbols array' },
        { status: 400 }
      );
    }

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'Missing fromDate or toDate' },
        { status: 400 }
      );
    }

    // Process all symbols in parallel with concurrency limit
    const CONCURRENCY = 5;
    const results: WatchlistScanResult[] = [];

    // Chunk into batches of CONCURRENCY
    for (let i = 0; i < symbols.length; i += CONCURRENCY) {
      const batch = symbols.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (emiten): Promise<WatchlistScanResult> => {
          try {
            const [marketDetectorData, orderbookData, emitenInfoData] = await Promise.all([
              fetchMarketDetector(emiten, fromDate, toDate),
              fetchOrderbook(emiten),
              fetchEmitenInfo(emiten).catch(() => null),
            ]);

            const brokerData = getTopBroker(marketDetectorData);
            const sector = emitenInfoData?.data?.sector;
            const obData = orderbookData.data || (orderbookData as any);

            if (!brokerData) {
              return {
                emiten,
                sector,
                harga: obData.close ? Number(obData.close) : undefined,
                status: 'no_data',
                error: 'Data broker tidak tersedia',
              };
            }

            const offerPrices = (obData.offer || []).map((o: any) => Number(o.price));
            const bidPrices = (obData.bid || []).map((b: any) => Number(b.price));
            const harga = Number(obData.close);
            const ara = offerPrices.length > 0 ? Math.max(...offerPrices) : Number(obData.high || 0);
            const arb = bidPrices.length > 0 ? Math.min(...bidPrices) : 0;
            const totalBid = obData.total_bid_offer?.bid?.lot
              ? Number(obData.total_bid_offer.bid.lot.replace(/,/g, ''))
              : 0;
            const totalOffer = obData.total_bid_offer?.offer?.lot
              ? Number(obData.total_bid_offer.offer.lot.replace(/,/g, ''))
              : 0;

            const calculated = calculateTargets(
              brokerData.rataRataBandar,
              brokerData.barangBandar,
              ara,
              arb,
              totalBid / 100,
              totalOffer / 100,
              harga
            );

            return {
              emiten,
              sector,
              harga,
              bandar: brokerData.bandar,
              barang_bandar: brokerData.barangBandar,
              rata_rata_bandar: brokerData.rataRataBandar,
              target_realistis: calculated.targetRealistis1,
              target_max: calculated.targetMax,
              ara,
              arb,
              status: 'success',
            };
          } catch (err) {
            return {
              emiten,
              status: 'error',
              error: err instanceof Error ? err.message : String(err),
            };
          }
        })
      );

      results.push(...batchResults);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Watchlist Scan API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
