#!/usr/bin/env node

/**
 * StableFX Demo - Project Generator
 *
 * This script generates all remaining backend and frontend files
 * Run: node generate-project.js
 */

const fs = require('fs');
const path = require('path');

// Helper to create file with directory
function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  console.log(`✓ Created: ${filePath}`);
}

console.log('🚀 Generating StableFX Demo Project...\n');

// ============================================================================
// BACKEND FILES
// ============================================================================

console.log('📁 Creating backend files...\n');

// Account Module
createFile('backend/src/account/account.service.ts', `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  async getDefaultAccount() {
    return this.prisma.account.findUnique({
      where: { email: 'demo@stablefx.local' },
      include: { balances: true },
    });
  }

  async getAccount(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { balances: true },
    });
  }
}
`);

createFile('backend/src/account/account.module.ts', `import { Module } from '@nestjs/common';
import { AccountService } from './account.service';

@Module({
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
`);

// Swap Module
createFile('backend/src/swap/swap.controller.ts', `import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SwapService } from './swap.service';

class SwapQuoteDto {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

class SwapExecuteDto {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  accountId?: string;
}

@Controller('swap')
export class SwapController {
  constructor(private swapService: SwapService) {}

  @Post('quote')
  async getQuote(@Body() dto: SwapQuoteDto) {
    return this.swapService.getQuote(
      dto.fromCurrency,
      dto.toCurrency,
      dto.amount
    );
  }

  @Post('execute')
  async executeSwap(@Body() dto: SwapExecuteDto) {
    return this.swapService.executeSwap(
      dto.fromCurrency,
      dto.toCurrency,
      dto.amount,
      dto.accountId
    );
  }

  @Get('history')
  async getHistory(@Query('accountId') accountId?: string) {
    return this.swapService.getHistory(accountId);
  }
}
`);

createFile('backend/src/swap/swap.service.ts', `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OracleService } from '../oracle/oracle.service';
import { AccountService } from '../account/account.service';

@Injectable()
export class SwapService {
  constructor(
    private prisma: PrismaService,
    private oracle: OracleService,
    private accountService: AccountService,
  ) {}

  async getQuote(fromCurrency: string, toCurrency: string, amount: number) {
    const quote = this.oracle.getQuote(fromCurrency, toCurrency, amount);

    return {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: quote.toAmount,
      rate: quote.rate,
      spread: quote.spread,
      spreadBps: quote.spread * 10000,
      estimatedTime: quote.estimatedTime,
      validUntil: new Date(Date.now() + 60000), // 1 minute
    };
  }

  async executeSwap(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    accountId?: string
  ) {
    // Get default account if not specified
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      throw new Error('Account not found');
    }

    // Get quote
    const quote = this.oracle.getQuote(fromCurrency, toCurrency, amount);

    // Check balance
    const fromBalance = account.balances.find(b => b.currency === fromCurrency);
    if (!fromBalance || fromBalance.amount < amount) {
      throw new Error(\`Insufficient \${fromCurrency} balance\`);
    }

    // Execute swap (update balances)
    await this.prisma.$transaction([
      // Deduct from source currency
      this.prisma.balance.update({
        where: {
          accountId_currency: {
            accountId: account.id,
            currency: fromCurrency,
          },
        },
        data: {
          amount: { decrement: amount },
        },
      }),
      // Add to destination currency
      this.prisma.balance.upsert({
        where: {
          accountId_currency: {
            accountId: account.id,
            currency: toCurrency,
          },
        },
        update: {
          amount: { increment: quote.toAmount },
        },
        create: {
          accountId: account.id,
          currency: toCurrency,
          amount: quote.toAmount,
        },
      }),
      // Record swap
      this.prisma.swap.create({
        data: {
          accountId: account.id,
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: quote.toAmount,
          rate: quote.rate,
          spread: quote.spread,
          status: 'executed',
        },
      }),
    ]);

    return {
      success: true,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: quote.toAmount,
      rate: quote.rate,
      executedAt: new Date(),
    };
  }

  async getHistory(accountId?: string) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      return [];
    }

    return this.prisma.swap.findMany({
      where: { accountId: account.id },
      orderBy: { executedAt: 'desc' },
      take: 50,
    });
  }
}
`);

createFile('backend/src/swap/swap.module.ts', `import { Module } from '@nestjs/common';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';
import { OracleModule } from '../oracle/oracle.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [OracleModule, AccountModule],
  controllers: [SwapController],
  providers: [SwapService],
})
export class SwapModule {}
`);

