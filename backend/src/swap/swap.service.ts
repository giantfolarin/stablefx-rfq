import { Injectable } from '@nestjs/common';
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
      throw new Error(`Insufficient ${fromCurrency} balance`);
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
