import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PriceData {
  pair: string;
  price: number;
  timestamp: Date;
  spread: number; // in basis points
}

@Injectable()
export class OracleService {
  private prices: Map<string, PriceData> = new Map();
  private updateInterval: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {
    this.initializePrices();
    this.startPriceUpdates();
  }

  private initializePrices() {
    // Base prices for stablecoin pairs
    const basePrices = {
      'USDC/EURC': 0.92,  // 1 USDC = 0.92 EURC (approx EUR/USD rate)
      'USDC/USDC': 1.0,   // Same stablecoin
      'EURC/USDC': 1.087, // Inverse of USDC/EURC
    };

    const baseSpread = parseInt(process.env.BASE_SPREAD_BPS || '5');

    for (const [pair, price] of Object.entries(basePrices)) {
      this.prices.set(pair, {
        pair,
        price,
        timestamp: new Date(),
        spread: baseSpread,
      });
    }

    console.log('✓ Price oracle initialized');
  }

  private startPriceUpdates() {
    const interval = parseInt(process.env.PRICE_UPDATE_INTERVAL || '5000');

    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, interval);
  }

  private updatePrices() {
    for (const [pair, data] of this.prices.entries()) {
      // Simulate small price fluctuations (±0.1%)
      const fluctuation = (Math.random() - 0.5) * 0.002;
      const newPrice = data.price * (1 + fluctuation);

      this.prices.set(pair, {
        ...data,
        price: newPrice,
        timestamp: new Date(),
      });

      // Store in database for history
      this.prisma.priceOracle.create({
        data: {
          pair,
          price: newPrice,
        },
      }).catch(() => {
        // Ignore errors in background updates
      });
    }
  }

  getPrice(pair: string): PriceData | null {
    return this.prices.get(pair) || null;
  }

  getAllPrices(): PriceData[] {
    return Array.from(this.prices.values());
  }

  /**
   * Calculate FX rate including spread
   */
  getQuote(fromCurrency: string, toCurrency: string, amount: number) {
    // Input validation
    if (!fromCurrency || !toCurrency) {
      throw new Error('fromCurrency and toCurrency are required');
    }

    // Normalize currency names (remove chain suffixes)
    const fromBase = fromCurrency.split('_')[0];
    const toBase = toCurrency.split('_')[0];

    // If same base currency (e.g., USDC_arc to USDC_base)
    if (fromBase === toBase) {
      const baseSpread = parseInt(process.env.BASE_SPREAD_BPS || '5');
      return {
        rate: 1.0,
        spread: baseSpread / 10000, // Convert bps to decimal
        toAmount: amount * (1 - baseSpread / 10000),
        estimatedTime: 45, // Arc's fast finality
      };
    }

    // Different stablecoins
    const pair = `${fromBase}/${toBase}`;
    const priceData = this.getPrice(pair);

    if (!priceData) {
      // Try inverse pair
      const inversePair = `${toBase}/${fromBase}`;
      const inversePriceData = this.getPrice(inversePair);

      if (!inversePriceData) {
        throw new Error(`No price data for pair: ${pair}`);
      }

      const rate = 1 / inversePriceData.price;
      const spread = inversePriceData.spread / 10000;

      return {
        rate,
        spread,
        toAmount: amount * rate * (1 - spread),
        estimatedTime: 45,
      };
    }

    const spread = priceData.spread / 10000;

    return {
      rate: priceData.price,
      spread,
      toAmount: amount * priceData.price * (1 - spread),
      estimatedTime: 45,
    };
  }

  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