// Perp Module
createFile('backend/src/perp/perp.controller.ts', `import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PerpService } from './perp.service';

class OpenPositionDto {
  pair: string;
  size: number;
  leverage: number;
  side: 'long' | 'short';
  accountId?: string;
}

class ClosePositionDto {
  positionId: string;
}

@Controller('perp')
export class PerpController {
  constructor(private perpService: PerpService) {}

  @Post('open')
  async openPosition(@Body() dto: OpenPositionDto) {
    return this.perpService.openPosition(
      dto.pair,
      dto.size,
      dto.leverage,
      dto.side,
      dto.accountId
    );
  }

  @Post('close')
  async closePosition(@Body() dto: ClosePositionDto) {
    return this.perpService.closePosition(dto.positionId);
  }

  @Get('positions')
  async getPositions(@Query('accountId') accountId?: string) {
    return this.perpService.getPositions(accountId);
  }

  @Get('positions/:id')
  async getPosition(@Param('id') id: string) {
    return this.perpService.getPosition(id);
  }
}
`);

createFile('backend/src/perp/perp.service.ts', `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OracleService } from '../oracle/oracle.service';
import { AccountService } from '../account/account.service';

@Injectable()
export class PerpService {
  constructor(
    private prisma: PrismaService,
    private oracle: OracleService,
    private accountService: AccountService,
  ) {}

  async openPosition(
    pair: string,
    size: number,
    leverage: number,
    side: 'long' | 'short',
    accountId?: string
  ) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      throw new Error('Account not found');
    }

    // Get current price
    const priceData = this.oracle.getPrice(pair);
    if (!priceData) {
      throw new Error(\`No price data for pair: \${pair}\`);
    }

    // Calculate required collateral
    const requiredCollateral = size / leverage;

    // Check if user has enough USDC
    const usdcBalance = account.balances.find(b => b.currency === 'USDC_arc');
    if (!usdcBalance || usdcBalance.amount < requiredCollateral) {
      throw new Error('Insufficient collateral');
    }

    // Lock collateral (deduct from balance)
    await this.prisma.balance.update({
      where: {
        accountId_currency: {
          accountId: account.id,
          currency: 'USDC_arc',
        },
      },
      data: {
        amount: { decrement: requiredCollateral },
      },
    });

    // Create position
    const position = await this.prisma.perpPosition.create({
      data: {
        accountId: account.id,
        pair,
        size,
        entryPrice: priceData.price,
        leverage,
        side,
        status: 'open',
      },
    });

    return {
      success: true,
      position,
      collateralLocked: requiredCollateral,
    };
  }

  async closePosition(positionId: string) {
    const position = await this.prisma.perpPosition.findUnique({
      where: { id: positionId },
    });

    if (!position || position.status !== 'open') {
      throw new Error('Position not found or already closed');
    }

    // Get current price
    const priceData = this.oracle.getPrice(position.pair);
    if (!priceData) {
      throw new Error(\`No price data for pair: \${position.pair}\`);
    }

    const closePrice = priceData.price;

    // Calculate PnL
    const priceDiff = closePrice - position.entryPrice;
    const pnlMultiplier = position.side === 'long' ? 1 : -1;
    const pnl = (priceDiff / position.entryPrice) * position.size * pnlMultiplier;

    // Calculate final amount (collateral + pnl)
    const collateral = position.size / position.leverage;
    const finalAmount = collateral + pnl;

    // Return funds to balance
    await this.prisma.balance.update({
      where: {
        accountId_currency: {
          accountId: position.accountId,
          currency: 'USDC_arc',
        },
      },
      data: {
        amount: { increment: Math.max(0, finalAmount) }, // Can't go negative
      },
    });

    // Update position
    await this.prisma.perpPosition.update({
      where: { id: positionId },
      data: {
        status: 'closed',
        closePrice,
        closedAt: new Date(),
        unrealizedPnL: pnl,
      },
    });

    return {
      success: true,
      pnl,
      closePrice,
      returnedAmount: finalAmount,
    };
  }

  async getPositions(accountId?: string) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      return [];
    }

    const positions = await this.prisma.perpPosition.findMany({
      where: { accountId: account.id },
      orderBy: { openedAt: 'desc' },
    });

    // Calculate current PnL for open positions
    return positions.map(pos => {
      if (pos.status === 'open') {
        const priceData = this.oracle.getPrice(pos.pair);
        if (priceData) {
          const priceDiff = priceData.price - pos.entryPrice;
          const pnlMultiplier = pos.side === 'long' ? 1 : -1;
          const unrealizedPnL = (priceDiff / pos.entryPrice) * pos.size * pnlMultiplier;

          return {
            ...pos,
            currentPrice: priceData.price,
            unrealizedPnL,
          };
        }
      }
      return pos;
    });
  }

  async getPosition(id: string) {
    const position = await this.prisma.perpPosition.findUnique({
      where: { id },
    });

    if (!position) {
      throw new Error('Position not found');
    }

    if (position.status === 'open') {
      const priceData = this.oracle.getPrice(position.pair);
      if (priceData) {
        const priceDiff = priceData.price - position.entryPrice;
        const pnlMultiplier = position.side === 'long' ? 1 : -1;
        const unrealizedPnL = (priceDiff / position.entryPrice) * position.size * pnlMultiplier;

        return {
          ...position,
          currentPrice: priceData.price,
          unrealizedPnL,
        };
      }
    }

    return position;
  }
}
`);

