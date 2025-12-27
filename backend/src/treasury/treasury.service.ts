import { Injectable } from '@nestjs/common';
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
      throw new Error(`Insufficient ${currency} balance`);
    }

    // Simulate cross-border transfer
    const transactionHash = `0x${Math.random().toString(16).slice(2, 66)}`;

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
