import { Injectable } from '@nestjs/common';
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
      throw new Error(`No price data for pair: ${pair}`);
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
      throw new Error(`No price data for pair: ${position.pair}`);
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