createFile('backend/src/perp/perp.module.ts', `import { Module } from '@nestjs/common';
import { PerpController } from './perp.controller';
import { PerpService } from './perp.service';
import { OracleModule } from '../oracle/oracle.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [OracleModule, AccountModule],
  controllers: [PerpController],
  providers: [PerpService],
})
export class PerpModule {}
`);

// Treasury Module
createFile('backend/src/treasury/treasury.controller.ts', `import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { TreasuryService } from './treasury.service';

class RebalanceDto {
  targetAllocations: Record<string, number>;
  accountId?: string;
}

class PayoutDto {
  fromRegion: string;
  toRegion: string;
  currency: string;
  amount: number;
  accountId?: string;
}

@Controller('treasury')
export class TreasuryController {
  constructor(private treasuryService: TreasuryService) {}

  @Get('balances')
  async getBalances(@Query('accountId') accountId?: string) {
    return this.treasuryService.getBalances(accountId);
  }

  @Post('rebalance')
  async rebalance(@Body() dto: RebalanceDto) {
    return this.treasuryService.rebalance(
      dto.targetAllocations,
      dto.accountId
    );
  }

  @Post('payout')
  async executePayout(@Body() dto: PayoutDto) {
    return this.treasuryService.executePayout(
      dto.fromRegion,
      dto.toRegion,
      dto.currency,
      dto.amount,
      dto.accountId
    );
  }

  @Get('payouts')
  async getPayouts(@Query('accountId') accountId?: string) {
    return this.treasuryService.getPayouts(accountId);
  }
}
`);

createFile('backend/src/treasury/treasury.service.ts', `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from '../account/account.service';
import { SwapService } from '../swap/swap.service';

@Injectable()
export class TreasuryService {
  constructor(
    private prisma: PrismaService,
    private accountService: AccountService,
    private swapService: SwapService,
  ) {}

  async getBalances(accountId?: string) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      return { balances: [], total: 0 };
    }

    const balances = await this.prisma.balance.findMany({
      where: { accountId: account.id },
    });

    const total = balances.reduce((sum, b) => sum + b.amount, 0);

    return {
      accountId: account.id,
      accountName: account.name,
      balances: balances.map(b => ({
        currency: b.currency,
        amount: b.amount,
        percentage: (b.amount / total) * 100,
      })),
      total,
      updatedAt: new Date(),
    };
  }

  async rebalance(
    targetAllocations: Record<string, number>,
    accountId?: string
  ) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      throw new Error('Account not found');
    }

    // Get current balances
    const balancesData = await this.getBalances(accountId);
    const total = balancesData.total;

    // Calculate required swaps
    const swaps = [];

    for (const [currency, targetPct] of Object.entries(targetAllocations)) {
      const targetAmount = total * (targetPct / 100);
      const currentBalance = balancesData.balances.find(b => b.currency === currency);
      const currentAmount = currentBalance?.amount || 0;
      const diff = targetAmount - currentAmount;

      if (Math.abs(diff) > 1) { // Ignore tiny differences
        swaps.push({
          currency,
          targetAmount,
          currentAmount,
          diff,
          needsAction: diff > 0 ? 'buy' : 'sell',
        });
      }
    }

    // Execute swaps
    const executedSwaps = [];

    for (const swap of swaps) {
      if (swap.diff > 0) {
        // Need to buy this currency - find source currency to sell
        const sourceCurrency = balancesData.balances.find(b =>
          b.amount > Math.abs(swap.diff) && b.currency !== swap.currency
        );

        if (sourceCurrency) {
          try {
            const result = await this.swapService.executeSwap(
              sourceCurrency.currency,
              swap.currency,
              Math.abs(swap.diff),
              account.id
            );
            executedSwaps.push(result);
          } catch (error) {
            console.error('Swap failed:', error.message);
          }
        }
      }
    }

    return {
      success: true,
      targetAllocations,
      swapsExecuted: executedSwaps.length,
      swaps: executedSwaps,
    };
  }

  async executePayout(
    fromRegion: string,
    toRegion: string,
    currency: string,
    amount: number,
    accountId?: string
  ) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      throw new Error('Account not found');
    }

    // Check balance
    const balance = account.balances.find(b => b.currency === currency);
    if (!balance || balance.amount < amount) {
      throw new Error(\`Insufficient \${currency} balance\`);
    }

    // Simulate cross-border transfer
    const transactionHash = \`0x\${Math.random().toString(16).slice(2, 66)}\`;

    // Record payout
    const payout = await this.prisma.payout.create({
      data: {
        accountId: account.id,
        fromRegion,
        toRegion,
        currency,
        amount,
        status: 'completed',
        transactionHash,
        completedAt: new Date(),
      },
    });

    // Deduct from balance
    await this.prisma.balance.update({
      where: {
        accountId_currency: {
          accountId: account.id,
          currency,
        },
      },
      data: {
        amount: { decrement: amount },
      },
    });

    return {
      success: true,
      payout,
      transactionHash,
      estimatedArrival: '< 60 seconds (Arc sub-second finality)',
    };
  }

  async getPayouts(accountId?: string) {
    const account = accountId
      ? await this.accountService.getAccount(accountId)
      : await this.accountService.getDefaultAccount();

    if (!account) {
      return [];
    }

    return this.prisma.payout.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
`);

