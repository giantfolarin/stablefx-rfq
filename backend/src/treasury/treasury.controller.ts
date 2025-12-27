import { Controller, Post, Get, Body, Query } from '@nestjs/common';
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