createFile('backend/src/treasury/treasury.module.ts', `import { Module } from '@nestjs/common';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { AccountModule } from '../account/account.module';
import { SwapModule } from '../swap/swap.module';

@Module({
  imports: [AccountModule, SwapModule],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}
`);

// TypeScript config
createFile('backend/tsconfig.json', `{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
`);

console.log('\n✅ Backend files generated!\n');

// ============================================================================
// FRONTEND FILES
// ============================================================================

console.log('📁 Creating frontend files...\n');

// Package.json
createFile('frontend/package.json', `{
  "name": "stablefx-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.2",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0"
  }
}
`);

// Next.js config
createFile('frontend/next.config.js', `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`);

// Tailwind config
createFile('frontend/tailwind.config.ts', `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
`);

// Globals CSS
createFile('frontend/app/globals.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}
`);

// Environment
createFile('frontend/.env.example', `NEXT_PUBLIC_API_URL=http://localhost:3001/api
`);

// API client
createFile('frontend/lib/api.ts', `import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Swap APIs
export const swapApi = {
  getQuote: (fromCurrency: string, toCurrency: string, amount: number) =>
    api.post('/swap/quote', { fromCurrency, toCurrency, amount }),

  execute: (fromCurrency: string, toCurrency: string, amount: number) =>
    api.post('/swap/execute', { fromCurrency, toCurrency, amount }),

  getHistory: () => api.get('/swap/history'),
};

// Perp APIs
export const perpApi = {
  openPosition: (pair: string, size: number, leverage: number, side: 'long' | 'short') =>
    api.post('/perp/open', { pair, size, leverage, side }),

  closePosition: (positionId: string) =>
    api.post('/perp/close', { positionId }),

  getPositions: () => api.get('/perp/positions'),
};

// Treasury APIs
export const treasuryApi = {
  getBalances: () => api.get('/treasury/balances'),

  rebalance: (targetAllocations: Record<string, number>) =>
    api.post('/treasury/rebalance', { targetAllocations }),

  payout: (fromRegion: string, toRegion: string, currency: string, amount: number) =>
    api.post('/treasury/payout', { fromRegion, toRegion, currency, amount }),

  getPayouts: () => api.get('/treasury/payouts'),
};

// Oracle API
export const oracleApi = {
  getPrices: () => api.get('/oracle/prices'),
};
`);

// Root layout
createFile('frontend/app/layout.tsx', `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StableFX Demo - Stablecoin FX on Arc',
  description: 'Localhost demo of stablecoin FX engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              StableFX Demo
            </Link>
            <div className="space-x-4">
              <Link href="/swap" className="hover:underline">Swap</Link>
              <Link href="/perp" className="hover:underline">Perpetuals</Link>
              <Link href="/treasury" className="hover:underline">Treasury</Link>
              <Link href="/payouts" className="hover:underline">Payouts</Link>
            </div>
          </div>
        </nav>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-center">
          <p className="text-sm">
            🚧 Localhost Demo • Simulated Liquidity • Inspired by Arc + StableFX
          </p>
        </div>
        <main className="container mx-auto py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
`);

// Home page
createFile('frontend/app/page.tsx', `import Link from 'next/link'

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">
        Welcome to StableFX Demo
      </h1>
      <p className="text-xl mb-8 text-gray-600">
        Institutional-grade stablecoin FX engine built on Arc
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <Link href="/swap" className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-bold mb-2">💱 Swap</h2>
          <p className="text-gray-600">
            Exchange stablecoins across chains with RFQ quotes
          </p>
        </Link>

        <Link href="/perp" className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-bold mb-2">📈 Perpetuals</h2>
          <p className="text-gray-600">
            Trade perpetuals on stablecoin pairs with leverage
          </p>
        </Link>

        <Link href="/treasury" className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-bold mb-2">🏦 Treasury</h2>
          <p className="text-gray-600">
            Manage multi-currency balances and auto-rebalance
          </p>
        </Link>

        <Link href="/payouts" className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-bold mb-2">🌍 Payouts</h2>
          <p className="text-gray-600">
            Execute cross-border payments with sub-second settlement
          </p>
        </Link>
      </div>

      <div className="mt-12 text-sm text-gray-500">
        <p>Built with Arc's sub-second finality and USDC-native gas</p>
        <p>Powered by Circle CCTP (simulated for localhost)</p>
      </div>
    </div>
  )
}
`);

console.log('\n✅ Frontend structure generated!\n');

// ============================================================================
// DOCKER & SCRIPTS
// ============================================================================

console.log('📁 Creating Docker and deployment files...\n');

// Docker Compose
createFile('docker-compose.yml', `version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=file:./prisma/dev.db
      - DEMO_MODE=true
      - MOCK_LIQUIDITY=true
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/prisma:/app/prisma
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
    depends_on:
      - backend
`);

// Backend Dockerfile
createFile('backend/Dockerfile', `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
`);

// Frontend Dockerfile
createFile('frontend/Dockerfile', `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
`);

// Setup script
createFile('setup.sh', `#!/bin/bash

echo "🚀 Setting up StableFX Demo..."

# Backend setup
echo "\n📦 Setting up backend..."
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
cd ..

# Frontend setup
echo "\n📦 Setting up frontend..."
cd frontend
cp .env.example .env.local
npm install
cd ..

echo "\n✅ Setup complete!"
echo "\nTo start the application:"
echo "  Option 1 (Docker): docker-compose up"
echo "  Option 2 (Manual):"
echo "    Terminal 1: cd backend && npm run dev"
echo "    Terminal 2: cd frontend && npm run dev"
echo "\nThen open http://localhost:3000"
`);

// Windows setup script
createFile('setup.bat', `@echo off

echo Setting up StableFX Demo...

echo.
echo Setting up backend...
cd backend
copy .env.example .env
call npm install
call npx prisma generate
call npx prisma migrate dev --name init
cd ..

echo.
echo Setting up frontend...
cd frontend
copy .env.example .env.local
call npm install
cd ..

echo.
echo Setup complete!
echo.
echo To start the application:
echo   Option 1 (Docker): docker-compose up
echo   Option 2 (Manual):
echo     Terminal 1: cd backend ^&^& npm run dev
echo     Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open http://localhost:3000
pause
`);

console.log('\n✅ Docker and setup scripts generated!\n');

console.log('🎉 Project generation complete!\n');
console.log('Next steps:');
console.log('  1. Run: chmod +x setup.sh (on Mac/Linux) or run setup.bat (on Windows)');
console.log('  2. Run: ./setup.sh (or setup.bat on Windows)');
console.log('  3. Start with Docker: docker-compose up');
console.log('  4. Or start manually:');
console.log('     - Terminal 1: cd backend && npm run dev');
console.log('     - Terminal 2: cd frontend && npm run dev');
console.log('  5. Open http://localhost:3000');
console.log('\n📚 See SETUP.md for detailed instructions');

console.log('\n✅ All files generated successfully!');
console.log('\nRun the setup script to complete the installation.');
console.log('\n📚 Documentation:');
console.log('  - See SETUP.md for detailed setup');
console.log('  - See DEPLOY_LOCALHOST.md for deployment guide');
